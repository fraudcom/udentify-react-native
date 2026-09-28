import Foundation
import UIKit
import AVFoundation
import UdentifyFACE
import udentify_core
import UdentifyCommons

@objc(LivenessManager)
class LivenessManager: NSObject {

    /// The settings the app last configured, kept so LiveKYC's in-call face
    /// screen can be given the same ones. `nil` until the app calls
    /// `configureUISettings`, and while it is nil the SDK keeps its own
    /// appearance - the wrapper contributes no defaults of its own.
    private var lastConfiguredSettings: CustomAPISettings?


    /// Hands LiveKYC's in-call face screen the same settings the standalone
    /// flows use. Settings are read when the closure runs, so a configuration
    /// applied later still reaches the next in-call capture.
    private func publishLiveKYCInstaller() {
        Self.publishInstaller()
    }

    /// Publishes the face installer without needing a `LivenessManager`, from
    /// `LivenessModule`'s launch hook - an app that drives LiveKYC from a video
    /// call never calls the liveness JS module, so the manager may not exist.
    @objc static func publishInstaller() {
        UdentifyLiveKYCModuleSettings.installFaceSettings = {
            // The app's styling when it configured any, otherwise the SDK's own
            // appearance. Either way the bundle is narrowed to the selected
            // language, which is the part that must not depend on whether the
            // app happens to have styled the face screens.
            let settings = shared?.lastConfiguredSettings
                ?? CustomAPISettings(configs: Self.languageOnlyConfigs())
            ApiSettingsProvider.getInstance().currentSettings = settings
        }
    }

    /// `ApiConfigs` left at every SDK default except the localization bundle.
    private static func languageOnlyConfigs() -> ApiConfigs {
        let sdk = ApiConfigs()
        return ApiConfigs(
            cameraPosition: sdk.cameraPosition,
            autoTake: sdk.autoTake,
            errorDelay: sdk.errorDelay,
            successDelay: sdk.successDelay,
            bundle: UdentifyLanguagePreference.localizedBundle(
                for: Bundle(for: ApiSettingsProvider.self)),
            tableName: sdk.tableName,
            maskDetection: sdk.maskDetection,
            maskConfidence: sdk.maskConfidence,
            invertedAnimation: sdk.invertedAnimation,
            backButtonEnabled: sdk.backButtonEnabled,
            multipleFacesRejected: sdk.multipleFacesRejected,
            buttonHeight: sdk.buttonHeight,
            buttonMarginLeft: sdk.buttonMarginLeft,
            buttonMarginRight: sdk.buttonMarginRight,
            buttonCornerRadius: sdk.buttonCornerRadius,
            progressBarStyle: sdk.progressBarStyle,
            activeLivenessConfig: sdk.activeLivenessConfig,
            faceLivenessProcessDuration: sdk.faceLivenessProcessDuration)
    }

    /// The most recently created manager, so the launch-time installer can
    /// still pick up a configuration the app applied later.
    private static weak var shared: LivenessManager?
    
    weak var eventEmitter: RCTEventEmitter?
    private var currentFaceIDViewController: UIViewController?
    private var currentIDCameraController: IDCameraController? // For API calls with captured images
    private var isInProgress = false
    
    @objc init(eventEmitter: RCTEventEmitter) {
        self.eventEmitter = eventEmitter
        super.init()
        LivenessManager.shared = self
        publishLiveKYCInstaller()
    }
    
    // MARK: - Permission Management
    
