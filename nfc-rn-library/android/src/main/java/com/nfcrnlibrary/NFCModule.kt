package com.nfcrnlibrary

import android.app.Activity
import android.content.Context
import android.content.Intent
// Removed native Android NFC imports - using Udentify NFC SDK exclusively
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.modules.core.DeviceEventManagerModule


// UdentifyNFC SDK imports
import io.udentify.android.nfc.ApiCredentials
import io.udentify.android.nfc.CardData
import io.udentify.android.nfc.reader.NFCLocation
import io.udentify.android.nfc.reader.NfcLocationListener
import io.udentify.android.nfc.reader.NFCReaderActivity
import io.udentify.android.nfc.reader.NFCReaderFragment
import io.udentify.android.nfc.reader.NFCState

class NFCModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "NFCModule"
    }

    override fun getName() = NAME

    private var nfcLocation: NFCLocation? = null
    private var currentCredentials: ApiCredentials? = null
    private var passportCompletion: Promise? = null

    // No initialization needed - Udentify SDK handles NFC internally

    // MARK: - NFC Status Methods

    @ReactMethod
    fun isNFCAvailable(promise: Promise) {
        try {
            Log.d(NAME, "NFCModule - Checking NFC availability")

            // Let Udentify SDK handle NFC availability internally
            // For Android API 14+ (which we target), assume NFC is available if declared in manifest
            val isAvailable = true
            Log.d(NAME, "NFCModule - NFC available: $isAvailable (handled by Udentify SDK)")

            promise.resolve(isAvailable)
        } catch (e: Exception) {
            Log.e(NAME, "NFCModule - Error checking NFC availability: ${e.message}", e)
            promise.reject("NFC_ERROR", "Error checking NFC availability: ${e.message}")
        }
    }

    @ReactMethod
    fun isNFCEnabled(promise: Promise) {
        try {
            Log.d(NAME, "NFCModule - Checking NFC enabled status")

            // Let Udentify SDK handle NFC enabled status internally
            // The SDK will show appropriate error if NFC is disabled
            val isEnabled = true
            Log.d(NAME, "NFCModule - NFC enabled: $isEnabled (handled by Udentify SDK)")

            promise.resolve(isEnabled)
        } catch (e: Exception) {
            Log.e(NAME, "NFCModule - Error checking NFC enabled status: ${e.message}", e)
            promise.reject("NFC_ERROR", "Error checking NFC enabled status: ${e.message}")
        }
    }

    // MARK: - NFC Scanning Methods

    @ReactMethod
    fun startNFCReading(
        credentials: ReadableMap,
        promise: Promise
    ) {
        try {
            Log.d(NAME, "NFCModule - Starting NFC passport reading")
            Log.d(NAME, "NFCModule - Credentials: $credentials")

            // NFC SDK is now available
            val currentActivity = getCurrentActivity()
            if (currentActivity !is AppCompatActivity) {
                promise.reject("NFC_ERROR", "Current activity must be an AppCompatActivity for NFC reading")
                return
            }

            // Extract and validate required credentials (avoid multiple access to prevent consumption errors)
            val documentNumber = credentials.getString("documentNumber")
            val dateOfBirth = credentials.getString("dateOfBirth")
            val expiryDate = credentials.getString("expiryDate")
            val serverURL = credentials.getString("serverURL")
            val transactionID = credentials.getString("transactionID")

            // Validate required parameters early
            if (documentNumber == null || dateOfBirth == null || expiryDate == null ||
                serverURL == null || transactionID == null) {
                promise.reject("NFC_ERROR", "Missing required credentials: documentNumber, dateOfBirth, expiryDate, serverURL, transactionID")
                return
            }

            // Extract optional parameters with safe access pattern
            val isActiveAuthEnabled = try {
                if (credentials.hasKey("isActiveAuthenticationEnabled")) {
                    credentials.getBoolean("isActiveAuthenticationEnabled")
                } else true
            } catch (e: Exception) {
                Log.w(NAME, "NFCModule - Error reading isActiveAuthenticationEnabled, using default: ${e.message}")
                true
            }
            
            val isPassiveAuthEnabled = try {
                if (credentials.hasKey("isPassiveAuthenticationEnabled")) {
                    credentials.getBoolean("isPassiveAuthenticationEnabled")
                } else true
            } catch (e: Exception) {
                Log.w(NAME, "NFCModule - Error reading isPassiveAuthenticationEnabled, using default: ${e.message}")
                true
            }
            
            val enableAutoTriggering = try {
                if (credentials.hasKey("enableAutoTriggering")) {
                    credentials.getBoolean("enableAutoTriggering")
                } else true
            } catch (e: Exception) {
                Log.w(NAME, "NFCModule - Error reading enableAutoTriggering, using default: ${e.message}")
                true
            }

            // Build ApiCredentials using Udentify SDK
            val apiCredentials = ApiCredentials.Builder()
                .mrzDocNo(documentNumber)
                .mrzBirthDate(dateOfBirth) // Format: YYMMDD
                .mrzExpireDate(expiryDate) // Format: YYMMDD
                .serverUrl(serverURL)
                .transactionID(transactionID)
                .enableAutoTriggering(enableAutoTriggering)
                .isActiveAuthenticationEnabled(isActiveAuthEnabled)
                .isPassiveAuthenticationEnabled(isPassiveAuthEnabled)
                .build()

            // Store credentials and completion for NFCReaderActivity
            currentCredentials = apiCredentials
            passportCompletion = promise

            // Use inline fragment approach instead of opening new Activity
            NFCReaderActivityWrapper.startInlineNFCReading(
                activity = currentActivity,
                apiCredentials = apiCredentials,
                nfcModule = this@NFCModule,
                promise = promise
            )

            Log.d(NAME, "NFCModule - NFC passport reading started successfully")
            
            // NFC reading started successfully

        } catch (e: Exception) {
            Log.e(NAME, "NFCModule - Error starting NFC reading: ${e.message}", e)
            promise.reject("NFC_ERROR", "Error starting NFC reading: ${e.message}")
        }
    }

    @ReactMethod
    fun cancelNFCReading(promise: Promise) {
        try {
            Log.d(NAME, "NFCModule - Cancelling NFC reading")

            // Stop inline NFC reading if active
            val currentActivity = getCurrentActivity()
            if (currentActivity is AppCompatActivity) {
                NFCReaderActivityWrapper.stopInlineNFCReading(currentActivity)
            }

            // Clear stored data
            currentCredentials = null
            passportCompletion?.reject("NFC_CANCELLED", "NFC reading was cancelled")
            passportCompletion = null

            Log.d(NAME, "NFCModule - NFC reading cancelled successfully")
            promise.resolve(true)

        } catch (e: Exception) {
            Log.e(NAME, "NFCModule - Error cancelling NFC reading: ${e.message}", e)
            promise.reject("NFC_ERROR", "Error cancelling NFC reading: ${e.message}")
        }
    }

    // MARK: - NFC Location Methods

    @ReactMethod
    fun getNFCLocation(
        serverURL: String,
        promise: Promise
    ) {
        try {
            Log.d(NAME, "NFCModule - Getting NFC antenna location")

            val currentActivity = getCurrentActivity()
            if (currentActivity == null) {
                promise.reject("NFC_ERROR", "No current activity found")
                return
            }

            // NFC Location detection is now available
            // Implement NfcLocationListener
            val locationListener = object : NfcLocationListener {
                override fun onSuccess(location: Int) {
                    Log.d(NAME, "NFCModule - NFC location detected: $location")

                    val result = WritableNativeMap()
                    result.putBoolean("success", true)
                    result.putInt("location", location)
                    result.putString("message", "NFC location detected successfully")
                    result.putDouble("timestamp", System.currentTimeMillis().toDouble())

                    promise.resolve(result)
                }

                override fun onFailed(error: String?) {
                    Log.e(NAME, "NFCModule - NFC location detection failed: $error")
                    promise.reject("NFC_LOCATION_ERROR", error ?: "Failed to detect NFC location")
                }
            }

            // Create NFCLocation instance with listener and serverURL (based on actual constructor)
            nfcLocation = NFCLocation(locationListener, serverURL)

            // Get NFC location
            nfcLocation?.getNfcLocation()

        } catch (e: Exception) {
            Log.e(NAME, "NFCModule - Error getting NFC location: ${e.message}", e)
            promise.reject("NFC_LOCATION_ERROR", "Error getting NFC location: ${e.message}")
        }
    }

    // MARK: - Helper Methods

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(NAME, "NFCModule - Error sending event $eventName: ${e.message}", e)
        }
    }

    fun emitNFCPassportSuccess(result: WritableMap) {
        Log.d(NAME, "NFCModule - Emitting onNFCPassportSuccess event")
        sendEvent("onNFCPassportSuccess", result)
    }

    fun emitNFCError(error: String) {
        Log.d(NAME, "NFCModule - Emitting onNFCError event")
        val params = WritableNativeMap()
        params.putString("message", error)
        params.putDouble("timestamp", System.currentTimeMillis().toDouble())
        sendEvent("onNFCError", params)
    }

    fun emitNFCProgress(progress: Int) {
        // Progress events are no longer emitted to UI
        Log.d(NAME, "NFCModule - NFC progress: $progress% (not emitted to UI)")
    }

    fun convertBitmapToBase64(bitmap: android.graphics.Bitmap): String {
        val outputStream = java.io.ByteArrayOutputStream()
        bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 80, outputStream)
        val byteArray = outputStream.toByteArray()
        return android.util.Base64.encodeToString(byteArray, android.util.Base64.DEFAULT)
    }

    private fun bytesToHex(bytes: ByteArray): String {
        val hexChars = "0123456789ABCDEF"
        val result = StringBuilder(bytes.size * 2)
        for (byte in bytes) {
            val i = byte.toInt()
            result.append(hexChars[i shr 4 and 0x0f])
            result.append(hexChars[i and 0x0f])
        }
        return result.toString()
    }
}
