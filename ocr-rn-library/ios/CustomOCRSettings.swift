//
//  CustomOCRSettings.swift
//  OCRLibrary
//
//  Created for OCR custom bundle configuration and UI customization
//

import Foundation
import UdentifyOCR
import UdentifyCommons

class CustomOCRSettings: NSObject, OCRSettings {
  private let localizationBundle: Bundle
  private let uiConfig: [String: Any]?
  
  init(localizationBundle: Bundle, uiConfig: [String: Any]? = nil) {
    self.localizationBundle = localizationBundle
    self.uiConfig = uiConfig
    super.init()
  }
  
  var configs: OCRConfigs {
    return OCRConfigs(
      // Placeholder Container Style
      placeholderContainerStyle: getPlaceholderContainerStyle(),
      
      // Placeholder Template
      placeholderTemplate: getPlaceholderTemplate(),
      
      // Detection Accuracy (0-200, default: 10)
      detectionAccuracy: getDetectionAccuracy(),
      
      // Button Back Color
      buttonBackColor: getButtonBackColor(),
      
      // Mask Layer Color
      maskLayerColor: getMaskLayerColor(),
      
      // Button Styles
      footerViewStyle: getFooterViewStyle(),
      buttonUseStyle: getButtonUseStyle(),
      buttonRetakeStyle: getButtonRetakeStyle(),
      
      // Localization
      orientation: getOrientation(),
      
      bundle: localizationBundle,
      
      tableName: getTableName(),
      
      // Blur Coefficient (-1 to 1, default: 0)
      blurCoefficient: getBlurCoefficient(),
      
      // Request Timeout (default: 30 seconds)
      requestTimeout: getRequestTimeout(),
      
      // Boolean Settings
      backButtonEnabled: getBackButtonEnabled(),
      reviewScreenEnabled: getReviewScreenEnabled(),
      footerViewHidden: getFooterViewHidden(),
      
      // Text Styles
      titleLabelStyle: getTitleLabelStyle(),
      instructionLabelStyle: getInstructionLabelStyle(),
      reviewTitleLabelStyle: getReviewTitleLabelStyle(),
      reviewInstructionLabelStyle: getReviewInstructionLabelStyle(),
      
      // Progress Bar Style (for hologram)
      progressBarStyle: getProgressBarStyle()
    )
  }
  
  // MARK: - Helper Methods for Configuration Parsing
  
  private func getPlaceholderContainerStyle() -> UdentifyCommons.UdentifyViewStyle {
    let backgroundColor = parseColor(uiConfig?["backgroundColor"] as? String) ?? .purple.withAlphaComponent(0.6)
    let borderColor = parseColor(uiConfig?["borderColor"] as? String) ?? .white
    let cornerRadius = uiConfig?["cornerRadius"] as? CGFloat ?? 8.0
    let borderWidth = uiConfig?["borderWidth"] as? CGFloat ?? 2.0
    
    return UdentifyCommons.UdentifyViewStyle(
      backgroundColor: backgroundColor,
      borderColor: borderColor,
      cornerRadius: cornerRadius,
      borderWidth: borderWidth
    )
  }
  
  private func getPlaceholderTemplate() -> PlaceholderTemplate {
    guard let templateString = uiConfig?["placeholderTemplate"] as? String else {
      return .defaultStyle
    }
    
    switch templateString.lowercased() {
    case "hidden":
      return .hidden
    case "defaultstyle", "default":
      return .defaultStyle
    case "countryspecificstyle", "countryspecific":
      return .countrySpecificStyle
    default:
      return .defaultStyle
    }
  }
  
  private func getDetectionAccuracy() -> Int {
    let accuracy = uiConfig?["detectionAccuracy"] as? Int ?? 10
    return min(max(accuracy, 0), 200) // Clamp between 0-200
  }
  
  private func getButtonBackColor() -> UIColor {
    return parseColor(uiConfig?["buttonBackColor"] as? String) ?? .white
  }
  
  private func getMaskLayerColor() -> UIColor {
    return parseColor(uiConfig?["maskLayerColor"] as? String) ?? .clear
  }
  