    @objc func checkPermissions(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            let cameraStatus = self.getCameraPermissionStatus()
            
            let result: [String: Any] = [
                "camera": cameraStatus,
                "readPhoneState": "granted", // Not applicable on iOS
                "internet": "granted" // Not applicable on iOS
            ]
            
            resolve(result)
        }
    }
    
    @objc func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    let cameraStatus = self.getCameraPermissionStatus()
                    
                    let result: [String: Any] = [
                        "camera": cameraStatus,
                        "readPhoneState": "granted", // Not applicable on iOS
                        "internet": "granted" // Not applicable on iOS
                    ]
                    
                    resolve(result)
                }
            }
        }
    }
    
    private func getCameraPermissionStatus() -> String {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            return "granted"
        case .denied:
            return "denied"
        case .restricted:
            return "denied"
        case .notDetermined:
            return "unknown"
        @unknown default:
            return "unknown"
        }
    }
    
    // MARK: - Camera-based Face Recognition
    
    @objc func startFaceRecognitionRegistration(_ credentials: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("LivenessManager - 🔄 Starting face recognition registration")
        
        guard !isInProgress else {
            reject("OPERATION_IN_PROGRESS", "Face recognition operation already in progress", nil)
            return
        }
        
        guard let parsedCredentials = parseFaceRecognizerCredentials(credentials) else {
            reject("INVALID_CREDENTIALS", "Invalid face recognizer credentials", nil)
            return
        }
        
        guard let serverURL = parsedCredentials["serverURL"] as? String,
              let transactionID = parsedCredentials["transactionID"] as? String else {
            reject("INVALID_CREDENTIALS", "Missing required serverURL or transactionID", nil)
            return
        }
        
        DispatchQueue.main.async {
            self.isInProgress = true
            
            NSLog("LivenessManager - ✅ Using UdentifyFACE SDK for registration")
            
            let userID = parsedCredentials["userID"] as? String
            let logLevel = UdentifyCommons.LogLevel.warning
            
            IDCameraController.instantiate(
                serverURL: serverURL,
                method: .registration,
                transactionID: transactionID,
                userID: userID,
                listName: nil,
                logLevel: logLevel
            ) { [weak self] controller, error in
                guard let self = self else { return }
                
                if let error = error {
                    self.isInProgress = false
                    reject("INITIALIZATION_FAILED", "Failed to initialize face recognition: \(error.localizedDescription)", nil)
                    return
                }
                
                guard let controller = controller,
                      let rootViewController = UIApplication.shared.windows.first?.rootViewController else {
                    self.isInProgress = false
                    reject("NO_VIEW_CONTROLLER", "Could not find root view controller", nil)
                    return
                }
                
                controller.delegate = self
                self.currentFaceIDViewController = controller
                rootViewController.present(controller, animated: true)
                
                let result: [String: Any] = [
                    "status": "success",
                    "faceIDMessage": [
                        "success": true,
                        "message": "Face recognition registration started"
                    ]
                ]
                resolve(result)
            }
        }
    }
    
    @objc func startFaceRecognitionAuthentication(_ credentials: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("LivenessManager - 🔄 Starting face recognition authentication")
        
        guard !isInProgress else {
            reject("OPERATION_IN_PROGRESS", "Face recognition operation already in progress", nil)
            return
        }
        
        guard let parsedCredentials = parseFaceRecognizerCredentials(credentials) else {
            reject("INVALID_CREDENTIALS", "Invalid face recognizer credentials", nil)
            return
        }
        
        guard let serverURL = parsedCredentials["serverURL"] as? String,
              let transactionID = parsedCredentials["transactionID"] as? String else {
            reject("INVALID_CREDENTIALS", "Missing required serverURL or transactionID", nil)
            return
        }
        
        DispatchQueue.main.async {
            self.isInProgress = true
            
            NSLog("LivenessManager - ✅ Using UdentifyFACE SDK for authentication")
            
            let userID = parsedCredentials["userID"] as? String
            let logLevel = UdentifyCommons.LogLevel.warning
            
            IDCameraController.instantiate(
                serverURL: serverURL,
                method: .authentication,
                transactionID: transactionID,
                userID: userID,
                listName: nil,
                logLevel: logLevel
            ) { [weak self] controller, error in
                guard let self = self else { return }
                
                if let error = error {
                    self.isInProgress = false
                    reject("INITIALIZATION_FAILED", "Failed to initialize face recognition: \(error.localizedDescription)", nil)
                    return
                }
                
                guard let controller = controller,
                      let rootViewController = UIApplication.shared.windows.first?.rootViewController else {
                    self.isInProgress = false
                    reject("NO_VIEW_CONTROLLER", "Could not find root view controller", nil)
                    return
                }
                
                controller.delegate = self
                self.currentFaceIDViewController = controller
                rootViewController.present(controller, animated: true)
                
                let result: [String: Any] = [
                    "status": "success",
                    "faceIDMessage": [
                        "success": true,
                        "message": "Face recognition authentication started"
                    ]
                ]
                resolve(result)
            }
        }
    }
    
    // MARK: - Liveness Detection
    
    @objc func startActiveLiveness(_ credentials: NSDictionary, isAuthentication: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("LivenessManager - 🔄 Starting active liveness detection (isAuth: \(isAuthentication))")
        
        guard !isInProgress else {
            reject("OPERATION_IN_PROGRESS", "Liveness operation already in progress", nil)
            return
        }
        
        guard let parsedCredentials = parseFaceRecognizerCredentials(credentials) else {
            reject("INVALID_CREDENTIALS", "Invalid face recognizer credentials", nil)
            return
        }
        
        guard let serverURL = parsedCredentials["serverURL"] as? String,
              let transactionID = parsedCredentials["transactionID"] as? String,
              let userID = parsedCredentials["userID"] as? String else {
            reject("INVALID_CREDENTIALS", "Missing required serverURL, transactionID, or userID", nil)
            return
        }
        
        DispatchQueue.main.async {
            self.isInProgress = true
            
            NSLog("LivenessManager - ✅ Using UdentifyFACE SDK for active liveness")
            
            let hybridLivenessEnabled = parsedCredentials["hybridLivenessEnabled"] as? Bool ?? false
            let autoNextEnabled = parsedCredentials["activeLivenessAutoNextEnabled"] as? Bool ?? true
            let logLevel = UdentifyCommons.LogLevel.warning
            
            // Use the isAuthentication parameter to determine method
            NSLog("LivenessManager - 🎯 Using method: \(isAuthentication ? "authentication" : "registration") (isAuthentication: \(isAuthentication))")
            
            ActiveCameraController.instantiate(
                serverURL: serverURL,
                method: isAuthentication ? .authentication : .registration,
                transactionID: transactionID,
                userID: userID,
                hybridLivenessEnabled: hybridLivenessEnabled,
                autoNextEnabled: autoNextEnabled,
                logLevel: logLevel
            ) { [weak self] controller, error in
                guard let self = self else { return }
                
                if let error = error {
                    self.isInProgress = false
                    reject("INITIALIZATION_FAILED", "Failed to initialize active liveness: \(error.localizedDescription)", nil)
                    return
                }
                
                guard let controller = controller,
                      let rootViewController = UIApplication.shared.windows.first?.rootViewController else {
                    self.isInProgress = false
                    reject("NO_VIEW_CONTROLLER", "Could not find root view controller", nil)
                    return
                }
                
                controller.delegate = self
                self.currentFaceIDViewController = controller
                rootViewController.present(controller, animated: true)
                
                let result: [String: Any] = [
                    "status": "success",
                    "faceIDMessage": [
                        "success": true,
                        "message": "Active liveness detection started"
                    ]
                ]
                resolve(result)
            }
        }
    }
    
    @objc func startHybridLiveness(_ credentials: NSDictionary, isAuthentication: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("LivenessManager - 🔄 Starting hybrid liveness detection (isAuth: \(isAuthentication))")
        
        guard !isInProgress else {
            reject("OPERATION_IN_PROGRESS", "Liveness operation already in progress", nil)
            return
        }
        
        guard let parsedCredentials = parseFaceRecognizerCredentials(credentials) else {
            reject("INVALID_CREDENTIALS", "Invalid face recognizer credentials", nil)
            return
        }
        
        guard let serverURL = parsedCredentials["serverURL"] as? String,
              let transactionID = parsedCredentials["transactionID"] as? String,
              let userID = parsedCredentials["userID"] as? String else {
            reject("INVALID_CREDENTIALS", "Missing required serverURL, transactionID, or userID", nil)
            return
        }
        
        DispatchQueue.main.async {
            self.isInProgress = true
            
            NSLog("LivenessManager - ✅ Using UdentifyFACE SDK for hybrid liveness")
            
            let autoNextEnabled = parsedCredentials["activeLivenessAutoNextEnabled"] as? Bool ?? true
            let logLevel = UdentifyCommons.LogLevel.warning
            
            // Use ActiveCameraController with hybrid liveness enabled
            // Use the isAuthentication parameter to determine method
            NSLog("LivenessManager - 🎯 Using method: \(isAuthentication ? "authentication" : "registration") (isAuthentication: \(isAuthentication))")
            
            ActiveCameraController.instantiate(
                serverURL: serverURL,
                method: isAuthentication ? .authentication : .registration,
                transactionID: transactionID,
                userID: userID,
                hybridLivenessEnabled: true, // This enables hybrid liveness
                autoNextEnabled: autoNextEnabled,
                logLevel: logLevel
            ) { [weak self] controller, error in
                guard let self = self else { return }
                
                if let error = error {
                    self.isInProgress = false
                    reject("INITIALIZATION_FAILED", "Failed to initialize hybrid liveness: \(error.localizedDescription)", nil)
                    return
                }
                
                guard let controller = controller,
                      let rootViewController = UIApplication.shared.windows.first?.rootViewController else {
                    self.isInProgress = false
                    reject("NO_VIEW_CONTROLLER", "Could not find root view controller", nil)
                    return
                }
                
                controller.delegate = self
                self.currentFaceIDViewController = controller
                rootViewController.present(controller, animated: true)
                
                let result: [String: Any] = [
                    "status": "success",
                    "faceIDMessage": [
                        "success": true,
                        "message": "Hybrid liveness detection started"
                    ]
                ]
                resolve(result)
            }
        }
    }
    
    // MARK: - Selfie Capture
    
    @objc func startSelfieCapture(_ credentials: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("LivenessManager - 🔄 Starting selfie capture")
        
        guard !isInProgress else {
            reject("OPERATION_IN_PROGRESS", "Face recognition operation already in progress", nil)
            return
        }
        
        guard let parsedCredentials = parseFaceRecognizerCredentials(credentials) else {
            reject("INVALID_CREDENTIALS", "Invalid face recognizer credentials", nil)
            return
        }
        
        guard let serverURL = parsedCredentials["serverURL"] as? String,
              let transactionID = parsedCredentials["transactionID"] as? String else {
            reject("INVALID_CREDENTIALS", "Missing required serverURL or transactionID", nil)
            return
        }
        
        DispatchQueue.main.async {
            self.isInProgress = true
            
            NSLog("LivenessManager - ✅ Using UdentifyFACE SDK for selfie capture")
            
            let userID = parsedCredentials["userID"] as? String
            let logLevel = UdentifyCommons.LogLevel.warning
            
            // Use .selfie method for photo capture only
            IDCameraController.instantiate(
                serverURL: serverURL,
                method: .selfie,
                transactionID: transactionID,
                userID: userID,
                listName: nil,
                logLevel: logLevel
            ) { [weak self] controller, error in
                guard let self = self else { return }
                
                if let error = error {
                    self.isInProgress = false
                    reject("INITIALIZATION_FAILED", "Failed to initialize selfie capture: \(error.localizedDescription)", nil)
                    return
                }
                
                guard let controller = controller,
                      let rootViewController = UIApplication.shared.windows.first?.rootViewController else {
                    self.isInProgress = false
                    reject("NO_VIEW_CONTROLLER", "Could not find root view controller", nil)
                    return
                }
                
                controller.delegate = self
                self.currentFaceIDViewController = controller
                rootViewController.present(controller, animated: true)
                
                let result: [String: Any] = [
                    "status": "success",
                    "faceIDMessage": [
                        "success": true,
                        "message": "Selfie capture started"
                    ]
                ]
                resolve(result)
            }
        }
    }
    
    @objc func performFaceRecognitionWithSelfie(_ credentials: NSDictionary, base64Image: String, isAuthentication: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("LivenessManager - 🔄 Performing face recognition with selfie (isAuth: \(isAuthentication))")
        
        guard let parsedCredentials = parseFaceRecognizerCredentials(credentials) else {
            reject("INVALID_CREDENTIALS", "Invalid face recognizer credentials", nil)
            return
        }
        
        guard let serverURL = parsedCredentials["serverURL"] as? String,
              let transactionID = parsedCredentials["transactionID"] as? String,
              let userID = parsedCredentials["userID"] as? String else {
            reject("INVALID_CREDENTIALS", "Missing required serverURL, transactionID, or userID", nil)
            return
        }
        
        // Convert base64 image to UIImage
        guard let imageData = Data(base64Encoded: base64Image),
              let image = UIImage(data: imageData) else {
            reject("INVALID_IMAGE", "Failed to decode base64 image", nil)
            return
        }
        
        DispatchQueue.main.async {
            NSLog("LivenessManager - ✅ Processing selfie with Face Recognition API")
            
            let logLevel = UdentifyCommons.LogLevel.warning
            let method: MethodType = isAuthentication ? .authentication : .registration
            
            // Create controller for API calls
            IDCameraController.instantiate(
                serverURL: serverURL,
                method: method,
                transactionID: transactionID,
                userID: userID,
                listName: nil,
                logLevel: logLevel
            ) { [weak self] controller, error in
                guard let self = self else { 
                    reject("WEAK_SELF", "LivenessManager was deallocated", nil)
                    return 
                }
                
                if let error = error {
                    NSLog("LivenessManager - ❌ Failed to initialize controller: \(error.localizedDescription)")
                    reject("INITIALIZATION_FAILED", "Failed to initialize face recognition: \(error.localizedDescription)", nil)
                    return
                }
                
                guard let controller = controller else {
                    NSLog("LivenessManager - ❌ Controller is nil")
                    reject("NO_CONTROLLER", "Could not create face recognition controller", nil)
                    return
                }
                
                NSLog("LivenessManager - 🎯 Controller created successfully, calling performFaceIDandLiveness")
                
                // Store the controller reference
                self.currentIDCameraController = controller
                
                // Call performFaceIDandLiveness method
                controller.performFaceIDandLiveness(image: image, methodType: method) { faceIDResult, livenessResult in
                    DispatchQueue.main.async {
                        NSLog("LivenessManager - 📋 performFaceIDandLiveness completed")
                        NSLog("LivenessManager - 📊 FaceIDResult: \(faceIDResult?.description ?? "nil")")
                        NSLog("LivenessManager - 📊 LivenessResult: \(livenessResult?.assessmentValue ?? 0.0)")
                        
                        // Clean up controller reference
                        self.currentIDCameraController = nil
                        
                        // Handle nil results
                        if faceIDResult == nil && livenessResult == nil {
                            NSLog("LivenessManager - ❌ Both results are nil - this indicates an API call failure")
                            reject("API_CALL_FAILED", "Both faceIDResult and livenessResult are nil", nil)
                            return
                        }
                        
                        // Create FaceIDMessage for result mapping
                        let faceIDMessage = FaceIDMessage()
                        faceIDMessage.faceIDResult = faceIDResult
                        faceIDMessage.livenessResult = livenessResult
                        
                        // Set isFailed logic based on results
                        if faceIDResult == nil || faceIDResult?.error != nil || faceIDResult?.verified == false {
                            faceIDMessage.isFailed = true
                        } else if livenessResult == nil || livenessResult?.error != nil || livenessResult?.assessmentValue == nil {
                            faceIDMessage.isFailed = true
                        } else {
                            faceIDMessage.isFailed = false
                        }
                        
                        // Create comprehensive result using our helper
                        let faceIDMessageDict = self.createFaceIDMessage(faceIDResult: faceIDResult, livenessResult: livenessResult)
                        
                        NSLog("LivenessManager - 📝 Created faceIDMessage: \(faceIDMessageDict)")
                        
                        let result: [String: Any] = [
                            "status": faceIDMessage.isFailed ? "failure" : "success",
                            "faceIDMessage": faceIDMessageDict
                        ]
                        
                        NSLog("LivenessManager - 📤 Resolving performFaceRecognitionWithSelfie with result: \(result)")
                        
                        // Note: Not sending event for performFaceRecognitionWithSelfie since it returns a promise
                        // Events are reserved for camera-based operations that don't return promises directly
                        
                        resolve(result)
                    }
                }
            }
        }
    }
    
    // MARK: - Photo-based Recognition
    
    // registerUserWithPhoto/authenticateUserWithPhoto are functionally performFaceRecognitionWithSelfie
    // with isAuthentication pre-set (same credentials/base64Image params, same FaceRecognitionResult
    // shape on the JS side — see LivenessModule.ts) — delegate to the one real implementation rather
    // than duplicating the IDCameraController/performFaceIDandLiveness call.
    @objc func registerUserWithPhoto(_ credentials: NSDictionary, base64Image: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("LivenessManager - 🔄 Registering user with photo")
        performFaceRecognitionWithSelfie(credentials, base64Image: base64Image, isAuthentication: false, resolver: resolve, rejecter: reject)
    }

    @objc func authenticateUserWithPhoto(_ credentials: NSDictionary, base64Image: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("LivenessManager - 🔄 Authenticating user with photo")
        performFaceRecognitionWithSelfie(credentials, base64Image: base64Image, isAuthentication: true, resolver: resolve, rejecter: reject)
    }
    
    // MARK: - Face Recognition Control
    
    @objc func cancelFaceRecognition(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("LivenessManager - 🔄 Cancelling face recognition")
        
        DispatchQueue.main.async {
            // Cancel any ongoing operations
            self.currentFaceIDViewController?.dismiss(animated: true) {
                self.isInProgress = false
                self.currentFaceIDViewController = nil
            }
            
            resolve(nil)
        }
    }
    
    @objc func isFaceRecognitionInProgress(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(isInProgress)
    }
    
    // MARK: - List Operations
    
    // Note: the JS API names the third parameter "status", but the real SDK's addUserToList only
    // accepts a listName + metadata (no separate status concept) — threaded through to listName here,
    // the only identifier string the native call accepts.
    @objc func addUserToList(_ serverURL: String, transactionId: String, status: String, metadata: NSDictionary?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            IDCameraController.addUserToList(
                serverUrl: serverURL,
                transactionId: transactionId,
                listName: status,
                metadata: metadata as? [String: Any]
            ) { listResponseData, error in
                DispatchQueue.main.async {
                    if let error = error {
                        reject("ADD_USER_TO_LIST_ERROR", error.localizedDescription, nil)
                        return
                    }
                    guard let listResponseData = listResponseData else {
                        resolve(["success": false])
                        return
                    }
                    // ListResponseData/CustomerList are Codable but expose no public Swift
                    // properties directly, so their real fields are recovered via a
                    // JSONEncoder/JSONSerialization round-trip rather than fabricated.
                    var data: [String: Any] = [:]
                    if let jsonData = try? JSONEncoder().encode(listResponseData),
                       let jsonObject = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                        data = jsonObject
                    }
                    let result: [String: Any] = [
                        "success": true,
                        "data": data
                    ]
                    resolve(result)
                }
            }
        }
    }
    
    // Mirrors startFaceRecognitionRegistration/startFaceRecognitionAuthentication above (present the
    // real IDCameraController, resolve immediately once presented, deliver the actual match via the
    // onFaceRecognitionResult/onFaceRecognitionError events from the shared delegate methods below),
    // using MethodType.identification and the caller's listName instead of a nil one.
    @objc func startFaceRecognitionIdentification(_ serverURL: String, transactionId: String, listName: String, logLevel: String?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("LivenessManager - 🔄 Starting face recognition identification, list: \(listName)")

        guard !isInProgress else {
            reject("OPERATION_IN_PROGRESS", "Face recognition operation already in progress", nil)
            return
        }

        DispatchQueue.main.async {
            self.isInProgress = true

            IDCameraController.instantiate(
                serverURL: serverURL,
                method: .identification,
                transactionID: transactionId,
                userID: nil,
                listName: listName,
                logLevel: self.parseLogLevel(logLevel)
            ) { [weak self] controller, error in
                guard let self = self else { return }

                if let error = error {
                    self.isInProgress = false
                    reject("INITIALIZATION_FAILED", "Failed to initialize face recognition: \(error.localizedDescription)", nil)
                    return
                }

                guard let controller = controller,
                      let rootViewController = UIApplication.shared.windows.first?.rootViewController else {
                    self.isInProgress = false
                    reject("NO_VIEW_CONTROLLER", "Could not find root view controller", nil)
                    return
                }

                controller.delegate = self
                self.currentFaceIDViewController = controller
                rootViewController.present(controller, animated: true)

                let result: [String: Any] = [
                    "status": "success",
                    "faceIDMessage": [
                        "success": true,
                        "message": "Face recognition identification started"
                    ]
                ]
                resolve(result)
            }
        }
    }

    private func parseLogLevel(_ logLevel: String?) -> UdentifyCommons.LogLevel {
        switch logLevel?.lowercased() {
        case "verbose": return .verbose
        case "debug": return .debug
        case "info": return .info
        case "error": return .error
        default: return .warning
        }
    }

    @objc func deleteUserFromList(_ serverURL: String, transactionId: String, listName: String, photoBase64: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let imageData = Data(base64Encoded: photoBase64), let image = UIImage(data: imageData) else {
            reject("INVALID_IMAGE", "Failed to decode base64 photo", nil)
            return
        }

        DispatchQueue.main.async {
            IDCameraController.deleteUserFromList(
                serverUrl: serverURL,
                transactionId: transactionId,
                listName: listName,
                photo: image
            ) { listUser, error in
                DispatchQueue.main.async {
                    if let error = error {
                        reject("DELETE_USER_FROM_LIST_ERROR", error.localizedDescription, nil)
                        return
                    }
                    // ListUser has no public properties on iOS (confirmed against the vendored
                    // UdentifyFACE.swiftinterface), so userID/matchScore/registrationTransactionID
                    // can't be read back here — unlike Android, where the SDK's ListUser class does
                    // expose real getters. success/transactionID/listName are the only fields this
                    // platform can genuinely report.
                    let result: [String: Any] = [
                        "success": listUser != nil,
                        "transactionID": transactionId,
                        "listName": listName
                    ]
                    resolve(result)
                }
            }
        }
    }
    
    // MARK: - UI Configuration
    
    @objc func configureUISettings(_ settings: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("LivenessManager - 🔄 Configuring UI settings")
        
        DispatchQueue.main.async {
            do {
                // Create custom API settings based on the provided configuration
                let customSettings = self.createCustomAPISettings(from: settings)
                
                // Apply the custom settings using ApiSettingsProvider
                ApiSettingsProvider.getInstance().currentSettings = customSettings
                // Remembered so the in-call LiveKYC face screen gets the same
                // settings when LiveKYC asks for them at module start.
                self.lastConfiguredSettings = customSettings
                
                NSLog("LivenessManager - ✅ UI settings applied successfully")
                resolve(true)
            } catch {
                NSLog("LivenessManager - ❌ Failed to configure UI settings: \(error)")
                reject("UI_CONFIG_ERROR", "Failed to configure UI settings: \(error.localizedDescription)", error)
            }
        }
    }
    
    @objc func setLocalization(_ languageCode: String, customStrings: NSDictionary?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("LivenessManager - 🔄 Setting localization to \(languageCode)")
        
        DispatchQueue.main.async {
            do {
                // Set the current locale if needed
                if !languageCode.isEmpty {
                    NSLog("LivenessManager - 📍 Setting language to: \(languageCode)")
                }
                
                // Custom strings are handled via the UI settings and Bundle localization
                // The SDK will automatically use the appropriate strings from the bundle
                
                NSLog("LivenessManager - ✅ Localization set successfully")
                resolve(nil)
            } catch {
                NSLog("LivenessManager - ❌ Failed to set localization: \(error)")
                reject("LOCALIZATION_ERROR", "Failed to set localization: \(error.localizedDescription)", error)
            }
        }
    }
    
    // MARK: - UI Configuration Helpers
    
    private func createCustomAPISettings(from settings: NSDictionary) -> CustomAPISettings {
        NSLog("LivenessManager - 🎨 Creating custom API settings from React Native configuration")
        
        let colors = settings["colors"] as? NSDictionary
        let fonts = settings["fonts"] as? NSDictionary
        let dimensions = settings["dimensions"] as? NSDictionary
        let configs = settings["configs"] as? NSDictionary
        
        return CustomAPISettings(
            colors: createAPIColors(from: colors),
            fonts: createAPIFonts(from: fonts),
            configs: createAPIConfigs(from: configs, dimensions: dimensions)
        )
    }
    
    /// Colors the JS config did not set fall back to the SDK's own defaults,
    /// read from a default-constructed `ApiColors`, so the wrapper never decides
    /// what a screen looks like and inherits vendor changes on the next drop.
    private func createAPIColors(from colorsDict: NSDictionary?) -> ApiColors {
        let sdk = ApiColors()
        guard let colors = colorsDict else { return sdk }

        return ApiColors(
            titleColor: parseUIColor(colors["titleColor"] as? String) ?? sdk.titleColor,
            titleBG: parseUIColor(colors["titleBG"] as? String) ?? sdk.titleBG,
            errorColor: parseUIColor(colors["buttonErrorColor"] as? String) ?? sdk.buttonErrorColor,
            successColor: parseUIColor(colors["buttonSuccessColor"] as? String) ?? sdk.buttonSuccessColor,
            buttonColor: parseUIColor(colors["buttonColor"] as? String) ?? sdk.buttonColor,
            buttonTextColor: parseUIColor(colors["buttonTextColor"] as? String) ?? sdk.buttonTextColor,
            buttonErrorTextColor: parseUIColor(colors["buttonErrorTextColor"] as? String) ?? sdk.buttonErrorTextColor,
            buttonSuccessTextColor: parseUIColor(colors["buttonSuccessTextColor"] as? String) ?? sdk.buttonSuccessTextColor,
            buttonBackColor: parseUIColor(colors["buttonBackColor"] as? String) ?? sdk.buttonBackColor,
            footerTextColor: parseUIColor(colors["footerTextColor"] as? String) ?? sdk.footerTextColor,
            checkmarkTintColor: parseUIColor(colors["checkmarkTintColor"] as? String) ?? sdk.checkmarkTintColor,
            backgroundColor: parseUIColor(colors["backgroundColor"] as? String) ?? sdk.backgroundColor
        )
    }
    
    /// `ApiFonts` exposes no readable stored properties, so its defaults cannot
    /// be read back from an instance the way `ApiColors`' are. This mirrors the
    /// value from the SDK's own initializer instead — re-check it when the
    /// frameworks are upgraded.
    private static let sdkDefaultFont = UIFont.boldSystemFont(ofSize: 24)

    private func createAPIFonts(from fontsDict: NSDictionary?) -> ApiFonts {
        guard let fonts = fontsDict else { return ApiFonts() }
        let fallback = Self.sdkDefaultFont

        return ApiFonts(
            titleFont: parseFont(fonts["titleFont"] as? NSDictionary,
                                 defaultSize: fallback.pointSize) ?? fallback,
            buttonFont: parseFont(fonts["buttonFont"] as? NSDictionary,
                                  defaultSize: fallback.pointSize) ?? fallback,
            footerFont: parseFont(fonts["footerFont"] as? NSDictionary,
                                  defaultSize: fallback.pointSize) ?? fallback
        )
    }
    
    private func createAPIConfigs(from configsDict: NSDictionary?, dimensions: NSDictionary?) -> ApiConfigs {
        // Seeded from the SDK's own defaults so anything the JS config omits keeps
        // the vendor's value. `requestTimeout` has no readable stored property, so
        // it mirrors the SDK initializer's default instead.
        let sdk = ApiConfigs()
        var cameraPosition: AVCaptureDevice.Position = sdk.cameraPosition
        var requestTimeout: Double = 30
        var autoTake: Bool = sdk.autoTake
        var errorDelay: Double = sdk.errorDelay
        var successDelay: Double = sdk.successDelay
        // ApiConfigs' own default is .main, which has no face strings - the text
        // has always come from UdentifyFACE.framework's built-in en/tr tables.
        // So the bundle to narrow is the framework's, not .main: this keeps the
        // vendor's wording and changes only which language of it is read.
        // Falls back to sdk.bundle if the framework bundle cannot be resolved.
        let faceBundle = Bundle(for: ApiSettingsProvider.self)
        var bundle: Bundle = UdentifyLanguagePreference.localizedBundle(for: faceBundle)
        var tableName: String? = sdk.tableName
        var maskDetection: Bool = sdk.maskDetection
        var maskConfidence: Double = Double(sdk.maskConfidence)
        var invertedAnimation: Bool = sdk.invertedAnimation
        var backButtonEnabled: Bool = sdk.backButtonEnabled
        var multipleFacesRejected: Bool = sdk.multipleFacesRejected

        // Button dimensions
        var buttonHeight: CGFloat = sdk.buttonHeight
        var buttonMarginLeft: CGFloat = sdk.buttonMarginLeft
        var buttonMarginRight: CGFloat = sdk.buttonMarginRight
        var buttonCornerRadius: CGFloat = sdk.buttonCornerRadius
        
        // Parse configs
        if let configs = configsDict {
            if let cameraPos = configs["cameraPosition"] as? String {
                cameraPosition = cameraPos == "back" ? .back : .front
            }
            if let timeout = configs["requestTimeout"] as? NSNumber {
                requestTimeout = timeout.doubleValue
            }
            if let autoTakeValue = configs["autoTake"] as? Bool {
                autoTake = autoTakeValue
            }
            if let errorDelayValue = configs["errorDelay"] as? NSNumber {
                errorDelay = errorDelayValue.doubleValue
            }
            if let successDelayValue = configs["successDelay"] as? NSNumber {
                successDelay = successDelayValue.doubleValue
            }
            if let tableNameValue = configs["tableName"] as? String {
                tableName = tableNameValue
            }
            if let maskDetectionValue = configs["maskDetection"] as? Bool {
                maskDetection = maskDetectionValue
            }
            if let maskConfidenceValue = configs["maskConfidence"] as? NSNumber {
                maskConfidence = maskConfidenceValue.doubleValue
            }
            if let invertedAnimationValue = configs["invertedAnimation"] as? Bool {
                invertedAnimation = invertedAnimationValue
            }
            if let backButtonValue = configs["backButtonEnabled"] as? Bool {
                backButtonEnabled = backButtonValue
            }
            if let multipleFacesValue = configs["multipleFacesRejected"] as? Bool {
                multipleFacesRejected = multipleFacesValue
            }
        }
        
        // Parse dimensions
        if let dims = dimensions {
            if let height = dims["buttonHeight"] as? NSNumber {
                buttonHeight = CGFloat(height.doubleValue)
            }
            if let marginLeft = dims["buttonMarginLeft"] as? NSNumber {
                buttonMarginLeft = CGFloat(marginLeft.doubleValue)
            }
            if let marginRight = dims["buttonMarginRight"] as? NSNumber {
                buttonMarginRight = CGFloat(marginRight.doubleValue)
            }
            if let cornerRadius = dims["buttonCornerRadius"] as? NSNumber {
                buttonCornerRadius = CGFloat(cornerRadius.doubleValue)
            }
        }
        
        // Create progress bar style with customizable options
        var progressBarBackgroundColor: UIColor = .lightGray.withAlphaComponent(0.5)
        var progressColor: UIColor = .gray
        var completionColor: UIColor = .green
        var progressBarCornerRadius: CGFloat = buttonCornerRadius
        
        // Parse progress bar style from configs
        if let configs = configsDict {
            if let progressBarStyle = configs["progressBarStyle"] as? NSDictionary {
                if let bgColor = progressBarStyle["backgroundColor"] as? String {
                    progressBarBackgroundColor = parseUIColor(bgColor) ?? progressBarBackgroundColor
                }
                if let progColor = progressBarStyle["progressColor"] as? String {
                    progressColor = parseUIColor(progColor) ?? progressColor
                }
                if let compColor = progressBarStyle["completionColor"] as? String {
                    completionColor = parseUIColor(compColor) ?? completionColor
                }
                if let cornerRad = progressBarStyle["cornerRadius"] as? NSNumber {
                    progressBarCornerRadius = CGFloat(cornerRad.doubleValue)
                }
            }
        }
        
        let progressBarStyle = UdentifyProgressBarStyle(
            backgroundColor: progressBarBackgroundColor,
            progressColor: progressColor,
            completionColor: completionColor,
            textStyle: UdentifyTextStyle(
                font: .boldSystemFont(ofSize: 19),
                textColor: .white,
                textAlignment: .center
            ),
            cornerRadius: progressBarCornerRadius
        )
        
        return ApiConfigs(
            cameraPosition: cameraPosition,
            requestTimeout: requestTimeout,
            autoTake: autoTake,
            errorDelay: errorDelay,
            successDelay: successDelay,
            bundle: bundle,
            tableName: tableName,
            maskDetection: maskDetection,
            maskConfidence: Float(maskConfidence),
            invertedAnimation: invertedAnimation,
            backButtonEnabled: backButtonEnabled,
            multipleFacesRejected: multipleFacesRejected,
            buttonHeight: buttonHeight,
            buttonMarginLeft: buttonMarginLeft,
            buttonMarginRight: buttonMarginRight,
            buttonCornerRadius: buttonCornerRadius,
            progressBarStyle: progressBarStyle
        )
    }
    
    private func parseUIColor(_ colorString: String?) -> UIColor? {
        guard let colorString = colorString else { return nil }
        
        // Support hex colors (#RRGGBB, #AARRGGBB)
        if colorString.hasPrefix("#") {
            let hex = String(colorString.dropFirst())
            var rgbValue: UInt64 = 0
            
            if Scanner(string: hex).scanHexInt64(&rgbValue) {
                let length = hex.count
                
                if length == 6 { // #RRGGBB
                    return UIColor(
                        red: CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0,
                        green: CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0,
                        blue: CGFloat(rgbValue & 0x0000FF) / 255.0,
                        alpha: 1.0
                    )
                } else if length == 8 { // #AARRGGBB
                    return UIColor(
                        red: CGFloat((rgbValue & 0x00FF0000) >> 16) / 255.0,
                        green: CGFloat((rgbValue & 0x0000FF00) >> 8) / 255.0,
                        blue: CGFloat(rgbValue & 0x000000FF) / 255.0,
                        alpha: CGFloat((rgbValue & 0xFF000000) >> 24) / 255.0
                    )
                }
            }
        }
        
        // Support named colors
        switch colorString.lowercased() {
        case "red": return .red
        case "green": return .green
        case "blue": return .blue
        case "black": return .black
        case "white": return .white
        case "clear": return .clear
        case "gray": return .gray
        case "purple": return .purple
        case "orange": return .orange
        case "yellow": return .yellow
        default: return nil
        }
    }
    
    private func parseFont(_ fontDict: NSDictionary?, defaultSize: CGFloat) -> UIFont? {
        guard let fontDict = fontDict else { return nil }
        
        let fontName = fontDict["name"] as? String ?? ""
        let fontSize = CGFloat((fontDict["size"] as? NSNumber)?.doubleValue ?? Double(defaultSize))
        
        if !fontName.isEmpty {
            return UIFont(name: fontName, size: fontSize)
        } else {
            return UIFont.systemFont(ofSize: fontSize)
        }
    }
    
    // MARK: - Helper Methods
    
    private func parseFaceRecognizerCredentials(_ credentials: NSDictionary) -> [String: Any]? {
        // Parse and validate credentials
        guard let serverURL = credentials["serverURL"] as? String,
              let transactionID = credentials["transactionID"] as? String,
              let userID = credentials["userID"] as? String else {
            NSLog("LivenessManager - ❌ Missing required credentials")
            return nil
        }
        
        // Only the keys call sites actually read are forwarded. Anything absent
        // here is left to the SDK's own default at the call site rather than
        // being given a value in this layer.
        var parsed: [String: Any] = [
            "serverURL": serverURL,
            "transactionID": transactionID,
            "userID": userID,
        ]
        if let hybrid = credentials["hybridLivenessEnabled"] as? Bool {
            parsed["hybridLivenessEnabled"] = hybrid
        }
        if let autoNext = credentials["activeLivenessAutoNextEnabled"] as? Bool {
            parsed["activeLivenessAutoNextEnabled"] = autoNext
        }
        return parsed
    }
    
    private func setupFaceIDCallbacks(_ faceID: NSObject) {
        // Setup callbacks for face recognition operations
        // This would involve setting up delegates/completion handlers for the UdentifyFACE SDK
    }
    
    private func setupActiveLivenessCallbacks(_ activeLiveness: NSObject) {
        // Setup callbacks for active liveness operations
        // This would involve setting up delegates/completion handlers for the UdentifyFACE SDK
    }
    
    private func setupHybridLivenessCallbacks(_ hybridLiveness: NSObject) {
        // Setup callbacks for hybrid liveness operations
        // This would involve setting up delegates/completion handlers for the UdentifyFACE SDK
    }
    
    private func sendEvent(_ eventName: String, body: Any) {
        eventEmitter?.sendEvent(withName: eventName, body: body)
    }
    
    private func methodTypeToString(_ methodType: MethodType?) -> String {
        guard let methodType = methodType else { return "unknown" }
        
        switch methodType {
        case .registration:
            return "registration"
        case .authentication:
            return "authentication"
        case .selfie:
            return "selfie"
        case .imageUpload:
            return "imageUpload"
        case .identification:
            return "identification"
        @unknown default:
            return "unknown"
        }
    }
    
    private func createFaceIDMessage(faceIDResult: FaceIDResult?, livenessResult: LivenessResult?) -> [String: Any] {
        var faceIDMessage: [String: Any] = [:]
        
        var isFailed = false
        
        // Process FaceIDResult
        if let faceIDResult = faceIDResult {
            var faceIDResultDict: [String: Any] = [
                "verified": faceIDResult.verified,
                "matchScore": faceIDResult.matchScore,
                "description": faceIDResult.description,
                "transactionID": faceIDResult.transactionID ?? "",
                "userID": faceIDResult.userID ?? "",
                "header": faceIDResult.header ?? "",
                "listNames": faceIDResult.listNames ?? "",
                "listIds": faceIDResult.listIds ?? "",
                "registrationTransactionID": faceIDResult.registrationTransactionID ?? "",
                "method": self.methodTypeToString(faceIDResult.method)
            ]
            
            if let error = faceIDResult.error {
                faceIDResultDict["error"] = [
                    "code": "\(error)",
                    "description": error.localizedDescription
                ]
                isFailed = true
            }
            
            if let referencePhoto = faceIDResult.referencePhoto {
                if let imageData = referencePhoto.jpegData(compressionQuality: 0.8) {
                    faceIDResultDict["referencePhotoBase64"] = imageData.base64EncodedString()
                }
            }
            
            if let metadata = faceIDResult.metadata {
                var metadataDict: [String: Any] = [:]
                for (key, value) in metadata {
                    if let udentifyAny = value {
                        metadataDict[key] = udentifyAny.value
                    }
                }
                faceIDResultDict["metadata"] = metadataDict
            }
            
            faceIDMessage["faceIDResult"] = faceIDResultDict
            
            if faceIDResult.error != nil || !faceIDResult.verified {
                isFailed = true
            }
        } else {
            isFailed = true
        }
        
        // Process LivenessResult
        if let livenessResult = livenessResult {
            var livenessResultDict: [String: Any] = [
                "assessmentValue": livenessResult.assessmentValue ?? 0.0,
                "assessmentDescription": livenessResult.assessmentDescription ?? "",
                "probability": livenessResult.probability ?? 0.0,
                "quality": livenessResult.quality ?? 0.0,
                "livenessScore": livenessResult.livenessScore ?? 0.0,
                "transactionID": livenessResult.transactionID ?? ""
            ]
            
            if let error = livenessResult.error {
                livenessResultDict["error"] = [
                    "code": "\(error)",
                    "description": error.localizedDescription
                ]
                isFailed = true
            }
            
            let assessment = livenessResult.assessment()
            livenessResultDict["assessment"] = assessment.description
            
            faceIDMessage["livenessResult"] = livenessResultDict
            
            if livenessResult.error != nil || livenessResult.assessmentValue == nil {
                isFailed = true
            }
        } else {
            isFailed = true
        }
        
        faceIDMessage["success"] = !isFailed
        faceIDMessage["isFailed"] = isFailed
        faceIDMessage["message"] = isFailed ? "Face recognition failed" : "Face recognition completed"
        
        return faceIDMessage
    }
}

