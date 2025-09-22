//
//  OCRManager.swift
//  OCRLibrary
//
//  Created by Fraud.com on 04/02/25.
//

import Foundation
import UIKit

// OCR Framework imports
import UdentifyCommons
import UdentifyOCR

@objc(OCRManager)
class OCRManager: NSObject {
  
  // MARK: - Notifications
  enum Notifications {
    static let ocrResult = Notification.Name("OCRManagerOCRResult")
    static let documentLivenessResult = Notification.Name("OCRManagerDocumentLivenessResult")
    static let hologramResult = Notification.Name("OCRManagerHologramResult")
    static let documentScanResult = Notification.Name("OCRManagerDocumentScanResult")
  }
  
  // OCR Camera Controller
  private var ocrCameraController: OCRCameraViewController?
  // Hologram Camera Controller
  private var hologramCameraController: HologramCameraViewController?
  
  // OCR completion handlers
  private var ocrScanCompletion: ((Bool, Error?) -> Void)?
  private var documentScanCompletion: (([String: Any]) -> Void)?
  // Hologram completion handlers
  private var hologramScanCompletion: ((Bool, Error?) -> Void)?
  private var hologramUploadCompletion: (([String: Any]?, Error?) -> Void)?
  
  private var currentServerURL: String?
  private var currentTransactionID: String?
  private var currentDocumentType: OCRDocumentType?
  
  // Store captured images for performOCR
  private var lastCapturedFrontImage: UIImage?
  private var lastCapturedBackImage: UIImage?
  
  // Store captured base64 strings (like Flutter does)
  private var lastCapturedFrontImageBase64: String = ""
  private var lastCapturedBackImageBase64: String = ""
  
  // Store UI configuration
  private var uiConfiguration: [String: Any]?
  
  @objc override init() {
    super.init()
    setupLocalizationBundle()
    
    // Also try direct OCRSettingsProvider import approach
    setupOCRSettingsDirectly()
  }
  
  private func setupOCRSettingsDirectly() {
    let libraryBundle = Bundle(for: OCRManager.self)
    
    if let resourceBundlePath = libraryBundle.path(forResource: "OCRLibraryResources", ofType: "bundle"),
       let resourceBundle = Bundle(path: resourceBundlePath) {
      
      // Create custom settings with UI configuration
      let customSettings = CustomOCRSettings(localizationBundle: resourceBundle, uiConfig: uiConfiguration)
      
      // Try to use OCRSettingsProvider directly (if accessible)
      print("OCRManager - 🔍 Trying to set OCR settings...")
      print("OCRManager - Custom settings created: \(customSettings)")
      print("OCRManager - UI Configuration: \(String(describing: uiConfiguration))")
      
      // This should work if OCRSettingsProvider is accessible
      OCRSettingsProvider.getInstance().currentSettings = customSettings
      print("OCRManager - ✅ Successfully set OCR settings directly")
    }
  }
  
  private func setupLocalizationBundle() {
    // Setup custom bundle for localization
    setupCustomLocalizationBundle()
  }
  
  private func setupCustomLocalizationBundle() {
    let libraryBundle = Bundle(for: OCRManager.self)
    
    // Find OCRLibraryResources bundle
    if let resourceBundlePath = libraryBundle.path(forResource: "OCRLibraryResources", ofType: "bundle"),
       let resourceBundle = Bundle(path: resourceBundlePath) {
      
      print("OCRManager - Found OCRLibraryResources bundle")
      
      // Try to set Udentify SDK localization bundle programmatically
      setUdentifyLocalizationBundle(resourceBundle)
      
    } else {
      print("OCRManager - Warning: Could not find OCRLibraryResources bundle")
    }
  }
  
  private func setUdentifyLocalizationBundle(_ bundle: Bundle) {
    print("OCRManager - Setting up OCRSettings with custom bundle")
    
    // Create custom OCR settings with our localization bundle
    let customSettings = CustomOCRSettings(localizationBundle: bundle)
    
    // Apply the settings globally using reflection
    if let settingsProviderClass = NSClassFromString("OCRSettingsProvider") as? NSObject.Type {
      print("OCRManager - Found OCRSettingsProvider, applying custom settings")
      
      // Get getInstance method using UnsafeMutablePointer
      let getInstanceSelector = NSSelectorFromString("getInstance")
      
      if settingsProviderClass.responds(to: getInstanceSelector) {
        let getInstanceMethod = class_getClassMethod(settingsProviderClass, getInstanceSelector)
        
        if let method = getInstanceMethod {
          let implementation = method_getImplementation(method)
          typealias GetInstanceFunction = @convention(c) (AnyClass, Selector) -> AnyObject
          let function = unsafeBitCast(implementation, to: GetInstanceFunction.self)
          
          let providerInstance = function(settingsProviderClass, getInstanceSelector)
          
          // Set currentSettings using setValue
          providerInstance.setValue(customSettings, forKey: "currentSettings")
          print("OCRManager - Successfully applied custom OCR settings via reflection")
        }
      }
    } else {
      print("OCRManager - OCRSettingsProvider not found")
    }
    
    // Test our localization
    let testKey = "udentify_ocr_status_view_title_default"
    let localizedString = bundle.localizedString(forKey: testKey, value: nil, table: nil)
    print("OCRManager - Our bundle says '\(testKey)' = '\(localizedString)'")
  }
  
