import Foundation
import UIKit
import AVFoundation
import React

// Import UdentifyVC framework if available
#if canImport(UdentifyVC) && canImport(UdentifyCommons)
import UdentifyVC
import UdentifyCommons
#endif

@objc(VideoCallManager)
public class VideoCallManager: NSObject {
    
    @objc public weak var eventEmitter: RCTEventEmitter?
    
#if canImport(UdentifyVC) && canImport(UdentifyCommons)
    private var videoCallOperator: VideoCallOperatorImpl?
    private var videoCallViewController: UIViewController?
#endif
    
    private var currentStatus = "idle"
    
    @objc public init(eventEmitter: RCTEventEmitter) {
        super.init()
        self.eventEmitter = eventEmitter
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
#if canImport(UdentifyVC) && canImport(UdentifyCommons)
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
            // Create VCSettings with proper configuration based on stored config values
            let settings = self.videoCallOperator?.createVCSettings() ?? VCSettings(
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
        print("VideoCallManager - ERROR: UdentifyVC framework NOT available")
        reject("FRAMEWORK_NOT_AVAILABLE", "UdentifyVC framework not available. Please ensure the UdentifyVC dependency is properly configured.", nil)
#endif
    }
    
    @objc public func endVideoCall(withResolver resolve: @escaping RCTPromiseResolveBlock, 
                                 rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyVC) && canImport(UdentifyCommons)
        DispatchQueue.main.async {
            if let viewController = self.videoCallViewController as? VCCameraController {
                // Use the proper dismissController method from UdentifyVC SDK
                viewController.dismissController()
                self.videoCallViewController = nil
                self.videoCallOperator = nil
                
                let resultMap: [String: Any] = [
                    "success": true,
                    "status": "disconnected"
                ]
                resolve(resultMap)
            } else {
                let resultMap: [String: Any] = [
                    "success": true,
                    "status": "disconnected"
                ]
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
    
    @objc public func getVideoCallStatus(withResolver resolve: @escaping RCTPromiseResolveBlock, 
                                       rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyVC) && canImport(UdentifyCommons)
        let status = videoCallOperator?.getStatus() ?? "idle"
        resolve(status)
#else
        resolve("idle")
#endif
    }
    
    // MARK: - Configuration Methods
    
    @objc public func setVideoCallConfig(withConfig config: [String: Any], 
                                       resolver resolve: @escaping RCTPromiseResolveBlock, 
                                       rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyVC) && canImport(UdentifyCommons)
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
        reject("FRAMEWORK_NOT_AVAILABLE", "UdentifyVC framework not available", nil)
#endif
    }
    
    // MARK: - Control Methods
    
    @objc public func toggleCamera(withResolver resolve: @escaping RCTPromiseResolveBlock, 
                                 rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyVC) && canImport(UdentifyCommons)
        let isEnabled = videoCallOperator?.toggleCamera() ?? false
        resolve(isEnabled)
#else
        resolve(false)
#endif
    }
    
    @objc public func switchCamera(withResolver resolve: @escaping RCTPromiseResolveBlock, 
                                 rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyVC) && canImport(UdentifyCommons)
        let success = videoCallOperator?.switchCamera() ?? false
        resolve(success)
#else
        resolve(false)
#endif
    }
    
    @objc public func toggleMicrophone(withResolver resolve: @escaping RCTPromiseResolveBlock, 
                                     rejecter reject: @escaping RCTPromiseRejectBlock) {
#if canImport(UdentifyVC) && canImport(UdentifyCommons)
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
}

#if canImport(UdentifyVC) && canImport(UdentifyCommons)
// MARK: - Video Call Operator Implementation

class VideoCallOperatorImpl: VCCameraControllerDelegate {
    private let serverURL: String
    private let wssURL: String
    private let userID: String
    private let transactionID: String
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
