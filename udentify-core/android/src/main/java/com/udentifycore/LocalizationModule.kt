package com.udentifycore

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import io.udentify.android.commons.model.LocalizationLanguage
import io.udentify.android.commons.model.UdentifySettingsProvider
import io.udentify.android.commons.interfaces.LocalizationInstantiationListener
import java.util.Locale

/**
 * LocalizationModule
 * React Native module for remote language pack functionality using UdentifySettingsProvider
 */
class LocalizationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "LocalizationModule"
    }
    
    override fun getName(): String {
        return "LocalizationModule"
    }
    
    /**
     * Instantiate server-based localization
     */
    @ReactMethod
    fun instantiateServerBasedLocalization(
        language: String,
        serverUrl: String,
        transactionId: String,
        requestTimeout: Double, // Note: ignored as API doesn't support timeout
        promise: Promise
    ) {
        try {
            Log.d(TAG, "instantiateServerBasedLocalization called for language: $language")
            
            // Map string to LocalizationLanguage enum
            val languageEnum = mapStringToLocalizationLanguage(language)
            if (languageEnum == null) {
                val errorMessage = "Invalid language code: $language"
                Log.e(TAG, "Error: $errorMessage")
                promise.reject("LOCALIZATION_ERROR", errorMessage)
                return
            }
            
            Log.d(TAG, "Mapped language to enum: $languageEnum")
            
            // Call native SDK method
            UdentifySettingsProvider.instantiateServerBasedLocalization(
                reactApplicationContext,
                languageEnum,
                serverUrl,
                transactionId,
                LocalizationInstantiationListener { error ->
                    if (error == null) {
                        Log.d(TAG, "Server-based localization instantiated successfully")
                        promise.resolve(null)
                    } else {
                        Log.e(TAG, "Error instantiating localization: ${error.message}")
                        promise.reject("LOCALIZATION_ERROR", error.message ?: "Unknown error")
                    }
                }
            )
            
        } catch (e: Exception) {
            Log.e(TAG, "Exception: ${e.message}", e)
            promise.reject("LOCALIZATION_ERROR", e.message, e)
        }
    }
    
    /**
     * Get the localization map
     */
    @ReactMethod
    fun getLocalizationMap(promise: Promise) {
        try {
            Log.d(TAG, "getLocalizationMap called")
            
            // Get localization map from UdentifySettingsProvider
            val localizationMap = UdentifySettingsProvider.getLocalizationMap()
            
            if (localizationMap == null || localizationMap.isEmpty()) {
                Log.d(TAG, "No localization map available")
                promise.resolve(null)
                return
            }
            
            // Convert to WritableMap
            val writableMap = Arguments.createMap()
            for ((key, value) in localizationMap) {
                writableMap.putString(key, value)
            }
            
            Log.d(TAG, "Localization map retrieved with ${localizationMap.size} entries")
            promise.resolve(writableMap)
            
        } catch (e: Exception) {
            Log.e(TAG, "Exception: ${e.message}", e)
            promise.reject("GET_MAP_ERROR", e.message, e)
        }
    }
    
    /**
     * Clear localization cache for a specific language
     */
    @ReactMethod
    fun clearLocalizationCache(language: String, promise: Promise) {
        try {
            Log.d(TAG, "clearLocalizationCache called for language: $language")
            
            // Map string to LocalizationLanguage enum
            val languageEnum = mapStringToLocalizationLanguage(language)
            if (languageEnum == null) {
                val errorMessage = "Invalid language code: $language"
                Log.e(TAG, "Error: $errorMessage")
                promise.reject("CLEAR_CACHE_ERROR", errorMessage)
                return
            }
            
            // Clear cache using UdentifySettingsProvider
            UdentifySettingsProvider.clearLocalizationCache(reactApplicationContext, languageEnum)
            
            Log.d(TAG, "Localization cache cleared successfully")
            promise.resolve(null)
            
        } catch (e: Exception) {
            Log.e(TAG, "Exception: ${e.message}", e)
            promise.reject("CLEAR_CACHE_ERROR", e.message, e)
        }
    }
    
    /**
     * Map system language to enum
     * Simple implementation based on device locale
     */
    @ReactMethod
    fun mapSystemLanguageToEnum(promise: Promise) {
        try {
            Log.d(TAG, "mapSystemLanguageToEnum called")
            
            // Get system language from device locale
            val systemLanguage = Locale.getDefault().language.uppercase()
            Log.d(TAG, "System language code: $systemLanguage")
            
            // Try to map to supported language
            val languageEnum = mapStringToLocalizationLanguage(systemLanguage)
            
            if (languageEnum == null) {
                Log.d(TAG, "System language not supported, defaulting to null")
                promise.resolve(null)
                return
            }
            
            val languageString = mapLocalizationLanguageToString(languageEnum)
            Log.d(TAG, "System language mapped to: $languageString")
            promise.resolve(languageString)
            
        } catch (e: Exception) {
            Log.e(TAG, "Exception: ${e.message}", e)
            promise.reject("MAP_LANGUAGE_ERROR", e.message, e)
        }
    }
    
    // MARK: - Helper Methods
    
    /**
     * Map string to LocalizationLanguage enum
     */
    private fun mapStringToLocalizationLanguage(language: String): LocalizationLanguage? {
        return when (language.uppercase()) {
            "EN" -> LocalizationLanguage.EN
            "ES" -> LocalizationLanguage.ES
            "FR" -> LocalizationLanguage.FR
            "DE" -> LocalizationLanguage.DE
            "IT" -> LocalizationLanguage.IT
            "PT" -> LocalizationLanguage.PT
            "RU" -> LocalizationLanguage.RU
            "ZH" -> LocalizationLanguage.ZH
            "JA" -> LocalizationLanguage.JA
            "KO" -> LocalizationLanguage.KO
            "AR" -> LocalizationLanguage.AR
            "HI" -> LocalizationLanguage.HI
            "BN" -> LocalizationLanguage.BN
            "PA" -> LocalizationLanguage.PA
            "UR" -> LocalizationLanguage.UR
            "ID" -> LocalizationLanguage.ID
            "MS" -> LocalizationLanguage.MS
            "SW" -> LocalizationLanguage.SW
            "TA" -> LocalizationLanguage.TA
            "TR" -> LocalizationLanguage.TR
            else -> null
        }
    }
    
    /**
     * Map LocalizationLanguage enum to string
     */
    private fun mapLocalizationLanguageToString(language: LocalizationLanguage): String {
        return when (language) {
            LocalizationLanguage.EN -> "EN"
            LocalizationLanguage.ES -> "ES"
            LocalizationLanguage.FR -> "FR"
            LocalizationLanguage.DE -> "DE"
            LocalizationLanguage.IT -> "IT"
            LocalizationLanguage.PT -> "PT"
            LocalizationLanguage.RU -> "RU"
            LocalizationLanguage.ZH -> "ZH"
            LocalizationLanguage.JA -> "JA"
            LocalizationLanguage.KO -> "KO"
            LocalizationLanguage.AR -> "AR"
            LocalizationLanguage.HI -> "HI"
            LocalizationLanguage.BN -> "BN"
            LocalizationLanguage.PA -> "PA"
            LocalizationLanguage.UR -> "UR"
            LocalizationLanguage.ID -> "ID"
            LocalizationLanguage.MS -> "MS"
            LocalizationLanguage.SW -> "SW"
            LocalizationLanguage.TA -> "TA"
            LocalizationLanguage.TR -> "TR"
        }
    }
}
