import Foundation
import UIKit

#if canImport(UdentifyCommons)
import UdentifyCommons
#if canImport(UdentifyVC)
import UdentifyVC
#endif
#endif

// Extracted from VideoCallManager.swift so VideoCallCameraView can build
// VCSettings directly from its `config` prop without depending on the
// VideoCallManager bridge module.
class CustomVideoCallSettings: NSObject {
  private let localizationBundle: Bundle
  private let uiConfig: [String: Any]?

  /// Width of the view the call is hosted in, used to honour a signed `center`
  /// offset (see `horizontalPosition`). Zero when it is not known yet, which
  /// makes a centered element fall back to plain `.center`.
  private let containerWidth: CGFloat

  init(localizationBundle: Bundle,
       uiConfig: [String: Any]? = nil,
       containerWidth: CGFloat = 0) {
    self.localizationBundle = localizationBundle
    self.uiConfig = uiConfig
    self.containerWidth = containerWidth
    super.init()
  }

  // MARK: - Config parsing helpers

  /// Accepts `#RGB`, `#RRGGBB` and `#RRGGBBAA` (React Native's own color
  /// string convention, so `'#00000080'` means 50%-opaque black), and returns
  /// nil for anything else so callers fall back to their default.
  private static func color(fromHex hex: Any?) -> UIColor? {
    guard var value = hex as? String else { return nil }
    value = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard value.hasPrefix("#") else { return nil }
    value.removeFirst()

    if value.count == 3 {
      value = value.map { "\($0)\($0)" }.joined()
    }
    guard value.count == 6 || value.count == 8 else { return nil }

    var hexNumber: UInt64 = 0
    guard Scanner(string: value).scanHexInt64(&hexNumber) else { return nil }

    if value.count == 6 {
      return UIColor(
        red: CGFloat((hexNumber & 0xff0000) >> 16) / 255,
        green: CGFloat((hexNumber & 0x00ff00) >> 8) / 255,
        blue: CGFloat(hexNumber & 0x0000ff) / 255,
        alpha: 1.0)
    }
    return UIColor(
      red: CGFloat((hexNumber & 0xff000000) >> 24) / 255,
      green: CGFloat((hexNumber & 0x00ff0000) >> 16) / 255,
      blue: CGFloat((hexNumber & 0x0000ff00) >> 8) / 255,
      alpha: CGFloat(hexNumber & 0x000000ff) / 255)
  }

  private static func dict(_ container: [String: Any]?, _ key: String) -> [String: Any]? {
    return container?[key] as? [String: Any]
  }

  private static func number(_ container: [String: Any]?, _ key: String) -> CGFloat? {
    guard let value = container?[key] as? NSNumber else { return nil }
    return CGFloat(truncating: value)
  }

  private static func bool(_ container: [String: Any]?, _ key: String) -> Bool? {
    return (container?[key] as? NSNumber)?.boolValue
  }

#if canImport(UdentifyCommons)

  /// `nil` when the app named no position, so the caller leaves the SDK's own
  /// value in place. A `center` with a signed offset becomes an absolute
  /// `.custom(x:)`, since the SDK's `.center` carries no offset - that is what
  /// keeps one config producing the same layout on both platforms.
  private func horizontalPosition(
    _ position: [String: Any]?,
    elementWidth: CGFloat
  ) -> UdentifyHorizontalPosition? {
    guard let position = position, let type = position["type"] as? String else { return nil }
    let offset = Self.number(position, "offset") ?? 0
    switch type {
    case "center":
      // Without a known container width there is nothing to measure the shift
      // against, so fall back to the SDK's own plain centering.
      guard offset != 0, containerWidth > 0 else { return .center }
      return .custom(x: containerWidth / 2 + offset - elementWidth / 2)
    case "left": return .left(offset: offset)
    case "right": return .right(offset: offset)
    case "custom": return .custom(x: Self.number(position, "x") ?? 0)
    default: return nil
    }
  }

  /// `nil` when the app named no position - see `horizontalPosition`.
  private static func verticalPosition(
    _ position: [String: Any]?
  ) -> UdentifyVerticalPosition? {
    guard let position = position, let type = position["type"] as? String else { return nil }
    let offset = number(position, "offset") ?? 0
    switch type {
    case "center": return .center
    case "top": return .top(offset: offset)
    case "bottom": return .bottom(offset: offset)
    case "custom": return .custom(y: number(position, "y") ?? 0)
    default: return nil
    }
  }

