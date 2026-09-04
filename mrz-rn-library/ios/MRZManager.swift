//
//  MRZManager.swift
//  MRZLibrary
//
//  Created by Fraud.com on 25/08/25.
//

import Foundation
import UIKit
import AVFoundation

// Udentify MRZ SDK imports (conditionally compiled)
#if canImport(UdentifyMRZ)
import UdentifyMRZ
#endif
#if canImport(UdentifyCommons)
import UdentifyCommons
#endif

// MARK: - Bundle Extension for Localization
extension Bundle {
    static var mrzLibraryBundle: Bundle {
        // First, try to find the resource bundle created by CocoaPods
        if let resourceBundlePath = Bundle(for: MRZManager.self).path(forResource: "MRZLibraryResources", ofType: "bundle"),
           let resourceBundle = Bundle(path: resourceBundlePath) {
            return resourceBundle
        }
        
        // Fallback: Try to find resources in the main app bundle
        if let path = Bundle.main.path(forResource: "mrz-rn-library", ofType: "bundle"),
           let bundle = Bundle(path: path) {
            return bundle
        }
        
        // Last fallback: Use the current bundle (for development/testing)
        return Bundle(for: MRZManager.self)
    }
}

// MARK: - Localization Helper
private func localizedString(_ key: String, comment: String = "") -> String {
    let bundle = Bundle.mrzLibraryBundle
    let localizedText = NSLocalizedString(key, bundle: bundle, comment: comment)
    
    // Debug logging to help troubleshoot localization issues
    print("MRZManager - Localization: key='\(key)', bundle='\(bundle.bundlePath)', result='\(localizedText)'")
    
    // If localization failed (key == result), try fallback strings
    if localizedText == key {
        print("MRZManager - Localization failed for key '\(key)', using fallback")
        return getFallbackString(for: key)
    }
    
    return localizedText
}

// MARK: - Fallback Localization
private func getFallbackString(for key: String) -> String {
    switch key {
    case "mrz_scan_instruction":
        return "Place document MRZ within the frame"
    case "cancel":
        return "Cancel"
    case "retry":
        return "Retry"
    case "mrz_scanning_title":
        return "MRZ Scanner"
    case "mrz_auto_capture":
        return "Auto Capture"
    case "mrz_camera_error":
        return "Camera error occurred"
    case "mrz_permission_required":
        return "Camera permission is required for MRZ scanning"
    default:
        return key
    }
}

// MARK: - UI Customization Helper
private struct UICustomization {
    let focusViewBorderColor: UIColor
    let focusViewStrokeWidth: CGFloat
    let instructionText: String
    let instructionTextColor: UIColor
    let showCancelButton: Bool
    let cancelButtonText: String
    let cancelButtonColor: UIColor
    let headerTitle: String
    let autoCaptureText: String

    init(from customization: NSDictionary?) {
        // Parse focus view border color
        if let colorHex = customization?["focusViewBorderColor"] as? String {
            self.focusViewBorderColor = UIColor(hex: colorHex) ?? .systemBlue
        } else {
            self.focusViewBorderColor = .systemBlue
        }
        
        // Parse focus view stroke width
        if let width = customization?["focusViewStrokeWidth"] as? NSNumber {
            self.focusViewStrokeWidth = CGFloat(width.floatValue)
        } else {
            self.focusViewStrokeWidth = 3.0
        }
        
        // Parse instruction text
        if let text = customization?["instructionText"] as? String {
            self.instructionText = text
        } else {
            self.instructionText = localizedString("mrz_scan_instruction")
        }
        
        // Parse instruction text color
        if let colorHex = customization?["instructionTextColor"] as? String {
            self.instructionTextColor = UIColor(hex: colorHex) ?? .white
        } else {
            self.instructionTextColor = .white
        }
        
        // Parse show cancel button
        if let show = customization?["showCancelButton"] as? Bool {
            self.showCancelButton = show
        } else {
            self.showCancelButton = true
        }
        
        // Parse cancel button text
        if let text = customization?["cancelButtonText"] as? String {
            self.cancelButtonText = text
        } else {
            self.cancelButtonText = localizedString("cancel")
        }
        
        // Parse cancel button color
        if let colorHex = customization?["cancelButtonColor"] as? String {
            self.cancelButtonColor = UIColor(hex: colorHex) ?? .red
        } else {
            self.cancelButtonColor = .red
        }

        // Parse header title (design 3.2)
        if let text = customization?["headerTitle"] as? String {
            self.headerTitle = text
        } else {
            self.headerTitle = localizedString("mrz_scanning_title")
        }

        // Parse auto capture indicator text (design 3.2)
        if let text = customization?["autoCaptureText"] as? String {
            self.autoCaptureText = text
        } else {
            self.autoCaptureText = localizedString("mrz_auto_capture")
        }
    }
}

