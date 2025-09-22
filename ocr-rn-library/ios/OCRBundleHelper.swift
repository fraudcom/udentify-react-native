//
//  OCRBundleHelper.swift
//  OCRLibrary
//
//  Created for Udentify SDK localization
//

import Foundation
import ObjectiveC

@objc
class OCRBundleHelper: NSObject {
  static var localizationBundle: Bundle?
  
  @objc static func setupLocalizationBundle(_ bundle: Bundle) {
    localizationBundle = bundle
    print("OCRBundleHelper - Localization bundle set: \(bundle.bundlePath)")
    
    // Test localization
    testLocalization()
  }
  
  private static func testLocalization() {
    if let bundle = localizationBundle {
      let testKey = "udentify_ocr_status_view_title_default"
      let localizedString = bundle.localizedString(forKey: testKey, value: nil, table: nil)
      print("OCRBundleHelper - Test localization for '\(testKey)': '\(localizedString)'")
      
      if localizedString == testKey {
        print("OCRBundleHelper - WARNING: Localization not working, key returned as-is")
      } else {
        print("OCRBundleHelper - SUCCESS: Localization working")
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
    return Bundle.main.localizedString(forKey: key, value: value, table: table)
  }
}
