import Foundation
import UIKit

#if canImport(UdentifyCommons)
import UdentifyCommons
#endif

/// Things the app can control from JS that `VCSettings` itself has no field
/// for, so `VideoCallCameraView` has to apply them to its own subviews after
/// the settings object is built.
/// `VCSettings.init` hard-codes the PiP container's `backgroundColor` to
struct VideoCallStyleOverrides {
  var isPipViewVisible: Bool = true
  var isMuteButtonVisible: Bool = true
  var isCameraSwitchButtonVisible: Bool = true
  var pipViewBackgroundColor: UIColor = .clear
  /// Signed shift from the container's horizontal centre, applied when a
  /// button's `horizontalPosition.type` is `center`. It cannot ride inside
  /// `VCSettings`: `UdentifyHorizontalPosition.center` carries no offset and
  /// the enum lives in the compiled UdentifyCommons framework, so a pair of
  var muteButtonCenterOffsetX: CGFloat = 0
  var cameraSwitchButtonCenterOffsetX: CGFloat = 0
  var pipViewCenterOffsetX: CGFloat = 0
}

// Extracted from VideoCallManager.swift so VideoCallCameraView can build
// VCSettings directly from its `config` prop without depending on the
// VideoCallManager bridge module.
class CustomVideoCallSettings: NSObject {
  private let localizationBundle: Bundle
  private let uiConfig: [String: Any]?