// MARK: - UIColor Extension for Hex Colors
extension UIColor {
    convenience init?(hex: String) {
        let r, g, b, a: CGFloat
        
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }
        
        switch hexSanitized.count {
        case 6:
            r = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
            g = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
            b = CGFloat(rgb & 0x0000FF) / 255.0
            a = 1.0
        case 8:
            r = CGFloat((rgb & 0xFF000000) >> 24) / 255.0
            g = CGFloat((rgb & 0x00FF0000) >> 16) / 255.0
            b = CGFloat((rgb & 0x0000FF00) >> 8) / 255.0
            a = CGFloat(rgb & 0x000000FF) / 255.0
        default:
            return nil
        }
        
        self.init(red: r, green: g, blue: b, alpha: a)
    }
}

@objc(MRZManager)
public class MRZManager: NSObject {
    
    private var currentCompletion: ((NSDictionary) -> Void)?
    private var previewView: UIView?
    private var mrzPreviewView: UIView?
    // Design 3.2 overlay chrome (title, back button, card guide, texts). Kept as
    // references so cleanup can reliably remove them when the screen closes.
    private var overlayViews: [UIView] = []
    
    // MRZ SDK controllers
#if canImport(UdentifyMRZ) && canImport(UdentifyCommons)
    private var mrzCameraController: MRZCameraController?
    private var mrzReader: MRZReader?
#endif
    
    @objc func checkPermissions(_ completion: @escaping (Bool) -> Void) {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        let hasPermission = status == .authorized
        completion(hasPermission)
    }
    
