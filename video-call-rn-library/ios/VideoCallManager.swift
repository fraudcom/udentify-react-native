import Foundation
import UIKit
import AVFoundation
import React

// Import UdentifyCommons framework and UdentifyVC source files are included directly
#if canImport(UdentifyCommons)
import UdentifyCommons
#endif

// Import our localization helpers
// Note: These are defined in the same module, so no import needed

// MARK: - VideoCallBundleHelper (Inline Implementation)

@objc
class VideoCallBundleHelper: NSObject {
  static var localizationBundle: Bundle?

  @objc static func setupLocalizationBundle(_ bundle: Bundle) {
    localizationBundle = bundle
    testLocalization()
  }

  private static func testLocalization() {
    // Test localization setup
    if let bundle = localizationBundle {
      let testKey = "udentify_vc_notification_label_default"
      let localizedString = bundle.localizedString(forKey: testKey, value: nil, table: nil)
      if localizedString == testKey {
        print("VideoCallBundleHelper - Warning: Localization not working properly")
      }
    }
  }

  @objc static func localizedString(forKey key: String, value: String?, table: String?) -> String {
    if let bundle = localizationBundle {
      let result = bundle.localizedString(forKey: key, value: value, table: table)
      if result != key {
        return result
      }
    }

    // Fallback to main bundle
    return Bundle.main.localizedString(forKey: key, value: value ?? key, table: table)
  }
}

@objc(VideoCallManager)
public class VideoCallManager: NSObject {

    @objc public weak var eventEmitter: RCTEventEmitter?

    private var currentStatus = "idle"

    // Lets VideoCallCameraView (created by VideoCallViewManager when JS mounts
    // <VideoCallView/>, not by this bridge module anymore) reach the same
    // RCTEventEmitter this module was constructed with, so VideoCall_on*
    // events keep flowing through the existing global emitter unchanged.
    static weak var sharedEventEmitter: RCTEventEmitter?

    @objc public init(eventEmitter: RCTEventEmitter) {
        super.init()
        self.eventEmitter = eventEmitter
        VideoCallManager.sharedEventEmitter = eventEmitter
        setupLocalizationBundle()
    }

    private func setupLocalizationBundle() {
        // Setup custom bundle for localization
        setupCustomLocalizationBundle()
    }

    private func setupCustomLocalizationBundle() {
        let libraryBundle = Bundle(for: VideoCallManager.self)

        // Try multiple approaches to find the bundle
        var resourceBundle: Bundle?

        // Look for VideoCallLibraryResources.bundle
        if let resourceBundlePath = libraryBundle.path(forResource: "VideoCallLibraryResources", ofType: "bundle") {
            resourceBundle = Bundle(path: resourceBundlePath)
        }

        // Fallback to main bundle
        if resourceBundle == nil {
            if let mainBundlePath = Bundle.main.path(forResource: "VideoCallLibraryResources", ofType: "bundle") {
                resourceBundle = Bundle(path: mainBundlePath)
            }
        }

        // Use library bundle directly if it contains Localizable.strings
        if resourceBundle == nil {
            if libraryBundle.path(forResource: "Localizable", ofType: "strings") != nil {
                resourceBundle = libraryBundle
            }
        }

        // Use main bundle as last resort
        if resourceBundle == nil {
            if Bundle.main.path(forResource: "Localizable", ofType: "strings") != nil {
                resourceBundle = Bundle.main
            }
        }

        if let bundle = resourceBundle {
            setVideoCallLocalizationBundle(bundle)
        } else {
            print("VideoCallManager - Warning: Could not find localization bundle")
        }
    }

    private func setVideoCallLocalizationBundle(_ bundle: Bundle) {
        // Set up VideoCallBundleHelper
        VideoCallBundleHelper.setupLocalizationBundle(bundle)

        // Set LocalizationConfiguration for SDK
        #if canImport(UdentifyCommons)
        LocalizationConfiguration.bundle = bundle
        // Cleared rather than set here: `config.tableName` belongs to a
        // specific <VideoCallView>, and startIfReady() assigns it from that
        // view's own prop once the call is about to start.
        LocalizationConfiguration.tableName = nil
        #endif
    }

    // MARK: - Permission Methods