// MARK: - IDCameraController Delegate
extension LivenessManager: IDCameraControllerDelegate {
    // Added by the UdentifyFACE 26.3.0814 SDK; not currently bridged to JS (the docs' migration
    // note says a no-op implementation is sufficient for integrators who don't need this data).
    public func onFaceDirectiveChanged(directive: FaceDirective) {}

    public func cameraController(image: UIImage) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            NSLog("LivenessManager - 📸 cameraController called with image")
            NSLog("LivenessManager - 🖼️ Image size: \(image.size)")
            
            self.isInProgress = false
            self.currentFaceIDViewController?.dismiss(animated: true) {
                self.currentFaceIDViewController = nil
            }
            
            let base64Image = image.jpegData(compressionQuality: 0.8)?.base64EncodedString() ?? ""
            NSLog("LivenessManager - 📷 Base64 image length: \(base64Image.count)")
            
            // Send the selfie taken event with the captured image
            // Fix: Wrap the base64Image in a dictionary as expected by React Native
            let eventBody: [String: Any] = ["base64Image": base64Image]
            self.sendEvent("onSelfieTaken", body: eventBody)
            self.sendEvent("onPhotoTaken", body: [:])

            NSLog("LivenessManager - ✅ onSelfieTaken event sent")
        }
    }
    
    public func cameraController(didEncounterError error: FaceError) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            self.isInProgress = false
            self.currentFaceIDViewController?.dismiss(animated: true) {
                self.currentFaceIDViewController = nil
            }
            
            let errorMap: [String: Any] = [
                "code": "FACE_RECOGNITION_ERROR",
                "message": error.localizedDescription
            ]
            
            self.sendEvent("onFaceRecognitionError", body: errorMap)
        }
    }
    
    public func cameraControllerDidFinishWithResult(viewMode: IDCameraController.ViewMode, result: FaceIDMessage) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            self.isInProgress = false
            self.currentFaceIDViewController?.dismiss(animated: true) {
                self.currentFaceIDViewController = nil
            }
            
            var faceIDResultMap: [String: Any] = [:]
            
            if let faceIDResult = result.faceIDResult {
                faceIDResultMap["verified"] = faceIDResult.verified
                faceIDResultMap["matchScore"] = faceIDResult.matchScore
                faceIDResultMap["transactionID"] = faceIDResult.transactionID ?? ""
                faceIDResultMap["userID"] = faceIDResult.userID ?? ""
                faceIDResultMap["listNames"] = faceIDResult.listNames ?? ""
                faceIDResultMap["listIds"] = faceIDResult.listIds ?? ""
                faceIDResultMap["description"] = faceIDResult.description
                faceIDResultMap["method"] = self.methodTypeToString(faceIDResult.method)
                
                if let registrationTransactionID = faceIDResult.registrationTransactionID {
                    faceIDResultMap["registrationTransactionID"] = registrationTransactionID
                }
                
                if let referencePhoto = faceIDResult.referencePhoto,
                   let photoData = referencePhoto.jpegData(compressionQuality: 0.8) {
                    faceIDResultMap["referencePhoto"] = photoData.base64EncodedString()
                }
                
                if let metadata = faceIDResult.metadata {
                    var metadataMap: [String: Any] = [:]
                    for (key, anyValue) in metadata {
                        if let value = anyValue?.value {
                            metadataMap[key] = value
                        }
                    }
                    faceIDResultMap["metadata"] = metadataMap
                }
            }
            
            // Build liveness result dictionary separately
            var livenessResultDict: [String: Any]? = nil
            if let livenessResult = result.livenessResult {
                livenessResultDict = [
                    "assessmentValue": livenessResult.assessmentValue ?? 0.0,
                    "assessmentDescription": livenessResult.assessmentDescription ?? "",
                    "probability": livenessResult.probability ?? 0.0,
                    "quality": livenessResult.quality ?? 0.0,
                    "livenessScore": livenessResult.livenessScore ?? 0.0,
                    "transactionID": livenessResult.transactionID ?? ""
                ]
            }
            
            // Build face ID message dictionary
            let faceIDMessage: [String: Any] = [
                "success": !result.isFailed,
                "message": result.isFailed ? "Face recognition failed" : "Face recognition completed",
                "faceIDResult": faceIDResultMap.isEmpty ? nil : faceIDResultMap,
                "livenessResult": livenessResultDict
            ]
            
            // Build final result dictionary
            let resultMap: [String: Any] = [
                "status": "success",
                "faceIDMessage": faceIDMessage
            ]
            
            self.sendEvent("onFaceRecognitionResult", body: resultMap)
        }
    }
    
    public func cameraControllerUserPressedBackButton() {
        DispatchQueue.main.async { [weak self] in
            self?.sendEvent("onBackButtonPressed", body: [:])
        }
    }
    
    public func cameraControllerWillDismiss() {
        DispatchQueue.main.async { [weak self] in
            self?.sendEvent("onWillDismiss", body: [:])
        }
    }
    
    public func cameraControllerDidDismiss() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.isInProgress = false
            self.currentFaceIDViewController = nil
            self.sendEvent("onDidDismiss", body: [:])
        }
    }
}