  /// `nil` unless the app sized or positioned the element horizontally.
  /// `horizontalAnchors` (stretch between two insets) takes precedence over
  /// `width` + `horizontalPosition` (fixed size), mirroring the two cases of
  /// `UdentifyHorizontalSizing`.
  private func horizontalSizing(_ style: [String: Any]?) -> UdentifyHorizontalSizing? {
    if let anchors = Self.dict(style, "horizontalAnchors") {
      return .anchors(
        leading: Self.number(anchors, "leading") ?? 0,
        trailing: Self.number(anchors, "trailing") ?? 0)
    }
    let width = Self.number(style, "width")
    let position = horizontalPosition(Self.dict(style, "horizontalPosition"),
                                      elementWidth: width ?? 90)
    guard width != nil || position != nil else { return nil }
    // `.fixed` needs both halves, and the SDK does not expose the default it
    // would have used, so an app that sets only one of the two gets the SDK's
    // documented starting point for the other.
    return .fixed(width: width ?? 90, horizontalPosition: position ?? .right(offset: 16))
  }

  /// `nil` unless the app sized or positioned the element vertically.
  private static func verticalSizing(_ style: [String: Any]?) -> UdentifyVerticalSizing? {
    if let anchors = dict(style, "verticalAnchors") {
      return .anchors(
        top: number(anchors, "top") ?? 0,
        bottom: number(anchors, "bottom") ?? 0)
    }
    let height = number(style, "height")
    let position = verticalPosition(dict(style, "verticalPosition"))
    guard height != nil || position != nil else { return nil }
    return .fixed(height: height ?? 135, verticalPosition: position ?? .bottom(offset: 0))
  }

  /// `nil` when the app set no alignment.
  private static func textAlignment(_ style: [String: Any]?) -> NSTextAlignment? {
    switch style?["textAlign"] as? String {
    case "left": return .left
    case "right": return .right
    case "center": return .center
    default: return nil
    }
  }

  private static func font(_ style: [String: Any]?) -> UIFont {
    // Only reached when the app styles the label at all; the SDK exposes no
    // readable default font, so this mirrors UdentifyTextStyle's own.
    let size = number(style, "fontSize") ?? 20
    let weight: UIFont.Weight
    switch style?["fontWeight"] as? String {
    case "regular": weight = .regular
    case "medium": weight = .medium
    case "semibold": weight = .semibold
    case "bold": weight = .bold
    default: weight = .medium
    }

    // UIFont(name:) returns nil for a family the app hasn't actually
    // bundled, so a typo'd or missing font degrades to the system font at
    // the requested size/weight instead of leaving the label unstyled.
    if let family = style?["fontFamily"] as? String, !family.isEmpty,
       let custom = UIFont(name: family, size: size) {
      return custom
    }
    return UIFont.systemFont(ofSize: size, weight: weight)
  }

  // MARK: - Settings construction

