package com.livenessrnlibrary

import android.os.Bundle
import android.util.Log
import com.facebook.react.bridge.ReadableMap
import com.udentifycore.LiveKycRepeatRegistry
import io.udentify.android.face.FaceRecognizerCredentials
import io.udentify.android.face.activities.Method
import io.udentify.android.face.livekyc.FaceLiveKYCRegistrar
import io.udentify.android.face.livekyc.FaceRepeatHandler
import java.io.Serializable

/**
 * Supplies the credentials for an in-call face re-capture, when the video call
 * operator asks for one. See [com.udentifycore.LiveKycRepeatRegistry] for why the
 * video call bridge asks this package rather than building the credentials itself.
 */
internal object FaceLiveKycRepeat {

    private const val TAG = "FaceLiveKycRepeat"

    private data class Config(
        val serverURL: String,
        val userID: String,
        val transactionID: String,
        val method: String?,
        val isAuthenticate: Boolean?,
        val activeLivenessOpacity: Float?,
        val runInBackground: Boolean?
    )

    @Volatile
    private var config: Config? = null

    fun setConfig(map: ReadableMap?) {
        if (map == null) {
            config = null
            LiveKycRepeatRegistry.unregister(LiveKycRepeatRegistry.ROLE_FACE)
            FaceLiveKYCRegistrar.unregister()
            Log.d(TAG, "Face repeat disabled")
            return
        }

        config = Config(
            serverURL = map.requireString("serverURL"),
            userID = map.requireString("userID"),
            transactionID = map.requireString("transactionID"),
            method = if (map.hasKey("method")) map.getString("method") else null,
            isAuthenticate = if (map.hasKey("isAuthenticate")) map.getBoolean("isAuthenticate") else null,
            activeLivenessOpacity =
                if (map.hasKey("activeLivenessOpacity"))
                    map.getDouble("activeLivenessOpacity").toFloat()
                else null,
            runInBackground =
                if (map.hasKey("runInBackground")) map.getBoolean("runInBackground") else null
        )

        FaceLiveKYCRegistrar.register()
        LiveKycRepeatRegistry.register(LiveKycRepeatRegistry.ROLE_FACE) { buildParams() }
        Log.d(TAG, "Face repeat enabled for transaction ${config?.transactionID}")
    }

    private fun ReadableMap.requireString(key: String): String {
        val value = if (hasKey(key)) getString(key) else null
        require(!value.isNullOrEmpty()) { "setRepeatConfig: \"$key\" is required" }
        return value
    }

    private fun buildParams(): Bundle? {
        val current = config ?: return null

        val builder = FaceRecognizerCredentials.Builder()
            .serverURL(current.serverURL)
            .userID(current.userID)
            .transactionID(current.transactionID)

        // Defaults to true for a repeat, which is what this path has always
        // passed: the capture runs inside a live video call, so the SDK must not
        // own the Activity. The standard (non-repeat) flow defaults to false
        // instead, so the two are deliberately different - do not "align" them.
        builder.runInBackground(current.runInBackground ?: true)

        // The SDK draws `gesture_presentation_bg` - a full-screen
        // udentifyface_bg_color image - over its own camera preview and sets
        // that image's alpha from this value. Its default is 1f, which hides
        // the preview entirely. Only applied when the app asks, so the SDK's
        // own default still stands for anyone who does not.
        current.activeLivenessOpacity?.let { builder.activeLivenessOpacity(it) }

        val credentials = builder.build()

        val params = Bundle()
        params.putSerializable(FaceRepeatHandler.PARAM_CREDENTIALS, credentials as Serializable)

        val method = when (current.method?.uppercase()) {
            "REGISTER" -> Method.Register
            "AUTHENTICATION" -> Method.Authentication
            "ACTIVELIVENESS", "ACTIVE_LIVENESS" -> Method.ActiveLiveness
            "HYBRIDLIVENESS", "HYBRID_LIVENESS" -> Method.HybridLiveness
            "SELFIE" -> Method.Selfie
            "PHOTOUPLOAD", "PHOTO_UPLOAD" -> Method.PhotoUpload
            "IDENTIFICATION" -> Method.Identification
            null -> null
            else -> {
                Log.w(TAG, "Unrecognized method \"${current.method}\"; using the SDK default")
                null
            }
        }
        method?.let { params.putSerializable(FaceRepeatHandler.PARAM_METHOD, it) }

        // PARAM_REGISTER's *name* is backwards, its value is not: the vendor sets
        // false to REGISTER a new user and true to AUTHENTICATE an existing one.
        // So the value passes through unchanged here - `isAuthenticate` is simply
        // the honest name for the same boolean, and renaming it on the JS side is
        current.isAuthenticate?.let { params.putBoolean(FaceRepeatHandler.PARAM_REGISTER, it) }

        return params
    }
}