  // MARK: - UI Configuration Methods
  
  @objc(configureUISettings:completion:)
  func configureUISettings(
    _ uiConfig: [String: Any],
    completion: @escaping (Bool, Error?) -> Void
  ) {
    print("OCRManager - configureUISettings called with: \(uiConfig)")
    
    // Store the UI configuration
    self.uiConfiguration = uiConfig
    
    // Re-apply OCR settings with the new UI configuration
    setupOCRSettingsDirectly()
    
    print("OCRManager - ✅ UI Configuration applied successfully")
    completion(true, nil)
  }
  
  // MARK: - OCR Methods
  
  @objc(startOCRScanning:transactionID:documentType:documentSide:completion:)
  func startOCRScanning(
    serverURL: String,
    transactionID: String,
    documentType: String,
    documentSide: String,
    completion: @escaping (Bool, Error?) -> Void
  ) {
    DispatchQueue.main.async {
      print("OCRManager - Starting OCR scanning for \(documentType)")
      print("OCRManager - Server URL: \(serverURL)")
      print("OCRManager - Transaction ID: \(transactionID)")
      print("OCRManager - Document Type: \(documentType)")
      print("OCRManager - Document Side: \(documentSide)")
      
      // Convert string parameters to appropriate enum types
      let ocrDocumentType: OCRDocumentType
      switch documentType.uppercased() {
      case "ID_CARD":
        ocrDocumentType = .ID_CARD
      case "PASSPORT":
        ocrDocumentType = .PASSPORT
      case "DRIVE_LICENCE", "DRIVER_LICENSE":
        ocrDocumentType = .DRIVE_LICENCE
      default:
        ocrDocumentType = .ID_CARD
      }
      
      let ocrDocumentSide: OCRDocumentSide
      switch documentSide.uppercased() {
      case "FRONT", "FRONTSIDE":
        ocrDocumentSide = .frontSide
      case "BACK", "BACKSIDE":
        ocrDocumentSide = .backSide
      case "BOTH", "BOTHSIDES":
        ocrDocumentSide = .bothSides
      default:
        ocrDocumentSide = .bothSides
      }
      
      // Get the current view controller to present OCR camera
      guard let topViewController = self.topViewController() else {
        completion(false, NSError(domain: "OCRManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Unable to find view controller to present OCR camera"]))
        return
      }
      
      // Instantiate OCR Camera with API disabled to get images first
      guard let vc = OCRCameraViewController.instantiate(
        withApiCallDisabled: self,
        serverURL: serverURL,
        transactionID: transactionID,
        documentType: ocrDocumentType,
        country: nil,
        documentSide: ocrDocumentSide,
        manualCapture: false
      ) else {
        completion(false, NSError(domain: "OCRManager", code: -2, userInfo: [NSLocalizedDescriptionKey: "Failed to instantiate OCR camera controller"]))
        return
      }
      
      self.ocrCameraController = vc
      vc.modalPresentationStyle = .fullScreen
      
      // Store completion and parameters for later use
      self.ocrScanCompletion = completion
      self.currentServerURL = serverURL
      self.currentTransactionID = transactionID
      self.currentDocumentType = ocrDocumentType
      
      // Present the camera
      topViewController.present(vc, animated: true)
    }
  }
  
  @objc(performOCR:transactionID:frontSideImage:backSideImage:documentType:completion:)
  func performOCR(
    serverURL: String,
    transactionID: String,
    frontSideImage: String,
    backSideImage: String,
    documentType: String,
    completion: @escaping ([String: Any]?, Error?) -> Void
  ) {
    print("OCRManager - Performing OCR with transaction ID: \(transactionID)")
    print("OCRManager - Server URL: \(serverURL)")
    print("OCRManager - Document Type: \(documentType)")
    print("OCRManager - Front Image Length: \(frontSideImage.count)")
    print("OCRManager - Back Image Length: \(backSideImage.count)")
    
    // Convert string parameters to appropriate enum types
    let ocrDocumentType: OCRDocumentType
    switch documentType.uppercased() {
    case "ID_CARD":
      ocrDocumentType = .ID_CARD
    case "PASSPORT":
      ocrDocumentType = .PASSPORT
    case "DRIVE_LICENCE", "DRIVER_LICENSE":
      ocrDocumentType = .DRIVE_LICENCE
    default:
      ocrDocumentType = .ID_CARD
    }
    
    // Convert base64 strings to UIImages, or use stored images if empty
    var frontImage: UIImage?
    var backImage: UIImage?
    
    if frontSideImage.isEmpty && backSideImage.isEmpty {
      // Use stored base64 strings and convert to UIImages (like Flutter does)
      print("OCRManager - Using stored base64 strings from document scan")
      
      if !self.lastCapturedFrontImageBase64.isEmpty {
        frontImage = base64ToUIImage(self.lastCapturedFrontImageBase64)
        print("OCRManager - Converted stored front base64 to UIImage: \(frontImage?.size ?? CGSize.zero)")
      }
      
      if !self.lastCapturedBackImageBase64.isEmpty {
        backImage = base64ToUIImage(self.lastCapturedBackImageBase64)
        print("OCRManager - Converted stored back base64 to UIImage: \(backImage?.size ?? CGSize.zero)")
      }
      
      if frontImage == nil && backImage == nil {
        print("OCRManager - ERROR: No stored base64 images found!")
      }
    } else {
      // Convert provided base64 strings to images
      frontImage = base64ToUIImage(frontSideImage)
      backImage = base64ToUIImage(backSideImage)
    }
    
    // 🔍 DEBUG: Print ALL parameters before OCR API call
    print("🔍 ===== REACT NATIVE OCR API CALL DEBUG =====")
    print("   Server URL: \(serverURL)")
    print("   Transaction ID: \(transactionID)")
    print("   Document Type: \(ocrDocumentType)")
    print("   Country: .TUR (Turkey)")
    print("   Front Image: \(frontImage != nil ? "✅ Present (\(frontImage!.size))" : "❌ Missing")")
    print("   Back Image: \(backImage != nil ? "✅ Present (\(backImage!.size))" : "❌ Missing")")
    print("   Front Image Data: \(frontImage?.jpegData(compressionQuality: 0.8)?.count ?? 0) bytes")
    print("   Back Image Data: \(backImage?.jpegData(compressionQuality: 0.8)?.count ?? 0) bytes")
    print("🔍 ================================================")
    
    // Perform actual OCR API call with TUR country
    OCRCameraViewController.performOCR(
      serverURL: serverURL,
      transactionID: transactionID,
      frontSidePhoto: frontImage,
      backSidePhoto: backImage,
      country: .TUR,  // ← SET TURKEY COUNTRY
      documentType: ocrDocumentType
    ) { (response, error) in
      DispatchQueue.main.async {
        if let error = error {
          print("OCRManager - OCR API Error: \(error)")
          completion(nil, error)
        } else if let ocrResponse = response {
          print("OCRManager - OCR API Success")
          
          // Convert OCRResponse to dictionary
          let resultDict = self.convertOCRResponseToDict(ocrResponse, transactionID: transactionID)
          completion(resultDict, nil)
        } else {
          let error = NSError(domain: "OCRManager", code: -5, userInfo: [NSLocalizedDescriptionKey: "No OCR response received"])
          completion(nil, error)
        }
      }
    }
  }
  
  @objc(performDocumentLiveness:transactionID:frontSideImage:backSideImage:completion:)
  func performDocumentLiveness(
    serverURL: String,
    transactionID: String,
    frontSideImage: String,
    backSideImage: String,
    completion: @escaping ([String: Any]?, Error?) -> Void
  ) {
    print("OCRManager - Performing Document Liveness Check for transaction: \(transactionID)")
    print("OCRManager - Server URL: \(serverURL)")
    print("OCRManager - Front Image Length: \(frontSideImage.count)")
    print("OCRManager - Back Image Length: \(backSideImage.count)")
    
    // Convert base64 strings to UIImages, or use stored images if empty
    var frontImage: UIImage?
    var backImage: UIImage?
    
    if frontSideImage.isEmpty && backSideImage.isEmpty {
      // Use stored base64 strings and convert to UIImages (like performOCR does)
      print("OCRManager - Using stored base64 strings from document scan for liveness check")
      
      if !self.lastCapturedFrontImageBase64.isEmpty {
        frontImage = base64ToUIImage(self.lastCapturedFrontImageBase64)
        print("OCRManager - Converted stored front base64 to UIImage for liveness: \(frontImage?.size ?? CGSize.zero)")
      }
      
      if !self.lastCapturedBackImageBase64.isEmpty {
        backImage = base64ToUIImage(self.lastCapturedBackImageBase64)
        print("OCRManager - Converted stored back base64 to UIImage for liveness: \(backImage?.size ?? CGSize.zero)")
      }
      
      if frontImage == nil && backImage == nil {
        print("OCRManager - ERROR: No stored base64 images found for liveness check!")
        let error = NSError(domain: "OCRManager", code: -7, userInfo: [NSLocalizedDescriptionKey: "Document liveness requires at least one valid base64 image. Both front and back images are empty, and no stored images available."])
        completion(nil, error)
        return
      }
    } else {
      // Convert provided base64 strings to images
      frontImage = base64ToUIImage(frontSideImage)
      backImage = base64ToUIImage(backSideImage)
      
      // Validate that at least one image was successfully converted
      if frontImage == nil && backImage == nil {
        let error = NSError(domain: "OCRManager", code: -8, userInfo: [NSLocalizedDescriptionKey: "Failed to convert base64 strings to valid images for document liveness check."])
        completion(nil, error)
        return
      }
    }
    
    // 🔍 DEBUG: Print ALL parameters before Document Liveness API call
    print("🔍 ===== REACT NATIVE DOCUMENT LIVENESS API CALL DEBUG =====")
    print("   Server URL: \(serverURL)")
    print("   Transaction ID: \(transactionID)")
    print("   Front Image: \(frontImage != nil ? "✅ Present (\(frontImage!.size))" : "❌ Missing")")
    print("   Back Image: \(backImage != nil ? "✅ Present (\(backImage!.size))" : "❌ Missing")")
    print("   Front Image Data: \(frontImage?.jpegData(compressionQuality: 0.8)?.count ?? 0) bytes")
    print("   Back Image Data: \(backImage?.jpegData(compressionQuality: 0.8)?.count ?? 0) bytes")
    print("🔍 ========================================================")
    
    // Perform actual Document Liveness API call
    OCRCameraViewController.performDocumentLiveness(
      serverURL: serverURL,
      transactionID: transactionID,
      frontSidePhoto: frontImage,
      backSidePhoto: backImage
    ) { (response) in
      DispatchQueue.main.async {
        if response.isFailed {
          let error = NSError(domain: "OCRManager", code: -6, userInfo: [NSLocalizedDescriptionKey: "Document liveness check failed"])
          completion(nil, error)
        } else {
          print("OCRManager - Document Liveness API Success")
          
          // Convert response to dictionary
          let resultDict = self.convertDocumentLivenessResponseToDict(response, transactionID: transactionID)
          completion(resultDict, nil)
        }
      }
    }
  }
  
  @objc(performOCRAndDocumentLiveness:transactionID:frontSideImage:backSideImage:documentType:completion:)
  func performOCRAndDocumentLiveness(
    serverURL: String,
    transactionID: String,
    frontSideImage: String,
    backSideImage: String,
    documentType: String,
    completion: @escaping ([String: Any]?, Error?) -> Void
  ) {
    print("OCRManager - Performing OCR and Document Liveness Check for transaction: \(transactionID)")
    print("OCRManager - Server URL: \(serverURL)")
    print("OCRManager - Document Type: \(documentType)")
    print("OCRManager - Front Image Length: \(frontSideImage.count)")
    print("OCRManager - Back Image Length: \(backSideImage.count)")
    
    // Convert string parameters to appropriate enum types
    let ocrDocumentType: OCRDocumentType
    switch documentType.uppercased() {
    case "ID_CARD":
      ocrDocumentType = .ID_CARD
    case "PASSPORT":
      ocrDocumentType = .PASSPORT
    case "DRIVE_LICENCE", "DRIVER_LICENSE":
      ocrDocumentType = .DRIVE_LICENCE
    default:
      ocrDocumentType = .ID_CARD
    }
    
    // Convert base64 strings to UIImages, or use stored images if empty
    var frontImage: UIImage?
    var backImage: UIImage?
    
    if frontSideImage.isEmpty && backSideImage.isEmpty {
      // Use stored base64 strings and convert to UIImages (like performOCR does)
      print("OCRManager - Using stored base64 strings from document scan for OCR and liveness check")
      
      if !self.lastCapturedFrontImageBase64.isEmpty {
        frontImage = base64ToUIImage(self.lastCapturedFrontImageBase64)
        print("OCRManager - Converted stored front base64 to UIImage for OCR and liveness: \(frontImage?.size ?? CGSize.zero)")
      }
      
      if !self.lastCapturedBackImageBase64.isEmpty {
        backImage = base64ToUIImage(self.lastCapturedBackImageBase64)
        print("OCRManager - Converted stored back base64 to UIImage for OCR and liveness: \(backImage?.size ?? CGSize.zero)")
      }
      
      if frontImage == nil && backImage == nil {
        print("OCRManager - ERROR: No stored base64 images found for OCR and liveness check!")
        let error = NSError(domain: "OCRManager", code: -9, userInfo: [NSLocalizedDescriptionKey: "OCR and document liveness requires at least one valid base64 image. Both front and back images are empty, and no stored images available."])
        completion(nil, error)
        return
      }
    } else {
      // Convert provided base64 strings to images
      frontImage = base64ToUIImage(frontSideImage)
      backImage = base64ToUIImage(backSideImage)
      
      // Validate that at least one image was successfully converted
      if frontImage == nil && backImage == nil {
        let error = NSError(domain: "OCRManager", code: -10, userInfo: [NSLocalizedDescriptionKey: "Failed to convert base64 strings to valid images for OCR and document liveness check."])
        completion(nil, error)
        return
      }
    }
    
    // 🔍 DEBUG: Print ALL parameters before OCR and Document Liveness API call
    print("🔍 ===== REACT NATIVE OCR AND DOCUMENT LIVENESS API CALL DEBUG =====")
    print("   Server URL: \(serverURL)")
    print("   Transaction ID: \(transactionID)")
    print("   Document Type: \(ocrDocumentType)")
    print("   Country: .TUR (Turkey)")
    print("   Front Image: \(frontImage != nil ? "✅ Present (\(frontImage!.size))" : "❌ Missing")")
    print("   Back Image: \(backImage != nil ? "✅ Present (\(backImage!.size))" : "❌ Missing")")
    print("   Front Image Data: \(frontImage?.jpegData(compressionQuality: 0.8)?.count ?? 0) bytes")
    print("   Back Image Data: \(backImage?.jpegData(compressionQuality: 0.8)?.count ?? 0) bytes")
    print("🔍 =================================================================")
    
    // Perform actual OCR and Document Liveness API call
    OCRCameraViewController.performOCRAndDocumentLiveness(
      serverURL: serverURL,
      transactionID: transactionID,
      frontSidePhoto: frontImage,
      backSidePhoto: backImage,
      country: .TUR,  // ← SET TURKEY COUNTRY
      documentType: ocrDocumentType
    ) { (response) in
      DispatchQueue.main.async {
        if response.isFailed {
          let error = NSError(domain: "OCRManager", code: -11, userInfo: [NSLocalizedDescriptionKey: "OCR and document liveness check failed"])
          completion(nil, error)
        } else {
          print("OCRManager - OCR and Document Liveness API Success")
          
          // Convert response to dictionary (this already includes both OCR and liveness data)
          let resultDict = self.convertDocumentLivenessResponseToDict(response, transactionID: transactionID)
          completion(resultDict, nil)
        }
      }
    }
  }
  
  // MARK: - Hologram Methods
  
  @objc(startHologramCamera:transactionID:completion:)
  func startHologramCamera(
    serverURL: String,
    transactionID: String,
    completion: @escaping (Bool, Error?) -> Void
  ) {
    DispatchQueue.main.async {
      print("OCRManager - Starting Hologram Camera")
      print("OCRManager - Server URL: \(serverURL)")
      print("OCRManager - Transaction ID: \(transactionID)")
      
      // Get the current view controller to present Hologram camera
      guard let topViewController = self.topViewController() else {
        completion(false, NSError(domain: "OCRManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Unable to find view controller to present Hologram camera"]))
        return
      }
      
      // Instantiate Hologram Camera
      guard let vc = HologramCameraViewController.instantiate(
        delegate: self,
        serverURL: serverURL,
        transactionID: transactionID
      ) else {
        completion(false, NSError(domain: "OCRManager", code: -2, userInfo: [NSLocalizedDescriptionKey: "Failed to instantiate Hologram camera controller"]))
        return
      }
      
      self.hologramCameraController = vc
      vc.modalPresentationStyle = .fullScreen
      
      // Store completion and parameters for later use
      self.hologramScanCompletion = completion
      self.currentServerURL = serverURL
      self.currentTransactionID = transactionID
      
      // Present the camera
      topViewController.present(vc, animated: true)
    }
  }
  
  @objc(performHologramCheck:transactionID:videoUrls:completion:)
  func performHologramCheck(
    serverURL: String,
    transactionID: String,
    videoUrls: [String],
    completion: @escaping ([String: Any]?, Error?) -> Void
  ) {
    print("OCRManager - Performing Hologram Check with transaction ID: \(transactionID)")
    print("OCRManager - Server URL: \(serverURL)")
    print("OCRManager - Video URLs count: \(videoUrls.count)")
    
    // Convert string URLs to URL objects
    let urlObjects = videoUrls.compactMap { URL(string: $0) }
    
    if urlObjects.isEmpty {
      let error = NSError(domain: "OCRManager", code: -9, userInfo: [NSLocalizedDescriptionKey: "No valid video URLs provided for hologram check"])
      completion(nil, error)
      return
    }
    
    // Perform actual Hologram API call
    HologramCameraViewController.uploadHologramVideo(
      serverURL: serverURL,
      transactionID: transactionID,
      paths: urlObjects
    ) { (response) in
      DispatchQueue.main.async {
        if let error = response.error {
          print("OCRManager - Hologram API Error: \(error)")
          completion(nil, error)
        } else {
          print("OCRManager - Hologram API Success")
          
          // Convert HologramResponse to dictionary
          let resultDict = self.convertHologramResponseToDict(response, transactionID: transactionID)
          completion(resultDict, nil)
        }
      }
    }
  }
  
  // MARK: - Helper Methods
  
  private func base64ToUIImage(_ base64String: String) -> UIImage? {
    guard let imageData = Data(base64Encoded: base64String) else {
      print("OCRManager - Failed to decode base64 image")
      return nil
    }
    return UIImage(data: imageData)
  }
  
  
  private func topViewController() -> UIViewController? {
    guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
          let window = windowScene.windows.first else {
      return nil
    }
    
    var topController = window.rootViewController
    while let presentedViewController = topController?.presentedViewController {
      topController = presentedViewController
    }
    return topController
  }
  
  private func convertOCRResponseToDict(_ response: OCRResponse, transactionID: String) -> [String: Any] {
    var resultDict: [String: Any] = [:]
    resultDict["success"] = true
    resultDict["transactionID"] = transactionID
    resultDict["timestamp"] = Date().timeIntervalSince1970
    
    switch response {
    case .idCard(let idCardResponse):
      resultDict["documentType"] = "ID_CARD"
      
      // Build extracted data dictionary step by step for ID Card
      var extractedData: [String: Any] = [:]
      extractedData["firstName"] = idCardResponse.firstName ?? ""
      extractedData["lastName"] = idCardResponse.lastName ?? ""
      extractedData["documentNumber"] = idCardResponse.documentID ?? ""
      extractedData["identityNo"] = idCardResponse.identityNo ?? ""
      extractedData["expiryDate"] = idCardResponse.expiryDate ?? ""
      extractedData["birthDate"] = idCardResponse.birthDate ?? ""
      extractedData["nationality"] = idCardResponse.nationality ?? ""
      extractedData["gender"] = idCardResponse.gender ?? ""
      extractedData["countryCode"] = idCardResponse.countryCode ?? ""
      extractedData["documentIssuer"] = idCardResponse.documentIssuer ?? ""
      extractedData["motherName"] = idCardResponse.motherName ?? ""
      extractedData["fatherName"] = idCardResponse.fatherName ?? ""
      extractedData["isDocumentExpired"] = idCardResponse.isOCRDocumentExpired ?? false
      extractedData["isIDValid"] = idCardResponse.isOCRIDValid ?? false
      extractedData["hasPhoto"] = idCardResponse.hasOCRPhoto ?? false
      extractedData["hasSignature"] = idCardResponse.hasOCRSignature ?? false
      
      resultDict["extractedData"] = extractedData
      
    case .driverLicense(let driverLicenseResponse):
      resultDict["documentType"] = "DRIVER_LICENSE"
      
      // Build extracted data dictionary step by step for Driver License
      var extractedData: [String: Any] = [:]
      extractedData["firstName"] = driverLicenseResponse.firstName ?? ""
      extractedData["lastName"] = driverLicenseResponse.lastName ?? ""
      extractedData["documentNumber"] = driverLicenseResponse.documentID ?? ""
      extractedData["identityNo"] = driverLicenseResponse.identityNo ?? ""
      extractedData["expiryDate"] = driverLicenseResponse.expiryDate ?? ""
      extractedData["birthDate"] = driverLicenseResponse.birthDate ?? ""
      extractedData["countryCode"] = driverLicenseResponse.countryCode ?? ""
      extractedData["issueDate"] = driverLicenseResponse.issueDate ?? ""
      extractedData["licenseType"] = driverLicenseResponse.ocrLicenceType ?? ""
      extractedData["city"] = driverLicenseResponse.city ?? ""
      extractedData["district"] = driverLicenseResponse.district ?? ""
      extractedData["isDocumentExpired"] = driverLicenseResponse.isOCRDocumentExpired ?? false
      extractedData["isIDValid"] = driverLicenseResponse.isOCRIDValid ?? false
      
      resultDict["extractedData"] = extractedData
    }
    
    return resultDict
  }
  
  private func convertDocumentLivenessResponseToDict(_ response: OCRAndDocumentLivenessResponse, transactionID: String) -> [String: Any] {
    var resultDict: [String: Any] = [:]
    resultDict["success"] = !response.isFailed
    resultDict["transactionID"] = transactionID
    resultDict["timestamp"] = Date().timeIntervalSince1970
    
    // Add front side liveness data
    if let frontData = response.documentLivenessDataFront?.documentLivenessResponse {
      let frontProbabilityString = frontData.aggregateDocumentLivenessProbability ?? "0"
      resultDict["frontSideProbability"] = Double(frontProbabilityString) ?? 0.0
      
      // Build front side results array step by step
      var frontSideResults: [[String: Any]] = []
      if let pipelineResults = frontData.pipelineResults {
        for result in pipelineResults {
          var resultDict: [String: Any] = [:]
          resultDict["name"] = result.name ?? ""
          
          let probabilityString = result.documentLivenessProbability ?? "0"
          resultDict["probability"] = Double(probabilityString) ?? 0.0
          resultDict["calibration"] = result.calibration ?? ""
          
          frontSideResults.append(resultDict)
        }
      }
      resultDict["frontSideResults"] = frontSideResults
    }
    
    // Add back side liveness data
    if let backData = response.documentLivenessDataBack?.documentLivenessResponse {
      let backProbabilityString = backData.aggregateDocumentLivenessProbability ?? "0"
      resultDict["backSideProbability"] = Double(backProbabilityString) ?? 0.0
      
      // Build back side results array step by step
      var backSideResults: [[String: Any]] = []
      if let pipelineResults = backData.pipelineResults {
        for result in pipelineResults {
          var resultDict: [String: Any] = [:]
          resultDict["name"] = result.name ?? ""
          
          let probabilityString = result.documentLivenessProbability ?? "0"
          resultDict["probability"] = Double(probabilityString) ?? 0.0
          resultDict["calibration"] = result.calibration ?? ""
          
          backSideResults.append(resultDict)
        }
      }
      resultDict["backSideResults"] = backSideResults
    }
    
    // Add OCR data if available
    if let ocrData = response.ocrData {
      if let ocrResponse = ocrData.ocrResponse {
        resultDict["ocrData"] = convertOCRResponseToDict(ocrResponse, transactionID: transactionID)
      }
    }
    
    return resultDict
  }
  
  private func convertHologramResponseToDict(_ response: HologramResponse, transactionID: String) -> [String: Any] {
    var resultDict: [String: Any] = [:]
    resultDict["success"] = response.error == nil
    resultDict["transactionID"] = transactionID
    resultDict["timestamp"] = Date().timeIntervalSince1970
    
    // Add hologram specific data
    resultDict["idNumber"] = response.idNumber ?? ""
    resultDict["hologramExists"] = response.hologramExists ?? false
    resultDict["ocrIdAndHologramIdMatch"] = response.ocrIdAndHologramIdMatch ?? false
    resultDict["ocrFaceAndHologramFaceMatch"] = response.ocrFaceAndHologramFaceMatch ?? false
    
    // Convert hologram face image to base64 if available
    if let hologramImage = response.hologramFaceImage,
       let imageData = hologramImage.jpegData(compressionQuality: 0.8) {
      resultDict["hologramFaceImageBase64"] = imageData.base64EncodedString()
    }
    
    // Add error information if available
    if let error = response.error {
      resultDict["error"] = error.localizedDescription
    }
    
    return resultDict
  }
}

