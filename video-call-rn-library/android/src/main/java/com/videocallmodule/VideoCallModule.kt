package com.videocallmodule

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class VideoCallModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener, LifecycleEventListener {

    private var videoCallOperator: VideoCallOperatorImpl? = null
    private var currentResult: Promise? = null

    companion object {
        private const val MODULE_NAME = "VideoCallModule"
        private const val PERMISSION_REQUEST_CODE = 1001
        private val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.CAMERA,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.INTERNET,
            Manifest.permission.RECORD_AUDIO
        )
    }

    init {
        reactContext.addActivityEventListener(this)
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String {
        return MODULE_NAME
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            val context = reactApplicationContext
            
            val hasCameraPermission = ContextCompat.checkSelfPermission(
                context, Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED

            val hasPhoneStatePermission = ContextCompat.checkSelfPermission(
                context, Manifest.permission.READ_PHONE_STATE
            ) == PackageManager.PERMISSION_GRANTED

            val hasInternetPermission = ContextCompat.checkSelfPermission(
                context, Manifest.permission.INTERNET
            ) == PackageManager.PERMISSION_GRANTED

            val hasRecordAudioPermission = ContextCompat.checkSelfPermission(
                context, Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED

            val permissions = WritableNativeMap().apply {
                putBoolean("hasCameraPermission", hasCameraPermission)
                putBoolean("hasPhoneStatePermission", hasPhoneStatePermission)
                putBoolean("hasInternetPermission", hasInternetPermission)
                putBoolean("hasRecordAudioPermission", hasRecordAudioPermission)
            }

            promise.resolve(permissions)
        } catch (e: Exception) {
            promise.reject("CHECK_PERMISSIONS_FAILED", "Failed to check permissions: ${e.message}", e)
        }
    }

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity not available", null)
                return
            }

            currentResult = promise
            ActivityCompat.requestPermissions(activity, REQUIRED_PERMISSIONS, PERMISSION_REQUEST_CODE)
        } catch (e: Exception) {
            promise.reject("REQUEST_PERMISSIONS_FAILED", "Failed to request permissions: ${e.message}", e)
        }
    }

    @ReactMethod
    fun startVideoCall(credentials: ReadableMap, promise: Promise) {
        try {
            val activity = currentActivity as? FragmentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "FragmentActivity not available", null)
                return
            }

            val serverURL = credentials.getString("serverURL")
            val wssURL = credentials.getString("wssURL")
            val userID = credentials.getString("userID")
            val transactionID = credentials.getString("transactionID")
            val clientName = credentials.getString("clientName")
            val idleTimeout = credentials.getString("idleTimeout") ?: "30"

            if (serverURL == null || wssURL == null || userID == null || 
                transactionID == null || clientName == null) {
                promise.reject("MISSING_PARAMETERS", "Missing required parameters", null)
                return
            }

            // Create video call operator
            videoCallOperator = VideoCallOperatorImpl(
                serverURL = serverURL,
                wssURL = wssURL,
                userID = userID,
                transactionID = transactionID,
                clientName = clientName,
                idleTimeout = idleTimeout,
                reactContext = reactApplicationContext
            )

            // Check if Udentify SDK is available
            val isSDKAvailable = try {
                Class.forName("io.udentify.android.vc.fragment.VCFragment")
                true
            } catch (e: ClassNotFoundException) {
                false
            }

            android.util.Log.i("VideoCallModule", "Udentify SDK available: $isSDKAvailable")

            // Start video call
            val success = videoCallOperator?.startVideoCall(activity) ?: false

            val result = WritableNativeMap().apply {
                putBoolean("success", success)
                putString("status", "connecting")
                putString("transactionID", transactionID)
            }

            promise.resolve(result)

        } catch (e: Exception) {
            promise.reject("START_VIDEO_CALL_FAILED", "Failed to start video call: ${e.message}", e)
        }
    }

    @ReactMethod
    fun endVideoCall(promise: Promise) {
        try {
            val success = videoCallOperator?.endVideoCall() ?: false
            videoCallOperator = null

            val result = WritableNativeMap().apply {
                putBoolean("success", success)
                putString("status", "disconnected")
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("END_VIDEO_CALL_FAILED", "Failed to end video call: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getVideoCallStatus(promise: Promise) {
        try {
            val status = videoCallOperator?.getStatus() ?: "idle"
            promise.resolve(status)
        } catch (e: Exception) {
            promise.reject("GET_STATUS_FAILED", "Failed to get video call status: ${e.message}", e)
        }
    }

    @ReactMethod
    fun setVideoCallConfig(config: ReadableMap, promise: Promise) {
        try {
            val backgroundColor = config.getString("backgroundColor")
            val textColor = config.getString("textColor")
            val pipViewBorderColor = config.getString("pipViewBorderColor")
            val notificationLabelDefault = config.getString("notificationLabelDefault")
            val notificationLabelCountdown = config.getString("notificationLabelCountdown")
            val notificationLabelTokenFetch = config.getString("notificationLabelTokenFetch")

            videoCallOperator?.setConfig(
                backgroundColor = backgroundColor,
                textColor = textColor,
                pipViewBorderColor = pipViewBorderColor,
                notificationLabelDefault = notificationLabelDefault,
                notificationLabelCountdown = notificationLabelCountdown,
                notificationLabelTokenFetch = notificationLabelTokenFetch
            )

            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SET_CONFIG_FAILED", "Failed to set video call config: ${e.message}", e)
        }
    }

    @ReactMethod
    fun toggleCamera(promise: Promise) {
        try {
            val isEnabled = videoCallOperator?.toggleCamera() ?: false
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun switchCamera(promise: Promise) {
        try {
            val success = videoCallOperator?.switchCamera() ?: false
            promise.resolve(success)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun toggleMicrophone(promise: Promise) {
        try {
            val isEnabled = videoCallOperator?.toggleMicrophone() ?: false
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun dismissVideoCall(promise: Promise) {
        try {
            videoCallOperator?.dismissVideoCall()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("DISMISS_FAILED", "Failed to dismiss video call: ${e.message}", e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN event emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN event emitter
    }

    // Send events to React Native
    fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    // Activity event listener methods
    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        // Handle activity results if needed
    }

    override fun onNewIntent(intent: android.content.Intent?) {
        // Handle new intents if needed
    }

    // Lifecycle event listener methods
    override fun onHostResume() {
        // Handle host resume if needed
    }

    override fun onHostPause() {
        // Handle host pause if needed
    }

    override fun onHostDestroy() {
        // Clean up resources
        videoCallOperator?.endVideoCall()
        videoCallOperator = null
    }

    // Handle permission request results
    fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val allGranted = grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            currentResult?.resolve(if (allGranted) "granted" else "denied")
            currentResult = null
        }
    }
}