    @objc public func checkPermissions(withResolver resolve: @escaping RCTPromiseResolveBlock,
                                     rejecter reject: @escaping RCTPromiseRejectBlock) {
        let cameraStatus = AVCaptureDevice.authorizationStatus(for: .video)
        let hasCameraPermission = cameraStatus == .authorized

        let microphoneStatus = AVCaptureDevice.authorizationStatus(for: .audio)
        let hasRecordAudioPermission = microphoneStatus == .authorized

        // iOS doesn't require READ_PHONE_STATE permission like Android
        let hasPhoneStatePermission = true

        // Internet permission is not required on iOS
        let hasInternetPermission = true

        let permissions: [String: Any] = [
            "hasCameraPermission": hasCameraPermission,
            "hasPhoneStatePermission": hasPhoneStatePermission,
            "hasInternetPermission": hasInternetPermission,
            "hasRecordAudioPermission": hasRecordAudioPermission
        ]

        resolve(permissions)
    }

    @objc public func requestPermissions(withResolver resolve: @escaping RCTPromiseResolveBlock,
                                       rejecter reject: @escaping RCTPromiseRejectBlock) {
        let cameraStatus = AVCaptureDevice.authorizationStatus(for: .video)
        let microphoneStatus = AVCaptureDevice.authorizationStatus(for: .audio)

        // Check if we need to request any permissions
        let needsCameraPermission = cameraStatus == .notDetermined
        let needsMicrophonePermission = microphoneStatus == .notDetermined

        if !needsCameraPermission && !needsMicrophonePermission {
            // All permissions are already determined
            let cameraGranted = cameraStatus == .authorized
            let microphoneGranted = microphoneStatus == .authorized
            resolve((cameraGranted && microphoneGranted) ? "granted" : "denied")
            return
        }

        // Request camera permission first
        if needsCameraPermission {
            AVCaptureDevice.requestAccess(for: .video) { cameraGranted in
                if needsMicrophonePermission {
                    // Request microphone permission after camera
                    AVCaptureDevice.requestAccess(for: .audio) { microphoneGranted in
                        DispatchQueue.main.async {
                            resolve((cameraGranted && microphoneGranted) ? "granted" : "denied")
                        }
                    }
                } else {
                    DispatchQueue.main.async {
                        let microphoneGranted = microphoneStatus == .authorized
                        resolve((cameraGranted && microphoneGranted) ? "granted" : "denied")
                    }
                }
            }
        } else if needsMicrophonePermission {
            // Only request microphone permission
            AVCaptureDevice.requestAccess(for: .audio) { microphoneGranted in
                DispatchQueue.main.async {
                    let cameraGranted = cameraStatus == .authorized
                    resolve((cameraGranted && microphoneGranted) ? "granted" : "denied")
                }
            }
        }
    }

    // MARK: - Video Call Lifecycle Methods

    // Deprecated: the call screen is no longer presented imperatively - render
    // <VideoCallView credentials={...} /> from the JS `video-call-rn-library`
    // package instead. Kept as a non-throwing stub so existing call sites that
    // haven't migrated yet don't crash; it never starts a call.
    @objc public func startVideoCall(withCredentials credentials: [String: Any],
                                   resolver resolve: @escaping RCTPromiseResolveBlock,
                                   rejecter reject: @escaping RCTPromiseRejectBlock) {
        let resultMap: [String: Any] = [
            "success": false,
            "error": [
                "type": "ERR_SDK_NOT_AVAILABLE",
                "message": "startVideoCall is deprecated; render <VideoCallView credentials={...} /> instead."
            ]
        ]
        resolve(resultMap)
    }

