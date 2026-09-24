package com.videocallmodule

import androidx.fragment.app.Fragment
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableNativeMap
import io.udentify.android.vc.fragment.UdentifyVideoCallFragment
import io.udentify.android.vc.listener.CancelVideoCallListener
import io.udentify.android.vc.model.VideoCallCredentials
import io.udentify.android.vc.enums.ObservationMode
import io.udentify.android.vc.enums.RepeatOutcome
import io.udentify.android.vc.enums.ParticipantState
import io.udentify.android.vc.enums.PhoneCallState
import io.udentify.android.vc.enums.UserState
import io.udentify.android.vc.fragment.VCFragment
import io.udentify.android.vc.listener.VideoCallOperator
import io.udentify.android.commons.livekyc.RepeatRole
import android.os.Parcel
import com.udentifycore.LiveKycRepeatRegistry

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
    // ObservationMode enum name (CAMERA_FEED / SCREEN_SHARE / PROGRESS_ONLY),
    // or null to leave the AAR's own default in place - see
    // applyObservationMode().
    private val observationMode: String?,
    private val reactContext: ReactApplicationContext,
    // Invoked when the SDK itself ends/fails the session (server-initiated hangup,
    // fatal error), so the owning VideoCallView can tear down its fragment even
    // when JS never called endVideoCall()/cancelVideoCall(). May fire off the main
    // thread - callers should hop back to the main thread before touching views.
    private val onSessionEnded: (() -> Unit)? = null,
    // Invoked when an in-call re-capture takes the screen (true) and when it
    // hands it back (false). The owning VideoCallView uses this to drop the
    // React root back under the SDK's fragment for the duration: while the
    // capture UI is up, the SDK owns both the pixels and the touches. May fire
    // off the main thread.
    private val onRepeatActiveChanged: ((Boolean) -> Unit)? = null,
    // Invoked when the SDK reports the microphone state changing, from any
    // source - a local tap on its own button, a remote signal from the operator,
    // or a forced mute. The SDK repaints its mute button on each of these and
    // re-applies its own colour while doing so, which overwrites the tint the
    private val onMicrophoneStateChanged: (() -> Unit)? = null
) : VideoCallOperator {

    private var currentStatus = "idle"
    // Set by didFailWithError so the onCallEnded that follows it reports the call
    // as failed rather than completed. Per-instance, and a new call builds a new
    // VideoCallOperatorImpl, so it never leaks across sessions.
    private var hasFailed = false
    // Role of the repeat currently on screen, so a wrapper-detected end can name
    // it. Null when no repeat is running.
    var activeRepeatRole: String? = null
        private set
    private var videoCallFragment: Fragment? = null
    // Cached by isMicrophoneEnabled()'s type-based lookup; see localParticipantField.
    private var localParticipantField: java.lang.reflect.Field? = null
    // Cached by remoteParticipantType()'s type-based lookup; see roomField.
    private var roomField: java.lang.reflect.Field? = null

    // Builds the vendor VCFragment and hands it this instance as its
    // VideoCallOperator, but does NOT attach it to any FragmentManager or
    // container - that is the caller's (VideoCallView's) responsibility.
    fun createFragment(): Fragment? {
        return try {
            android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - Creating video call fragment: serverURL=$serverURL, userID=$userID, transactionID=$transactionID")
            currentStatus = "connecting"
            notifyStatusChanged("connecting")

            // `this` *is* the VideoCallOperator - see the overrides below. The
            // SDK's own newInstance takes the interface, so no reflection is
            // needed to hand it over.
            val fragment = VCFragment.newInstance(this)

            videoCallFragment = fragment
            fragment
        } catch (e: Exception) {
            currentStatus = "failed"
            notifyError("ERR_UNKNOWN", "Failed to create video call fragment: ${e.message}")
            null
        }
    }

    // Builds the SDK's own credentials object with the vendor builder directly.
    // The AAR is a compileOnly dependency, so these types are available at
    // compile time; if the app fails to ship it, this class cannot load at all
    // and VideoCallView reports that at construction - see its LinkageError
    // guard - rather than each method probing for the SDK.
    override fun getCredentials(): VideoCallCredentials {
        return try {
            VideoCallCredentials.Builder()
                .serverURL(serverURL)
                .wssURL(wssURL)
                .userID(userID)
                .transactionID(transactionID)
                .clientName(clientName)
                .idleTimeout(idleTimeout.toIntOrNull() ?: 30)
                .also { applyObservationMode(it) }
                .build()
        } catch (e: Exception) {
            android.util.Log.e("VideoCallOperator", "Failed to create credentials: ${e.message}")
            throw e
        }
    }

    // Bridges getRepeatParams(RepeatRole) to LiveKycRepeatRegistry. `role` is
    // read as a plain Enum and passed on by name, since this library has no
    // compile dependency on Commons. An unregistered role returns null, which is
    // a supported state.
    override fun getRepeatParams(role: RepeatRole?): android.os.Bundle? {
        val roleName = role?.name
        if (roleName == null) {
            android.util.Log.w(
                "VideoCallOperator",
                "VideoCallOperatorImpl - getRepeatParams called with unrecognized role $role; refusing")
            return null
        }
        val params = LiveKycRepeatRegistry.paramsFor(roleName)
        android.util.Log.d(
            "VideoCallOperator",
            "VideoCallOperatorImpl - getRepeatParams($roleName) -> " +
                if (params == null) "refused" else "credentials supplied")
        if (params != null) {
            activeRepeatRole = roleName
            onRepeatActiveChanged?.invoke(true)
            val started = WritableNativeMap()
            started.putString("role", roleName)
            sendEvent("VideoCall_onRepeatStarted", started)
        }
        return params
    }

    // Reports only that a repeat produced a result, and for which role: reading
    // fields off `result` would put the ocr/face/nfc AARs on this library's
    // classpath, and the cross-SDK hand-off that needs them runs inside the
    // capture libraries via the vendor's LiveKYCCoordinator.
    override fun onRepeatResult(role: RepeatRole?, result: Any?) {
        val roleName = role?.name ?: return
        android.util.Log.d(
            "VideoCallOperator",
            "VideoCallOperatorImpl - onRepeatResult($roleName): ${result?.javaClass?.simpleName}")
        val params = WritableNativeMap()
        params.putString("role", roleName)
        sendEvent("VideoCall_onRepeatResult", params)
    }

    // The end of a repeat, whatever ended it. The SDK guarantees the role is
    // always present, that onRepeatResult precedes this on COMPLETED, and that
    // this arrives even if the host has already torn the SDK's view down.
    override fun onRepeatEnded(role: RepeatRole?, outcome: RepeatOutcome?, reason: String?) {
        val roleName = role?.name ?: activeRepeatRole ?: ""
        android.util.Log.d(
            "VideoCallOperator",
            "VideoCallOperatorImpl - onRepeatEnded($roleName): ${outcome?.name} ${reason ?: ""}")
        onRepeatActiveChanged?.invoke(false)
        activeRepeatRole = null
        val params = WritableNativeMap()
        params.putString("role", roleName)
        outcome?.let { params.putString("outcome", it.name) }
        reason?.let { params.putString("reason", it) }
        sendEvent("VideoCall_onRepeatEnded", params)
    }

    // What the remote operator sees during a LiveKYC repeat step. Omitting it
    // leaves the SDK's own default, CAMERA_FEED, which needs no MediaProjection.
    private fun applyObservationMode(builder: VideoCallCredentials.Builder) {
        val requested = observationMode?.takeIf { it.isNotBlank() } ?: return

        val value = ObservationMode.values().firstOrNull { it.name == requested }
        if (value == null) {
            android.util.Log.w(
                "VideoCallOperator",
                "VideoCallOperatorImpl - observationMode='$requested' ignored: expected one of " +
                    ObservationMode.values().joinToString { it.name })
            return
        }

        builder.observationMode(value)
        android.util.Log.d(
            "VideoCallOperator", "VideoCallOperatorImpl - observationMode=$requested")
    }

    // Status/event bookkeeping only - the owning VideoCallView is responsible
    // for the actual FragmentManager removal. Guarded on the current status
    // because the end-call path cancels first, and a successful cancel has
    // already reported "disconnected" by the time the teardown runs.
    fun endVideoCall(): Boolean {
        if (currentStatus != "disconnected") {
            currentStatus = "disconnected"
            notifyStatusChanged("disconnected")
        }
        videoCallFragment = null
        return true
    }

    fun getStatus(): String {
        return currentStatus
    }

    // Reads whether the local microphone is currently live, via reflection into
    // LiveKit's own state (the SDK exposes no getter). Null means "unknown",
    // not unmuted. See INTERNALS-REACT.md "Reading vendor-obfuscated LiveKit state
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
    // the SDK's own optimistically-set field. See INTERNALS-REACT.md "Reading
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
    // INTERNALS-REACT.md "Reading vendor-obfuscated LiveKit state
    // (VideoCallOperatorImpl)".
    private fun remoteParticipantType(): String {
        val participants = remoteParticipants() ?: return PARTICIPANT_TYPE_UNKNOWN
        val types = participants.map {
            participantType(it) ?: return PARTICIPANT_TYPE_UNKNOWN
        }
        return types.distinct().singleOrNull() ?: PARTICIPANT_TYPE_UNKNOWN
    }

    // Same type-based field lookup as localParticipantField above, and the
    // same reason (see INTERNALS-REACT.md "Reading vendor-obfuscated LiveKit state").
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
    override fun onCallStarted() {
        currentStatus = "connected"
        notifyStatusChanged("connected")
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - onCallStarted called")
    }

    // The SDK calls this after a failure too, not only after a call that ran to
    // completion - so `success` is derived from whether didFailWithError fired
    // rather than hardcoded. It previously always reported true, which told the
    // host a permission-refused call had succeeded.
    override fun onCallEnded() {
        val succeeded = !hasFailed
        currentStatus = if (succeeded) "completed" else "failed"
        notifyStatusChanged(currentStatus)
        videoCallFragment = null
        val params = WritableNativeMap().apply {
            putBoolean("success", succeeded)
        }
        sendEvent("VideoCall_onVideoCallEnded", params)
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - onCallEnded called (success=$succeeded)")
        if (!disposed) onSessionEnded?.invoke()
    }

    override fun didChangeUserState(userState: UserState?) {
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - didChangeUserState: $userState")
        val params = WritableNativeMap().apply {
            putString("state", userState.toString())
        }
        sendEvent("VideoCall_onUserStateChanged", params)
    }

    override fun didChangeParticipantState(participantState: ParticipantState?) {
        val participantType = remoteParticipantType()
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - didChangeParticipantState: $participantState ($participantType)")
        val params = WritableNativeMap().apply {
            putString("participantType", participantType)
            putString("state", participantState.toString())
        }
        sendEvent("VideoCall_onParticipantStateChanged", params)
    }

    override fun didFailWithError(error: String?) {
        val message = error ?: "Unknown error"
        currentStatus = "failed"
        hasFailed = true
        notifyError(errorType(message), message)
        android.util.Log.e("VideoCallOperator", "VideoCallOperatorImpl - didFailWithError: $message")
        if (!disposed) onSessionEnded?.invoke()
    }

    // Maps the SDK's plain-text permission failures onto the same typed strings
    // iOS reports, so one JS branch handles both. Camera first, to match iOS.
    // Anything unrecognised falls back to the generic type.
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
    override fun onPhoneLocked() {
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - onPhoneLocked")
        sendEvent("VideoCall_onScreenLocked", WritableNativeMap())
    }

    override fun onPhoneUnlocked() {
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - onPhoneUnlocked")
        sendEvent("VideoCall_onScreenUnlocked", WritableNativeMap())
    }

    // `phoneCallState` is the vendor's io.udentify.android.vc.enums
    // .PhoneCallState, whose constants are already named exactly as JS expects
    // ('incoming'/'outgoing'/'connected'/'ended'), so toString() is the whole
    // mapping - same approach as didChangeUserState above.
    override fun onPhoneCallStateChanged(phoneCallState: PhoneCallState?) {
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
    override fun onMicrophoneStateChanged(enabled: Boolean) {
        android.util.Log.d("VideoCallOperator", "VideoCallOperatorImpl - onMicrophoneStateChanged: $enabled")
        val params = WritableNativeMap().apply {
            putBoolean("enabled", enabled)
        }
        sendEvent("VideoCall_onMicrophoneStateChanged", params)
        // The SDK has just repainted its mute button with its own colour; see
        // the constructor parameter.
        onMicrophoneStateChanged?.invoke()
    }

    // Cancels the in-progress video call transaction on the server - used both for the
    // JS-invoked cancelVideoCall bridge method (e.g. user backs out before a room is
    // joined) and for the in-call End Call control.
    fun cancelVideoCall(callback: (Boolean, String?) -> Unit) {
        try {
            UdentifyVideoCallFragment.cancelVideoCall(
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

    // VideoCallOperator extends Parcelable and VCFragment.newInstance puts this
    // operator into the fragment's Bundle args, so these can be called - on a
    // configuration change, for instance. There is nothing meaningful to write:
    // the SDK uses this same in-memory instance, and an object bridging to the
    // React context could not survive process death anyway.
    override fun describeContents(): Int = 0

    override fun writeToParcel(dest: Parcel, flags: Int) {}

    // Set once this operator's session is over, by the VideoCallView that owns
    // it. The SDK keeps the proxy it was handed at createFragment() and is what
    // invokes onCallEnded(), so dropping our own reference does not stop it
    // emitting - on a remount the dead session's global, session-less
    @Volatile private var disposed = false

    // Stops this operator emitting, and stops onSessionEnded re-entering
    // teardown() on a view that has already gone. Idempotent.
    fun dispose() {
        disposed = true
    }

    private fun sendEvent(eventName: String, params: WritableNativeMap) {
        if (disposed) return
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
