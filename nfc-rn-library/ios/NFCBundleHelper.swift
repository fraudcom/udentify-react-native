//
//  NFCBundleHelper.swift
//  NFCLibrary
//
//  Created for Udentify NFC SDK localization
//

import Foundation
import UdentifyNFC

@objc
class NFCBundleHelper: NSObject {
  static var localizationBundle: Bundle?
  
  @objc static func setupLocalizationBundle() {
    // First try to find our custom resource bundle
    if let resourceBundle = getNFCResourceBundle() {
      localizationBundle = resourceBundle
      print("NFCBundleHelper - Using NFCLibraryResources bundle: \(resourceBundle.bundlePath)")
      testLocalization()
    } else if let frameworkBundle = getUdentifyNFCBundle() {
      localizationBundle = frameworkBundle
      print("NFCBundleHelper - Using UdentifyNFC framework bundle: \(frameworkBundle.bundlePath)")
      testLocalization()
    } else {
      print("NFCBundleHelper - Warning: Could not find localization bundle, falling back to main bundle")
      localizationBundle = Bundle.main
    }
  }
  
  private static func getNFCResourceBundle() -> Bundle? {
    // Try to find the NFCLibraryResources bundle (similar to OCR approach)
    let libraryBundle = Bundle(for: NFCBundleHelper.self)
    
    if let resourceBundlePath = libraryBundle.path(forResource: "NFCLibraryResources", ofType: "bundle"),
       let resourceBundle = Bundle(path: resourceBundlePath) {
      print("NFCBundleHelper - Found NFCLibraryResources bundle")
      if hasLocalizationResources(in: resourceBundle) {
        return resourceBundle
      }
    }
    
    print("NFCBundleHelper - NFCLibraryResources bundle not found or has no localization")
    return nil
  }
  
  private static func getUdentifyNFCBundle() -> Bundle? {
    // First try to get the bundle from the UdentifyNFC framework class
    let nfcReaderClass = NFCReader.self
    let frameworkBundle = Bundle(for: nfcReaderClass)
    
    print("NFCBundleHelper - Found framework bundle: \(frameworkBundle.bundlePath)")
    
    // Check if this bundle contains localization resources
    if hasLocalizationResources(in: frameworkBundle) {
      return frameworkBundle
    }
    
    // If framework bundle doesn't have resources, try to find the embedded bundle
    if let resourcePath = frameworkBundle.path(forResource: "UdentifyNFC", ofType: "bundle"),
       let resourceBundle = Bundle(path: resourcePath) {
      print("NFCBundleHelper - Found resource bundle: \(resourceBundle.bundlePath)")
      if hasLocalizationResources(in: resourceBundle) {
        return resourceBundle
      }
    }
    
    return frameworkBundle // Return framework bundle as fallback
  }
  
  private static func hasLocalizationResources(in bundle: Bundle) -> Bool {
    // Check for English localization
    if let _ = bundle.path(forResource: "Localizable", ofType: "strings", inDirectory: "en.lproj") {
      print("NFCBundleHelper - Found English localization in bundle")
      return true
    }
    
    // Check for Turkish localization
    if let _ = bundle.path(forResource: "Localizable", ofType: "strings", inDirectory: "tr.lproj") {
      print("NFCBundleHelper - Found Turkish localization in bundle")
      return true
    }
    
    print("NFCBundleHelper - No localization resources found in bundle")
    return false
  }
  
  private static func testLocalization() {
    if let bundle = localizationBundle {
      let testKeys = [
        "nfc_reading_message",
        "nfc_reading_directive", 
        "nfc_error_connection_failed_message"
      ]
      
      for testKey in testKeys {
        let localizedString = bundle.localizedString(forKey: testKey, value: nil, table: nil)
        print("NFCBundleHelper - Test localization for '\(testKey)': '\(localizedString)'")
        
        if localizedString != testKey {
          print("NFCBundleHelper - SUCCESS: Localization working for \(testKey)")
          return
        }
      }
      
      print("NFCBundleHelper - WARNING: Localization test failed, all keys returned as-is")
    }
  }
  
  @objc static func getLocalizationBundle() -> Bundle {
    if localizationBundle == nil {
      setupLocalizationBundle()
    }
    return localizationBundle ?? Bundle.main
  }
  
  @objc static func localizedString(forKey key: String, value: String?, table: String?) -> String {
    if let bundle = localizationBundle {
      let result = bundle.localizedString(forKey: key, value: value, table: table)
      if result != key {
        return result
      }
    }
    
    // Fallback to main bundle
    return Bundle.main.localizedString(forKey: key, value: value, table: table)
  }
}