  /// Builds `VCSettings` from the app's `config` prop. The styler holds no
  /// defaults of its own: each element starts from the SDK's default-constructed
  /// value and only supplied fields are overwritten, so anything the app omits
  /// keeps whatever the SDK ships.
  func createVCSettings() -> VCSettings {
    let pipStyle = Self.dict(uiConfig, "pipViewStyle")
    let muteStyle = Self.dict(uiConfig, "muteButtonStyle")
    let cameraSwitchStyle = Self.dict(uiConfig, "cameraSwitchButtonStyle")
    let labelStyle = Self.dict(uiConfig, "instructionLabelStyle")

    let backgroundColor = Self.color(fromHex: uiConfig?["backgroundColor"])
    // The flat `textColor`/`pipViewBorderColor` keys predate the per-element
    // styles and stay supported as shorthands; the specific style wins.
    let textColor = Self.color(fromHex: labelStyle?["textColor"])
      ?? Self.color(fromHex: uiConfig?["textColor"])
    let pipBorderColor = Self.color(fromHex: pipStyle?["borderColor"])
      ?? Self.color(fromHex: uiConfig?["pipViewBorderColor"])

    var muteButtonStyle: VCMuteButtonStyle?
    if let muteStyle = muteStyle {
      var style = VCMuteButtonStyle()
      if let v = Self.color(fromHex: muteStyle["mutedColor"]) { style.mutedColor = v }
      if let v = Self.color(fromHex: muteStyle["unmutedColor"]) { style.unmutedColor = v }
      if let v = Self.number(muteStyle, "size") { style.size = v }
      if let v = horizontalPosition(Self.dict(muteStyle, "horizontalPosition"),
                                    elementWidth: style.size) {
        style.horizontalPosition = v
      }
      if let v = Self.verticalPosition(Self.dict(muteStyle, "verticalPosition")) {
        style.verticalPosition = v
      }
      muteButtonStyle = style
    }

    var cameraSwitchButtonStyle: VCCameraSwitchButtonStyle?
    if let cameraSwitchStyle = cameraSwitchStyle {
      var style = VCCameraSwitchButtonStyle()
      if let v = Self.color(fromHex: cameraSwitchStyle["color"]) { style.color = v }
      if let v = Self.number(cameraSwitchStyle, "size") { style.size = v }
      if let v = horizontalPosition(Self.dict(cameraSwitchStyle, "horizontalPosition"),
                                    elementWidth: style.size) {
        style.horizontalPosition = v
      }
      if let v = Self.verticalPosition(Self.dict(cameraSwitchStyle, "verticalPosition")) {
        style.verticalPosition = v
      }
      cameraSwitchButtonStyle = style
    }

    var pipViewStyle: UdentifyViewStyle?
    if pipStyle != nil || pipBorderColor != nil {
      // backgroundColor has no default, so it is the one value that must be
      // supplied; .clear keeps the SDK's own camera fill. borderWidth is
      // get-only, so it goes through the initializer - and its fallback is read
      // back off a default-constructed instance rather than written here, so
      // the SDK still owns the value.
      let sdk = UdentifyViewStyle(backgroundColor: .clear)
      var style = UdentifyViewStyle(
        backgroundColor: .clear,
        borderWidth: Self.number(pipStyle, "borderWidth") ?? sdk.borderWidth)
      if let v = pipBorderColor { style.borderColor = v }
      if let v = Self.number(pipStyle, "cornerRadius") { style.cornerRadius = v }
      if let v = horizontalSizing(pipStyle) { style.horizontalSizing = v }
      if let v = Self.verticalSizing(pipStyle) { style.verticalSizing = v }
      pipViewStyle = style
    }

    var instructionLabelStyle: UdentifyTextStyle?
    if labelStyle != nil || textColor != nil {
      // font and textColor have no defaults on UdentifyTextStyle, so both are
      // always supplied; Self.font() already falls back to the SDK's own size.
      var style = UdentifyTextStyle(font: Self.font(labelStyle),
                                    textColor: textColor ?? .white)
      if let v = Self.textAlignment(labelStyle) { style.textAlignment = v }
      if let v = Self.number(labelStyle, "numberOfLines") { style.numberOfLines = Int(v) }
      if let v = Self.number(labelStyle, "lineHeightMultiple") { style.lineHeightMultiple = v }
      if let v = Self.number(labelStyle, "leading") { style.leading = v }
      if let v = Self.number(labelStyle, "trailing") { style.trailing = v }
      if let v = Self.verticalPosition(Self.dict(labelStyle, "verticalPosition")) {
        style.verticalPosition = v
      }
      instructionLabelStyle = style
    }

    return VCSettings(
      bundle: localizationBundle,
      tableName: getTableName(),
      backgroundColor: backgroundColor,
      backgroundStyle: nil,
      overlayImageStyle: nil,
      muteButtonStyle: muteButtonStyle,
      cameraSwitchButtonStyle: cameraSwitchButtonStyle,
      pipViewStyle: pipViewStyle,
      instructionLabelStyle: instructionLabelStyle,
      requestTimeout: getRequestTimeout())
  }

#endif

  // MARK: - Localization Methods

  func localizedString(forKey key: String, value: String? = nil, table: String? = nil) -> String {
    let result = localizationBundle.localizedString(forKey: key, value: value, table: table)
    if result != key {
      return result
    }

    // Fallback to main bundle
    return Bundle.main.localizedString(forKey: key, value: value, table: table)
  }

  // MARK: - Configuration Methods

  func getTableName() -> String? {
    return uiConfig?["tableName"] as? String
  }

  func getRequestTimeout() -> Double {
    return uiConfig?["requestTimeout"] as? Double ?? 30.0
  }
}
