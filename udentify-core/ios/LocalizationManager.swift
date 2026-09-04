import Foundation
import UdentifyCommons

/**
 * LocalizationManager
 * Manages remote language pack functionality using UdentifySettingsProvider and LocalizationManager
 */
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
    
    /**
     * Map string to LocalizationLanguage enum
     */
    private func mapStringToLocalizationLanguage(_ language: String) -> LocalizationLanguage? {
        switch language.uppercased() {
        case "EN": return .EN
        case "ES": return .ES
        case "FR": return .FR
        case "DE": return .DE
        case "IT": return .IT
        case "PT": return .PT
        case "RU": return .RU
        case "ZH": return .ZH
        case "JA": return .JA
        case "KO": return .KO
        case "AR": return .AR
        case "HI": return .HI
        case "BN": return .BN
        case "PA": return .PA
        case "UR": return .UR
        case "ID": return .ID
        case "MS": return .MS
        case "SW": return .SW
        case "TA": return .TA
        case "TR": return .TR
        default: return nil
        }
    }
    
    /**
     * Map LocalizationLanguage enum to string
     */
    private func mapLocalizationLanguageToString(_ language: LocalizationLanguage) -> String {
        switch language {
        case .EN: return "EN"
        case .ES: return "ES"
        case .FR: return "FR"
        case .DE: return "DE"
        case .IT: return "IT"
        case .PT: return "PT"
        case .RU: return "RU"
        case .ZH: return "ZH"
        case .JA: return "JA"
        case .KO: return "KO"
        case .AR: return "AR"
        case .HI: return "HI"
        case .BN: return "BN"
        case .PA: return "PA"
        case .UR: return "UR"
        case .ID: return "ID"
        case .MS: return "MS"
        case .SW: return "SW"
        case .TA: return "TA"
        case .TR: return "TR"
        @unknown default: return "EN"
        }
    }
}