  private func getFooterViewStyle() -> UdentifyCommons.UdentifyButtonStyle {
    let backgroundColor = parseColor(uiConfig?["footerBackgroundColor"] as? String) ?? .purple.withAlphaComponent(0.6)
    let textColor = parseColor(uiConfig?["footerTextColor"] as? String) ?? .white
    let fontSize = uiConfig?["footerFontSize"] as? CGFloat ?? 20.0
    let height = uiConfig?["footerHeight"] as? CGFloat ?? 70.0
    
    return UdentifyCommons.UdentifyButtonStyle(
      backgroundColor: backgroundColor,
      borderColor: .clear,
      cornerRadius: 8,
      borderWidth: 0,
      contentAlignment: .center,
      height: height,
      leading: 20,
      trailing: 20,
      font: UIFont.boldSystemFont(ofSize: fontSize),
      textColor: textColor,
      textAlignment: .center,
      lineBreakMode: .byTruncatingTail,
      numberOfLines: 1
    )
  }
  
  private func getButtonUseStyle() -> UdentifyCommons.UdentifyButtonStyle {
    let backgroundColor = parseColor(uiConfig?["useButtonBackgroundColor"] as? String) ?? .purple
    let textColor = parseColor(uiConfig?["useButtonTextColor"] as? String) ?? .white
    let fontSize = uiConfig?["useButtonFontSize"] as? CGFloat ?? 20.0
    let height = uiConfig?["useButtonHeight"] as? CGFloat ?? 70.0
    
    return UdentifyCommons.UdentifyButtonStyle(
      backgroundColor: backgroundColor,
      borderColor: .clear,
      cornerRadius: 8,
      borderWidth: 0,
      contentAlignment: .center,
      height: height,
      leading: 20,
      trailing: 20,
      font: UIFont.boldSystemFont(ofSize: fontSize),
      textColor: textColor,
      textAlignment: .center,
      lineBreakMode: .byTruncatingTail,
      numberOfLines: 1
    )
  }
  
  private func getButtonRetakeStyle() -> UdentifyCommons.UdentifyButtonStyle {
    let backgroundColor = parseColor(uiConfig?["retakeButtonBackgroundColor"] as? String) ?? .purple
    let textColor = parseColor(uiConfig?["retakeButtonTextColor"] as? String) ?? .white
    let fontSize = uiConfig?["retakeButtonFontSize"] as? CGFloat ?? 20.0
    let height = uiConfig?["retakeButtonHeight"] as? CGFloat ?? 70.0
    
    return UdentifyCommons.UdentifyButtonStyle(
      backgroundColor: backgroundColor,
      borderColor: .clear,
      cornerRadius: 8,
      borderWidth: 0,
      contentAlignment: .center,
      height: height,
      leading: 20,
      trailing: 20,
      font: UIFont.boldSystemFont(ofSize: fontSize),
      textColor: textColor,
      textAlignment: .center,
      lineBreakMode: .byTruncatingTail,
      numberOfLines: 1
    )
  }
  
  private func getTableName() -> String? {
    return uiConfig?["tableName"] as? String
  }
  
  private func getOrientation() -> OCROrientation {
    guard let orientationString = uiConfig?["orientation"] as? String else {
      return .horizontal
    }
    
    switch orientationString.lowercased() {
    case "vertical":
      return .vertical
    case "horizontal":
      return .horizontal
    default:
      return .horizontal
    }
  }
  
  private func getBlurCoefficient() -> Double {
    let coefficient = uiConfig?["blurCoefficient"] as? Double ?? 0.0
    return min(max(coefficient, -1.0), 1.0) // Clamp between -1 and 1
  }
  
  private func getRequestTimeout() -> Double {
    return uiConfig?["requestTimeout"] as? Double ?? 30.0
  }
  
  private func getBackButtonEnabled() -> Bool {
    return uiConfig?["backButtonEnabled"] as? Bool ?? true
  }
  
  private func getReviewScreenEnabled() -> Bool {
    return uiConfig?["reviewScreenEnabled"] as? Bool ?? true
  }
  
  private func getFooterViewHidden() -> Bool {
    return uiConfig?["footerViewHidden"] as? Bool ?? false
  }
  
  private func getTitleLabelStyle() -> UdentifyCommons.UdentifyTextStyle? {
    guard getFooterViewHidden() else { return nil }
    
    let textColor = parseColor(uiConfig?["titleTextColor"] as? String) ?? .white
    let fontSize = uiConfig?["titleFontSize"] as? CGFloat ?? 24.0
    
    return UdentifyCommons.UdentifyTextStyle(
      font: UIFont.boldSystemFont(ofSize: fontSize),
      textColor: textColor,
      textAlignment: .center,
      lineBreakMode: .byWordWrapping,
      numberOfLines: 0,
      leading: 20,
      trailing: 20
    )
  }
  
