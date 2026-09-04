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

// MARK: - CustomVideoCallSettings (Inline Implementation)

class CustomVideoCallSettings: NSObject {
  private let localizationBundle: Bundle
  private let uiConfig: [String: Any]?
  
  init(localizationBundle: Bundle, uiConfig: [String: Any]? = nil) {
    self.localizationBundle = localizationBundle
    self.uiConfig = uiConfig
    super.init()
  }
  
#if canImport(UdentifyCommons)
  func createVCSettings() -> VCSettings {
    // Helper function to convert hex string to UIColor
    func colorFromHex(_ hex: String?) -> UIColor? {
      guard let hex = hex, hex.hasPrefix("#"), hex.count == 7 else { return nil }
      let start = hex.index(hex.startIndex, offsetBy: 1)
      let hexColor = String(hex[start...])
      
      let scanner = Scanner(string: hexColor)
      var hexNumber: UInt64 = 0
      
      if scanner.scanHexInt64(&hexNumber) {
        let r = CGFloat((hexNumber & 0xff0000) >> 16) / 255
        let g = CGFloat((hexNumber & 0x00ff00) >> 8) / 255
        let b = CGFloat(hexNumber & 0x0000ff) / 255
        return UIColor(red: r, green: g, blue: b, alpha: 1.0)
      }
      return nil
    }
    
    // Parse UI configuration
    let backgroundColor = colorFromHex(uiConfig?["backgroundColor"] as? String) ?? .black
    let textColor = colorFromHex(uiConfig?["textColor"] as? String) ?? .white
    let pipBorderColor = colorFromHex(uiConfig?["pipViewBorderColor"] as? String) ?? .white
    
    // Create VCSettings with localization bundle and table name
    let settings = VCSettings(
      bundle: localizationBundle,
      tableName: getTableName(),
      backgroundColor: backgroundColor,
      backgroundStyle: nil,
      overlayImageStyle: nil,
      muteButtonStyle: VCMuteButtonStyle(),
      cameraSwitchButtonStyle: VCCameraSwitchButtonStyle(),
      pipViewStyle: UdentifyViewStyle(
        backgroundColor: .clear,
        borderColor: pipBorderColor,
        cornerRadius: 10,
        borderWidth: 2,
        horizontalSizing: .fixed(width: 120, horizontalPosition: .right(offset: 16)),
        verticalSizing: .fixed(height: 135, verticalPosition: .bottom(offset: 0))
      ),
      instructionLabelStyle: UdentifyTextStyle(
        font: UIFont.systemFont(ofSize: 20, weight: .medium),
        textColor: textColor,
        numberOfLines: 0,
        leading: 35,
        trailing: 35
      ),
      requestTimeout: getRequestTimeout()
    )
    
    return settings
  }
#endif
  
  // MARK: - Localization Methods
  
  func localizedString(forKey key: String, value: String? = nil, table: String? = nil) -> String {
    let result = localizationBundle.localizedString(forKey: key, value: value, table: table)
    if result != key {
      return result
    }
    
    // Fallback to main bundle
    return Bundle.main.localizedString(forKey: key, value: value, table: table)
  }
  
  // MARK: - Configuration Methods
  
  func getTableName() -> String? {
    return uiConfig?["tableName"] as? String
  }
  
  func getRequestTimeout() -> Double {
    return uiConfig?["requestTimeout"] as? Double ?? 30.0
  }
}

@objc(VideoCallManager)
public class VideoCallManager: NSObject {
    
    @objc public weak var eventEmitter: RCTEventEmitter?
    
#if canImport(UdentifyCommons)
    private var videoCallOperator: VideoCallOperatorImpl?
    private var videoCallViewController: UIViewController?
    private weak var endCallButton: UIButton?
#endif
    
    private var currentStatus = "idle"
    
    // Store UI configuration
    private var uiConfiguration: [String: Any]?
    
