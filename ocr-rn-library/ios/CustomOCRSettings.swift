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
    let bgStyle = getReviewBackgroundStyle()
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

      // Review Screen Background (style takes priority over color)
      reviewBackgroundColor: bgStyle != nil ? nil : getReviewBackgroundColor(),
      reviewBackgroundStyle: bgStyle,

      // Progress Bar Style (for hologram)
      progressBarStyle: getProgressBarStyle(),

      // Document detection border colors (iOS only)
      documentDetectionConfig: getDocumentDetectionConfig(),

      // IQA Service Configuration
      isIQAServiceEnabled: getIQAServiceEnabled(),
      iqaScreenStyle: getIQAScreenStyle(),

      // 26.1.3: raw photo crop ratio (0.0-1.0, default 0.35)
      rawPhotoCropRatio: getRawPhotoCropRatio()
    )
  }
  
  // MARK: - Helper Methods for Configuration Parsing
  
  private func getPlaceholderContainerStyle() -> UdentifyCommons.UdentifyViewStyle {
    var backgroundColor = parseColor(uiConfig?["backgroundColor"] as? String) ?? .purple.withAlphaComponent(0.6)
    if let opacity = uiConfig?["opacity"] as? CGFloat {
      backgroundColor = backgroundColor.withAlphaComponent(opacity)
    }
    let borderColor = parseColor(uiConfig?["borderColor"] as? String) ?? .white
    let cornerRadius = uiConfig?["cornerRadius"] as? CGFloat ?? 8.0
    let borderWidth = uiConfig?["borderWidth"] as? CGFloat ?? 2.0
    
    return UdentifyCommons.UdentifyViewStyle(
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                cornerRadius: cornerRadius,
                borderWidth: borderWidth,
                horizontalSizing: .fixed(width: 120, horizontalPosition: .right(offset: 16)),
                verticalSizing: .fixed(height: 135, verticalPosition: .bottom(offset: 0))
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

  private func getReviewBackgroundColor() -> UIColor? {
    return parseColor(uiConfig?["reviewBackgroundColor"] as? String)
  }

  private func getReviewBackgroundStyle() -> UdentifyCommons.UdentifyImageStyle? {
    guard let styleConfig = uiConfig?["reviewBackgroundStyle"] as? [String: Any],
          let imageBase64 = styleConfig["imageBase64"] as? String,
          let imageData = Data(base64Encoded: imageBase64, options: .ignoreUnknownCharacters),
          let image = UIImage(data: imageData) else {
      return nil
    }

    let contentMode: UIView.ContentMode
    switch (styleConfig["contentMode"] as? String)?.lowercased() {
    case "scaletofill":
      contentMode = .scaleToFill
    case "scaleaspectfill":
      contentMode = .scaleAspectFill
    case "scaleaspectfit":
      contentMode = .scaleAspectFit
    default:
      contentMode = .scaleAspectFill
    }

    let opacity = CGFloat((styleConfig["opacity"] as? NSNumber)?.doubleValue ?? 1.0)
    let borderColor = parseColor(styleConfig["borderColor"] as? String) ?? .clear
    let borderWidth = CGFloat((styleConfig["borderWidth"] as? NSNumber)?.doubleValue ?? 0)
    let cornerRadius = CGFloat((styleConfig["cornerRadius"] as? NSNumber)?.doubleValue ?? 0)

    return UdentifyCommons.UdentifyImageStyle(
      image: image,
      contentMode: contentMode,
      opacity: opacity,
      borderColor: borderColor,
      borderWidth: borderWidth,
      horizontalSizing: .anchors(leading: 0, trailing: 0),
      verticalSizing: .anchors(top: 0, bottom: 0),
      cornerRadius: cornerRadius
    )
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
  
  // Colors the document's detection border while scanning. iOS-only real SDK feature (Android's
  // CardRecognizerCredentials$Builder has no matching method) — returns nil, not a constructed
  // default, when the key is absent so existing configs that never set this field see zero
  // behavior change (the SDK's own .green/.red defaults apply in that case).
  private func getDocumentDetectionConfig() -> UdentifyOCR.OCRDocumentDetectionConfig? {
    guard let config = uiConfig?["documentDetectionConfig"] as? [String: Any] else {
      return nil
    }
    let borderColorOnSuccess = parseColor(config["borderColorOnSuccess"] as? String) ?? .green
    let borderColorOnFailure = parseColor(config["borderColorOnFailure"] as? String) ?? .red
    return UdentifyOCR.OCRDocumentDetectionConfig(
      borderColorOnSuccess: borderColorOnSuccess,
      borderColorOnFailure: borderColorOnFailure
    )
  }

  // MARK: - IQA Configuration Methods

  private func getIQAServiceEnabled() -> Bool {
    return uiConfig?["isIQAServiceEnabled"] as? Bool ?? true
  }

  // 26.1.3: raw photo crop ratio applied to the captured document image (0.0-1.0)
  private func getRawPhotoCropRatio() -> Double? {
    return uiConfig?["rawPhotoCropRatio"] as? Double ?? 0.35
  }
  
  private func getIQAScreenStyle() -> UdentifyOCR.IQAScreenStyle {
    guard let iqaConfig = uiConfig?["iqaScreenStyle"] as? [String: Any] else {
      return UdentifyOCR.IQAScreenStyle()
    }
    
    return UdentifyOCR.IQAScreenStyle(
      backgroundColor: parseColor(iqaConfig["backgroundColor"] as? String),
      backgroundStyle: nil,
      overlayImageStyle: getIQAOverlayImageStyle(iqaConfig),
      ocrImageStyle: getIQAOcrImageStyle(iqaConfig),
      resultAreaPositioning: getIQAResultAreaPositioning(iqaConfig),
      frontOverlayImage: nil,
      backOverlayImage: nil,
      titleLabelStyle: getIQATitleLabelStyle(iqaConfig),
      failureBannerStyle: getIQAFailureBannerStyle(iqaConfig),
      reasonBannerStyle: getIQAReasonBannerStyle(iqaConfig),
      successBannerStyle: getIQASuccessBannerStyle(iqaConfig),
      successButtonStyle: getIQASuccessButtonStyle(iqaConfig),
      retakeButtonStyle: getIQARetakeButtonStyle(iqaConfig),
      progressBarStyle: getIQAProgressBarStyle(iqaConfig),
      dismissAfterSuccessInSeconds: iqaConfig["dismissAfterSuccessInSeconds"] as? TimeInterval
    )
  }
  
  private func getIQAOverlayImageStyle(_ iqaConfig: [String: Any]) -> UdentifyCommons.UdentifyViewStyle {
    guard let overlayStyle = iqaConfig["overlayImageStyle"] as? [String: Any] else {
      return UdentifyCommons.UdentifyViewStyle(
        backgroundColor: .clear,
        borderColor: .clear,
        cornerRadius: 12,
        borderWidth: 0,
        horizontalSizing: .anchors(leading: 45, trailing: 45),
        verticalSizing: .fixed(height: 350, verticalPosition: .top(offset: 140))
      )
    }
    
    let backgroundColor = parseColor(overlayStyle["backgroundColor"] as? String) ?? .clear
    let borderColor = parseColor(overlayStyle["borderColor"] as? String) ?? .clear
    let cornerRadius = overlayStyle["cornerRadius"] as? CGFloat ?? 12.0
    let borderWidth = overlayStyle["borderWidth"] as? CGFloat ?? 0.0
    
    return UdentifyCommons.UdentifyViewStyle(
      backgroundColor: backgroundColor,
      borderColor: borderColor,
      cornerRadius: cornerRadius,
      borderWidth: borderWidth,
      horizontalSizing: .anchors(leading: 45, trailing: 45),
      verticalSizing: .fixed(height: 350, verticalPosition: .top(offset: 140))
    )
  }
  
  private func getIQAOcrImageStyle(_ iqaConfig: [String: Any]) -> UdentifyCommons.UdentifyViewStyle {
    guard let ocrImageStyle = iqaConfig["ocrImageStyle"] as? [String: Any] else {
      return UdentifyCommons.UdentifyViewStyle(
        backgroundColor: .clear,
        borderColor: .white,
        cornerRadius: 12,
        borderWidth: 2,
        horizontalSizing: .anchors(leading: 30, trailing: 30),
        verticalSizing: .fixed(height: 200, verticalPosition: .top(offset: 100))
      )
    }
    
    let backgroundColor = parseColor(ocrImageStyle["backgroundColor"] as? String) ?? .clear
    let borderColor = parseColor(ocrImageStyle["borderColor"] as? String) ?? .white
    let cornerRadius = ocrImageStyle["cornerRadius"] as? CGFloat ?? 12.0
    let borderWidth = ocrImageStyle["borderWidth"] as? CGFloat ?? 2.0
    
    return UdentifyCommons.UdentifyViewStyle(
      backgroundColor: backgroundColor,
      borderColor: borderColor,
      cornerRadius: cornerRadius,
      borderWidth: borderWidth,
      horizontalSizing: .anchors(leading: 30, trailing: 30),
      verticalSizing: .fixed(height: 200, verticalPosition: .top(offset: 100))
    )
  }
  
  private func getIQAResultAreaPositioning(_ iqaConfig: [String: Any]) -> UdentifyOCR.IQAPositionedArea {
    guard let positioning = iqaConfig["resultAreaPositioning"] as? [String: Any] else {
      return UdentifyOCR.IQAPositionedArea(
        target: .ocrPhoto,
        horizontal: .anchors(leading: 0, trailing: 0),
        vertical: .fixed(height: 0, verticalPosition: .bottom(offset: 50)),
        useSafeArea: false
      )
    }
    
    let targetString = positioning["target"] as? String ?? "ocrPhoto"
    let target: UdentifyOCR.IQAReferenceTarget
    switch targetString.lowercased() {
    case "container":
      target = .container
    case "containernosafe area", "containernosafearea":
      target = .containerNoSafeArea
    case "overlayimage":
      target = .overlayImage
    case "ocrphoto":
      target = .ocrPhoto
    case "footerview":
      target = .footerView
    default:
      target = .ocrPhoto
    }
    
    let horizontalPadding = positioning["horizontalPadding"] as? CGFloat ?? 0
    let verticalOffset = positioning["verticalOffset"] as? CGFloat ?? 50
    
    return UdentifyOCR.IQAPositionedArea(
      target: target,
      horizontal: .anchors(leading: horizontalPadding, trailing: horizontalPadding),
      vertical: .fixed(height: 0, verticalPosition: .bottom(offset: verticalOffset)),
      useSafeArea: false
    )
  }
  
  private func getIQATitleLabelStyle(_ iqaConfig: [String: Any]) -> UdentifyCommons.UdentifyTextStyle {
    let textColor = parseColor(iqaConfig["titleTextColor"] as? String) ?? .white
    let fontSize = iqaConfig["titleFontSize"] as? CGFloat ?? 19.0
    
    return UdentifyCommons.UdentifyTextStyle(
      font: UIFont.boldSystemFont(ofSize: fontSize),
      textColor: textColor,
      textAlignment: .center,
      lineBreakMode: .byWordWrapping,
      numberOfLines: 2,
      leading: 20,
      trailing: 20,
      verticalPosition: .top(offset: 50)
    )
  }
  
  private func getIQABannerStyle(
    _ iqaConfig: [String: Any],
    key: String,
    defaultBgColor: UIColor,
    defaultIconColor: UIColor,
    defaultTitleColor: UIColor,
    defaultDescColor: UIColor
  ) -> UdentifyOCR.IQABannerStyle {
    guard let bannerConfig = iqaConfig[key] as? [String: Any] else {
      return createDefaultIQABannerStyle(
        bgColor: defaultBgColor,
        iconColor: defaultIconColor,
        titleColor: defaultTitleColor,
        descColor: defaultDescColor
      )
    }
    
    let backgroundColor = parseColor(bannerConfig["backgroundColor"] as? String) ?? defaultBgColor
    let iconColor = parseColor(bannerConfig["iconColor"] as? String) ?? defaultIconColor
    let titleColor = parseColor(bannerConfig["titleColor"] as? String) ?? defaultTitleColor
    let descColor = parseColor(bannerConfig["descriptionColor"] as? String) ?? defaultDescColor
    let fontSize = bannerConfig["fontSize"] as? CGFloat ?? 16.0
    
    let titleStyle = UdentifyCommons.UdentifyTextStyle(
      font: UIFont.boldSystemFont(ofSize: fontSize),
      textColor: titleColor,
      textAlignment: .left,
      lineBreakMode: .byWordWrapping,
      numberOfLines: 0,
      lineHeightMultiple: 0.8, leading: 0,
      trailing: 0
    )
    
    let descStyle = UdentifyCommons.UdentifyTextStyle(
      font: UIFont.systemFont(ofSize: fontSize - 2),
      textColor: descColor,
      textAlignment: .left,
      lineBreakMode: .byWordWrapping,
      numberOfLines: 0,
      lineHeightMultiple: 0.8, leading: 0,
      trailing: 0
    )
    
    return UdentifyOCR.IQABannerStyle(
      backgroundColor: backgroundColor,
      borderColor: .clear,
      iconColor: iconColor,
      cornerRadius: 10,
      borderWidth: 0,
      verticalPadding: 12,
      horizontalPadding: 16,
      iconSize: CGSize(width: 30, height: 30),
      titleLabelStyle: titleStyle,
      descriptionLabelStyle: descStyle
    )
  }
  
  private func createDefaultIQABannerStyle(
    bgColor: UIColor,
    iconColor: UIColor,
    titleColor: UIColor,
    descColor: UIColor
  ) -> UdentifyOCR.IQABannerStyle {
    let titleStyle = UdentifyCommons.UdentifyTextStyle(
      font: UIFont.boldSystemFont(ofSize: 16),
      textColor: titleColor,
      textAlignment: .left,
      lineBreakMode: .byWordWrapping,
      numberOfLines: 0,
      lineHeightMultiple: 0.8, leading: 0,
      trailing: 0
    )
    
    let descStyle = UdentifyCommons.UdentifyTextStyle(
      font: UIFont.systemFont(ofSize: 14),
      textColor: descColor,
      textAlignment: .left,
      lineBreakMode: .byWordWrapping,
      numberOfLines: 0,
      lineHeightMultiple: 0.8, leading: 0,
      trailing: 0
    )
    
    return UdentifyOCR.IQABannerStyle(
      backgroundColor: bgColor,
      borderColor: .clear,
      iconColor: iconColor,
      cornerRadius: 10,
      borderWidth: 0,
      verticalPadding: 12,
      horizontalPadding: 16,
      iconSize: CGSize(width: 30, height: 30),
      titleLabelStyle: titleStyle,
      descriptionLabelStyle: descStyle
    )
  }
  
  private func getIQAFailureBannerStyle(_ iqaConfig: [String: Any]) -> UdentifyOCR.IQABannerStyle {
    return getIQABannerStyle(
      iqaConfig,
      key: "failureBanner",
      defaultBgColor: UIColor(red: 0.98, green: 0.88, blue: 0.9, alpha: 1),
      defaultIconColor: UIColor(red: 0.95, green: 0.33, blue: 0.34, alpha: 1),
      defaultTitleColor: UIColor(red: 0.69, green: 0.14, blue: 0.23, alpha: 1),
      defaultDescColor: UIColor(red: 0.69, green: 0.14, blue: 0.23, alpha: 1)
    )
  }
  
  private func getIQAReasonBannerStyle(_ iqaConfig: [String: Any]) -> UdentifyOCR.IQABannerStyle {
    return getIQABannerStyle(
      iqaConfig,
      key: "reasonBanner",
      defaultBgColor: UIColor(red: 0.98, green: 0.94, blue: 0.85, alpha: 1),
      defaultIconColor: UIColor(red: 0.96, green: 0.83, blue: 0.06, alpha: 1),
      defaultTitleColor: UIColor(red: 0.45, green: 0.32, blue: 0.05, alpha: 1),
      defaultDescColor: UIColor(red: 0.45, green: 0.32, blue: 0.05, alpha: 1)
    )
  }
  
  private func getIQASuccessBannerStyle(_ iqaConfig: [String: Any]) -> UdentifyOCR.IQABannerStyle {
    return getIQABannerStyle(
      iqaConfig,
      key: "successBanner",
      defaultBgColor: UIColor(red: 0xDC/255.0, green: 0xEB/255.0, blue: 0xF0/255.0, alpha: 1.0),
      defaultIconColor: UIColor(red: 0x4C/255.0, green: 0xD9/255.0, blue: 0x64/255.0, alpha: 1.0),
      defaultTitleColor: UIColor(red: 0x2B/255.0, green: 0xAC/255.0, blue: 0x72/255.0, alpha: 1.0),
      defaultDescColor: UIColor(red: 0x2B/255.0, green: 0xAC/255.0, blue: 0x72/255.0, alpha: 1.0)
    )
  }
  
  private func getIQASuccessButtonStyle(_ iqaConfig: [String: Any]) -> UdentifyCommons.UdentifyButtonStyle {
    guard let buttonConfig = iqaConfig["successButton"] as? [String: Any] else {
      return UdentifyCommons.UdentifyButtonStyle(
        backgroundColor: UIColor(red: 0.3, green: 0.85, blue: 0.39, alpha: 1),
        borderColor: .clear,
        cornerRadius: 8,
        borderWidth: 0,
        contentAlignment: .center,
        height: 70,
        leading: 20,
        trailing: 20,
        font: UIFont.boldSystemFont(ofSize: 20),
        textColor: .white,
        textAlignment: .center,
        lineBreakMode: .byWordWrapping,
        numberOfLines: 0
      )
    }
    
    let backgroundColor = parseColor(buttonConfig["backgroundColor"] as? String) ?? UIColor(red: 0.3, green: 0.85, blue: 0.39, alpha: 1)
    let textColor = parseColor(buttonConfig["textColor"] as? String) ?? .white
    let fontSize = buttonConfig["fontSize"] as? CGFloat ?? 20.0
    
    return UdentifyCommons.UdentifyButtonStyle(
      backgroundColor: backgroundColor,
      borderColor: .clear,
      cornerRadius: 8,
      borderWidth: 0,
      contentAlignment: .center,
      height: 70,
      leading: 20,
      trailing: 20,
      font: UIFont.boldSystemFont(ofSize: fontSize),
      textColor: textColor,
      textAlignment: .center,
      lineBreakMode: .byWordWrapping,
      numberOfLines: 0
    )
  }
  
  private func getIQARetakeButtonStyle(_ iqaConfig: [String: Any]) -> UdentifyCommons.UdentifyButtonStyle {
    guard let buttonConfig = iqaConfig["retakeButton"] as? [String: Any] else {
      return UdentifyCommons.UdentifyButtonStyle(
        backgroundColor: UIColor(red: 1, green: 0.23, blue: 0.19, alpha: 1),
        borderColor: .clear,
        cornerRadius: 8,
        borderWidth: 0,
        contentAlignment: .center,
        height: 70,
        leading: 20,
        trailing: 20,
        font: UIFont.boldSystemFont(ofSize: 20),
        textColor: .white,
        textAlignment: .center,
        lineBreakMode: .byWordWrapping,
        numberOfLines: 0
      )
    }
    
    let backgroundColor = parseColor(buttonConfig["backgroundColor"] as? String) ?? UIColor(red: 1, green: 0.23, blue: 0.19, alpha: 1)
    let textColor = parseColor(buttonConfig["textColor"] as? String) ?? .white
    let fontSize = buttonConfig["fontSize"] as? CGFloat ?? 20.0
    
    return UdentifyCommons.UdentifyButtonStyle(
      backgroundColor: backgroundColor,
      borderColor: .clear,
      cornerRadius: 8,
      borderWidth: 0,
      contentAlignment: .center,
      height: 70,
      leading: 20,
      trailing: 20,
      font: UIFont.boldSystemFont(ofSize: fontSize),
      textColor: textColor,
      textAlignment: .center,
      lineBreakMode: .byWordWrapping,
      numberOfLines: 0
    )
  }
  
  private func getIQAProgressBarStyle(_ iqaConfig: [String: Any]) -> UdentifyCommons.UdentifyProgressBarStyle? {
    guard let progressConfig = iqaConfig["progressBar"] as? [String: Any] else {
      return UdentifyCommons.UdentifyProgressBarStyle(
        backgroundColor: .lightGray,
        progressColor: UIColor(red: 0.3, green: 0.85, blue: 0.39, alpha: 1),
        completionColor: UIColor(red: 0.3, green: 0.85, blue: 0.39, alpha: 1),
        textStyle: UdentifyCommons.UdentifyTextStyle(
          font: UIFont.boldSystemFont(ofSize: 20),
          textColor: .white,
          textAlignment: .center,
          lineBreakMode: .byWordWrapping,
          numberOfLines: 0,
          leading: 20,
          trailing: 20
        ),
        cornerRadius: 8
      )
    }
    
    let backgroundColor = parseColor(progressConfig["backgroundColor"] as? String) ?? .lightGray
    let progressColor = parseColor(progressConfig["progressColor"] as? String) ?? UIColor(red: 0.3, green: 0.85, blue: 0.39, alpha: 1)
    let completionColor = parseColor(progressConfig["completionColor"] as? String) ?? UIColor(red: 0.3, green: 0.85, blue: 0.39, alpha: 1)
    let textColor = parseColor(progressConfig["textColor"] as? String) ?? .white
    let fontSize = progressConfig["fontSize"] as? CGFloat ?? 20.0
    
    let textStyle = UdentifyCommons.UdentifyTextStyle(
      font: UIFont.boldSystemFont(ofSize: fontSize),
      textColor: textColor,
      textAlignment: .center,
      lineBreakMode: .byWordWrapping,
      numberOfLines: 0,
      leading: 20,
      trailing: 20
    )
    
    return UdentifyCommons.UdentifyProgressBarStyle(
      backgroundColor: backgroundColor,
      progressColor: progressColor,
      completionColor: completionColor,
      textStyle: textStyle,
      cornerRadius: 8
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