// MARK: - Camera Controller Delegates
@available(iOS 11.0, *)
extension OCRManager: OCRCameraControllerDelegate, HologramCameraControllerDelegate {
  
  func willDismiss(controllerType: UdentifyOCR.ControllerType) {
    if controllerType == .OcrViewController {
      print("OCRManager - OCR Camera will dismiss")
    } else if controllerType == .HologramViewController {
      print("OCRManager - Hologram Camera will dismiss")
    }
  }
  
  func didDismiss(controllerType: UdentifyOCR.ControllerType) {
    if controllerType == .OcrViewController {
      print("OCRManager - OCR Camera did dismiss")
      self.ocrCameraController = nil
    } else if controllerType == .HologramViewController {
      print("OCRManager - Hologram Camera did dismiss")
      self.hologramCameraController = nil
    }
  }
  
  public func onSuccess(response: OCRResponse) {
    print("OCRManager - OCR Success: \(response)")
    self.ocrScanCompletion?(true, nil)
    self.ocrScanCompletion = nil
  }
  
  public func onFailure(error: Error) {
    // Try to determine if this is OCR or Hologram failure based on which completion handler is active
    if self.ocrScanCompletion != nil {
      print("OCRManager - OCR Failed: \(error)")
      // Emit OCR error event
      NotificationCenter.default.post(
        name: NSNotification.Name("OCROCRError"), 
        object: nil, 
        userInfo: ["message": error.localizedDescription]
      )
      self.ocrScanCompletion?(false, error)
      self.ocrScanCompletion = nil
    } else if self.hologramScanCompletion != nil {
      print("OCRManager - Hologram Failed: \(error)")
      // Emit hologram error event
      NotificationCenter.default.post(
        name: NSNotification.Name("OCRHologramError"), 
        object: nil, 
        userInfo: ["message": error.localizedDescription]
      )
      self.hologramScanCompletion?(false, error)
      self.hologramScanCompletion = nil
    } else {
      print("OCRManager - Unknown failure: \(error)")
    }
  }
  