    @objc public init(eventEmitter: RCTEventEmitter) {
        super.init()
        self.eventEmitter = eventEmitter
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
        
        if let tableName = uiConfiguration?["tableName"] as? String {
            LocalizationConfiguration.tableName = tableName
        } else {
            LocalizationConfiguration.tableName = nil
        }
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
    
    @objc public func startVideoCall(withCredentials credentials: [String: Any], 
                                   resolver resolve: @escaping RCTPromiseResolveBlock, 
                                   rejecter reject: @escaping RCTPromiseRejectBlock) {
        print("VideoCallManager - Starting video call...")
#if canImport(UdentifyCommons)
        print("VideoCallManager - UdentifyVC framework available")
        guard let serverURL = credentials["serverURL"] as? String,
              let wssURL = credentials["wssURL"] as? String,
              let userID = credentials["userID"] as? String,
              let transactionID = credentials["transactionID"] as? String,
              let clientName = credentials["clientName"] as? String else {
            reject("MISSING_PARAMETERS", "Missing required parameters", nil)
            return
        }
        
        let idleTimeout = credentials["idleTimeout"] as? String ?? "30"
        
        // Create video call operator
        self.videoCallOperator = VideoCallOperatorImpl(
            serverURL: serverURL,
            wssURL: wssURL,
            userID: userID,
            transactionID: transactionID,
            clientName: clientName,
            idleTimeout: idleTimeout,
            eventEmitter: self.eventEmitter
        )
        
        // Create and present video call view controller
        DispatchQueue.main.async {
            // Create VCSettings using our custom localization settings
            let settings: VCSettings
            
            if let bundle = VideoCallBundleHelper.localizationBundle {
                let customSettings = CustomVideoCallSettings(
                    localizationBundle: bundle,
                    uiConfig: self.uiConfiguration
                )
                settings = customSettings.createVCSettings()
            } else {
                settings = VCSettings(
                    backgroundColor: .black,
                    backgroundStyle: nil,
                    overlayImageStyle: nil,
                    muteButtonStyle: VCMuteButtonStyle(),
                    cameraSwitchButtonStyle: VCCameraSwitchButtonStyle(),
                    pipViewStyle: UdentifyViewStyle(
                        backgroundColor: .clear,
                        borderColor: .white,
                        cornerRadius: 10,
                        borderWidth: 2,
                        horizontalSizing: .fixed(width: 120, horizontalPosition: .right(offset: 16)),
                        verticalSizing: .fixed(height: 135, verticalPosition: .bottom(offset: 0))
                    ),
                    instructionLabelStyle: UdentifyTextStyle(
                        font: UIFont.systemFont(ofSize: 20, weight: .medium),
                        textColor: .white,
                        numberOfLines: 0,
                        leading: 35,
                        trailing: 35
                    ),
                    requestTimeout: 30
                )
            }
            
            let videoCallViewController = VCCameraController(
                delegate: self.videoCallOperator!,
                serverURL: serverURL,
                wsURL: wssURL,
                transactionID: transactionID,
                username: clientName,
                idleTimeout: Int(idleTimeout) ?? 100,
                settings: settings,
                logLevel: .info
            )
            self.videoCallViewController = videoCallViewController
            
            if let viewController = UIApplication.shared.windows.first?.rootViewController {
                viewController.present(videoCallViewController, animated: true) {
                    self.addEndCallButton(to: videoCallViewController.view)
                    let resultMap: [String: Any] = [
                        "success": true,
                        "status": "connecting",
                        "transactionID": transactionID
                    ]
                    resolve(resultMap)
                }
            } else {
                reject("NO_VIEW_CONTROLLER", "No view controller available", nil)
            }
        }
#else
        print("VideoCallManager - ERROR: UdentifyCommons framework NOT available")
        reject("FRAMEWORK_NOT_AVAILABLE", "UdentifyCommons framework not available. Please ensure the UdentifyCommons dependency is properly configured.", nil)
#endif
    }

    @objc public func endVideoCall(withResolver resolve: @escaping RCTPromiseResolveBlock,
                                 rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyCommons)
        DispatchQueue.main.async {
            self.performEndVideoCall()
            let resultMap: [String: Any] = [
                "success": true,
                "status": "disconnected"
            ]
            resolve(resultMap)
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
    // Vendor's VCCameraController ships no client-facing hang-up control of its own
    // (only mute/camera-switch), so we overlay our own "End Call" button on top of its
    // view once presented. It calls cancelVideoCall (the SDK's own client-initiated
    // termination API, added in this SDK version) rather than the plain dismissController()
    // that endVideoCall(withResolver:) above uses, so the server is told the call was
    // ended by the client, not just that the local UI was torn down.
    private func addEndCallButton(to containerView: UIView) {
        let button = UIButton(type: .system)
        button.setTitle("End Call", for: .normal)
        button.setTitleColor(.white, for: .normal)
        button.titleLabel?.font = UIFont.boldSystemFont(ofSize: 16)
        button.backgroundColor = UIColor(red: 0.8, green: 0.0, blue: 0.0, alpha: 1.0)
        button.layer.cornerRadius = 8
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(handleEndCallButtonTapped), for: .touchUpInside)
        containerView.addSubview(button)
        NSLayoutConstraint.activate([
            button.centerXAnchor.constraint(equalTo: containerView.safeAreaLayoutGuide.centerXAnchor),
            button.bottomAnchor.constraint(equalTo: containerView.safeAreaLayoutGuide.bottomAnchor, constant: -32),
            button.widthAnchor.constraint(equalToConstant: 140),
            button.heightAnchor.constraint(equalToConstant: 48)
        ])
        endCallButton = button
    }

    @objc private func handleEndCallButtonTapped() {
        performCancelVideoCall { _, error in
            if let error = error {
                print("VideoCallManager - End Call button failed to cancel video call: \(error.localizedDescription)")
            }
        }
    }

    // Shared by the JS-invoked cancelVideoCall bridge method and the in-call End Call
    // button: posts the cancellation to the server via VCCameraController's currentInstance,
    // then tears down our local view controller/operator/button state.
    private func performCancelVideoCall(completion: @escaping (Bool, Error?) -> Void) {
        guard let operatorImpl = videoCallOperator else {
            completion(false, nil)
            return
        }

        VCCameraController.cancelVideoCall(
            serverUrl: operatorImpl.serverURL,
            transactionId: operatorImpl.transactionID
        ) { result in
            DispatchQueue.main.async {
                self.endCallButton?.removeFromSuperview()
                self.endCallButton = nil
                self.videoCallViewController = nil
                self.videoCallOperator = nil

                switch result {
                case .success(let success):
                    completion(success, nil)
                case .failure(let error):
                    completion(false, error)
                }
            }
        }
    }

    // Used by the JS-invoked endVideoCall/dismissVideoCall bridge methods: a plain local
    // teardown (no server call), distinct from performCancelVideoCall above.
    private func performEndVideoCall() {
        endCallButton?.removeFromSuperview()
        endCallButton = nil
        if let viewController = videoCallViewController as? VCCameraController {
            // Use the proper dismissController method from UdentifyVC SDK
            viewController.dismissController()
        }
        videoCallViewController = nil
        videoCallOperator = nil
    }
#endif
    
    @objc public func getVideoCallStatus(withResolver resolve: @escaping RCTPromiseResolveBlock, 
                                       rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyCommons)
        let status = videoCallOperator?.getStatus() ?? "idle"
        resolve(status)
#else
        resolve("idle")
#endif
    }
    
