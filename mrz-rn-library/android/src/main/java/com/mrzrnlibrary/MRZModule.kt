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
import io.udentify.android.mrz.reader.MrzListener

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
            promise.reject("ACTIVITY_ERROR", reactApplicationContext.getString(R.string.mrz_activity_unavailable))
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
            promise.reject("ACTIVITY_ERROR", reactApplicationContext.getString(R.string.mrz_activity_unavailable))
        }
    }

    @ReactMethod
    fun startMrzCamera(customization: ReadableMap?, promise: Promise) {
        try {
            Log.i(TAG, "🚀 MRZ camera scanning requested")
            
            val currentActivity = currentActivity ?: run {
                promise.reject("ACTIVITY_ERROR", reactApplicationContext.getString(R.string.mrz_activity_unavailable))
                return
            }
            
            // Check camera permission
            val hasCameraPermission = ContextCompat.checkSelfPermission(currentActivity,
                Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
            
            if (!hasCameraPermission) {
                promise.reject("PERMISSION_DENIED", reactApplicationContext.getString(R.string.mrz_permission_required))
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
            currentPromise?.reject("CANCELLED", reactApplicationContext.getString(R.string.mrz_scanning_cancelled))
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
                
                if (mrzDataJson != null) {
                    try {
                        // The SDK's result carries exactly three keys; the other fields stay empty.
                        val jsonObject = org.json.JSONObject(mrzDataJson)
                        val docNum = jsonObject.optString(MrzListener.MRZ_DOC_NO, "")
                        val birthDate = jsonObject.optString(MrzListener.MRZ_DATE_OF_BIRTH, "")
                        val expDate = jsonObject.optString(MrzListener.MRZ_DATE_OF_EXPIRE, "")
                        
                        val mrzData = Arguments.createMap().apply {
                            putString("documentType", "")
                            putString("issuingCountry", "")
                            putString("documentNumber", docNum)
                            putString("optionalData1", "")
                            putString("dateOfBirth", birthDate)
                            putString("gender", "")
                            putString("dateOfExpiration", expDate)
                            putString("nationality", "")
                            putString("optionalData2", "")
                            putString("surname", "")
                            putString("givenNames", "")
                        }
                        
                        val resultMap = Arguments.createMap().apply {
                            putBoolean("success", true)
                            putMap("mrzData", mrzData)
                            
                            // Add legacy fields for backward compatibility  
                            putString("documentNumber", docNum)
                            putString("dateOfBirth", birthDate)
                            putString("dateOfExpiration", expDate)
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
                    currentPromise?.reject("NO_DATA", reactApplicationContext.getString(R.string.mrz_not_found))
                    currentPromise = null
                }
            } else {
                // User cancelled or error occurred
                currentPromise?.reject("USER_CANCELLED", reactApplicationContext.getString(R.string.mrz_scanning_cancelled))
                currentPromise = null
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {
        // Not needed for this implementation
    }
}