  public func onDocumentScan(for documentSide: OCRDocumentSide, frontSidePhoto: UIImage?, backSidePhoto: UIImage?) {
    print("OCRManager - Document scanned for side: \(documentSide)")
    
    // Convert OCRDocumentSide enum to string representation
    let documentSideString: String
    switch documentSide {
    case .frontSide:
      documentSideString = "frontSide"
    case .backSide:
      documentSideString = "backSide"
    case .bothSides:
      documentSideString = "bothSides"
    @unknown default:
      documentSideString = "unknown"
    }
    
    // Convert images to base64 for React Native consumption
    var frontSideBase64: String = ""
    var backSideBase64: String = ""
    
    if let frontImage = frontSidePhoto,
       let frontData = frontImage.jpegData(compressionQuality: 0.8) {
      frontSideBase64 = frontData.base64EncodedString()
      print("OCRManager - Front image converted to base64 (\(frontData.count) bytes)")
    }
    
    if let backImage = backSidePhoto,
       let backData = backImage.jpegData(compressionQuality: 0.8) {
      backSideBase64 = backData.base64EncodedString()
      print("OCRManager - Back image converted to base64 (\(backData.count) bytes)")
    }
    
    // Prepare scan result data (similar to Flutter approach)
    var scanResult: [String: Any] = [:]
    scanResult["documentSide"] = documentSideString
    scanResult["frontSidePhoto"] = frontSideBase64
    scanResult["backSidePhoto"] = backSideBase64
    
    if let transactionID = currentTransactionID {
      scanResult["transactionID"] = transactionID
    }
    
    if let serverURL = currentServerURL {
      scanResult["serverURL"] = serverURL
    }
    
    if let documentType = currentDocumentType {
      scanResult["documentType"] = documentType.rawValue
    }
    
    // Store images for later use in performOCR
    self.lastCapturedFrontImage = frontSidePhoto
    self.lastCapturedBackImage = backSidePhoto
    
    // Also store base64 strings (like Flutter does)
    self.lastCapturedFrontImageBase64 = frontSideBase64
    self.lastCapturedBackImageBase64 = backSideBase64
    
    // Debug: Confirm images are stored
    print("OCRManager - Stored front image: \(frontSidePhoto != nil ? "✅ \(frontSidePhoto!.size)" : "❌ nil")")
    print("OCRManager - Stored back image: \(backSidePhoto != nil ? "✅ \(backSidePhoto!.size)" : "❌ nil")")
    print("OCRManager - Stored front base64: \(frontSideBase64.count) chars")
    print("OCRManager - Stored back base64: \(backSideBase64.count) chars")
    
    // Call the document scan completion callback (like Flutter's channel.invokeMethod)
    if let callback = self.documentScanCompletion {
      callback(scanResult)
    }
    
    // Complete the scanning process successfully
    print("OCRManager - Document scan completed, images ready for performOCR")
    self.ocrScanCompletion?(true, nil)
    self.ocrScanCompletion = nil
    self.documentScanCompletion = nil
  }
  