    // MARK: - Configuration Methods
    
    @objc public func configureUISettings(
        _ uiConfig: [String: Any],
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        // Store the UI configuration
        self.uiConfiguration = uiConfig
        
        // Re-apply localization settings with the new UI configuration
        setupLocalizationBundle()
        
        resolve(true)
    }
    
    @objc public func setVideoCallConfig(withConfig config: [String: Any], 
                                       resolver resolve: @escaping RCTPromiseResolveBlock, 
                                       rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyCommons)
        let backgroundColor = config["backgroundColor"] as? String
        let textColor = config["textColor"] as? String
        let pipViewBorderColor = config["pipViewBorderColor"] as? String
        let notificationLabelDefault = config["notificationLabelDefault"] as? String
        let notificationLabelCountdown = config["notificationLabelCountdown"] as? String
        let notificationLabelTokenFetch = config["notificationLabelTokenFetch"] as? String
        
        videoCallOperator?.setConfig(
            backgroundColor: backgroundColor,
            textColor: textColor,
            pipViewBorderColor: pipViewBorderColor,
            notificationLabelDefault: notificationLabelDefault,
            notificationLabelCountdown: notificationLabelCountdown,
            notificationLabelTokenFetch: notificationLabelTokenFetch
        )
        
        resolve(nil)
#else
        reject("FRAMEWORK_NOT_AVAILABLE", "UdentifyCommons framework not available", nil)
#endif
    }
    
    // MARK: - Control Methods
    
    @objc public func toggleCamera(withResolver resolve: @escaping RCTPromiseResolveBlock, 
                                 rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyCommons)
        let isEnabled = videoCallOperator?.toggleCamera() ?? false
        resolve(isEnabled)
