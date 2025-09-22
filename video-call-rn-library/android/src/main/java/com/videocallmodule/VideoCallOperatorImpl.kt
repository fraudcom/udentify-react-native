package com.videocallmodule

import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableNativeMap

/**
 * Implementation of VideoCallOperator interface.
 * This class manages video call functionality using Udentify's SDK.
 * Based on the Flutter VideoCallOperatorImpl.kt implementation.
 */
class VideoCallOperatorImpl(
    private val serverURL: String,
    private val wssURL: String,
    private val userID: String,
    private val transactionID: String,
    private val clientName: String,
    private val idleTimeout: String,
    private val reactContext: ReactApplicationContext
) {

    private var currentStatus = "idle"
    private var videoCallFragment: Any? = null // VideoCallFragment when SDK is available
    
    // Configuration properties
    private var backgroundColor: String? = null
    private var textColor: String? = null
    private var pipViewBorderColor: String? = null
    private var notificationLabelDefault: String? = null
    private var notificationLabelCountdown: String? = null
    private var notificationLabelTokenFetch: String? = null



    fun startVideoCall(activity: FragmentActivity): Boolean {
        return try {
            android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - Starting video call with credentials: serverURL=$serverURL, userID=$userID, transactionID=$transactionID")
            currentStatus = "connecting"
            notifyStatusChanged("connecting")

            // Verify Udentify SDK is available
            if (!isUdentifySDKAvailable()) {
                currentStatus = "failed"
                val errorMsg = "Udentify SDK is not available. Please ensure AAR files are properly integrated."
                android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - $errorMsg")
                notifyError("ERR_SDK_NOT_AVAILABLE", errorMsg)
                return false
            }
            
            android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - Udentify SDK is available, proceeding with video call initialization")

            // Create a dynamic proxy that implements VideoCallOperator interface
            val operatorInterface = Class.forName("io.udentify.android.vc.listener.VideoCallOperator")
            val proxy = java.lang.reflect.Proxy.newProxyInstance(
                operatorInterface.classLoader,
                arrayOf(operatorInterface)
            ) { _, method, args ->
                when (method.name) {
                    "onCallStarted" -> {
                        onCallStarted()
                        Unit
                    }
                    "onCallEnded" -> {
                        onCallEnded()
                        Unit
                    }
                    "didChangeUserState" -> {
                        val userState = args?.get(0)
                        if (userState != null) {
                            didChangeUserState(userState)
                        }
                        Unit
                    }
                    "didChangeParticipantState" -> {
                        val participantState = args?.get(0)
                        if (participantState != null) {
                            didChangeParticipantState(participantState)
                        }
                        Unit
                    }
                    "didFailWithError" -> {
                        didFailWithError(args?.get(0) as String)
                        Unit
                    }
                    "getCredentials" -> getCredentials()

                    else -> null
                }
            }
            
            // Use reflection to create VideoCallFragment
            val vcFragmentClass = Class.forName("io.udentify.android.vc.fragment.VCFragment")
            val newInstanceMethod = vcFragmentClass.getMethod("newInstance", operatorInterface)
            val fragment = newInstanceMethod.invoke(null, proxy) as androidx.fragment.app.Fragment
            
            // Add fragment to activity
            activity.supportFragmentManager.beginTransaction()
                .replace(android.R.id.content, fragment)
                .addToBackStack("video_call")
                .commit()
            
            videoCallFragment = fragment
            true
        } catch (e: Exception) {
            currentStatus = "failed"
            notifyError("ERR_UNKNOWN", "Failed to start video call: ${e.message}")
            false
        }
    }
    
    private fun isUdentifySDKAvailable(): Boolean {
        return try {
            Class.forName("io.udentify.android.vc.fragment.VCFragment")
            android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - VCFragment class found")
            
            Class.forName("io.udentify.android.vc.model.VideoCallCredentials")
            android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - VideoCallCredentials class found")
            
            Class.forName("io.udentify.android.vc.listener.VideoCallOperator")
            android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - VideoCallOperator interface found")
            
            true
        } catch (e: ClassNotFoundException) {
            android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - SDK class not found: ${e.message}")
            false
        }
    }
    
    // Method to create VideoCallCredentials using reflection
    fun getCredentials(): Any? {
        return try {
            if (!isUdentifySDKAvailable()) {
                throw IllegalStateException("Udentify SDK is not available")
            }
            
            val credentialsClass = Class.forName("io.udentify.android.vc.model.VideoCallCredentials")
            val builderClass = Class.forName("io.udentify.android.vc.model.VideoCallCredentials\$Builder")
            
            val builderConstructor = builderClass.getDeclaredConstructor()
            val builder = builderConstructor.newInstance()
            
            // Set properties using reflection
            builderClass.getMethod("serverURL", String::class.java).invoke(builder, serverURL)
            builderClass.getMethod("wssURL", String::class.java).invoke(builder, wssURL)
            builderClass.getMethod("userID", String::class.java).invoke(builder, userID)
            builderClass.getMethod("transactionID", String::class.java).invoke(builder, transactionID)
            builderClass.getMethod("clientName", String::class.java).invoke(builder, clientName)
            builderClass.getMethod("idleTimeout", Int::class.java).invoke(builder, idleTimeout.toIntOrNull() ?: 30)
            
            // Build and return credentials
            builderClass.getMethod("build").invoke(builder)
        } catch (e: Exception) {
            android.util.Log.e("VideoCallOperator", "Failed to create credentials: ${e.message}")
            throw e
        }
    }

    fun endVideoCall(): Boolean {
        return try {
            currentStatus = "disconnected"
            notifyStatusChanged("disconnected")

            // Remove fragment if it exists
            (videoCallFragment as? androidx.fragment.app.Fragment)?.let { fragment ->
                try {
                    fragment.parentFragmentManager.beginTransaction()
                        .remove(fragment)
                        .commit()
                } catch (e: Exception) {
                    android.util.Log.w("VideoCallOperator", "Failed to remove fragment: ${e.message}")
                }
            }

            videoCallFragment = null
            true
        } catch (e: Exception) {
            notifyError("ERR_UNKNOWN", "Failed to end video call: ${e.message}")
            false
        }
    }

    fun getStatus(): String {
        return currentStatus
    }
    
    // VideoCallOperator interface methods required by Udentify SDK
    fun onCallStarted() {
        currentStatus = "connected"
        notifyStatusChanged("connected")
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - onCallStarted called")
    }
    
    fun onCallEnded() {
        currentStatus = "completed"
        notifyStatusChanged("completed")
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - onCallEnded called")
    }
    
    fun didChangeUserState(userState: Any) {
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - didChangeUserState: $userState")
        val params = WritableNativeMap().apply {
            putString("state", userState.toString())
        }
        sendEvent("VideoCall_onUserStateChanged", params)
    }
    
    fun didChangeParticipantState(participantState: Any) {
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - didChangeParticipantState: $participantState")
        val params = WritableNativeMap().apply {
            putString("participantType", "unknown") // Would need to extract from participantState
            putString("state", participantState.toString())
        }
        sendEvent("VideoCall_onParticipantStateChanged", params)
    }
    
    fun didFailWithError(error: String) {
        currentStatus = "failed"
        notifyError("ERR_SDK", error)
        android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - didFailWithError: $error")
    }

    fun setConfig(
        backgroundColor: String? = null,
        textColor: String? = null,
        pipViewBorderColor: String? = null,
        notificationLabelDefault: String? = null,
        notificationLabelCountdown: String? = null,
        notificationLabelTokenFetch: String? = null
    ) {
        this.backgroundColor = backgroundColor
        this.textColor = textColor
        this.pipViewBorderColor = pipViewBorderColor
        this.notificationLabelDefault = notificationLabelDefault
        this.notificationLabelCountdown = notificationLabelCountdown
        this.notificationLabelTokenFetch = notificationLabelTokenFetch

        // Apply configuration to the Udentify VideoCallFragment if available
        try {
            val fragment = videoCallFragment ?: return
            
            // Use reflection to apply configuration to the VideoCallFragment
            backgroundColor?.let { color ->
                val setBackgroundMethod = fragment.javaClass.getMethod("setBackgroundColor", String::class.java)
                setBackgroundMethod.invoke(fragment, color)
            }
            
            textColor?.let { color ->
                val setTextColorMethod = fragment.javaClass.getMethod("setTextColor", String::class.java)
                setTextColorMethod.invoke(fragment, color)
            }
            
            pipViewBorderColor?.let { color ->
                val setPipBorderColorMethod = fragment.javaClass.getMethod("setPipViewBorderColor", String::class.java)
                setPipBorderColorMethod.invoke(fragment, color)
            }
            
            // Apply notification labels
            notificationLabelDefault?.let { label ->
                val setDefaultLabelMethod = fragment.javaClass.getMethod("setNotificationLabelDefault", String::class.java)
                setDefaultLabelMethod.invoke(fragment, label)
            }
            
            notificationLabelCountdown?.let { label ->
                val setCountdownLabelMethod = fragment.javaClass.getMethod("setNotificationLabelCountdown", String::class.java)
                setCountdownLabelMethod.invoke(fragment, label)
            }
            
            notificationLabelTokenFetch?.let { label ->
                val setTokenFetchLabelMethod = fragment.javaClass.getMethod("setNotificationLabelTokenFetch", String::class.java)
                setTokenFetchLabelMethod.invoke(fragment, label)
            }
            
        } catch (e: Exception) {
            android.util.Log.w("VideoCallOperator", "VideoCallOperatorImpl - Failed to apply configuration: ${e.message}")
        }
    }

    fun toggleCamera(): Boolean {
        return try {
            if (!isUdentifySDKAvailable()) {
                android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - SDK not available for camera toggle")
                return false
            }
            
            // Use reflection to call SDK camera toggle method
            val fragment = videoCallFragment ?: return false
            val toggleMethod = fragment.javaClass.getMethod("toggleCamera")
            toggleMethod.invoke(fragment) as? Boolean ?: false
        } catch (e: Exception) {
            android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - Failed to toggle camera: ${e.message}")
            false
        }
    }

    fun switchCamera(): Boolean {
        return try {
            if (!isUdentifySDKAvailable()) {
                android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - SDK not available for camera switch")
                return false
            }
            
            // Use reflection to call SDK camera switch method
            val fragment = videoCallFragment ?: return false
            val switchMethod = fragment.javaClass.getMethod("switchCamera")
            switchMethod.invoke(fragment) as? Boolean ?: false
        } catch (e: Exception) {
            android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - Failed to switch camera: ${e.message}")
            false
        }
    }

    fun toggleMicrophone(): Boolean {
        return try {
            if (!isUdentifySDKAvailable()) {
                android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - SDK not available for microphone toggle")
                return false
            }
            
            // Use reflection to call SDK microphone toggle method
            val fragment = videoCallFragment ?: return false
            val toggleMethod = fragment.javaClass.getMethod("toggleMicrophone")
            toggleMethod.invoke(fragment) as? Boolean ?: false
        } catch (e: Exception) {
            android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - Failed to toggle microphone: ${e.message}")
            false
        }
    }

    fun dismissVideoCall() {
        // When Udentify SDK is available, dismiss the video call UI
        endVideoCall()
    }

    private fun notifyStatusChanged(status: String) {
        try {
            val params = WritableNativeMap().apply {
                putString("status", status)
            }
            sendEvent("VideoCall_onStatusChanged", params)
        } catch (e: Exception) {
            android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - Failed to notify status change: ${e.message}")
        }
    }

    private fun notifyError(type: String, message: String) {
        try {
            val params = WritableNativeMap().apply {
                putString("type", type)
                putString("message", message)
            }
            sendEvent("VideoCall_onError", params)
        } catch (e: Exception) {
            android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - Failed to notify error: ${e.message}")
        }
    }

    private fun sendEvent(eventName: String, params: WritableNativeMap) {
        try {
            (reactContext.getJSModule(
                com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java
            ) as com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter)
                .emit(eventName, params)
        } catch (e: Exception) {
            android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - Failed to send event: ${e.message}")
        }
    }


}