  func onBackButtonPressed(at controllerType: UdentifyOCR.ControllerType) {
    if controllerType == .OcrViewController {
      print("OCRManager - OCR back button pressed")
      self.ocrScanCompletion?(false, NSError(domain: "OCRManager", code: -4, userInfo: [NSLocalizedDescriptionKey: "User cancelled OCR scanning"]))
      self.ocrScanCompletion = nil
    } else if controllerType == .HologramViewController {
      print("OCRManager - Hologram back button pressed")
      self.hologramScanCompletion?(false, NSError(domain: "OCRManager", code: -4, userInfo: [NSLocalizedDescriptionKey: "User cancelled Hologram scanning"]))
      self.hologramScanCompletion = nil
    }
  }
  
  func onDestroy(controllerType: UdentifyOCR.ControllerType) {
    if controllerType == .OcrViewController {
      print("OCRManager - OCR Camera destroyed")
      self.ocrCameraController = nil
    } else if controllerType == .HologramViewController {
      print("OCRManager - Hologram Camera destroyed")
      self.hologramCameraController = nil
    }
  }
  
  func didFinishOcrAndDocumentLivenessCheck(response: OCRAndDocumentLivenessResponse) {
    print("OCRManager - OCR and Document Liveness finished: \(response)")
    self.ocrScanCompletion?(true, nil)
    self.ocrScanCompletion = nil
  }
  