    // Cancels the transaction server-side before tearing the local session down:
    // the cancel is what ends the agent's session, since merely leaving the media
    // room looks like a network blip from their side. The teardown runs even when
    // the cancel fails, so a failure cannot strand the user on the call screen -
    // it is reported in `error` instead.
    @objc public func endVideoCall(withResolver resolve: @escaping RCTPromiseResolveBlock,
                                 rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyCommons)
        DispatchQueue.main.async {
            guard VideoCallCameraView.hasActiveInstance else {
                // Nothing to cancel, but a session that ended elsewhere may
                // still hold the lock.
                VideoCallScreenLock.releaseAll()
                resolve([
                    "success": false,
                    "status": "disconnected"
                ])
                return
            }

            self.performCancelVideoCall { success, error in
                var resultMap: [String: Any] = [
                    "success": true,
                    "status": "disconnected"
                ]

                if !success {
                    let message = error?.localizedDescription
                        ?? "The server did not confirm the cancellation."
                    print("VideoCallManager - Video call ended locally, but the transaction was not cancelled server-side: \(message)")
                    resultMap["error"] = [
                        "type": "ERR_SDK",
                        "message": "Call ended locally, but the transaction was not cancelled on the server; the agent's session may stay open. \(message)"
                    ]
                }

                // A cancel that reached the SDK already dismissed the controller,
                // so this is a no-op there; it is what ends the call on the
                // failure paths above, which never got that far.
                VideoCallCameraView.endActiveCall()
                VideoCallScreenLock.releaseAll()
                resolve(resultMap)
            }
        }
#else
        let resultMap: [String: Any] = [
            "success": true,
            "status": "disconnected"
        ]
        resolve(resultMap)
#endif
    }

#if canImport(UdentifyCommons)
    // Shared by endVideoCall above and by the JS-invoked cancelVideoCall bridge
    // method: posts the cancellation to the server via VideoCallCameraView's
    // currentInstance. `false` with a nil error means the call was already gone.
    private func performCancelVideoCall(completion: @escaping (Bool, Error?) -> Void) {
        guard let serverURL = VideoCallCameraView.activeServerURL,
              let transactionID = VideoCallCameraView.activeTransactionID else {
            completion(false, nil)
            return
        }

        VideoCallCameraView.cancelVideoCall(
            serverUrl: serverURL,
            transactionId: transactionID
        ) { result in
            DispatchQueue.main.async {
                VideoCallScreenLock.releaseAll()
                switch result {
                case .success(let success):
                    completion(success, nil)
                case .failure(let error):
                    completion(false, error)
                }
            }
        }
    }
#endif

    @objc public func getVideoCallStatus(withResolver resolve: @escaping RCTPromiseResolveBlock,
                                       rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyCommons)
        resolve(VideoCallCameraView.currentUserStatus())
#else
        resolve("idle")
#endif
    }

    // Resolves the SDK's own localized End Call button labels for the
    // device's current language, mirroring Android's identically-named
    // udentify_vc_button_end_call/udentify_vc_button_ending_call strings.
    @objc public func getLocalizedStrings(withResolver resolve: @escaping RCTPromiseResolveBlock,
                                        rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyCommons)
        let result: [String: Any] = [
            "endCallButtonLabel": "udentify_vc_button_end_call".localized(),
            "endCallButtonEndingLabel": "udentify_vc_button_ending_call".localized(),
        ]
#else
        let result: [String: Any] = [
            "endCallButtonLabel": "End Call",
            "endCallButtonEndingLabel": "Ending call...",
        ]
#endif
        resolve(result)
    }

    // MARK: - Control Methods

    // Microphone only. Camera control is deliberately absent: the Android SDK
    // exposes none, and a method that works on one platform is worse than no
    // method at all. Users switch the camera with the SDK's own in-call button.
    // Deprecated: iOS-only, and it bypasses the agent signal. Use
    // setMicrophoneEnabled(_:) instead.
    @available(*, deprecated, message: "Use setMicrophoneEnabled(_:) instead.")
    @objc public func toggleMicrophone(withResolver resolve: @escaping RCTPromiseResolveBlock,
                                     rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyCommons)
        resolve(VideoCallCameraView.toggleMicrophone())
#else
        resolve(false)
#endif
    }

    // Resolves whether the request was taken up (false = no active call), not whether the
    // microphone actually changed - that arrives as VideoCall_onMicrophoneStateChanged.
    @objc public func setMicrophoneEnabled(_ enabled: Bool,
                                           withResolver resolve: @escaping RCTPromiseResolveBlock,
                                           rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyCommons)
        resolve(VideoCallCameraView.setMicrophoneEnabled(enabled))
#else
        resolve(false)
#endif
    }

    @objc public func isMicrophoneEnabled(withResolver resolve: @escaping RCTPromiseResolveBlock,
                                          rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyCommons)
        resolve(VideoCallCameraView.isMicrophoneEnabled())
#else
        resolve(false)
