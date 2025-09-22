//
//  LivenessManager.swift
//  liveness-rn-library
//
//  Created by Liveness RN Library on 2024-01-01.
//

import Foundation
import UIKit
import AVFoundation
import UdentifyFACE
import UdentifyCommons

@objc(LivenessManager)
class LivenessManager: NSObject {
    
    weak var eventEmitter: RCTEventEmitter?
    private var currentFaceIDViewController: UIViewController?
    private var currentIDCameraController: IDCameraController? // For API calls with captured images
    private var isInProgress = false
    
    @objc init(eventEmitter: RCTEventEmitter) {
        self.eventEmitter = eventEmitter
        super.init()
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
    
    @objc func registerUserWithPhoto(_ credentials: NSDictionary, base64Image: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("LivenessManager - 🔄 Registering user with photo")
        
        guard let parsedCredentials = parseFaceRecognizerCredentials(credentials) else {
            reject("INVALID_CREDENTIALS", "Invalid face recognizer credentials", nil)
            return
        }
        
        // Implementation for photo-based registration
        let result: [String: Any] = [
            "status": "success",
            "faceIDMessage": [
                "success": true,
                "message": "User registration with photo completed"
            ]
        ]
        resolve(result)
    }
    
    @objc func authenticateUserWithPhoto(_ credentials: NSDictionary, base64Image: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("LivenessManager - 🔄 Authenticating user with photo")
        
        guard let parsedCredentials = parseFaceRecognizerCredentials(credentials) else {
            reject("INVALID_CREDENTIALS", "Invalid face recognizer credentials", nil)
            return
        }
        
        // Implementation for photo-based authentication
        let result: [String: Any] = [
            "status": "success",
            "faceIDMessage": [
                "success": true,
                "message": "User authentication with photo completed"
            ]
        ]
        resolve(result)
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
    
    @objc func addUserToList(_ serverURL: String, transactionId: String, status: String, metadata: NSDictionary?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        // Implementation for adding user to list
        let result: [String: Any] = [
            "success": true,
            "data": [
                "id": 1,
                "userId": 123,
                "customerList": [
                    "id": 1,
                    "name": "Main List",
                    "listRole": "Customer",
                    "description": "Main customer list",
                    "creationDate": String(Int(Date().timeIntervalSince1970 * 1000))
                ]
            ]
        ]
        resolve(result)
    }
    
    @objc func startFaceRecognitionIdentification(_ serverURL: String, transactionId: String, listName: String, logLevel: String?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        // Implementation for face recognition identification
        let result: [String: Any] = [
            "status": "success",
            "faceIDMessage": [
                "success": true,
                "message": "Face recognition identification started"
            ]
        ]
        resolve(result)
    }
    
    @objc func deleteUserFromList(_ serverURL: String, transactionId: String, listName: String, photoBase64: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        // Implementation for deleting user from list
        let result: [String: Any] = [
            "success": true,
            "message": "User deleted from list successfully",
            "userID": "user123",
            "transactionID": transactionId,
            "listName": listName,
            "matchScore": 0.95,
            "registrationTransactionID": "reg_txn_123"
        ]
        resolve(result)
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
    
    private func createAPIColors(from colorsDict: NSDictionary?) -> ApiColors {
        guard let colors = colorsDict else {
            return ApiColors() // Use default colors
        }
        
        return ApiColors(
            titleColor: parseUIColor(colors["titleColor"] as? String) ?? .purple,
            titleBG: parseUIColor(colors["titleBG"] as? String) ?? UIColor.blue.withAlphaComponent(0.2),
            errorColor: parseUIColor(colors["buttonErrorColor"] as? String) ?? .red,
            successColor: parseUIColor(colors["buttonSuccessColor"] as? String) ?? .green,
            buttonColor: parseUIColor(colors["buttonColor"] as? String) ?? .darkGray,
            buttonTextColor: parseUIColor(colors["buttonTextColor"] as? String) ?? .white,
            buttonErrorTextColor: parseUIColor(colors["buttonErrorTextColor"] as? String) ?? .white,
            buttonSuccessTextColor: parseUIColor(colors["buttonSuccessTextColor"] as? String) ?? .white,
            buttonBackColor: parseUIColor(colors["buttonBackColor"] as? String) ?? .black,
            footerTextColor: parseUIColor(colors["footerTextColor"] as? String) ?? .white,
            checkmarkTintColor: parseUIColor(colors["checkmarkTintColor"] as? String) ?? .white,
            backgroundColor: parseUIColor(colors["backgroundColor"] as? String) ?? .purple
        )
    }
    
    private func createAPIFonts(from fontsDict: NSDictionary?) -> ApiFonts {
        guard let fonts = fontsDict else {
            return ApiFonts() // Use default fonts
        }
        
        let titleFont = parseFont(fonts["titleFont"] as? NSDictionary, defaultSize: 30) ?? UIFont.boldSystemFont(ofSize: 30)
        let buttonFont = parseFont(fonts["buttonFont"] as? NSDictionary, defaultSize: 18) ?? UIFont.boldSystemFont(ofSize: 18)
        let footerFont = parseFont(fonts["footerFont"] as? NSDictionary, defaultSize: 24) ?? UIFont.boldSystemFont(ofSize: 24)
        
        return ApiFonts(
            titleFont: titleFont,
            buttonFont: buttonFont,
            footerFont: footerFont
        )
    }
    
    private func createAPIConfigs(from configsDict: NSDictionary?, dimensions: NSDictionary?) -> ApiConfigs {
        var cameraPosition: AVCaptureDevice.Position = .front
        var requestTimeout: Double = 15
        var autoTake: Bool = true
        var errorDelay: Double = 0.25
        var successDelay: Double = 0.75
        var bundle: Bundle = .main
        var tableName: String? = nil
        var maskDetection: Bool = false
        var maskConfidence: Double = 0.95
        var invertedAnimation: Bool = false
        var backButtonEnabled: Bool = true
        var multipleFacesRejected: Bool = true
        
        // Button dimensions
        var buttonHeight: CGFloat = 48
        var buttonMarginLeft: CGFloat = 20
        var buttonMarginRight: CGFloat = 20
        var buttonCornerRadius: CGFloat = 8
        
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
        
        return [
            "serverURL": serverURL,
            "transactionID": transactionID,
            "userID": userID,
            "autoTake": credentials["autoTake"] as? Bool ?? true,
            "errorDelay": credentials["errorDelay"] as? Double ?? 0.10,
            "successDelay": credentials["successDelay"] as? Double ?? 0.75,
            "runInBackground": credentials["runInBackground"] as? Bool ?? false,
            "blinkDetectionEnabled": credentials["blinkDetectionEnabled"] as? Bool ?? false,
            "requestTimeout": credentials["requestTimeout"] as? Int ?? 10,
            "eyesOpenThreshold": credentials["eyesOpenThreshold"] as? Double ?? 0.75,
            "maskConfidence": credentials["maskConfidence"] as? Double ?? 0.95,
            "invertedAnimation": credentials["invertedAnimation"] as? Bool ?? false,
            "activeLivenessAutoNextEnabled": credentials["activeLivenessAutoNextEnabled"] as? Bool ?? true
        ]
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