  // MARK: - Hologram-specific delegate methods
  
  public func onVideoRecordFinished(videoUrls: [URL]) {
    print("OCRManager - Hologram video recorded successfully, URLs: \(videoUrls)")
    
    // Convert URLs to string array and store for upload
    let urlStrings = videoUrls.map { $0.absoluteString }
    
    // Emit video recorded event immediately (like Android)
    NotificationCenter.default.post(
      name: NSNotification.Name("OCRHologramVideoRecorded"), 
      object: nil, 
      userInfo: ["videoUrls": urlStrings]
    )
    
    // Call performHologramCheck API with the recorded video URLs
    guard let serverURL = currentServerURL,
          let transactionID = currentTransactionID else {
      self.hologramScanCompletion?(false, NSError(domain: "OCRManager", code: -3, userInfo: [NSLocalizedDescriptionKey: "Missing Hologram parameters"]))
      return
    }
    
    // Store the upload completion for later notification
    self.hologramUploadCompletion = { [weak self] (result, error) in
      if let error = error {
        print("OCRManager - Hologram upload error: \(error)")
        // Emit error event to React Native
        NotificationCenter.default.post(
          name: NSNotification.Name("OCRHologramError"), 
          object: nil, 
          userInfo: ["message": error.localizedDescription]
        )
      } else if let result = result, let strongSelf = self, let txId = strongSelf.currentTransactionID {
        print("OCRManager - Hologram upload success")
        // Emit hologram result to React Native (like Android)
        NotificationCenter.default.post(
          name: NSNotification.Name("OCRHologramComplete"), 
          object: nil, 
          userInfo: result
        )
        // Keep old notification for backward compatibility
        NotificationCenter.default.post(name: Notifications.hologramResult, object: nil, userInfo: result)
      }
    }
    
    // Perform Hologram upload
    performHologramCheck(
      serverURL: serverURL,
      transactionID: transactionID,
      videoUrls: urlStrings
    ) { [weak self] (result, error) in
      DispatchQueue.main.async {
        self?.hologramUploadCompletion?(result, error)
        self?.hologramScanCompletion?(error == nil, error)
        self?.hologramScanCompletion = nil
        self?.hologramUploadCompletion = nil
      }
    }
  }
}