  init(localizationBundle: Bundle, uiConfig: [String: Any]? = nil) {
    self.localizationBundle = localizationBundle
    self.uiConfig = uiConfig
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

  private static func horizontalPosition(
    _ position: [String: Any]?,
    default fallback: UdentifyHorizontalPosition
  ) -> UdentifyHorizontalPosition {
    guard let position = position, let type = position["type"] as? String else { return fallback }
    let offset = number(position, "offset") ?? 0
    switch type {
    // A `center` offset is not representable here - it reaches the layout
    // via VideoCallStyleOverrides.*CenterOffsetX instead.
    case "center": return .center
    case "left": return .left(offset: offset)
    case "right": return .right(offset: offset)
    case "custom": return .custom(x: number(position, "x") ?? 0)
    default: return fallback
    }
  }

  private static func verticalPosition(
    _ position: [String: Any]?,
    default fallback: UdentifyVerticalPosition
  ) -> UdentifyVerticalPosition {
    guard let position = position, let type = position["type"] as? String else { return fallback }
    let offset = number(position, "offset") ?? 0
    switch type {
    case "center": return .center
    case "top": return .top(offset: offset)
    case "bottom": return .bottom(offset: offset)
    case "custom": return .custom(y: number(position, "y") ?? 0)
    default: return fallback
    }
  }

  /// `horizontalAnchors` (stretch between two insets) takes precedence over
  /// `width` + `horizontalPosition` (fixed size), mirroring the two cases of
  /// `UdentifyHorizontalSizing`.
  private static func horizontalSizing(
    _ style: [String: Any]?,
    defaultWidth: CGFloat,
    defaultPosition: UdentifyHorizontalPosition
  ) -> UdentifyHorizontalSizing {
    if let anchors = dict(style, "horizontalAnchors") {
      return .anchors(
        leading: number(anchors, "leading") ?? 0,
        trailing: number(anchors, "trailing") ?? 0)
    }
    return .fixed(
      width: number(style, "width") ?? defaultWidth,
      horizontalPosition: horizontalPosition(dict(style, "horizontalPosition"), default: defaultPosition))
  }

  private static func verticalSizing(
    _ style: [String: Any]?,
    defaultHeight: CGFloat,
    defaultPosition: UdentifyVerticalPosition
  ) -> UdentifyVerticalSizing {
    if let anchors = dict(style, "verticalAnchors") {
      return .anchors(
        top: number(anchors, "top") ?? 0,
        bottom: number(anchors, "bottom") ?? 0)
    }
    return .fixed(
      height: number(style, "height") ?? defaultHeight,
      verticalPosition: verticalPosition(dict(style, "verticalPosition"), default: defaultPosition))
  }

  private static func font(_ style: [String: Any]?) -> UIFont {
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

  private static func textAlignment(_ style: [String: Any]?) -> NSTextAlignment {
    switch style?["textAlign"] as? String {
    case "left": return .left
    case "right": return .right
    case "center": return .center
    default: return .center
    }
  }

  // MARK: - Settings construction

  func createVCSettings() -> VCSettings {
    let pipStyle = Self.dict(uiConfig, "pipViewStyle")
    let muteStyle = Self.dict(uiConfig, "muteButtonStyle")
    let cameraSwitchStyle = Self.dict(uiConfig, "cameraSwitchButtonStyle")
    let labelStyle = Self.dict(uiConfig, "instructionLabelStyle")

    let backgroundColor = Self.color(fromHex: uiConfig?["backgroundColor"]) ?? .black
    // The flat `textColor`/`pipViewBorderColor` keys predate the per-element
    // styles and stay supported as shorthands; the specific style wins.
    let textColor = Self.color(fromHex: labelStyle?["textColor"])
      ?? Self.color(fromHex: uiConfig?["textColor"])
      ?? .white
    let pipBorderColor = Self.color(fromHex: pipStyle?["borderColor"])
      ?? Self.color(fromHex: uiConfig?["pipViewBorderColor"])
      ?? .white

    let muteButtonStyle = VCMuteButtonStyle(
      mutedColor: Self.color(fromHex: muteStyle?["mutedColor"]) ?? .red,
      unmutedColor: Self.color(fromHex: muteStyle?["unmutedColor"]) ?? .white,
      size: Self.number(muteStyle, "size") ?? 50,
      horizontalPosition: Self.horizontalPosition(
        Self.dict(muteStyle, "horizontalPosition"), default: .center),
      verticalPosition: Self.verticalPosition(
        Self.dict(muteStyle, "verticalPosition"), default: .bottom(offset: 20)))

    let cameraSwitchButtonStyle = VCCameraSwitchButtonStyle(
      color: Self.color(fromHex: cameraSwitchStyle?["color"]) ?? .white,
      size: Self.number(cameraSwitchStyle, "size") ?? 50,
      horizontalPosition: Self.horizontalPosition(
        Self.dict(cameraSwitchStyle, "horizontalPosition"), default: .left(offset: 16)),
      verticalPosition: Self.verticalPosition(
        Self.dict(cameraSwitchStyle, "verticalPosition"), default: .bottom(offset: 20)))

    return VCSettings(
      bundle: localizationBundle,
      tableName: getTableName(),
      backgroundColor: backgroundColor,
      backgroundStyle: nil,
      overlayImageStyle: nil,
      muteButtonStyle: muteButtonStyle,
      cameraSwitchButtonStyle: cameraSwitchButtonStyle,
      pipViewStyle: UdentifyViewStyle(
        backgroundColor: .clear,
        borderColor: pipBorderColor,
        cornerRadius: Self.number(pipStyle, "cornerRadius") ?? 10,
        borderWidth: Self.number(pipStyle, "borderWidth") ?? 2,
        horizontalSizing: Self.horizontalSizing(
          pipStyle, defaultWidth: 120, defaultPosition: .right(offset: 16)),
        verticalSizing: Self.verticalSizing(
          pipStyle, defaultHeight: 135, defaultPosition: .bottom(offset: 0))),
      instructionLabelStyle: UdentifyTextStyle(
        font: Self.font(labelStyle),
        textColor: textColor,
        textAlignment: Self.textAlignment(labelStyle),
        numberOfLines: Int(Self.number(labelStyle, "numberOfLines") ?? 0),
        lineHeightMultiple: Self.number(labelStyle, "lineHeightMultiple") ?? 0,
        leading: Self.number(labelStyle, "leading") ?? 35,
        trailing: Self.number(labelStyle, "trailing") ?? 35,
        verticalPosition: Self.dict(labelStyle, "verticalPosition").map {
          Self.verticalPosition($0, default: .center)
        }),
      requestTimeout: getRequestTimeout())
  }

#endif

  /// The signed shift for `horizontalPosition: {type: 'center', offset: X}`.
  /// Zero for every other placement, where `offset` means an edge inset and
  /// is already carried by `UdentifyHorizontalPosition` itself.
  private static func centerOffsetX(_ style: [String: Any]?) -> CGFloat {
    let position = dict(style, "horizontalPosition")
    guard position?["type"] as? String == "center" else { return 0 }
    return number(position, "offset") ?? 0
  }

  /// Per-element visibility, the PiP background fill and the centred
  /// buttons' offsets - see `VideoCallStyleOverrides`.
  func createStyleOverrides() -> VideoCallStyleOverrides {
    var overrides = VideoCallStyleOverrides()
    let pipStyle = Self.dict(uiConfig, "pipViewStyle")
    overrides.isPipViewVisible = Self.bool(pipStyle, "visible") ?? true
    overrides.isMuteButtonVisible =
      Self.bool(Self.dict(uiConfig, "muteButtonStyle"), "visible") ?? true
    overrides.isCameraSwitchButtonVisible =
      Self.bool(Self.dict(uiConfig, "cameraSwitchButtonStyle"), "visible") ?? true
    overrides.pipViewBackgroundColor = Self.color(fromHex: pipStyle?["backgroundColor"]) ?? .clear
    overrides.muteButtonCenterOffsetX =
      Self.centerOffsetX(Self.dict(uiConfig, "muteButtonStyle"))
    let cameraSwitchStyle = Self.dict(uiConfig, "cameraSwitchButtonStyle")
    overrides.cameraSwitchButtonCenterOffsetX = Self.centerOffsetX(cameraSwitchStyle)
    // Android reads the same offset straight from `horizontalPosition`, so
    // the PiP view carries one too rather than honouring the field on only
    // one platform.
    overrides.pipViewCenterOffsetX = Self.centerOffsetX(pipStyle)
    return overrides
  }

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