// MARK: - ActiveCameraController Delegate (Liveness)
extension LivenessManager: ActiveCameraControllerDelegate {
    // onFaceDirectiveChanged is shared with IDCameraControllerDelegate above; one implementation
    // on this concrete type satisfies both protocol requirements.
    // Added by the UdentifyFACE 26.3.0814 SDK; not currently bridged to JS (the docs' migration
    // note says a no-op implementation is sufficient for integrators who don't need this data).
    public func onActiveLivenessDirectiveChanged(directive: ActiveLivenessDirective) {}

    public func onResult(result: FaceIDMessage) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            self.isInProgress = false
            self.currentFaceIDViewController?.dismiss(animated: true) {
                self.currentFaceIDViewController = nil
            }
            
            // Create comprehensive result map with ALL available data
            var faceIDMessageDict: [String: Any] = [
                "success": !result.isFailed,
                "message": result.isFailed ? "Active liveness failed" : "Active liveness completed",
                "isFailed": result.isFailed
            ]
            
            var resultMap: [String: Any] = [
                "status": result.isFailed ? "failure" : "success"
            ]
            
            // Add FaceIDResult if available (contains server response data)
            if let faceIDResult = result.faceIDResult {
                var faceIDResultDict: [String: Any] = [
                    "verified": faceIDResult.verified,
                    "matchScore": faceIDResult.matchScore,
                    "transactionID": faceIDResult.transactionID ?? "",
                    "userID": faceIDResult.userID ?? "",
                    "header": faceIDResult.header ?? "",
                    "description": faceIDResult.description,
                    "listNames": faceIDResult.listNames ?? "",
                    "listIds": faceIDResult.listIds ?? "",
                    "registrationTransactionID": faceIDResult.registrationTransactionID ?? "",
                    "method": self.methodTypeToString(faceIDResult.method)
                ]
                
                // Add error if present
                if let error = faceIDResult.error {
                    faceIDResultDict["error"] = [
                        "code": "\(error)",
                        "description": error.localizedDescription
                    ]
                }
                
                // Convert reference photo to base64 if present
                if let referencePhoto = faceIDResult.referencePhoto {
                    if let imageData = referencePhoto.jpegData(compressionQuality: 0.8) {
                        faceIDResultDict["referencePhotoBase64"] = imageData.base64EncodedString()
                    }
                }
                
                // Add raw server response from metadata
                if let metadata = faceIDResult.metadata {
                    var metadataDict: [String: Any] = [:]
                    for (key, value) in metadata {
                        if let udentifyAny = value {
                            metadataDict[key] = udentifyAny.value
                        }
                    }
                    faceIDResultDict["metadata"] = metadataDict
                }
                
                faceIDMessageDict["faceIDResult"] = faceIDResultDict
            }
            
