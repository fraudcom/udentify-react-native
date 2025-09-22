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
    val invertedAnimation: Boolean = false,
    val activeLivenessAutoNextEnabled: Boolean = true
) {
    
    /**
     * Convert to map for Udentify SDK compatibility
     */
    fun toMap(): Map<String, Any> {
        return mapOf(
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
            "invertedAnimation" to invertedAnimation,
            "activeLivenessAutoNextEnabled" to activeLivenessAutoNextEnabled
        )
    }
}
