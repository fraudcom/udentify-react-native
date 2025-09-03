//
//  NFCManager.swift
//  NFCLibrary
//
//  Created by React Native on 01/01/25.
//

import Foundation
import UIKit
import UdentifyCommons
import UdentifyNFC

@objc(NFCManagerSwift)
class NFCManagerSwift: NSObject {
  
  @objc static let shared = NFCManagerSwift()
  private var nfcReader: NFCReader?
  private var nfcLocator: NFCLocator?
  
  // Store completion handlers (like OCR does)
  private var passportReadCompletion: (([String: Any]?, Error?) -> Void)?
  
  private override init() {
    super.init()
    NFCBundleHelper.setupLocalizationBundle()
  }
  
  @objc(isNFCAvailableWithCompletion:)
  func isNFCAvailable(completion: @escaping (Bool, Error?) -> Void) {
    DispatchQueue.main.async {
      
      if #available(iOS 13.0, *) {
        let isAvailable = true
        print("NFCManager - NFC passport reading available: \(isAvailable)")
        completion(isAvailable, nil)
      } else {
        print("NFCManager - NFC passport reading requires iOS 13.0+")
        completion(false, NSError(domain: "NFCManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "NFC passport reading requires iOS 13.0 or later"]))
      }
    }
  }
  
  @objc(isNFCEnabledWithCompletion:)
  func isNFCEnabled(completion: @escaping (Bool, Error?) -> Void) {
    DispatchQueue.main.async {
      print("NFCManager - Checking NFC enabled status")
      
      if #available(iOS 13.0, *) {
        let isEnabled = true
        print("NFCManager - NFC enabled: \(isEnabled)")
        completion(isEnabled, nil)
      } else {
        print("NFCManager - NFC not supported on iOS < 13.0")
        completion(false, NSError(domain: "NFCManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "NFC requires iOS 13.0 or later"]))
      }
    }
  }
  
  // MARK: - NFC Passport Reading Methods
  
  @objc(startNFCReadingWithCredentials:completion:)
  func startNFCReading(credentials: [String: Any], completion: @escaping ([String: Any]?, Error?) -> Void) {
    DispatchQueue.main.async {
      print("NFCManager - Starting NFC passport reading with credentials")
      
      guard #available(iOS 13.0, *) else {
        completion(nil, NSError(domain: "NFCManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "NFC passport reading requires iOS 13.0 or later"]))
        return
      }
      
      guard let documentNumber = credentials["documentNumber"] as? String,
            let dateOfBirth = credentials["dateOfBirth"] as? String,
            let expiryDate = credentials["expiryDate"] as? String,
            let serverURL = credentials["serverURL"] as? String,
            let transactionID = credentials["transactionID"] as? String else {
        completion(nil, NSError(domain: "NFCManager", code: -3, userInfo: [NSLocalizedDescriptionKey: "Missing required credentials: documentNumber, dateOfBirth, expiryDate, serverURL, transactionID"]))
        return
      }
      
      // Store completion handler (like OCR does)
      self.passportReadCompletion = completion
      
      let requestTimeout = credentials["requestTimeout"] as? Double ?? 10.0
      let isActiveAuthEnabled = credentials["isActiveAuthenticationEnabled"] as? Bool ?? true
      let isPassiveAuthEnabled = credentials["isPassiveAuthenticationEnabled"] as? Bool ?? true
      let logLevel = credentials["logLevel"] as? String ?? "warning"
      
      let nfcLogLevel: LogLevel
      switch logLevel.lowercased() {
      case "debug":
        nfcLogLevel = .debug
      case "info":
        nfcLogLevel = .info
      case "warning":
        nfcLogLevel = .warning
      case "error":
        nfcLogLevel = .error
      default:
        nfcLogLevel = .warning
      }
      
      // Get the localization bundle for NFC
      let localizationBundle = NFCBundleHelper.getLocalizationBundle()
      
      // Initialize NFCReader with Udentify SDK and proper localization bundle
      self.nfcReader = NFCReader(
        documentNumber: documentNumber,
        dateOfBirth: dateOfBirth,
        expiryDate: expiryDate,
        transactionID: transactionID,
        serverURL: serverURL,
        requestTimeout: requestTimeout,
        isActiveAuthenticationEnabled: isActiveAuthEnabled,
        isPassiveAuthenticationEnabled: isPassiveAuthEnabled,
        bundle: localizationBundle,
        tableName: nil,
        isFastModeEnabled: true,
        logLevel: nfcLogLevel
      )
      
      // Set session delegate
      self.nfcReader?.sessionDelegate = self
      
      // Start NFC reading
      self.nfcReader?.read { [weak self] (passport, error, progress) in
        DispatchQueue.main.async {
          if let passport = passport {
            print("NFCManager - NFC passport reading successful")
            
            // Convert passport data to dictionary
            let passportData = self?.convertPassportToDict(passport, transactionID: transactionID) ?? [:]
            
            // Call completion handler with result (like OCR does)
            self?.passportReadCompletion?(passportData, nil)
            self?.passportReadCompletion = nil
            
            // Clean up
            self?.nfcReader = nil
            
          } else if let progress = progress {
            print("NFCManager - NFC reading progress: \(progress)%")
            // Progress updates - could be handled differently if needed
            
          } else if let error = error {
            print("NFCManager - NFC reading failed: \(error)")
            
            // Call completion handler with error (like OCR does)
            self?.passportReadCompletion?(nil, error)
            self?.passportReadCompletion = nil
            self?.nfcReader = nil
            
          } else {
            print("NFCManager - NFC reading failed with unknown error")
            let unknownError = NSError(domain: "NFCManager", code: -4, userInfo: [NSLocalizedDescriptionKey: "Unknown error occurred during NFC reading"])
            
            // Call completion handler with error (like OCR does)
            self?.passportReadCompletion?(nil, unknownError)
            self?.passportReadCompletion = nil
            self?.nfcReader = nil
          }
        }
      }
      
      print("NFCManager - NFC passport reading started successfully")
      // Result will be returned via passportReadCompletion when NFC reading completes
    }
  }
  
  @objc(cancelNFCReadingWithCompletion:)
  func cancelNFCReading(completion: @escaping (Bool, Error?) -> Void) {
    DispatchQueue.main.async {
      print("NFCManager - Cancelling NFC reading")
      
      if let nfcReader = self.nfcReader {
        nfcReader.cancelReading {
          print("NFCManager - NFC reading cancelled successfully")
        }
        self.nfcReader = nil
      }
      
      // No completion handlers to clean up (using events now)
      
      completion(true, nil)
    }
  }
  
  // MARK: - NFC Location Methods
  
  @objc(getNFCLocationWithServerURL:completion:)
  func getNFCLocation(serverURL: String, completion: @escaping ([String: Any]?, Error?) -> Void) {
    DispatchQueue.main.async {
      print("NFCManager - Getting NFC antenna location for device")
      
      // Initialize NFCLocator with Udentify SDK
      self.nfcLocator = NFCLocator(serverURL: serverURL, requestTimeout: 15.0)
      
      // Get NFC location
      self.nfcLocator?.locateNFC { [weak self] (location, error) in
        DispatchQueue.main.async {
          if let error = error {
            print("NFCManager - NFC location error: \(error)")
            completion(nil, error)
          } else if let location = location {
            print("NFCManager - NFC location found: \(location)")
            
            let locationData: [String: Any] = [
              "success": true,
              "location": location.rawValue,
              "message": "NFC location detected successfully",
              "timestamp": Date().timeIntervalSince1970
            ]
            
            completion(locationData, nil)
          } else {
            let unknownError = NSError(domain: "NFCManager", code: -5, userInfo: [NSLocalizedDescriptionKey: "Unknown error occurred while detecting NFC location"])
            completion(nil, unknownError)
          }
          
          // Clean up
          self?.nfcLocator = nil
        }
      }
    }
  }
  
  // MARK: - Helper Methods
  
  private func convertPassportToDict(_ passport: Passport, transactionID: String) -> [String: Any] {
    var result: [String: Any] = [:]
    result["success"] = true
    result["transactionID"] = transactionID
    result["timestamp"] = Date().timeIntervalSince1970
    
    // Personal information
    result["firstName"] = passport.firstName ?? ""
    result["lastName"] = passport.lastName ?? ""
    result["documentNumber"] = passport.documentNumber ?? ""
    result["nationality"] = passport.nationality ?? ""
    result["dateOfBirth"] = passport.dateOfBirth ?? ""
    result["gender"] = passport.gender ?? ""
    result["personalNumber"] = passport.personalNumber ?? ""
    // Note: expiryDate, placeOfBirth, issuingAuthority may not be available in this Passport model
    
    // Authentication results
    switch passport.passedPA {
    case .Disabled:
      result["passedPA"] = "disabled"
    case .True:
      result["passedPA"] = "true"
    case .False:
      result["passedPA"] = "false"
    case .NotSupported:
      result["passedPA"] = "notSupported"
    @unknown default:
      result["passedPA"] = "unknown"
    }
    
    switch passport.passedAA {
    case .Disabled:
      result["passedAA"] = "disabled"
    case .True:
      result["passedAA"] = "true"
    case .False:
      result["passedAA"] = "false"
    case .NotSupported:
      result["passedAA"] = "notSupported"
    @unknown default:
      result["passedAA"] = "unknown"
    }
    
    // Convert images to base64
    if let faceImage = passport.image,
       let imageData = faceImage.jpegData(compressionQuality: 0.8) {
      result["faceImage"] = imageData.base64EncodedString()
    }
    
    // Note: signatureImage may not be available in this Passport model
    // if let signatureImage = passport.signatureImage,
    //    let signatureData = signatureImage.jpegData(compressionQuality: 0.8) {
    //   result["signatureImage"] = signatureData.base64EncodedString()
    // }
    
    return result
  }
}

// MARK: - NFCReaderSessionDelegate

extension NFCManagerSwift: NFCReaderSessionDelegate {
  
  public func nfcReaderSessionDidBegin() {
    print("NFCManager - NFC reader session started")
    
    DispatchQueue.main.async {
      // Session started - can update UI if needed
    }
  }
  
  public func nfcReaderSessionDidEnd(with message: String?) {
    print("NFCManager - NFC reader session ended: \(message ?? "")")
    
    DispatchQueue.main.async {
      // Session ended - can update UI if needed
    }
  }
}
