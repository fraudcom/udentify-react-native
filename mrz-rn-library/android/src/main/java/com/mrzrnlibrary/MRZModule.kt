package com.mrzrnlibrary

import androidx.annotation.NonNull
import android.app.Activity
import android.content.pm.PackageManager
import android.Manifest
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.util.Log
import android.content.Intent

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class MRZModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {
    
    private var currentPromise: Promise? = null
    private val REQUEST_CAMERA_PERMISSION = 1001
    private val LAUNCH_MRZ_CAMERA_ACTIVITY = 1002

    companion object {
        private const val TAG = "MRZModule"
        const val NAME = "MRZModule"
    }

    override fun getName(): String {
        return NAME
    }

    init {
        // Register as activity event listener
        reactContext.addActivityEventListener(this)
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        val currentActivity = currentActivity
        if (currentActivity != null) {
            val hasCameraPermission = ContextCompat.checkSelfPermission(currentActivity,
                Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
            promise.resolve(hasCameraPermission)
        } else {
            promise.reject("ACTIVITY_ERROR", "Activity is not available")
        }
    }

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        val currentActivity = currentActivity
        if (currentActivity != null) {
            val hasCameraPermission = ContextCompat.checkSelfPermission(currentActivity,
                Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
            
            if (hasCameraPermission) {
                promise.resolve("granted")
            } else {
                ActivityCompat.requestPermissions(currentActivity,
                    arrayOf(Manifest.permission.CAMERA), REQUEST_CAMERA_PERMISSION)
                promise.resolve("requested")
            }
        } else {
            promise.reject("ACTIVITY_ERROR", "Activity is not available")
        }
    }

    @ReactMethod
    fun startMrzCamera(customization: ReadableMap?, promise: Promise) {
        try {
            Log.i(TAG, "🚀 MRZ camera scanning requested")
            
            val currentActivity = currentActivity ?: run {
                promise.reject("ACTIVITY_ERROR", "Activity is not available")
                return
            }
            
            // Check camera permission
            val hasCameraPermission = ContextCompat.checkSelfPermission(currentActivity,
                Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
            
            if (!hasCameraPermission) {
                promise.reject("PERMISSION_DENIED", "Camera permission is required for MRZ scanning")
                return
            }
            
            // Store the promise for later use in callbacks
            currentPromise = promise
            
            // Launch MRZ camera activity using Intent (like RNUdentifyBridge pattern)
            val intent = Intent(currentActivity, MrzCameraActivity::class.java)
            currentActivity.startActivityForResult(intent, LAUNCH_MRZ_CAMERA_ACTIVITY)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting MRZ camera", e)
            promise.reject("START_MRZ_CAMERA_ERROR", "Failed to start MRZ camera: ${e.message}")
        }
    }

    @ReactMethod
    fun processMrzImage(imageBase64: String, promise: Promise) {
        // Image processing not implemented yet - will be added in future version
        promise.reject("NOT_IMPLEMENTED", "Image processing feature is not yet implemented")
    }

    @ReactMethod
    fun cancelMrzScanning(promise: Promise) {
        try {
            Log.i(TAG, "🛑 User cancelled MRZ scanning")
            
            // Cancel any ongoing promise
            currentPromise?.reject("CANCELLED", "MRZ scanning was cancelled")
            currentPromise = null
            
            // Reply to the cancel request
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling MRZ scanning", e)
            promise.reject("CANCEL_MRZ_ERROR", "Failed to cancel MRZ scanning: ${e.message}")
        }
    }



    // ActivityEventListener implementation
    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        Log.d(TAG, "onActivityResult: requestCode=$requestCode, resultCode=$resultCode")
        
        if (requestCode == LAUNCH_MRZ_CAMERA_ACTIVITY) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                val mrzDataJson = data.getStringExtra(MrzCameraActivity.RESULT_MRZ_DATA)
                Log.i(TAG, "🔍 Received MRZ data from activity: $mrzDataJson")
                
                if (mrzDataJson != null) {
                    try {
                        // Parse the JSON result and create the response
                        val jsonObject = org.json.JSONObject(mrzDataJson)
                        Log.i(TAG, "📋 Available JSON keys in module: ${jsonObject.keys().asSequence().toList()}")
                        
                        // Helper function to get value with multiple possible keys
                        fun getValueFromJson(vararg keys: String): String {
                            for (key in keys) {
                                if (jsonObject.has(key)) {
                                    val value = jsonObject.optString(key, "")
                                    if (value.isNotEmpty()) {
                                        Log.d(TAG, "✅ Found $key = $value")
                                        return value
                                    }
                                }
                            }
                            Log.w(TAG, "⚠️ None of these keys found: ${keys.joinToString(", ")}")
                            return ""
                        }
                        
                        val mrzData = Arguments.createMap().apply {
                            putString("documentType", getValueFromJson("documentType", "docType", "document_type"))
                            putString("issuingCountry", getValueFromJson("issuingCountry", "issuing_country", "country"))
                            putString("documentNumber", getValueFromJson("documentNumber", "docNo", "document_number", "doc_no"))
                            putString("optionalData1", getValueFromJson("optionalData1", "optional_data_1", "optionalData"))
                            putString("dateOfBirth", getValueFromJson("dateOfBirth", "birthDate", "date_of_birth", "birth_date"))
                            putString("gender", getValueFromJson("gender", "sex"))
                            putString("dateOfExpiration", getValueFromJson("date_of_expire", "dateOfExpiration", "expirationDate", "expireDate", "date_of_expiration", "expiration_date"))
                            putString("nationality", getValueFromJson("nationality", "nat"))
                            putString("optionalData2", getValueFromJson("optionalData2", "optional_data_2"))
                            putString("surname", getValueFromJson("surname", "lastName", "last_name"))
                            putString("givenNames", getValueFromJson("givenNames", "firstName", "first_name", "given_names"))
                        }
                        
                        val resultMap = Arguments.createMap().apply {
                            putBoolean("success", true)
                            putMap("mrzData", mrzData)
                            
                            // Add legacy fields for backward compatibility  
                            val docNum = getValueFromJson("documentNumber", "docNo", "document_number", "doc_no")
                            val birthDate = getValueFromJson("dateOfBirth", "birthDate", "date_of_birth", "birth_date")
                            val expDate = getValueFromJson("date_of_expire", "dateOfExpiration", "expirationDate", "expireDate", "date_of_expiration", "expiration_date")
                            
                            putString("documentNumber", docNum)
                            putString("dateOfBirth", birthDate)
                            putString("dateOfExpiration", expDate)
                            
                            Log.i(TAG, "📤 Sending to React Native - success: true")
                            Log.i(TAG, "📤 Legacy fields - docNumber: $docNum, birthDate: $birthDate, expDate: $expDate")
                        }
                        
                        Log.i(TAG, "✅ Resolving promise with MRZ result")
                        currentPromise?.resolve(resultMap)
                        currentPromise = null
                        
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing MRZ result", e)
                        currentPromise?.reject("PARSE_ERROR", "Failed to parse MRZ result: ${e.message}")
                        currentPromise = null
                    }
                } else {
                    currentPromise?.reject("NO_DATA", "No MRZ data received")
                    currentPromise = null
                }
            } else {
                // User cancelled or error occurred
                currentPromise?.reject("USER_CANCELLED", "MRZ scanning was cancelled")
                currentPromise = null
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {
        // Not needed for this implementation
    }
}