  private func getInstructionLabelStyle() -> UdentifyCommons.UdentifyTextStyle? {
    guard getFooterViewHidden() else { return nil }
    
    let textColor = parseColor(uiConfig?["instructionTextColor"] as? String) ?? .white
    let fontSize = uiConfig?["instructionFontSize"] as? CGFloat ?? 16.0
    
    return UdentifyCommons.UdentifyTextStyle(
      font: UIFont.boldSystemFont(ofSize: fontSize),
      textColor: textColor,
      textAlignment: .center,
      lineBreakMode: .byWordWrapping,
      numberOfLines: 0,
      leading: 20,
      trailing: 20
    )
  }
  
  private func getReviewTitleLabelStyle() -> UdentifyCommons.UdentifyTextStyle {
    let textColor = parseColor(uiConfig?["reviewTitleTextColor"] as? String) ?? .label
    let fontSize = uiConfig?["reviewTitleFontSize"] as? CGFloat ?? 24.0
    
    return UdentifyCommons.UdentifyTextStyle(
      font: UIFont.boldSystemFont(ofSize: fontSize),
      textColor: textColor,
      textAlignment: .left,
      lineBreakMode: .byWordWrapping,
      numberOfLines: 0,
      leading: 20,
      trailing: 20
    )
  }
  
  private func getReviewInstructionLabelStyle() -> UdentifyCommons.UdentifyTextStyle {
    let textColor = parseColor(uiConfig?["reviewInstructionTextColor"] as? String) ?? .label
    let fontSize = uiConfig?["reviewInstructionFontSize"] as? CGFloat ?? 16.0
    
    return UdentifyCommons.UdentifyTextStyle(
      font: UIFont.boldSystemFont(ofSize: fontSize),
      textColor: textColor,
      textAlignment: .left,
      lineBreakMode: .byWordWrapping,
      numberOfLines: 0,
      leading: 20,
      trailing: 20
    )
  }
  
  private func getProgressBarStyle() -> UdentifyCommons.UdentifyProgressBarStyle {
    let backgroundColor = parseColor(uiConfig?["progressBackgroundColor"] as? String) ?? .purple.withAlphaComponent(0.7)
    let progressColor = parseColor(uiConfig?["progressColor"] as? String) ?? .green
    let completionColor = parseColor(uiConfig?["progressCompletionColor"] as? String) ?? .green
    let cornerRadius = uiConfig?["progressCornerRadius"] as? CGFloat ?? 8.0
    let textColor = parseColor(uiConfig?["progressTextColor"] as? String) ?? .white
    let fontSize = uiConfig?["progressFontSize"] as? CGFloat ?? 24.0
    
    let textStyle = UdentifyTextStyle(
      font: UIFont.boldSystemFont(ofSize: fontSize),
      textColor: textColor,
      textAlignment: .center,
      lineBreakMode: .byWordWrapping,
      numberOfLines: 1,
      leading: 20,
      trailing: 20
    )
    
    return UdentifyCommons.UdentifyProgressBarStyle(
      backgroundColor: backgroundColor,
      progressColor: progressColor,
      completionColor: completionColor,
      textStyle: textStyle,
      cornerRadius: cornerRadius
    )
  }
  
  // MARK: - Color Parsing Helper
  
  private func parseColor(_ colorString: String?) -> UIColor? {
    guard let colorString = colorString else { return nil }
    
    switch colorString.lowercased() {
    case "purple":
      return .purple
    case "blue":
      return .blue
    case "green":
      return .green
    case "red":
      return .red
    case "black":
      return .black
    case "white":
      return .white
    case "gray", "grey":
      return .gray
    case "clear":
      return .clear
    case "label":
      return .label
    default:
      // Try to parse hex color (e.g., "#FF5733")
      if colorString.hasPrefix("#") {
        return UIColor(hex: colorString)
      }
      return nil
    }
  }
}

// MARK: - UIColor Hex Extension

extension UIColor {
  convenience init?(hex: String) {
    let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var int: UInt64 = 0
    Scanner(string: hex).scanHexInt64(&int)
    let a, r, g, b: UInt64
    switch hex.count {
    case 3: // RGB (12-bit)
      (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
    case 6: // RGB (24-bit)
      (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
    case 8: // ARGB (32-bit)
      (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
    default:
      return nil
    }
    
    self.init(
      red: Double(r) / 255,
      green: Double(g) / 255,
      blue: Double(b) / 255,
      alpha: Double(a) / 255
    )
  }
}