#endif
    }

    @objc public func dismissVideoCall(withResolver resolve: @escaping RCTPromiseResolveBlock,
                                     rejecter reject: @escaping RCTPromiseRejectBlock) {
        endVideoCall(withResolver: resolve, rejecter: reject)
    }

    // Cancels an in-progress video call transaction on the server (e.g. user backs out
    // while the call is still ringing/connecting). Requires an active call, since it
    // relies on VideoCallCameraView's currently mounted instance. Unlike endVideoCall,
    // a failed cancel rejects and leaves the call up rather than ending it anyway.
    @objc public func cancelVideoCall(withResolver resolve: @escaping RCTPromiseResolveBlock,
                                    rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyCommons)
        guard VideoCallCameraView.hasActiveInstance else {
            reject("NO_ACTIVE_CALL", "No active video call to cancel", nil)
            return
        }

        performCancelVideoCall { success, error in
            if let error = error {
                reject("CANCEL_VIDEO_CALL_FAILED", error.localizedDescription, error)
            } else {
                resolve(["success": success])
            }
        }
#else
        reject("FRAMEWORK_NOT_AVAILABLE", "UdentifyCommons framework not available", nil)
#endif
    }
}

#if canImport(UdentifyCommons)
// MARK: - Video Call Operator Implementation

class VideoCallOperatorImpl: VCCameraControllerDelegate {
    let serverURL: String
    private let wssURL: String
    private let userID: String
    let transactionID: String
    private let clientName: String
    private let idleTimeout: String
    private weak var eventEmitter: RCTEventEmitter?

    private var currentStatus = "idle"
    // Last value sent as VideoCall_onStatusChanged; see emitStatus.
    private var lastEmittedStatus: String?

    init(serverURL: String, wssURL: String, userID: String, transactionID: String,
         clientName: String, idleTimeout: String, eventEmitter: RCTEventEmitter?) {
        self.serverURL = serverURL
        self.wssURL = wssURL
        self.userID = userID
        self.transactionID = transactionID
        self.clientName = clientName
        self.idleTimeout = idleTimeout
        self.eventEmitter = eventEmitter
    }

    func getStatus() -> String {
        return currentStatus
    }

    // MARK: - Coarse call status (VideoCall_onStatusChanged)

    // Derives the coarse status JS listens for from the finer-grained UserState;
    // see INTERNALS-REACT.md "iOS coarse call status (VideoCallManager.statusString)".
    private func statusString(for state: UserState) -> String {
        switch state {
        case .initiating:
            return "idle"
        case .tokenFetching, .tokenFetched, .connecting, .reconnecting:
            return "connecting"
        case .connected:
            return "connected"
        case .disconnected:
            return "disconnected"
        @unknown default:
            return "idle"
        }
    }

    // Emits only on an actual change, because several UserStates collapse to
    // one status - tokenFetching/tokenFetched/connecting are all "connecting",
    // and a "status changed" event that fires three times for the same value
    // would be noise JS has to dedupe itself.
    private func emitStatus(_ status: String) {
        guard status != lastEmittedStatus else { return }
        lastEmittedStatus = status
        eventEmitter?.sendEvent(withName: "VideoCall_onStatusChanged", body: ["status": status])
    }

    // MARK: - VCCameraControllerDelegate Implementation

    public func cameraController(_ controller: VideoCallCameraView, didChangeUserState state: UserState) {
        let stateString: String
        switch state {
        case .initiating:
            stateString = "initiating"
        case .tokenFetching:
            stateString = "tokenFetching"
        case .tokenFetched:
            stateString = "tokenFetched"
        case .connecting:
            stateString = "connecting"
        case .connected:
            stateString = "connected"
        case .disconnected:
            stateString = "disconnected"
        case .reconnecting:
            stateString = "reconnecting"
        @unknown default:
            stateString = "unknown"
        }

        currentStatus = stateString
        print("VideoCallOperatorImpl - User state changed: \(stateString)")
        eventEmitter?.sendEvent(withName: "VideoCall_onUserStateChanged", body: ["state": stateString])
        emitStatus(statusString(for: state))
    }

