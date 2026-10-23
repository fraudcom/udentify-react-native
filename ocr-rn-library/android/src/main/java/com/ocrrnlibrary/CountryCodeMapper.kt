package com.ocrrnlibrary

/**
 * Normalizes a JS country string to the ISO 3166-1 alpha-3 code the SDK expects.
 * Alpha-3 codes pass through, so the SDK decides which countries it supports
 * rather than this class holding a list that drifts from it.
 */
object CountryCodeMapper {

    /**
     * Non-ISO spellings earlier versions of this library accepted. Kept so
     * integrations already sending them keep working; alpha-3 codes must not be
     * listed here, they pass through unchanged.
     */
    private val LEGACY_ALIASES = mapOf(
        "TR" to "TUR", "TURKEY" to "TUR",
        "GB" to "GBR", "UK" to "GBR", "UNITED_KINGDOM" to "GBR",
        "CO" to "COL", "COLOMBIA" to "COL",
        "ES" to "ESP", "SPAIN" to "ESP",
        "BR" to "BRA", "BRAZIL" to "BRA",
        "US" to "USA", "UNITED_STATES" to "USA",
        "PE" to "PER", "PERU" to "PER",
        "EC" to "ECU", "ECUADOR" to "ECU",
        "NL" to "NLD", "NETHERLANDS" to "NLD",
        "DE" to "DEU", "GERMANY" to "DEU",
        "FR" to "FRA", "FRANCE" to "FRA",
        "IT" to "ITA", "ITALY" to "ITA"
    )

    private val ALPHA3 = Regex("^[A-Z]{3}$")

    fun toCountryCode(countryCode: String): String {
        val normalized = countryCode.trim().uppercase()
        LEGACY_ALIASES[normalized]?.let { return it }
        if (ALPHA3.matches(normalized)) return normalized

        android.util.Log.w(
            "CountryCodeMapper",
            "Unsupported country code '$countryCode', defaulting to TUR. Expected an ISO 3166-1 alpha-3 code."
        )
        return "TUR"
    }
}