            // Add LivenessResult if available (passive liveness data)
            if let livenessResult = result.livenessResult {
                var livenessResultDict: [String: Any] = [
                    "assessmentValue": livenessResult.assessmentValue ?? 0.0,
                    "assessmentDescription": livenessResult.assessmentDescription ?? "",
                    "probability": livenessResult.probability ?? 0.0,
                    "quality": livenessResult.quality ?? 0.0,
                    "livenessScore": livenessResult.livenessScore ?? 0.0,
                    "transactionID": livenessResult.transactionID ?? ""
                ]
                
                // Add error if present
                if let error = livenessResult.error {
                    livenessResultDict["error"] = [
                        "code": "\(error)",
                        "description": error.localizedDescription
                    ]
                }
                
                // Add assessment result
                let assessment = livenessResult.assessment()
                livenessResultDict["assessment"] = assessment.description
                
                faceIDMessageDict["livenessResult"] = livenessResultDict
            }
            
            // Add ActiveLivenessResult if available (gesture results)
            if let activeLivenessResult = result.activeLivenessResult {
                var activeLivenessResultDict: [String: Any] = [
                    "transactionID": activeLivenessResult.transactionID ?? "",
                    "gestureResult": activeLivenessResult.gestureResult ?? [:]
                ]
                
                // Add error if present
                if let error = activeLivenessResult.error {
                    activeLivenessResultDict["error"] = [
                        "code": "\(error)",
                        "description": error.localizedDescription
                    ]
                }
                
                faceIDMessageDict["activeLivenessResult"] = activeLivenessResultDict
            }
            
