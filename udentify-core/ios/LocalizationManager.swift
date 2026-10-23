import Foundation
import UdentifyCommons

/// The language the app asked the SDKs to use, and the bundle that serves it.
///
/// iOS resolves a bundle's `.lproj` by device language, so the SDKs take a
/// `bundle:` from the host instead and use whatever they are given. This picks
/// the language-specific sub-bundle. It only covers keys the server-hosted
/// language pack does not already answer.
@objc(UdentifyLanguagePreference)
public class UdentifyLanguagePreference: NSObject {

    /// The last language passed to `instantiateServerBasedLocalization`, as the
    /// `LocalizationLanguage` raw value (`"TR"`, `"EN"`, ...). `nil` means the
    /// app never chose one, and every bundle then resolves by device language
    /// exactly as it did before this existed.
    @objc public private(set) static var selected: String?

    /// Named `select` because `@objc` synthesises a setter selector for the
    /// property above, which a conventionally-named setter would collide with.
    @objc public static func select(_ language: String?) {
        selected = language?.uppercased()
    }

    /// The bundle to hand an SDK for `resourceBundle`, narrowed to the selected
    /// language when that language is actually present in it.
    ///
    /// Falls back to `resourceBundle` untouched when no language is selected or
    /// the bundle has no table for it, so a missing translation degrades to the
    /// device-language behaviour rather than to nothing.
    @objc public static func localizedBundle(for resourceBundle: Bundle) -> Bundle {
        guard let language = selected else { return resourceBundle }
        // .lproj directories are lowercase two-letter codes; the SDK enum is
        // uppercase.
        guard let path = resourceBundle.path(forResource: language.lowercased(), ofType: "lproj"),
              let localized = Bundle(path: path) else {
            print("UdentifyLanguagePreference - no \(language).lproj in \(resourceBundle.bundlePath); keeping device language")
            return resourceBundle
        }
        return localized
    }
}

@objc(LocalizationManager)
public class LocalizationManager: NSObject {
    
    /**
     * Instantiate server-based localization by downloading the localization file from the server
     */
    @objc public func instantiateServerBasedLocalization(
        language: String,
        serverUrl: String,
        transactionId: String,
        requestTimeout: Double,
        completion: @escaping (Error?) -> Void
    ) {
        NSLog("LocalizationManager - Instantiating server-based localization for language: \(language)")

        // Remembered whether or not the server has a pack for it: the compiled
        // .strings tables in each library's resource bundle are the fallback,
        // and they are only reachable for a non-device language if the wrapper
        // hands the SDK the matching .lproj. See UdentifyLanguagePreference.
        UdentifyLanguagePreference.select(language)
        
        // Map string to LocalizationLanguage enum
        guard let languageEnum = mapStringToLocalizationLanguage(language) else {
            let error = NSError(
                domain: "com.udentify.localization",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Invalid language code: \(language)"]
            )
            NSLog("LocalizationManager - Error: \(error.localizedDescription)")
            completion(error)
            return
        }
        
        NSLog("LocalizationManager - Mapped language to enum: \(languageEnum)")
        
        // Call native SDK static method from UdentifySettingsProvider
        UdentifySettingsProvider.instantiateServerBasedLocalization(
            for: languageEnum,
            serverUrl: serverUrl,
            transactionId: transactionId,
            requestTimeout: requestTimeout
        ) { error in
            if let error = error {
                NSLog("LocalizationManager - Error instantiating localization: \(error.localizedDescription)")
                completion(error)
            } else {
                NSLog("LocalizationManager - Server-based localization instantiated successfully")
                completion(nil)
            }
        }
    }
    
    /**
     * Get the localization map downloaded from the server
     */
    @objc public func getLocalizationMap(
        _ completion: @escaping ([String: String]?, Error?) -> Void
    ) {
        NSLog("LocalizationManager - Getting localization map")
        
        // Get localization map from UdentifySettingsProvider
        if let localizationMap = UdentifySettingsProvider.localizationMap {
            NSLog("LocalizationManager - Localization map retrieved with \(localizationMap.count) entries")
            completion(localizationMap, nil)
        } else {
            NSLog("LocalizationManager - No localization map available")
            completion(nil, nil)
        }
    }
    
    /**
     * Clear the localization cache for a specific language
     */
    @objc public func clearLocalizationCache(
        language: String,
        completion: @escaping (Error?) -> Void
    ) {
        NSLog("LocalizationManager - Clearing localization cache for language: \(language)")
        
        // Map string to LocalizationLanguage enum
        guard let languageEnum = mapStringToLocalizationLanguage(language) else {
            let error = NSError(
                domain: "com.udentify.localization",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Invalid language code: \(language)"]
            )
            NSLog("LocalizationManager - Error: \(error.localizedDescription)")
            completion(error)
            return
        }
        
        // Clear cache using UdentifySettingsProvider
        UdentifySettingsProvider.clearLocalizationCache(for: languageEnum)
        
        NSLog("LocalizationManager - Localization cache cleared successfully")
        completion(nil)
    }
    
    /**
     * Map the system language to the enum value
     */
    @objc public func mapSystemLanguageToEnum(
        _ completion: @escaping (String?, Error?) -> Void
    ) {
        NSLog("LocalizationManager - Mapping system language to enum")
        
        // Get system language mapping
        if let languageEnum = UdentifySettingsProvider.mapSystemLanguageToEnum() {
            let languageString = mapLocalizationLanguageToString(languageEnum)
            NSLog("LocalizationManager - System language mapped to: \(languageString)")
            completion(languageString, nil)
        } else {
            NSLog("LocalizationManager - Could not map system language")
            completion(nil, nil)
        }
    }
    
    // MARK: - Helper Methods
    
    /// `LocalizationLanguage` is `String`-backed, so the SDK's own cases resolve
    /// by raw value; nil for anything it does not declare.
    private func mapStringToLocalizationLanguage(_ language: String) -> LocalizationLanguage? {
        return LocalizationLanguage(rawValue: language.uppercased())
    }

    private func mapLocalizationLanguageToString(_ language: LocalizationLanguage) -> String {
        return language.rawValue
    }
}

