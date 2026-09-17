package com.videocallmodule

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import io.udentify.android.vc.fragment.UdentifyVideoCallFragment

class VideoCallModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener, LifecycleEventListener,
    PermissionListener {

    private var currentResult: Promise? = null

    companion object {
        private const val MODULE_NAME = "VideoCallModule"
        private const val PERMISSION_REQUEST_CODE = 1001
        // INTERNET is deliberately absent: it is install-time, so requesting it
        // at runtime can never grant anything and would make the "all granted"
        // check below permanently false on some OEM builds. checkPermissions()
        // still reports it.
        private val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.CAMERA,
            Manifest.permission.READ_PHONE_STATE,
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

    // Routed through PermissionAwareActivity rather than ActivityCompat: only the
    // former hands the result back to a PermissionListener, which is what settles
    // `promise`. Requesting via ActivityCompat shows the dialog but drops the
    // result on the floor, leaving every caller awaiting forever.
    @ReactMethod
    fun requestPermissions(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity !is PermissionAwareActivity) {
                promise.reject("NO_ACTIVITY", reactApplicationContext.getString(R.string.vc_error_no_activity), null)
                return
            }

            // A second request while one is in flight would strand the first
            // caller's promise, since only one can be settled by the result.
            currentResult?.let {
                promise.reject("REQUEST_IN_PROGRESS", "A permission request is already in progress.", null)
                return
            }

            currentResult = promise
            activity.requestPermissions(REQUIRED_PERMISSIONS, PERMISSION_REQUEST_CODE, this)
        } catch (e: Exception) {
            currentResult = null
            promise.reject("REQUEST_PERMISSIONS_FAILED", "Failed to request permissions: ${e.message}", e)
        }
    }

    // Deprecated: the call screen is no longer presented imperatively - render
    // <VideoCallView credentials={...} /> from the JS `video-call-rn-library`
    // package instead. Kept as a non-throwing stub so existing call sites that
    // haven't migrated yet don't crash; it never starts a call.
    @ReactMethod
    fun startVideoCall(credentials: ReadableMap, promise: Promise) {
        val error = WritableNativeMap().apply {
            putString("type", "ERR_SDK_NOT_AVAILABLE")
            putString("message", "startVideoCall is deprecated; render <VideoCallView credentials={...} /> instead.")
        }
        val result = WritableNativeMap().apply {
            putBoolean("success", false)
            putMap("error", error)
        }
        promise.resolve(result)
    }

    // Cancels the transaction server-side and then tears the local session down;
    // see VideoCallView.endCall for why the cancel is what the agent reacts to.
    // `success` still means "there was a call to end"; a failed cancel goes to
    // `error` rather than rejecting, as the call has ended either way.
    @ReactMethod
    fun endVideoCall(promise: Promise) {
        try {
            val view = VideoCallView.getActiveInstance()
            if (view == null) {
                promise.resolve(WritableNativeMap().apply {
                    putBoolean("success", false)
                    putString("status", "disconnected")
                })
                return
            }

            view.endCall { cancelled, error ->
                val result = WritableNativeMap().apply {
                    putBoolean("success", true)
                    putString("status", "disconnected")
                }

                if (!cancelled) {
                    val detail = error ?: "The server did not confirm the cancellation."
                    android.util.Log.w(MODULE_NAME, "Video call ended locally, but the transaction was not cancelled server-side: $detail")
                    result.putMap("error", WritableNativeMap().apply {
                        putString("type", "ERR_SDK")
                        putString("message", "Call ended locally, but the transaction was not cancelled on the server; the agent's session may stay open. $detail")
                    })
                }

                promise.resolve(result)
            }
        } catch (e: Exception) {
            promise.reject("END_VIDEO_CALL_FAILED", "Failed to end video call: ${e.message}", e)
        }
    }

    // Resolves the SDK's own localized End Call button labels for the
    // device's current language, mirroring iOS's identically-named
    // udentify_vc_button_end_call/udentify_vc_button_ending_call strings.
    @ReactMethod
    fun getLocalizedStrings(promise: Promise) {
        try {
            val context = reactApplicationContext
            val result = WritableNativeMap().apply {
                putString("endCallButtonLabel", context.getString(R.string.udentify_vc_button_end_call))
                putString("endCallButtonEndingLabel", context.getString(R.string.udentify_vc_button_ending_call))
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("GET_LOCALIZED_STRINGS_FAILED", "Failed to get localized strings: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getVideoCallStatus(promise: Promise) {
        try {
            val status = VideoCallView.getActiveInstance()?.getStatus() ?: "idle"
            promise.resolve(status)
        } catch (e: Exception) {
            promise.reject("GET_STATUS_FAILED", "Failed to get video call status: ${e.message}", e)
        }
    }

    // Deprecated, and never supported here: the vendor SDK exposes no toggle,
    // only the explicit setMicrophoneEnabled below. Rejecting clearly instead of
    // resolving a misleading `false`.
    @Deprecated("Use setMicrophoneEnabled instead.")
    @ReactMethod
    fun toggleMicrophone(promise: Promise) {
        promise.reject("ERR_NOT_SUPPORTED", "toggleMicrophone is not supported by the current video call SDK; use setMicrophoneEnabled.", null)
    }

    // The microphone is the only control the vendor SDK exposes as a real API
    // (since 26.3.0914). The camera has no equivalent - users switch it with the
    // SDK's own in-call button. UdentifyVideoCallFragment resolves the active call
    // itself, so neither of these needs a view reference - but both must run on
    // the main thread, which RN does not guarantee for @ReactMethod calls.
    @ReactMethod
    fun setMicrophoneEnabled(enabled: Boolean, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                // false means the request was not taken up at all (no active call,
                // or not connected yet). true means accepted, not applied - listen
                // for VideoCall_onMicrophoneStateChanged for the real outcome.
                promise.resolve(UdentifyVideoCallFragment.setMicrophoneEnabled(enabled))
            } catch (e: Throwable) {
                promise.reject("SET_MICROPHONE_FAILED", "Failed to set microphone state: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun isMicrophoneEnabled(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                promise.resolve(UdentifyVideoCallFragment.isMicrophoneEnabled())
            } catch (e: Throwable) {
                promise.reject("GET_MICROPHONE_STATE_FAILED", "Failed to read microphone state: ${e.message}", e)
            }
        }
    }

    // Deprecated alias for endVideoCall, kept for existing call sites. It cancels
    // the transaction the same way, but resolves without waiting for the server
    // to answer, since its promise carries no result to report either way.
    @ReactMethod
    fun dismissVideoCall(promise: Promise) {
        try {
            VideoCallView.getActiveInstance()?.endCall()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("DISMISS_FAILED", "Failed to dismiss video call: ${e.message}", e)
        }
    }

    @ReactMethod
    fun cancelVideoCall(promise: Promise) {
        try {
            val view = VideoCallView.getActiveInstance()
            if (view == null) {
                promise.reject("NO_ACTIVE_CALL", reactApplicationContext.getString(R.string.vc_error_no_active_call), null)
                return
            }

            view.cancelCall { success, error ->
                if (error != null) {
                    promise.reject("CANCEL_VIDEO_CALL_FAILED", error, null)
                    return@cancelCall
                }

                val result = WritableNativeMap().apply {
                    putBoolean("success", success)
                }
                promise.resolve(result)
            }
        } catch (e: Exception) {
            promise.reject("CANCEL_VIDEO_CALL_FAILED", "Failed to cancel video call: ${e.message}", e)
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
        // Local teardown only: the host is going away, so a cancel request would
        // not outlive the process. The agent's session falls back to the
        // server's idle timeout here.
        VideoCallView.getActiveInstance()?.endCallLocally()
    }

    // PermissionListener. Returning true tells the activity this listener is
    // finished and can be released; returning false keeps it registered for a
    // request code that isn't ours.
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ): Boolean {
        if (requestCode != PERMISSION_REQUEST_CODE) return false

        // An empty grantResults means the request was cancelled (the dialog was
        // dismissed, or the system interrupted it) - `all` is vacuously true on
        // an empty array, which would otherwise report a cancellation as granted.
        val allGranted = grantResults.isNotEmpty() &&
            grantResults.all { it == PackageManager.PERMISSION_GRANTED }
        currentResult?.resolve(if (allGranted) "granted" else "denied")
        currentResult = null
        return true
    }
}
