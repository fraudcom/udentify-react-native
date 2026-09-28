package com.livenessrnlibrary

/**
 * Face recognizer credentials data class
 * Based on the Flutter implementation
 */
data class FaceRecognizerCredentials(
    val serverURL: String,
    val transactionID: String,
    val userID: String,
    val autoTake: Boolean = true,
    val errorDelay: Float = 0.10f,
    val successDelay: Float = 0.75f,
    val runInBackground: Boolean = false,
    val blinkDetectionEnabled: Boolean = false,
    val requestTimeout: Int = 10,
    val eyesOpenThreshold: Float = 0.75f,
    val maskConfidence: Double = 0.95,
    // null leaves the SDK's own default (1f, fully opaque). See LivenessModels.ts.
    val activeLivenessOpacity: Float? = null,
    val invertedAnimation: Boolean = false,
    val activeLivenessAutoNextEnabled: Boolean = true,
    /** Name of the server-side list to identify/register against. Required for Method.Identification. */
    val listName: String? = null
) {
    
    /**
     * Convert to map for Udentify SDK compatibility
     */
    fun toMap(): Map<String, Any> {
        // activeLivenessOpacity is deliberately omitted when null: absent means
        // "leave the SDK's own default", and a null value in this map would make
        // it Map<String, Any?>.
        return mapOfNotNullValues(
            "serverURL" to serverURL,
            "transactionID" to transactionID,
            "userID" to userID,
            "autoTake" to autoTake,
            "errorDelay" to errorDelay,
            "successDelay" to successDelay,
            "runInBackground" to runInBackground,
            "blinkDetectionEnabled" to blinkDetectionEnabled,
            "requestTimeout" to requestTimeout,
            "eyesOpenThreshold" to eyesOpenThreshold,
            "maskConfidence" to maskConfidence,
            "activeLivenessOpacity" to activeLivenessOpacity,
            "invertedAnimation" to invertedAnimation,
            "activeLivenessAutoNextEnabled" to activeLivenessAutoNextEnabled,
            "listName" to (listName ?: "")
        )
    }

    private fun mapOfNotNullValues(vararg pairs: Pair<String, Any?>): Map<String, Any> =
        pairs.mapNotNull { (k, v) -> v?.let { k to it } }.toMap()
}