    @objc func requestPermissions(_ completion: @escaping (String) -> Void) {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        
        switch status {
        case .authorized:
            completion("granted")
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    completion(granted ? "granted" : "denied")
                }
            }
        case .denied, .restricted:
            completion("denied")
        @unknown default:
            completion("denied")
        }
    }
    
    @objc func startMrzCamera(_ customization: NSDictionary?, completion: @escaping (NSDictionary) -> Void) {
        // Check camera permission
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        guard status == .authorized else {
            let errorResult: [String: Any] = [
                "success": false,
                "errorMessage": "PERMISSION_DENIED - Camera permission is required for MRZ scanning"
            ]
            completion(errorResult as NSDictionary)
            return
        }
        
        print("MRZManager - Starting MRZ camera")
        
        // Store completion for later use
        currentCompletion = completion
        
        // Ensure all UI operations happen on the main thread (TurboModule calls come from background threads)
        DispatchQueue.main.async { [weak self] in
            // Get the root view controller - try multiple approaches for better compatibility
            var viewController: UIViewController?
            
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let window = windowScene.windows.first {
                viewController = window.rootViewController
            } else if let window = UIApplication.shared.windows.first {
                viewController = window.rootViewController
            }
            
            guard let viewController = viewController else {
                let errorResult: [String: Any] = [
                    "success": false,
                    "errorMessage": "NO_VIEW_CONTROLLER - Could not find root view controller"
                ]
                completion(errorResult as NSDictionary)
                return
            }
            
            // Create preview views for MRZ camera
            let uiCustomization = UICustomization(from: customization)
            self?.setupPreviewViews(in: viewController.view, customization: uiCustomization)
            
            // Start real MRZ camera implementation
#if canImport(UdentifyMRZ) && canImport(UdentifyCommons)
            self?.startRealMrzCamera(customization: uiCustomization)
#else
            // SDK not available - return error
            let errorResult: [String: Any] = [
                "success": false,
                "errorMessage": "SDK_NOT_AVAILABLE - Please add the Udentify MRZ frameworks to ios/Frameworks/"
            ]
            completion(errorResult as NSDictionary)
#endif
        }
    }
    
    @objc func processMrzImage(_ imageBase64: String, completion: @escaping (NSDictionary) -> Void) {
        print("MRZManager - Processing MRZ image")
        
        // Decode Base64 image
        guard let imageData = Data(base64Encoded: imageBase64),
              let image = UIImage(data: imageData) else {
            let errorResult: [String: Any] = [
                "success": false,
                "errorMessage": "INVALID_IMAGE - Failed to decode Base64 image"
            ]
            completion(errorResult as NSDictionary)
            return
        }
        
        // Store completion for later use
        currentCompletion = completion
        
        // Process the image using real Udentify SDK
#if canImport(UdentifyMRZ) && canImport(UdentifyCommons)
        processRealMrzImage(image: image)
#else
        // SDK not available - return error
        let errorResult: [String: Any] = [
            "success": false,
            "errorMessage": "SDK_NOT_AVAILABLE - Please add the Udentify MRZ frameworks to ios/Frameworks/"
        ]
        completion(errorResult as NSDictionary)
#endif
    }
    
    @objc func cancelMrzScanning(_ completion: @escaping () -> Void) {
        print("MRZManager - Cancelling MRZ scanning and cleaning up resources")
        
        // Ensure all UI operations happen on the main thread
        DispatchQueue.main.async { [weak self] in
            // Properly stop MRZ processing first
#if canImport(UdentifyMRZ) && canImport(UdentifyCommons)
            self?.mrzCameraController?.pauseMRZ()
            self?.mrzCameraController = nil
            self?.mrzReader = nil
#endif
            
            // Clean up preview views
            self?.cleanupPreviewViews()
            
            // Clear current completion reference
            if let currentCompletion = self?.currentCompletion {
                let cancelResult: [String: Any] = [
                    "success": false,
                    "errorMessage": "USER_CANCELLED",
                    "cancelled": true
                ]
                currentCompletion(cancelResult as NSDictionary)
            }
            self?.currentCompletion = nil
            
            completion()
        }
    }
    
    // MARK: - Private Methods
    
    private func setupPreviewViews(in parentView: UIView, customization: UICustomization) {
        // Create preview view for camera
        previewView = UIView(frame: parentView.bounds)
        previewView?.backgroundColor = UIColor.black
        parentView.addSubview(previewView!)
        
        // Create MRZ preview view (focus area)
        let mrzFrame = CGRect(
            x: 20,
            y: parentView.bounds.height * 0.6,
            width: parentView.bounds.width - 40,
            height: 100
        )
        mrzPreviewView = UIView(frame: mrzFrame)
        mrzPreviewView?.backgroundColor = UIColor.clear
        parentView.addSubview(mrzPreviewView!)
        
        // Overlay chrome per design 3.2 (MRZ Scan). The scan ROI above is
        // untouched; everything below is decoration around it.
        let safeTop = parentView.window?.safeAreaInsets.top
            ?? parentView.safeAreaInsets.top
        let headerTop = max(safeTop, 44)

        // Header: centered title.
        let titleLabel = UILabel(frame: CGRect(
            x: 48,
            y: headerTop + 16,
            width: parentView.bounds.width - 96,
            height: 24
        ))
        titleLabel.text = customization.headerTitle
        titleLabel.textColor = UIColor.white
        titleLabel.font = UIFont.boldSystemFont(ofSize: 16)
        titleLabel.textAlignment = .center
        parentView.addSubview(titleLabel)
        overlayViews.append(titleLabel)

        // Header: back button in the top-left corner (replaces the old Cancel
        // button); tapping it dismisses the camera and returns to the previous
        // screen.
        if customization.showCancelButton {
            let backButton = UIButton(frame: CGRect(
                x: 12,
                y: headerTop + 8,
                width: 40,
                height: 40
            ))
            let chevronConfig = UIImage.SymbolConfiguration(pointSize: 18, weight: .semibold)
            backButton.setImage(
                UIImage(systemName: "chevron.left", withConfiguration: chevronConfig),
                for: .normal
            )
            backButton.tintColor = UIColor.white
            backButton.addTarget(self, action: #selector(cancelButtonTapped), for: .touchUpInside)
            parentView.addSubview(backButton)
            overlayViews.append(backButton)
        }

        // Instruction below the header. The text is dynamic, so it must wrap to
        // as many lines as needed and never overflow.
        let instructionLabel = UILabel()
        instructionLabel.text = customization.instructionText
        instructionLabel.textColor = customization.instructionTextColor
        instructionLabel.textAlignment = .center
        instructionLabel.font = UIFont.systemFont(ofSize: 18)
        instructionLabel.numberOfLines = 0
        instructionLabel.lineBreakMode = .byWordWrapping
        let labelWidth = parentView.bounds.width - 32
        let fittedSize = instructionLabel.sizeThatFits(
            CGSize(width: labelWidth, height: .greatestFiniteMagnitude)
        )
        instructionLabel.frame = CGRect(
            x: 16,
            y: headerTop + 56 + 20,
            width: labelWidth,
            height: fittedSize.height
        )
        parentView.addSubview(instructionLabel)
        overlayViews.append(instructionLabel)

        // Bottom auto-capture indicator. Decorative only: scanning is automatic.
        let safeBottom = parentView.window?.safeAreaInsets.bottom
            ?? parentView.safeAreaInsets.bottom
        let capturePill = UIView(frame: CGRect(
            x: 16,
            y: parentView.bounds.height - safeBottom - 36 - 48,
            width: parentView.bounds.width - 32,
            height: 48
        ))
        capturePill.backgroundColor = UIColor.white.withAlphaComponent(0.1)
        capturePill.layer.cornerRadius = 8
        let capturePillLabel = UILabel(frame: capturePill.bounds)
        capturePillLabel.text = customization.autoCaptureText
        capturePillLabel.textColor = UIColor.white
        capturePillLabel.font = UIFont.boldSystemFont(ofSize: 14)
        capturePillLabel.textAlignment = .center
        capturePill.addSubview(capturePillLabel)
        parentView.addSubview(capturePill)
        overlayViews.append(capturePill)
    }
    
    @objc private func cancelButtonTapped() {
        print("MRZManager - Cancel button tapped - dismissing MRZ screen")
        
        // Return cancellation result to React Native
        if let completion = currentCompletion {
            let cancelResult: [String: Any] = [
                "success": false,
                "errorMessage": "USER_CANCELLED",
                "cancelled": true
            ]
            completion(cancelResult as NSDictionary)
            currentCompletion = nil
        }
        
        // Clean up camera and views
        let dummyCompletion: () -> Void = {}
        cancelMrzScanning(dummyCompletion)
    }
    
    private func startRealMrzCamera(customization: UICustomization) {
#if canImport(UdentifyMRZ) && canImport(UdentifyCommons)
        // Real SDK implementation when frameworks are available
        print("MRZManager - Starting real MRZ camera with Udentify SDK")
        
        // Initialize MRZCameraController with customized settings
        mrzCameraController = MRZCameraController(
            on: previewView!,
            mrzPreviewView: mrzPreviewView!,
            focusViewBorderColor: customization.focusViewBorderColor,
            focusViewStrokeWidth: customization.focusViewStrokeWidth,
            delegate: self
        )
        
        // Give camera time to initialize properly
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            self.mrzCameraController?.resumeMRZ()
            print("MRZManager - MRZ camera initialized successfully")
        }
#endif
    }
    
    private func processRealMrzImage(image: UIImage) {
#if canImport(UdentifyMRZ) && canImport(UdentifyCommons)
        // Real SDK implementation for image processing
        print("MRZManager - Processing image with real Udentify MRZ SDK")
        
        // Create MRZReader instance
        mrzReader = MRZReader()
        
        // Process the image using real Udentify SDK
        var sourceImage = image
        mrzReader?.processImage(sourceImage: &sourceImage) { [weak self] (parser, progress) in
            DispatchQueue.main.async {
                if let parser = parser {
                    // Extract MRZ data from parser
                    let mrzData = self?.extractMrzData(from: parser) ?? [:]
                    
                    let mrzResult: [String: Any] = [
                        "success": true,
                        "mrzData": mrzData,
                        // Legacy fields for backward compatibility
                        "documentNumber": mrzData["documentNumber"] ?? "",
                        "dateOfBirth": mrzData["dateOfBirth"] ?? "",
                        "dateOfExpiration": mrzData["dateOfExpiration"] ?? ""
                    ]
                    
                    self?.currentCompletion?(mrzResult as NSDictionary)
                    self?.currentCompletion = nil
                } else {
                    print("MRZManager - Image processing progress: \(Int(progress))%")
                    NotificationCenter.default.post(
                        name: NSNotification.Name("MRZProgress"),
                        object: nil,
                        userInfo: ["progress": Int(progress)]
                    )
                }
            }
        }
#endif
    }
    
    private func extractMrzData(from parser: Any) -> [String: Any] {
#if canImport(UdentifyMRZ)
        guard let mrzParser = parser as? MRZParser else {
            return [:]
        }
        
        let data = mrzParser.data()
        
        // Use only the most basic fields that are guaranteed to exist (based on Flutter implementation)
        let documentNumber = data[MRZField.DocumentNumber] as? String ?? ""
        let dateOfBirth = data[MRZField.DateOfBirth] as? String ?? ""
        let dateOfExpiration = data[MRZField.ExpirationDate] as? String ?? ""
        
        // Use safe defaults for other fields that may not be available in all SDK versions
        let documentType = ""
        let issuingCountry = ""
        let gender = ""
        let nationality = ""
        let surname = ""
        let givenNames = ""
        let optionalData1: String? = nil
        let optionalData2: String? = nil
        
        return [
            "documentType": documentType,
            "issuingCountry": issuingCountry,
            "documentNumber": documentNumber,
            "optionalData1": optionalData1 ?? "",
            "dateOfBirth": dateOfBirth,
            "gender": gender,
            "dateOfExpiration": dateOfExpiration,
            "nationality": nationality,
            "optionalData2": optionalData2 ?? "",
            "surname": surname,
            "givenNames": givenNames
        ]
#else
        return [:]
#endif
    }
    
    private func cleanupPreviewViews() {
        print("MRZManager - Cleaning up MRZ preview views and UI elements")
        
        // Ensure all UI operations happen on the main thread
        DispatchQueue.main.async { [weak self] in
            // Pause MRZ processing before cleanup
#if canImport(UdentifyMRZ) && canImport(UdentifyCommons)
            self?.mrzCameraController?.pauseMRZ()
#endif

            // Remove preview views
            self?.previewView?.removeFromSuperview()
            self?.mrzPreviewView?.removeFromSuperview()
            self?.previewView = nil
            self?.mrzPreviewView = nil

            // Remove the design 3.2 overlay chrome (title, back button, card
            // guide, instruction, auto-capture pill).
            self?.overlayViews.forEach { $0.removeFromSuperview() }
            self?.overlayViews.removeAll()

            // Remove all MRZ-related subviews from the root view
            if let window = UIApplication.shared.windows.first {
                let rootView = window.rootViewController?.view
                rootView?.subviews.forEach { subview in
                    // Remove MRZ camera views, instruction labels, and cancel button
                    if subview.backgroundColor == UIColor.black ||
                       subview.layer.borderColor == UIColor.white.cgColor ||
                       subview.layer.borderColor == UIColor.systemBlue.cgColor ||
                       (subview as? UILabel)?.text?.contains("MRZ") == true ||
                       (subview as? UILabel)?.text?.contains("document") == true ||
                       (subview as? UIButton)?.titleLabel?.text == localizedString("cancel", comment: "Cancel") {
                        print("MRZManager - Removing MRZ UI element: \(type(of: subview))")
                        subview.removeFromSuperview()
                    }
                }
            }
            
            print("MRZManager - MRZ cleanup completed - screen should be dismissed")
        }
    }
}

