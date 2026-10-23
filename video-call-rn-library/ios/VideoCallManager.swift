import Foundation
import UIKit
import AVFoundation
import React

// Import UdentifyCommons framework and UdentifyVC source files are included directly
#if canImport(UdentifyCommons)
import UdentifyCommons
import udentify_core
#endif
#if canImport(UdentifyVC)
import UdentifyVC
#endif

// Import our localization helpers
// Note: These are defined in the same module, so no import needed

// Until 26.3.0917 UdentifyVC shipped as loose Swift sources that included this
// extension; the 26.3.0923 binary does not export it, so the two call sites in
// getLocalizedStrings() keep it here. It resolves through UdentifyCommons
// exactly as the SDK's own copy did.
#if canImport(UdentifyCommons) && canImport(UdentifyVC)
private extension String {
    func localized() -> String {
        return udtfy.localized(in: LocalizationConfiguration.tableName,
                               bundle: LocalizationConfiguration.bundle)
    }
}
#endif

// MARK: - VideoCallBundleHelper (Inline Implementation)

@objc
class VideoCallBundleHelper: NSObject {
  static var localizationBundle: Bundle?

  @objc static func setupLocalizationBundle(_ bundle: Bundle) {
    // Stored whole. The narrowing to the app's selected language happens where
    // the bundle is used, in RNVideoCallHostView.startIfReady: this runs at
    // module init, long before the app has chosen a language, so narrowing here
    // would always be a no-op.
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

    // Lets RNVideoCallHostView (created by VideoCallViewManager when JS mounts
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
            guard let host = RNVideoCallHostView.active else {
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

                // The SDK's "nothing to cancel" is not a failure: the call was already gone.
                let alreadyGone = error?.localizedDescription == Self.noActiveCallMessage
                if !success && !alreadyGone {
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
                host.teardown()
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
    private static let noActiveCallMessage = "No active call instance to cancel."

    // Shared by endVideoCall above and by the JS-invoked cancelVideoCall bridge
    // method. The server URL and transaction id come from the mounted host,
    // which took them from the `credentials` prop. `false` with a nil error
    // means the call was already gone.
    private func performCancelVideoCall(completion: @escaping (Bool, Error?) -> Void) {
        guard let host = RNVideoCallHostView.active,
              let serverURL = host.activeServerURL,
              let transactionID = host.activeTransactionID else {
            completion(false, nil)
            return
        }

        host.isCancelling = true
        VCCameraController.cancelVideoCall(
            serverUrl: serverURL,
            transactionId: transactionID
        ) { result in
            DispatchQueue.main.async {
                host.isCancelling = false
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
        resolve(RNVideoCallHostView.active?.currentStatus ?? "idle")
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
        // 26.3.0923 removed the SDK's own toggle. This deprecated JS entry point
        // stays working by expressing it through the supported pair, which also
        // notifies the operator console - the very thing the deprecation note
        // says the toggle failed to do.
        DispatchQueue.main.async {
            let enabled = !VCCameraController.isMicrophoneEnabled()
            resolve(VCCameraController.setMicrophoneEnabled(enabled) ? enabled : !enabled)
        }
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
        DispatchQueue.main.async { resolve(VCCameraController.setMicrophoneEnabled(enabled)) }
#else
        resolve(false)
#endif
    }

    @objc public func isMicrophoneEnabled(withResolver resolve: @escaping RCTPromiseResolveBlock,
                                          rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyCommons)
        DispatchQueue.main.async { resolve(VCCameraController.isMicrophoneEnabled()) }
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
        DispatchQueue.main.async {
            guard RNVideoCallHostView.active != nil else {
                reject("NO_ACTIVE_CALL", "No active video call to cancel", nil)
                return
            }

            self.performCancelVideoCall { success, error in
                if let error = error, error.localizedDescription != Self.noActiveCallMessage {
                    reject("CANCEL_VIDEO_CALL_FAILED", error.localizedDescription, error)
                } else {
                    resolve(["success": success])
                }
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
    private weak var emitter: RCTEventEmitter?

    // The host view is gone (RNVideoCallHostView.teardown), and this bridge only lives on to
    // receive a dismissal the SDK had not reported yet.
    var isRetired = false
    // A retired call whose place a newer call has taken: its late callbacks must neither read
    // as the newer call's events nor drop the newer call's screen-lock hold.
    private var isSuperseded: Bool { isRetired && RNVideoCallHostView.active != nil }
    private var eventEmitter: RCTEventEmitter? { isSuperseded ? nil : emitter }
    // cameraControllerDidDismiss has arrived.
    private(set) var hasDismissed = false
    // Run once after the dismissal is handled; the host lets go of a retired controller with it.
    var onDismissed: (() -> Void)?

    private var currentStatus = "idle"
    // The call has ended with a result (the agent ended it, or it failed): a later
    // "disconnected" must not replace that status. The SDK always reports a dismissal after.
    private var hasResult = false
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
        self.emitter = eventEmitter
    }

    func getStatus() -> String {
        return currentStatus
    }

    // MARK: - Coarse call status (VideoCall_onStatusChanged)

    // Derives the coarse status JS listens for from the finer-grained
    // UserState. Several states collapse onto one status on purpose:
    // tokenFetching, tokenFetched, connecting and reconnecting are all
    // "connecting", because an app's UI has nothing different to do for them.
    // An app that needs the distinction reads onUserStateChanged, which carries
    // the SDK's own state verbatim.
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
        if status == "disconnected" && hasResult { return }
        lastEmittedStatus = status
        eventEmitter?.sendEvent(withName: "VideoCall_onStatusChanged", body: ["status": status])
    }

    // MARK: - LiveKYC

    // Bridges VCLiveKYCEvent onto the same VideoCall_onRepeat* events Android
    // emits, so one JS contract covers both. VCLiveKYCModule's raw values are
    // "OCR"/"NFC"/"FACE"/"HOLOGRAM" and are forwarded untouched. VCLiveKYCEvent
    // is non-frozen, so keep @unknown default or this stops building next drop.
    func handleLiveKYCEvent(_ event: VCLiveKYCEvent) {
        // Every other delegate callback in this class prints, and those prints
        // are the only window into a call: the SDK's own logger is not part of
        // its public API. LiveKYC's onEvent was the one silent path, which made
        // "did the SDK call us?" and "did nothing happen?" indistinguishable in
        // a device log. It carries diagnostic cases the JS contract deliberately
        // drops, so print them all and emit only the four events Android also
        // emits.
        print("VideoCallOperatorImpl - LiveKYC event: \(Self.describe(event))")

        switch event {
        case .moduleStarted(let module):
            eventEmitter?.sendEvent(withName: "VideoCall_onRepeatStarted",
                                    body: ["role": module.rawValue])
        case .moduleCompleted(let module):
            // Android emits a result before the end-of-repeat event; mirror that
            // ordering so a JS handler written for Android behaves the same here.
            eventEmitter?.sendEvent(withName: "VideoCall_onRepeatResult",
                                    body: ["role": module.rawValue])
            emitRepeatEnded(module: module, outcome: "COMPLETED", reason: nil)
        case .moduleCancelled(let module):
            emitRepeatEnded(module: module, outcome: "CANCELLED", reason: nil)
        case .moduleFailed(let module, let code, let description):
            // The SDK reports a cancel as a failure with a CANCELLED_* code; JS gets
            // CANCELLED, as on Android, with the code kept as the reason.
            let cancelled = code == .cancelledByUser || code == .cancelledByAgent
                || code == .cancelledByHost
            emitRepeatEnded(module: module, outcome: cancelled ? "CANCELLED" : "FAILED",
                            reason: "\(code.rawValue): \(description)")
        case .nfcProgress(let percent):
            // live-kyc.md, "Showing NFC Progress": the chip read is the one step
            // with no camera and "the SDK ships no NFC UI, so provide your own
            // status view and drive it from the events". Without this the app
            // cannot build that view at all. The value is passed through as the
            // SDK reports it - 0...99, repeats already filtered, and never 100,
            // because completion is moduleCompleted(.nfc).
            eventEmitter?.sendEvent(withName: "VideoCall_onNfcProgress",
                                    body: ["percent": percent])
        default:
            // Everything else is diagnostic - signals, capabilities, per-module
            // progress, screen-share lifecycle. None of it is surfaced to JS
            // today. Adding one is a public API decision, not a local change:
            // it becomes a contract customers write against, so decide the
            // event name and payload deliberately before wiring it up.
            break
        }
    }

    /// A one-line rendering of a LiveKYC event for the device console. Kept
    /// exhaustive on purpose: an event that shows up as "unknown" here is a new
    /// case the vendor added, which is worth noticing.
    private static func describe(_ event: VCLiveKYCEvent) -> String {
        switch event {
        case .liveKYCStarted(let mode):
            return "liveKYCStarted(observationMode: \(mode.rawValue))"
        // Payload values are never printed: an agent's request can carry the customer's
        // document data. The key names are enough to see what arrived.
        case .signalSent(let type, let payload):
            return "signalSent(type: \(type), payloadKeys: \(payload.keys.sorted()))"
        case .signalReceived(let type, let payload):
            return "signalReceived(type: \(type), payloadKeys: \(payload.keys.sorted()))"
        case .moduleStarted(let module):
            return "moduleStarted(\(module.rawValue))"
        case .moduleProgress(let module, let step):
            return "moduleProgress(\(module.rawValue), step: \(step))"
        case .nfcProgress(let percent):
            return "nfcProgress(\(percent)%)"
        case .moduleUIFinished(let module):
            return "moduleUIFinished(\(module.rawValue))"
        case .moduleCompleted(let module):
            return "moduleCompleted(\(module.rawValue))"
        case .moduleFailed(let module, let code, let description):
            return "moduleFailed(\(module.rawValue), code: \(code.rawValue), description: \(description))"
        case .moduleCancelled(let module):
            return "moduleCancelled(\(module.rawValue))"
        case .busyRejected(let requested):
            return "busyRejected(requested: \(requested.rawValue))"
        case .screenShareStarted:
            return "screenShareStarted"
        case .screenShareFailed(let reason, let description):
            return "screenShareFailed(reason: \(reason.rawValue), description: \(description))"
        case .liveKYCEnded:
            return "liveKYCEnded"
        case .diagnostic(let name, let info):
            return "diagnostic(name: \(name), info: \(info))"
        @unknown default:
            return "unknown event"
        }
    }

    private func emitRepeatEnded(module: VCLiveKYCModule, outcome: String, reason: String?) {
        var body: [String: Any] = ["role": module.rawValue, "outcome": outcome]
        if let reason = reason { body["reason"] = reason }
        eventEmitter?.sendEvent(withName: "VideoCall_onRepeatEnded", body: body)
    }

    // MARK: - VCCameraControllerDelegate Implementation

    public func cameraController(_ controller: VCCameraController, didChangeUserState state: UserState) {
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

        // video-call.md, Background Behavior: onMicrophoneStateChanged "only
        // fires on an actual change", and after the app returns from the
        // background "if the room is still reconnecting ... the microphone state
        // is not restored and onMicrophoneStateChanged does not fire, so re-seed
        // your UI from isMicrophoneEnabled() when UserState.connected is
        // reported again". Re-reading the SDK's own value covers both the first
        // connect and every reconnect; nothing is inferred here.
        if case .connected = state {
            onMicrophoneStateChanged(VCCameraController.isMicrophoneEnabled())
        }
    }

    public func cameraController(_ controller: VCCameraController, participantType: ParticipantType, didChangeState state: ParticipantState) {
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

    public func cameraController(_ controller: VCCameraController, didFailWithError error: Error) {
        print("VideoCallOperatorImpl - Error occurred: \(error.localizedDescription)")
        eventEmitter?.sendEvent(withName: "VideoCall_onError", body: [
            "type": Self.errorType(for: error),
            "message": error.localizedDescription
        ])

        // Not every error ends the call. video-call.md and live-kyc.md both say
        // of ERR_LIVEKYC_SCREEN_RECORDING_PERMISSION_DENIED: "It is
        // informational. Do not end the call on it" - the call continues
        // camera-only with screen sharing off. Reporting "failed" here would
        // tell JS the call died while it is still running, so the error is
        // surfaced and the status left alone.
        guard !Self.isInformational(error) else { return }

        currentStatus = "error"
        hasResult = true
        emitStatus("failed")
    }

    /// Errors the SDK reports for information, which leave the call running.
    private static func isInformational(_ error: Error) -> Bool {
        guard let vcError = error as? VCError else { return false }
        if case .screenRecordingPermissionDenied = vcError { return true }
        return false
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

    public func cameraControllerDidDismiss(_ controller: VCCameraController) {
        hasDismissed = true
        currentStatus = "dismissed"
        print("VideoCallOperatorImpl - Dismissed")
        if !isSuperseded { VideoCallScreenLock.releaseAll() }
        // "disconnected" when the SDK reported no result of its own; emitStatus keeps
        // an earlier "completed" or "failed".
        emitStatus("disconnected")
        // A nil body can be silently dropped by RCTEventEmitter on some RN
        // versions/bridge configurations - every other sendEvent call here
        // passes a real dictionary, so match that instead of nil.
        eventEmitter?.sendEvent(withName: "VideoCall_onVideoCallDismissed", body: [:])
        // Next turn of the run loop, so this call is not still running when the host lets go of us.
        if let done = onDismissed {
            onDismissed = nil
            DispatchQueue.main.async(execute: done)
        }
    }

    public func cameraControllerDidEndSessionSuccessfully(_ controller: VCCameraController) {
        currentStatus = "ended"
        hasResult = true
        print("VideoCallOperatorImpl - Session ended successfully")
        if !isSuperseded { VideoCallScreenLock.releaseAll() }
        emitStatus("completed")
        eventEmitter?.sendEvent(withName: "VideoCall_onVideoCallEnded", body: ["success": true])
    }

    // Purely informational: a device phone call overlapping the video call
    // does not end the session (the SDK keeps the room connected while the
    // system call UI is in front), so `currentStatus` is deliberately left
    // alone here - only the app is notified.
    public func cameraController(_ controller: VCCameraController, didChangePhoneCallState state: PhoneCallState) {
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

    // The media server's reading of one side's link, on changes only. `isLocal` is this
    // device, false is the operator. Upper-case names, so JS shares one enum with Android.
    public func cameraController(_ controller: VCCameraController, didChangeConnectionQuality quality: VCConnectionQuality, isLocal: Bool) {
        let qualityString: String
        switch quality {
        case .excellent:
            qualityString = "EXCELLENT"
        case .good:
            qualityString = "GOOD"
        case .poor:
            qualityString = "POOR"
        case .lost:
            qualityString = "LOST"
        case .unknown:
            qualityString = "UNKNOWN"
        @unknown default:
            qualityString = "UNKNOWN"
        }

        print("VideoCallOperatorImpl - Connection quality changed: \(qualityString) isLocal=\(isLocal)")
        eventEmitter?.sendEvent(withName: "VideoCall_onConnectionQualityChanged",
                                body: ["quality": qualityString, "isLocal": isLocal])
    }

    // A console signal the SDK does not act on, as its raw wire string. Passed on as
    // received, never parsed.
    public func cameraController(_ controller: VCCameraController, didRelaySignal signalType: String) {
        print("VideoCallOperatorImpl - Signal relayed: \(signalType)")
        eventEmitter?.sendEvent(withName: "VideoCall_onSignalRelayed", body: ["signalType": signalType])
    }

    // Not a VCCameraControllerDelegate method: the SDK publishes microphone changes through
    // VCCameraController.onMicrophoneStateChanged, which startIfReady() points at this.
    // Already de-duplicated there, so every call here is a real change.
    func onMicrophoneStateChanged(_ enabled: Bool) {
        print("VideoCallOperatorImpl - Microphone state changed: \(enabled)")
        eventEmitter?.sendEvent(withName: "VideoCall_onMicrophoneStateChanged", body: ["enabled": enabled])
    }
}
#endif
