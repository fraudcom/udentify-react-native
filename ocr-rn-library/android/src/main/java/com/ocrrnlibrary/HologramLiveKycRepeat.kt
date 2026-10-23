package com.ocrrnlibrary

import android.os.Bundle
import android.util.Log
import com.facebook.react.bridge.ReadableMap
import com.udentifycore.LiveKycRepeatRegistry
import com.udentifycore.RepeatConfigReader
import io.udentify.android.ocr.CardRecognizerCredentials
import io.udentify.android.ocr.activities.DocumentType
import io.udentify.android.ocr.livekyc.HologramLiveKYCRegistrar
import io.udentify.android.ocr.livekyc.HologramRepeatHandler
import java.io.Serializable

/**
 * Supplies the credentials for an in-call hologram re-capture, when the video
 * call operator asks for one. The hologram flow ships in the same SDK module as
 * OCR but registers separately, so it is opted into separately.
 */
internal object HologramLiveKycRepeat {

    private const val TAG = "HologramLiveKycRepeat"
    private const val NAME = "setHologramRepeatConfig"

    private data class Config(
        val serverURL: String,
        val userID: String,
        val transactionID: String,
        val country: String,
        val cardOrientation: Boolean?,
        val noFlashDuration: Int?,
        val flashDuration: Int?,
        val totalDuration: Int?,
        val bitrate: Float?,
        val requestTimeout: Int?
    )

    @Volatile
    private var config: Config? = null

    /**
     * Stores the configuration a repeat will use and opts in; null clears it and opts
     * out. A call that is rejected leaves the redo opted out, not on an earlier config.
     */
    fun setConfig(map: ReadableMap?) {
        if (map == null) {
            disable()
            return
        }

        val parsed = try {
            parse(RepeatConfigReader(map, NAME))
        } catch (e: IllegalArgumentException) {
            disable()
            throw e
        }
        config = parsed

        HologramLiveKYCRegistrar.register()
        LiveKycRepeatRegistry.register(LiveKycRepeatRegistry.ROLE_HOLOGRAM) { buildParams() }
        Log.d(TAG, "Hologram repeat enabled for transaction ${parsed.transactionID}")
    }

    private fun disable() {
        config = null
        LiveKycRepeatRegistry.unregister(LiveKycRepeatRegistry.ROLE_HOLOGRAM)
        HologramLiveKYCRegistrar.unregister()
        Log.d(TAG, "Hologram repeat disabled")
    }

    // The SDK's durations and timeout are whole seconds, so a fractional value is
    // truncated.
    private fun parse(reader: RepeatConfigReader) = Config(
        serverURL = reader.requireString("serverURL"),
        userID = reader.requireString("userID"),
        transactionID = reader.requireString("transactionID"),
        country = reader.optionalString("country") ?: "TUR",
        cardOrientation = reader.optionalBoolean("cardOrientation"),
        noFlashDuration = reader.seconds("hologramNoFlashDuration", "0 or more") { it >= 0 },
        flashDuration = reader.seconds("hologramFlashDuration", "0 or more") { it >= 0 },
        totalDuration = reader.seconds("hologramTotalDuration", "0 or more") { it >= 0 },
        bitrate = reader.optionalNumber("hologramBitrate", "greater than 0") { it > 0 }?.toFloat(),
        requestTimeout = reader.seconds("hologramRequestTimeout", "1 or more") { it >= 1 }
    )

    private fun RepeatConfigReader.seconds(
        key: String,
        requirement: String,
        accepts: (Double) -> Boolean
    ): Int? = optionalNumber(key, requirement, accepts)?.toInt()

    private fun buildParams(): Bundle? {
        val current = config ?: return null

        // Only what the app set reaches the builder; the SDK keeps its own
        // defaults for the rest.
        val builder = CardRecognizerCredentials.Builder()
            .serverURL(current.serverURL)
            .userID(current.userID)
            .transactionID(current.transactionID)
            .countryCode(CountryCodeMapper.toCountryCode(current.country))
            .docType(DocumentType.OCR_ID_UPLOAD)
        current.noFlashDuration?.let { builder.hologramNoFlashDuration(it) }
        current.flashDuration?.let { builder.hologramFlashDuration(it) }
        current.totalDuration?.let { builder.hologramTotalDuration(it) }
        current.bitrate?.let { builder.hologramBitrate(it) }
        current.requestTimeout?.let { builder.requestTimeout(it) }

        val params = Bundle()
        params.putSerializable(HologramRepeatHandler.PARAM_CREDENTIALS, builder.build() as Serializable)
        current.cardOrientation?.let { params.putBoolean(HologramRepeatHandler.PARAM_CARD_ORIENTATION, it) }
        return params
    }
}
