package com.videocallmodule

import androidx.fragment.app.Fragment
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableNativeMap
import io.udentify.android.vc.fragment.VideoCallFragment
import io.udentify.android.vc.listener.CancelVideoCallListener

/**
 * Builds the vendor call fragment and bridges its callbacks to RN events.
 * Owned by a mounted `VideoCallView` (see VideoCallView.kt), which actually
 * attaches/detaches the fragment into the RN view tree.
 */
class VideoCallOperatorImpl(
    private val serverURL: String,
    private val wssURL: String,
    private val userID: String,
    private val transactionID: String,
    private val clientName: String,
    private val idleTimeout: String,
    private val reactContext: ReactApplicationContext,
    // Invoked when the SDK itself ends/fails the session (server-initiated hangup,
    // fatal error), so the owning VideoCallView can tear down its fragment even
    // when JS never called endVideoCall()/cancelVideoCall(). May fire off the main
    // thread - callers should hop back to the main thread before touching views.
    private val onSessionEnded: (() -> Unit)? = null
) {

    private var currentStatus = "idle"
    // Set by didFailWithError so the onCallEnded that follows it reports the call
    // as failed rather than completed. Per-instance, and a new call builds a new
    // VideoCallOperatorImpl, so it never leaks across sessions.
    private var hasFailed = false
    private var videoCallFragment: Any? = null // VideoCallFragment when SDK is available
    // Cached by isMicrophoneEnabled()'s type-based lookup; see localParticipantField.
    private var localParticipantField: java.lang.reflect.Field? = null
    // Cached by remoteParticipantType()'s type-based lookup; see roomField.
    private var roomField: java.lang.reflect.Field? = null

    // Builds the vendor VCFragment (via reflection - it's a closed-source AAR
    // class) and wires its VideoCallOperator callback interface to this class,
    // but does NOT attach it to any FragmentManager/container - that's the
    // caller's (VideoCallView's) responsibility.
    fun createFragment(): Fragment? {
        return try {
            android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - Creating video call fragment: serverURL=$serverURL, userID=$userID, transactionID=$transactionID")
            currentStatus = "connecting"
            notifyStatusChanged("connecting")

            if (!isUdentifySDKAvailable()) {
                currentStatus = "failed"
                val errorMsg = reactContext.getString(R.string.udentify_vc_error_sdk_not_available)
                android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - $errorMsg")
                notifyError("ERR_SDK_NOT_AVAILABLE", errorMsg)
                return null
            }

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
                    // Added by the vendor in 26.3.0910 (and onMicrophoneStateChanged
                    // in 26.3.0914) as *default* interface methods. A
                    // java.lang.reflect.Proxy routes those through this handler too
                    // rather than to their default bodies, so they have to be named
                    // here or they are silently dropped.
                    "onPhoneLocked" -> {
                        onPhoneLocked()
                        Unit
                    }
                    "onPhoneUnlocked" -> {
                        onPhoneUnlocked()
                        Unit
                    }
                    "onPhoneCallStateChanged" -> {
                        val phoneCallState = args?.get(0)
                        if (phoneCallState != null) {
                            onPhoneCallStateChanged(phoneCallState)
                        }
                        Unit
                    }
                    "onMicrophoneStateChanged" -> {
                        (args?.get(0) as? Boolean)?.let { onMicrophoneStateChanged(it) }
                        Unit
                    }
                    "getCredentials" -> getCredentials()

                    else -> null
                }
            }

            // Use reflection to create VideoCallFragment
            val vcFragmentClass = Class.forName("io.udentify.android.vc.fragment.VCFragment")
            val newInstanceMethod = vcFragmentClass.getMethod("newInstance", operatorInterface)
            val fragment = newInstanceMethod.invoke(null, proxy) as Fragment

            videoCallFragment = fragment
            fragment
        } catch (e: Exception) {
            currentStatus = "failed"
            notifyError("ERR_UNKNOWN", "Failed to create video call fragment: ${e.message}")
            null
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

    // Status/event bookkeeping only - the owning VideoCallView is responsible
    // for the actual FragmentManager removal.
    fun endVideoCall(): Boolean {
        currentStatus = "disconnected"
        notifyStatusChanged("disconnected")
        videoCallFragment = null
        return true
    }

    fun getStatus(): String {
        return currentStatus
    }

    // Reads whether the local microphone is currently live, via reflection into
    // LiveKit's own state (the SDK exposes no getter). Null means "unknown",
    // not unmuted. See INTERNALS.md "Reading vendor-obfuscated LiveKit state
    // (VideoCallOperatorImpl)".
    fun isMicrophoneEnabled(): Boolean? {
        val participant = localParticipant() ?: return null
        return try {
            participant.javaClass.getMethod("isMicrophoneEnabled").invoke(participant) as? Boolean
        } catch (t: Throwable) {
            android.util.Log.w(
                "VideoCallOperator",
                "VideoCallOperatorImpl - Failed to read microphone state", t)
            null
        }
    }

    // Reads which camera the local video track is capturing from ("front"/
    // "back", or null if unknown), from LiveKit's confirmed state rather than
    // the SDK's own optimistically-set field. See INTERNALS.md "Reading
    // vendor-obfuscated LiveKit state (VideoCallOperatorImpl)".
    fun cameraPosition(): String? {
        val participant = localParticipant() ?: return null
        return try {
            val sourceType = Class.forName(LIVEKIT_TRACK_SOURCE)
            val camera = sourceType.enumConstants
                ?.firstOrNull { (it as? Enum<*>)?.name == "CAMERA" } ?: return null
            val publication = participant.javaClass
                .getMethod("getTrackPublication", sourceType)
                .invoke(participant, camera) ?: return null
            val track = publication.javaClass.getMethod("getTrack").invoke(publication)
                ?: return null
            // getOptions() only exists on LocalVideoTrack; anything else here
            // means the camera track is not published (yet) - unknown, not a
            // failure.
            val options = track.javaClass.getMethod("getOptions").invoke(track) ?: return null
            val position = options.javaClass.getMethod("getPosition").invoke(options)
            (position as? Enum<*>)?.name?.lowercase()
        } catch (t: Throwable) {
            android.util.Log.w(
                "VideoCallOperator",
                "VideoCallOperatorImpl - Failed to read camera position", t)
            null
        }
    }

    private fun localParticipant(): Any? {
        val fragment = videoCallFragment ?: return null
        return try {
            localParticipantField(fragment.javaClass)?.get(fragment)
        } catch (t: Throwable) {
            android.util.Log.w(
                "VideoCallOperator",
                "VideoCallOperatorImpl - Failed to read local participant", t)
            null
        }
    }

    private fun localParticipantField(type: Class<*>): java.lang.reflect.Field? {
        localParticipantField?.let { return it }
        var current: Class<*>? = type
        while (current != null && current != Any::class.java) {
            current.declaredFields
                .firstOrNull { it.type.name == LIVEKIT_LOCAL_PARTICIPANT }
                ?.let {
                    it.isAccessible = true
                    localParticipantField = it
                    return it
                }
            current = current.superclass
        }
        android.util.Log.w(
            "VideoCallOperator",
            "VideoCallOperatorImpl - No $LIVEKIT_LOCAL_PARTICIPANT field on ${type.name}")
        return null
    }

    // Which remote party the SDK's participant-state callback is about
    // ("agent"/"supervisor"/"unknown"); the callback itself never says. See
    // INTERNALS.md "Reading vendor-obfuscated LiveKit state
    // (VideoCallOperatorImpl)".
    private fun remoteParticipantType(): String {
        val participants = remoteParticipants() ?: return PARTICIPANT_TYPE_UNKNOWN
        val types = participants.map {
            participantType(it) ?: return PARTICIPANT_TYPE_UNKNOWN
        }
        return types.distinct().singleOrNull() ?: PARTICIPANT_TYPE_UNKNOWN
    }

    // Same type-based field lookup as localParticipantField above, and the
    // same reason (see INTERNALS.md "Reading vendor-obfuscated LiveKit state").
    private fun remoteParticipants(): Collection<Any>? {
        val fragment = videoCallFragment ?: return null
        return try {
            val room = roomField(fragment.javaClass)?.get(fragment) ?: return null
            (room.javaClass.getMethod("getRemoteParticipants").invoke(room) as? Map<*, *>)
                ?.values
                ?.filterNotNull()
        } catch (t: Throwable) {
            android.util.Log.w(
                "VideoCallOperator",
                "VideoCallOperatorImpl - Failed to read remote participants", t)
            null
        }
    }

    // Matches the SDK's own derivation exactly - a case-sensitive substring
    // test against the participant's metadata - so this never disagrees with
    // the type the AAR logs for the same participant. Null means the metadata
    // is absent or names no known role.
    private fun participantType(participant: Any): String? {
        val metadata = try {
            participant.javaClass.getMethod("getMetadata").invoke(participant) as? String
        } catch (t: Throwable) {
            android.util.Log.w(
                "VideoCallOperator",
                "VideoCallOperatorImpl - Failed to read participant metadata", t)
            null
        } ?: return null

        return when {
            metadata.contains(PARTICIPANT_TYPE_AGENT) -> PARTICIPANT_TYPE_AGENT
            metadata.contains(PARTICIPANT_TYPE_SUPERVISOR) -> PARTICIPANT_TYPE_SUPERVISOR
            else -> null
        }
    }

    private fun roomField(type: Class<*>): java.lang.reflect.Field? {
        roomField?.let { return it }
        var current: Class<*>? = type
        while (current != null && current != Any::class.java) {
            current.declaredFields
                .firstOrNull { it.type.name == LIVEKIT_ROOM }
                ?.let {
                    it.isAccessible = true
                    roomField = it
                    return it
                }
            current = current.superclass
        }
        android.util.Log.w(
            "VideoCallOperator",
            "VideoCallOperatorImpl - No $LIVEKIT_ROOM field on ${type.name}")
        return null
    }

    // VideoCallOperator interface methods required by Udentify SDK
    fun onCallStarted() {
        currentStatus = "connected"
        notifyStatusChanged("connected")
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - onCallStarted called")
    }

    // The SDK calls this after a failure too, not only after a call that ran to
    // completion - so `success` is derived from whether didFailWithError fired
    // rather than hardcoded. It previously always reported true, which told the
    // host a permission-refused call had succeeded.
    fun onCallEnded() {
        val succeeded = !hasFailed
        currentStatus = if (succeeded) "completed" else "failed"
        notifyStatusChanged(currentStatus)
        videoCallFragment = null
        val params = WritableNativeMap().apply {
            putBoolean("success", succeeded)
        }
        sendEvent("VideoCall_onVideoCallEnded", params)
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - onCallEnded called (success=$succeeded)")
        onSessionEnded?.invoke()
    }

    fun didChangeUserState(userState: Any) {
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - didChangeUserState: $userState")
        val params = WritableNativeMap().apply {
            putString("state", userState.toString())
        }
        sendEvent("VideoCall_onUserStateChanged", params)
    }

    fun didChangeParticipantState(participantState: Any) {
        val participantType = remoteParticipantType()
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - didChangeParticipantState: $participantState ($participantType)")
        val params = WritableNativeMap().apply {
            putString("participantType", participantType)
            putString("state", participantState.toString())
        }
        sendEvent("VideoCall_onParticipantStateChanged", params)
    }

    fun didFailWithError(error: String) {
        currentStatus = "failed"
        hasFailed = true
        notifyError(errorType(error), error)
        android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - didFailWithError: $error")
        onSessionEnded?.invoke()
    }

    // The vendor reports a missing-permission failure as a plain message listing the
    // permissions, where iOS reports a typed VCError. Mapping the two onto the same
    // strings lets one JS branch handle both platforms instead of parsing a message.
    //
    // Camera is tested first to match iOS, whose own check returns on the first missing
    // permission rather than reporting both. Matching on vendor text is inherently
    // brittle, so anything unrecognised falls back to the generic type - a wrong-but-
    // generic error is better than a confidently wrong specific one.
    //
    // Always `_DENIED`, never `_REQUIRED`: Android cannot distinguish "never asked" from
    // "denied permanently" without state the SDK does not have, and iOS's distinction
    // exists only because AVFoundation reports `.notDetermined` separately.
    private fun errorType(error: String): String = when {
        !error.contains(MISSING_PERMISSION_MARKER, ignoreCase = true) -> ERROR_TYPE_SDK
        error.contains(android.Manifest.permission.CAMERA) -> ERROR_TYPE_CAMERA_PERMISSION_DENIED
        error.contains(android.Manifest.permission.RECORD_AUDIO) -> ERROR_TYPE_MICROPHONE_PERMISSION_DENIED
        else -> ERROR_TYPE_SDK
    }

    // The next three are informational only: none of them ends the session -
    // the SDK keeps the room connected while the device's call UI or lock
    // screen is in front - so `currentStatus` is deliberately untouched and
    // onSessionEnded is not invoked. JS names them onScreenLocked/
    // onScreenUnlocked to match iOS, whose SDK calls the same thing a screen
    // rather than a phone lock.
    fun onPhoneLocked() {
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - onPhoneLocked")
        sendEvent("VideoCall_onScreenLocked", WritableNativeMap())
    }

    fun onPhoneUnlocked() {
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - onPhoneUnlocked")
        sendEvent("VideoCall_onScreenUnlocked", WritableNativeMap())
    }

    // `phoneCallState` is the vendor's io.udentify.android.vc.enums
    // .PhoneCallState, whose constants are already named exactly as JS expects
    // ('incoming'/'outgoing'/'connected'/'ended'), so toString() is the whole
    // mapping - same approach as didChangeUserState above.
    fun onPhoneCallStateChanged(phoneCallState: Any) {
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - onPhoneCallStateChanged: $phoneCallState")
        val params = WritableNativeMap().apply {
            putString("state", phoneCallState.toString())
        }
        sendEvent("VideoCall_onPhoneCallStateChanged", params)
    }

    // Fires for every microphone change the SDK makes, not just host-initiated ones:
    // the in-call mute button, the operator's mute/unmute signals, and the SDK's own
    // automatic mutes (app backgrounded, audio focus lost, a real phone call answered)
    // plus the automatic unmute once those end. Already de-duplicated by the SDK, so
    // JS can treat it as the microphone's source of truth.
    fun onMicrophoneStateChanged(enabled: Boolean) {
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - onMicrophoneStateChanged: $enabled")
        val params = WritableNativeMap().apply {
            putBoolean("enabled", enabled)
        }
        sendEvent("VideoCall_onMicrophoneStateChanged", params)
    }

    // Cancels the in-progress video call transaction on the server - used both for the
    // JS-invoked cancelVideoCall bridge method (e.g. user backs out before a room is
    // joined) and for the in-call End Call control.
    fun cancelVideoCall(callback: (Boolean, String?) -> Unit) {
        try {
            VideoCallFragment.cancelVideoCall(
                serverURL,
                transactionID,
                object : CancelVideoCallListener() {
                    override fun onCancelSuccess(success: Boolean) {
                        currentStatus = "disconnected"
                        notifyStatusChanged("disconnected")
                        videoCallFragment = null
                        callback(success, null)
                    }

                    override fun onCancelError(error: String) {
                        callback(false, error)
                    }
                }
            )
        } catch (e: Exception) {
            android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - Failed to cancel video call: ${e.message}")
            callback(false, e.message)
        }
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

    companion object {
        private const val LIVEKIT_LOCAL_PARTICIPANT =
            "io.livekit.android.room.participant.LocalParticipant"
        private const val LIVEKIT_TRACK_SOURCE = "io.livekit.android.room.track.Track\$Source"
        private const val LIVEKIT_ROOM = "io.livekit.android.room.Room"
        // Spelled the same as the vendor's ParticipantType constants, which is
        // also what iOS sends for these - see remoteParticipantType().
        private const val PARTICIPANT_TYPE_AGENT = "agent"
        private const val PARTICIPANT_TYPE_SUPERVISOR = "supervisor"
        private const val PARTICIPANT_TYPE_UNKNOWN = "unknown"
        // Spelled exactly as VideoCallErrorType's members in VideoCallModels.ts - and, for
        // the two permission ones, exactly as the iOS VCError descriptions, so both
        // platforms deliver the same `type` for the same failure.
        private const val ERROR_TYPE_SDK = "ERR_SDK"
        private const val ERROR_TYPE_CAMERA_PERMISSION_DENIED = "ERR_CAMERA_PERMISSION_DENIED"
        private const val ERROR_TYPE_MICROPHONE_PERMISSION_DENIED = "ERR_MICROPHONE_PERMISSION_DENIED"
        // Matched against the vendor's own failure text ("Missing permission(s): ...").
        private const val MISSING_PERMISSION_MARKER = "Missing permission"
    }
}
