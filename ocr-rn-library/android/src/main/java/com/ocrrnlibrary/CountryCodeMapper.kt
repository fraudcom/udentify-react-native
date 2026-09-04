package com.ocrrnlibrary

/**
 * Shared country code mapping for OCR SDK
 * Maps country codes to SDK-compatible format
 */
object CountryCodeMapper {
    
    /**
     * Converts a country code string to SDK-compatible country code
     * @param countryCode The input country code (e.g., "TUR", "TR", "TURKEY")
     * @return The SDK-compatible country code (e.g., "TUR")
     */
    fun toCountryCode(countryCode: String): String {
        return when (countryCode.uppercase()) {
            "TUR", "TR", "TURKEY" -> "TUR"
            "GBR", "GB", "UK", "UNITED_KINGDOM" -> "GBR"
            "COL", "CO", "COLOMBIA" -> "COL"
            "ESP", "ES", "SPAIN" -> "ESP"
            "BRA", "BR", "BRAZIL" -> "BRA"
            "USA", "US", "UNITED_STATES" -> "USA"
            "PER", "PE", "PERU" -> "PER"
            "ECU", "EC", "ECUADOR" -> "ECU"
            "NLD", "NL", "NETHERLANDS" -> "NLD"
            "DEU", "DE", "GERMANY" -> "DEU"
            "FRA", "FR", "FRANCE" -> "FRA"
            "ITA", "IT", "ITALY" -> "ITA"
            else -> {
                android.util.Log.w("CountryCodeMapper", "Unknown country code: $countryCode, defaulting to TUR")
                "TUR"
            }
        }
    }
}