// MARK: - MRZ Camera Controller Delegate (Real Implementation)
#if canImport(UdentifyMRZ) && canImport(UdentifyCommons)
extension MRZManager: MRZCameraControllerDelegate {
    
    public func onStart() {
        print("MRZManager - MRZ process started")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            self.mrzCameraController?.resumeMRZ()
        }
    }
    
    public func onStop() {
        print("MRZManager - MRZ process stopped")
    }
    
    public func onPause() {
        print("MRZManager - MRZ process paused")
    }
    
    public func onResume() {
        print("MRZManager - MRZ process resumed")
    }
    
    public func onDestroy() {
        print("MRZManager - MRZ controller destroyed")
        DispatchQueue.main.async { [weak self] in
            self?.currentCompletion = nil
            self?.cleanupPreviewViews()
        }
    }
    
    public func onSuccess(documentNumber: String?, dateOfBirth: String?, dateOfExpiration: String?) {
        DispatchQueue.main.async { [weak self] in
            // Legacy callback signature - convert to modern format using safe defaults
            let mrzData: [String: Any] = [
                "documentType": "",
                "issuingCountry": "",
                "documentNumber": documentNumber ?? "",
                "optionalData1": "",
                "dateOfBirth": dateOfBirth ?? "",
                "gender": "",
                "dateOfExpiration": dateOfExpiration ?? "",
                "nationality": "",
                "optionalData2": "",
                "surname": "",
                "givenNames": ""
            ]
            
            let mrzResult: [String: Any] = [
                "success": true,
                "mrzData": mrzData,
                // Legacy fields for backward compatibility
                "documentNumber": documentNumber ?? "",
                "dateOfBirth": dateOfBirth ?? "",
                "dateOfExpiration": dateOfExpiration ?? ""
            ]
            
            self?.currentCompletion?(mrzResult as NSDictionary)
            self?.currentCompletion = nil
            
            // Clean up
            self?.mrzCameraController = nil
            self?.cleanupPreviewViews()
        }
    }
    
    public func onProgress(progress: Float) {
        if progress > 50 {
            print("MRZManager - MRZ scan progress: \(Int(progress))%")
        }
        NotificationCenter.default.post(
            name: NSNotification.Name("MRZProgress"),
            object: nil,
            userInfo: ["progress": Int(progress)]
        )
    }
    
    public func onFailure(error: Error) {
        DispatchQueue.main.async { [weak self] in
            let errorMessage: String
            
            if let cameraError = error as? CameraError {
                switch cameraError {
                case .CameraNotFound:
                    errorMessage = "CAMERA_NOT_FOUND - Couldn't find the camera"
                case .CameraPermissionRequired:
                    errorMessage = "CAMERA_PERMISSION_REQUIRED - Camera permission is required"
                case .FocusViewInvalidSize(let message):
                    errorMessage = "FOCUS_VIEW_INVALID_SIZE - MrzPreviewView's size is invalid: \(message)"
                case .SessionPresetNotAvailable:
                    errorMessage = "SESSION_PRESET_NOT_AVAILABLE - Min. 720p rear camera is required"
                case .Unknown:
                    errorMessage = "UNKNOWN_ERROR - Unknown camera error occurred"
                case .MinIOSRequirementNotSatisfied:
                    errorMessage = "MIN_IOS_REQUIREMENT_NOT_SATISFIED - Required iOS version is not supported"
                default:
                    errorMessage = "UNKNOWN_CAMERA_ERROR - An unknown camera error occurred"
                }
            } else {
                errorMessage = error.localizedDescription
            }
            
            print("MRZManager - MRZ error: \(errorMessage)")
            
            // Return error result and ensure screen dismisses
            if let completion = self?.currentCompletion {
                let mrzResult: [String: Any] = [
                    "success": false,
                    "errorMessage": errorMessage
                ]
                completion(mrzResult as NSDictionary)
            }
            self?.currentCompletion = nil
            self?.cleanupPreviewViews()
        }
    }
}
#endif
