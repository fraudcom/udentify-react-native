import Foundation
import UdentifyCommons
import udentify_core

/// Texts for the example screens, in the app's language rather than the device's.
enum ExampleStrings {

    /// The app's language setting, for example "TR". `nil` follows the SDK's selected language.
    static var language: String?

    private static var resources: Bundle? {
        guard let url = Bundle(for: Marker.self)
            .url(forResource: "ExampleCustomScreensResources", withExtension: "bundle") else { return nil }
        return Bundle(url: url)
    }

    /// `bundle` narrowed to the app language, when it has that language.
    private static func narrowed(_ bundle: Bundle) -> Bundle {
        guard let code = (language ?? UdentifyLanguagePreference.selected)?.lowercased(),
              let path = bundle.path(forResource: code, ofType: "lproj"),
              let localized = Bundle(path: path) else { return bundle }
        return localized
    }

    /// One of the test app's own strings.
    static func own(_ key: String, _ args: CVarArg...) -> String {
        guard let resources else { return key }
        let format = narrowed(resources).localizedString(forKey: key, value: key, table: "ExampleStrings")
        return args.isEmpty ? format : String(format: format, arguments: args)
    }

    /// An SDK string by its key: the language pack first, then the SDK's own table, then `fallback`.
    static func sdk(_ key: String, in bundle: Bundle?, table: String? = nil, fallback: String) -> String {
        if let remote = UdentifySettingsProvider.localizationMap?[key], !remote.isEmpty { return remote }
        guard let bundle else { return fallback }
        let value = bundle.localizedString(forKey: key, value: nil, table: table)
        return value == key ? fallback : value
    }

    private final class Marker {}
}