#else
        resolve(false)
#endif
    }
    
    @objc public func switchCamera(withResolver resolve: @escaping RCTPromiseResolveBlock, 
                                 rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyCommons)
        let success = videoCallOperator?.switchCamera() ?? false
        resolve(success)
#else
        resolve(false)
#endif
    }
    
    @objc public func toggleMicrophone(withResolver resolve: @escaping RCTPromiseResolveBlock, 
                                     rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyCommons)
        let isEnabled = videoCallOperator?.toggleMicrophone() ?? false
        resolve(isEnabled)
#else
        resolve(false)
#endif
    }
    
    @objc public func dismissVideoCall(withResolver resolve: @escaping RCTPromiseResolveBlock,
                                     rejecter reject: @escaping RCTPromiseRejectBlock) {
        endVideoCall(withResolver: resolve, rejecter: reject)
    }

    // Cancels an in-progress video call transaction on the server (e.g. user backs out
    // while the call is still ringing/connecting, or taps the in-call End Call button
    // added below). Requires an active call, since it relies on VCCameraController's
    // currently presented instance.
    @objc public func cancelVideoCall(withResolver resolve: @escaping RCTPromiseResolveBlock,
                                    rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyCommons)
        guard videoCallOperator != nil else {
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
    
    // Configuration properties
    private var backgroundColor: String?
    private var textColor: String?
    private var pipViewBorderColor: String?
    private var notificationLabelDefault: String?
    private var notificationLabelCountdown: String?
    private var notificationLabelTokenFetch: String?
    
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
    
    func setConfig(backgroundColor: String?, textColor: String?, pipViewBorderColor: String?,
                   notificationLabelDefault: String?, notificationLabelCountdown: String?,
                   notificationLabelTokenFetch: String?) {
        self.backgroundColor = backgroundColor
        self.textColor = textColor
        self.pipViewBorderColor = pipViewBorderColor
        self.notificationLabelDefault = notificationLabelDefault
        self.notificationLabelCountdown = notificationLabelCountdown
        self.notificationLabelTokenFetch = notificationLabelTokenFetch
        
        // Configuration will be applied when creating VCSettings in startVideoCall method
        // Store these values to be used for creating custom VCSettings
    }
    
    func createVCSettings() -> VCSettings {
        // Use CustomVideoCallSettings if available
        if let bundle = VideoCallBundleHelper.localizationBundle {
            let customSettings = CustomVideoCallSettings(
                localizationBundle: bundle,
                uiConfig: [
                    "backgroundColor": backgroundColor ?? "#000000",
                    "textColor": textColor ?? "#FFFFFF",
                    "pipViewBorderColor": pipViewBorderColor ?? "#FFFFFF",
                    "tableName": "Localizable"
                ]
            )
            return customSettings.createVCSettings()
        }
        
        // Fallback to original implementation
        // Helper function to convert hex string to UIColor
        func colorFromHex(_ hex: String?) -> UIColor? {
            guard let hex = hex, hex.hasPrefix("#"), hex.count == 7 else { return nil }
            let start = hex.index(hex.startIndex, offsetBy: 1)
            let hexColor = String(hex[start...])
            
            let scanner = Scanner(string: hexColor)
            var hexNumber: UInt64 = 0
            
            if scanner.scanHexInt64(&hexNumber) {
                let r = CGFloat((hexNumber & 0xff0000) >> 16) / 255
                let g = CGFloat((hexNumber & 0x00ff00) >> 8) / 255
                let b = CGFloat(hexNumber & 0x0000ff) / 255
                return UIColor(red: r, green: g, blue: b, alpha: 1.0)
            }
            return nil
        }
        
        let bgColor = colorFromHex(backgroundColor) ?? .black
        let textColorParsed = colorFromHex(textColor) ?? .white
        let pipBorderColor = colorFromHex(pipViewBorderColor) ?? .white
        
        return VCSettings(
            backgroundColor: bgColor,
            backgroundStyle: nil,
            overlayImageStyle: nil,
            muteButtonStyle: VCMuteButtonStyle(),
            cameraSwitchButtonStyle: VCCameraSwitchButtonStyle(),
            pipViewStyle: UdentifyViewStyle(
                backgroundColor: .clear,
                borderColor: pipBorderColor,
                cornerRadius: 10,
                borderWidth: 2,
                horizontalSizing: .fixed(width: 120, horizontalPosition: .right(offset: 16)),
                verticalSizing: .fixed(height: 135, verticalPosition: .bottom(offset: 0))
            ),
            instructionLabelStyle: UdentifyTextStyle(
                font: UIFont.systemFont(ofSize: 20, weight: .medium),
                textColor: textColorParsed,
                numberOfLines: 0,
                leading: 35,
                trailing: 35
            ),
            requestTimeout: 30
        )
    }
    
    func toggleCamera() -> Bool {
        // Note: Based on UdentifyVC documentation, camera toggle is handled internally by the SDK
        // The VCCameraController manages camera state through its internal UI controls
        // This method returns true to indicate the feature is available, but actual control
        // is managed by the user through the VCCameraController UI
        return true
    }
    
    func switchCamera() -> Bool {
        // Note: Based on UdentifyVC documentation, camera switching is handled internally by the SDK
        // The VCCameraController provides a camera switch button in the UI
        // This method returns true to indicate the feature is available, but actual control
        // is managed by the user through the VCCameraController UI
        return true
    }
    
    func toggleMicrophone() -> Bool {
        // Note: Based on UdentifyVC documentation, microphone toggle is handled internally by the SDK
        // The VCCameraController provides a mute button in the UI
        // This method returns true to indicate the feature is available, but actual control
        // is managed by the user through the VCCameraController UI
        return true
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
        currentStatus = "error"
        print("VideoCallOperatorImpl - Error occurred: \(error.localizedDescription)")
        eventEmitter?.sendEvent(withName: "VideoCall_onError", body: [
            "type": "ERR_SDK",
            "message": error.localizedDescription
        ])
    }
    
    public func cameraControllerDidDismiss(_ controller: VCCameraController) {
        currentStatus = "dismissed"
        print("VideoCallOperatorImpl - Camera controller dismissed")
        eventEmitter?.sendEvent(withName: "VideoCall_onVideoCallDismissed", body: nil)
    }
    
    public func cameraControllerDidEndSessionSuccessfully(_ controller: VCCameraController) {
        currentStatus = "ended"
        print("VideoCallOperatorImpl - Session ended successfully")
        eventEmitter?.sendEvent(withName: "VideoCall_onVideoCallEnded", body: ["success": true])
    }
}
#endif