    public func cameraController(_ controller: VideoCallCameraView, participantType: ParticipantType, didChangeState state: ParticipantState) {
        let participantTypeString = participantType == .agent ? "agent" : "supervisor"
        let stateString: String

        switch state {
        case .connected:
            stateString = "connected"
        case .videoTrackActivated:
            stateString = "videoTrackActivated"
        case .videoTrackPaused:
            stateString = "videoTrackPaused"
        case .disconnected:
            stateString = "disconnected"
        @unknown default:
            stateString = "unknown"
        }

        print("VideoCallOperatorImpl - Participant \(participantTypeString) state changed: \(stateString)")
        eventEmitter?.sendEvent(withName: "VideoCall_onParticipantStateChanged", body: [
            "participantType": participantTypeString,
            "state": stateString
        ])
    }

    public func cameraController(_ controller: VideoCallCameraView, didFailWithError error: Error) {
        currentStatus = "error"
        print("VideoCallOperatorImpl - Error occurred: \(error.localizedDescription)")
        eventEmitter?.sendEvent(withName: "VideoCall_onError", body: [
            "type": Self.errorType(for: error),
            "message": error.localizedDescription
        ])
        emitStatus("failed")
    }

    // Permission failures get their own `type` rather than the catch-all ERR_SDK: they are
    // the one class of SDK error the app can actually act on (prompt, or send the user to
    // Settings), and that decision needs the specific reason, not a message string.
    private static func errorType(for error: Error) -> String {
        guard let vcError = error as? VCError else { return "ERR_SDK" }
        switch vcError {
        case .cameraPermissionRequired, .cameraPermissionDenied,
             .microphonePermissionRequired, .microphonePermissionDenied:
            return vcError.errorDescription ?? "ERR_SDK"
        default:
            return "ERR_SDK"
        }
    }

    public func cameraControllerDidDismiss(_ controller: VideoCallCameraView) {
        currentStatus = "dismissed"
        VideoCallScreenLock.releaseAll()
        // "disconnected" rather than "completed": a dismissal is exactly the
        // case where the SDK could not report a definitive result.
        emitStatus("disconnected")
        // A nil body can be silently dropped by RCTEventEmitter on some RN
        // versions/bridge configurations - every other sendEvent call here
        // passes a real dictionary, so match that instead of nil.
        eventEmitter?.sendEvent(withName: "VideoCall_onVideoCallDismissed", body: [:])
    }

    public func cameraControllerDidEndSessionSuccessfully(_ controller: VideoCallCameraView) {
        currentStatus = "ended"
        print("VideoCallOperatorImpl - Session ended successfully")
        VideoCallScreenLock.releaseAll()
        emitStatus("completed")
        eventEmitter?.sendEvent(withName: "VideoCall_onVideoCallEnded", body: ["success": true])
    }

    // Purely informational: a device phone call overlapping the video call
    // does not end the session (the SDK keeps the room connected while the
    // system call UI is in front), so `currentStatus` is deliberately left
    // alone here - only the app is notified.
    public func cameraController(_ controller: VideoCallCameraView, didChangePhoneCallState state: PhoneCallState) {
        let stateString: String
        switch state {
        case .incoming:
            stateString = "incoming"
        case .outgoing:
            stateString = "outgoing"
        case .connected:
            stateString = "connected"
        case .ended:
            stateString = "ended"
        @unknown default:
            stateString = "ended"
        }

        print("VideoCallOperatorImpl - Phone call state changed: \(stateString)")
        eventEmitter?.sendEvent(withName: "VideoCall_onPhoneCallStateChanged", body: ["state": stateString])
    }

    public func onScreenLocked() {
        print("VideoCallOperatorImpl - Screen has been locked")
        eventEmitter?.sendEvent(withName: "VideoCall_onScreenLocked", body: [:])
    }

    public func onScreenUnlocked() {
        print("VideoCallOperatorImpl - Screen has been unlocked")
        eventEmitter?.sendEvent(withName: "VideoCall_onScreenUnlocked", body: [:])
    }

    // Not a VCCameraControllerDelegate method: the SDK publishes microphone changes through
    // VideoCallCameraView.onMicrophoneStateChanged, which startIfReady() points at this.
    // Already de-duplicated there, so every call here is a real change.
    func onMicrophoneStateChanged(_ enabled: Bool) {
        print("VideoCallOperatorImpl - Microphone state changed: \(enabled)")
        eventEmitter?.sendEvent(withName: "VideoCall_onMicrophoneStateChanged", body: ["enabled": enabled])
    }
}
#endif