            // Finalize the result structure
            resultMap["faceIDMessage"] = faceIDMessageDict
            
            // Send comprehensive result to React Native
            self.sendEvent("onActiveLivenessResult", body: resultMap)
        }
    }
    
    public func onVideoTaken() {
        DispatchQueue.main.async { [weak self] in
            self?.sendEvent("onVideoTaken", body: [:])
            self?.sendEvent("onPhotoTaken", body: [:])
        }
    }
    
    public func onFailure(error: Error) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            self.isInProgress = false
            self.currentFaceIDViewController?.dismiss(animated: true) {
                self.currentFaceIDViewController = nil
            }
            
            let errorMap: [String: Any] = [
                "code": "ACTIVE_LIVENESS_ERROR",
                "message": error.localizedDescription
            ]
            
            self.sendEvent("onActiveLivenessFailure", body: errorMap)
        }
    }
    
    public func backButtonPressed() {
        DispatchQueue.main.async { [weak self] in
            self?.sendEvent("onBackButtonPressed", body: [:])
        }
    }
    
    public func willDismiss() {
        DispatchQueue.main.async { [weak self] in
            self?.sendEvent("onWillDismiss", body: [:])
        }
    }
    
    public func didDismiss() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.isInProgress = false
            self.currentFaceIDViewController = nil
            self.sendEvent("onDidDismiss", body: [:])
        }
    }

    // MARK: - Demographics Estimation (26.1.3)

    /**
     * Estimate demographics (age + gender) from a base64-encoded selfie image.
     */
    @objc func estimateDemographics(
        _ serverURL: String,
        transactionID: String,
        imageBase64: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let imageData = Data(base64Encoded: imageBase64),
              let image = UIImage(data: imageData) else {
            reject("INVALID_ARGUMENTS", "A valid base64 imageBase64 is required", nil)
            return
        }

        DispatchQueue.main.async {
            IDCameraController.performAgeEstimation(
                serverURL: serverURL,
                transactionID: transactionID,
                image: image
            ) { age, gender in
                DispatchQueue.main.async {
                    if age == nil && gender == nil {
                        reject("DEMOGRAPHICS_ERROR", "Demographics estimation failed", nil)
                    } else {
                        var demographics: [String: Any] = [:]
                        if let age = age { demographics["estimatedAge"] = age }
                        if let gender = gender { demographics["estimatedGender"] = gender }
                        resolve(demographics)
                    }
                }
            }
        }
    }
}

// MARK: - Custom API Settings Implementation
struct CustomAPISettings: ApiSettings {
    var colors: ApiColors
    var fonts: ApiFonts
    var configs: ApiConfigs
    
    init(colors: ApiColors = ApiColors(), fonts: ApiFonts = ApiFonts(), configs: ApiConfigs = ApiConfigs()) {
        self.colors = colors
        self.fonts = fonts
        self.configs = configs
    }
}
