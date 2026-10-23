package com.ocrrnlibrary

import android.os.Bundle
import android.util.Log
import com.facebook.react.bridge.ReadableMap
import com.udentifycore.LiveKycRepeatRegistry
import com.udentifycore.RepeatConfigReader
import io.udentify.android.ocr.CardRecognizerCredentials
import io.udentify.android.ocr.activities.DocumentType
import io.udentify.android.ocr.activities.Process
import io.udentify.android.ocr.livekyc.OCRLiveKYCRegistrar
import io.udentify.android.ocr.livekyc.OCRRepeatHandler
import java.io.Serializable

/**
 * Supplies the credentials for an in-call OCR re-capture, when the video call
 * operator asks for one.
 * Two registrations are needed: `OCRLiveKYCRegistrar` tells the vendor SDKs
 */
internal object OcrLiveKycRepeat {

    private const val TAG = "OcrLiveKycRepeat"

    private data class Config(
        val serverURL: String,
        val userID: String,
        val transactionID: String,
        val country: String,
        val documentType: String,
        val documentSide: String?,
        val cardOrientation: Boolean?
    )

    @Volatile
    private var config: Config? = null

    /**
     * Stores the configuration a repeat will use and opts this app in. Passing
     * null clears it and opts back out, so an app can confine repeats to the
     * transactions it actually wants them for.
     */
    fun setConfig(map: ReadableMap?) {
        if (map == null) {
            disable()
            return
        }

        // A rejected call leaves the redo opted out, not on an earlier config.
        val parsed = try {
            parse(RepeatConfigReader(map, "setRepeatConfig"))
        } catch (e: IllegalArgumentException) {
            disable()
            throw e
        }
        config = parsed

        OCRLiveKYCRegistrar.register()
        LiveKycRepeatRegistry.register(LiveKycRepeatRegistry.ROLE_OCR) { buildParams() }
        Log.d(TAG, "OCR repeat enabled for transaction ${parsed.transactionID}")
    }

    private fun disable() {
        config = null
        LiveKycRepeatRegistry.unregister(LiveKycRepeatRegistry.ROLE_OCR)
        OCRLiveKYCRegistrar.unregister()
        Log.d(TAG, "OCR repeat disabled")
    }

    private fun parse(reader: RepeatConfigReader) = Config(
        serverURL = reader.requireString("serverURL"),
        userID = reader.requireString("userID"),
        transactionID = reader.requireString("transactionID"),
        country = reader.optionalString("country") ?: "TUR",
        documentType = reader.optionalString("documentType") ?: "ID_CARD",
        documentSide = reader.optionalString("documentSide"),
        cardOrientation = reader.optionalBoolean("cardOrientation")
    )

    private fun buildParams(): Bundle? {
        val current = config ?: return null

        // Same mapping the normal (non-repeat) OCR entry point uses, so a repeat
        // reads the same document the original scan did.
        val docType = when (current.documentType.uppercase()) {
            "ID_CARD" -> DocumentType.OCR_ID_UPLOAD
            "PASSPORT" -> DocumentType.OCR_PASSPORT_UPLOAD
            "DRIVER_LICENSE", "DRIVE_LICENCE" -> DocumentType.OCR_DRIVER_LICENCE_UPLOAD
            else -> DocumentType.OCR_ID_UPLOAD
        }

        val credentials = CardRecognizerCredentials.Builder()
            .serverURL(current.serverURL)
            .userID(current.userID)
            .transactionID(current.transactionID)
            .countryCode(CountryCodeMapper.toCountryCode(current.country))
            .docType(docType)
            .build()

        val params = Bundle()
        params.putSerializable(OCRRepeatHandler.PARAM_CREDENTIALS, credentials as Serializable)

        // Both optional. Left out, the handler starts with Process.frontSide and false;
        // a non-passport redo captures both sides either way.
        when (current.documentSide?.uppercase()) {
            "BACK", "BACKSIDE", "BACK_SIDE" -> params.putSerializable(OCRRepeatHandler.PARAM_DOC_SIDE, Process.backSide)
            "FRONT", "FRONTSIDE", "FRONT_SIDE" -> params.putSerializable(OCRRepeatHandler.PARAM_DOC_SIDE, Process.frontSide)
            null -> Unit
            else -> Log.w(TAG, "Unrecognized documentSide \"${current.documentSide}\"; using the SDK default")
        }
        current.cardOrientation?.let { params.putBoolean(OCRRepeatHandler.PARAM_CARD_ORIENTATION, it) }

        return params
    }
}
