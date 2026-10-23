package com.nfcrnlibrary

import android.os.Bundle
import android.util.Log
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.udentifycore.LiveKycRepeatRegistry
import com.udentifycore.RepeatConfigReader
import io.udentify.android.commons.livekyc.LiveKYCCoordinator
import io.udentify.android.commons.livekyc.RepeatRole
import io.udentify.android.nfc.ApiCredentials
import io.udentify.android.nfc.enums.ChipAnticloneMode
import io.udentify.android.nfc.livekyc.NFCLiveKYCRegistrar
import io.udentify.android.nfc.livekyc.NFCRepeatHandler
import java.io.Serializable
import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Locale

/**
 * Supplies the credentials for an in-call NFC re-read, when the video call
 * operator asks for one. The BAC key material that unlocks the chip is the MRZ
 * of an OCR redo in the same call and, when the app passed one, its own MRZ.
 */
internal object NfcLiveKycRepeat {

    private const val TAG = "NfcLiveKycRepeat"

    // The three BAC key fields: the document number and the dates as YYMMDD.
    private data class Mrz(val documentNumber: String, val dateOfBirth: String, val expiryDate: String)

    // An MRZ the app already has (a scan made before the call), and whether the one
    // an OCR redo of the call captured is preferred over it.
    private data class AppMrz(val mrz: Mrz, val preferCaptured: Boolean)

    private data class Config(
        val serverURL: String,
        val transactionID: String,
        val passiveAuthentication: Boolean?,
        val appMrz: AppMrz?
    )

    @Volatile
    private var config: Config? = null

    fun setConfig(map: ReadableMap?) {
        if (map == null) {
            disable()
            return
        }

        // A rejected call leaves the redo opted out, not on an earlier config.
        val parsed = try {
            parse(map)
        } catch (e: IllegalArgumentException) {
            disable()
            throw e
        }
        config = parsed

        NFCLiveKYCRegistrar.register()
        LiveKycRepeatRegistry.register(LiveKycRepeatRegistry.ROLE_NFC) { buildParams() }
        Log.d(TAG, "NFC repeat enabled for transaction ${parsed.transactionID}")
    }

    private fun disable() {
        config = null
        LiveKycRepeatRegistry.unregister(LiveKycRepeatRegistry.ROLE_NFC)
        NFCLiveKYCRegistrar.unregister()
        Log.d(TAG, "NFC repeat disabled")
    }

    private fun parse(map: ReadableMap): Config {
        val reader = RepeatConfigReader(map, "setRepeatConfig")
        return Config(
            serverURL = reader.requireString("serverURL"),
            transactionID = reader.requireString("transactionID"),
            passiveAuthentication = reader.optionalBoolean("passiveAuthentication"),
            appMrz = parseMrz(map)
        )
    }

    // Optional. Absent, the redo takes its key from the OCR redo of the call only.
    private fun parseMrz(map: ReadableMap): AppMrz? {
        if (!map.hasKey("mrz") || map.isNull("mrz")) return null
        require(map.getType("mrz") == ReadableType.Map) { "setRepeatConfig: \"mrz\" must be a map" }
        val reader = RepeatConfigReader(map.getMap("mrz")!!, "setRepeatConfig mrz")
        val birth = reader.requireString("dateOfBirth")
        val expiry = reader.requireString("expiryDate")
        require(isYymmdd(birth)) { "setRepeatConfig mrz: \"dateOfBirth\" must be YYMMDD" }
        require(isYymmdd(expiry)) { "setRepeatConfig mrz: \"expiryDate\" must be YYMMDD" }
        return AppMrz(
            Mrz(reader.requireString("documentNumber"), birth, expiry),
            reader.optionalBoolean("preferCapturedMRZ") ?: true
        )
    }

    private fun isYymmdd(value: String) = value.length == 6 && value.all { it in '0'..'9' }

    private fun buildParams(): Bundle? {
        val current = config ?: return null

        // The MRZ of whatever OCR repeat ran earlier in this call. Absent on the first
        // repeat of a call, or when the operator asks for NFC without asking for
        // OCR first - or after cancelling the OCR repeat, which caches nothing.
        val captured = capturedMrz()
        val app = current.appMrz
        val mrz = when {
            app == null -> captured
            app.preferCaptured -> captured ?: app.mrz
            else -> app.mrz
        }

        // Refuse rather than open a reader that is certain to fail: without all
        // three fields the chip cannot be unlocked, and a refusal tells the
        // operator something useful where a failed read would not.
        if (mrz == null) {
            Log.w(TAG, "Refusing NFC repeat: no usable BAC key material (no app MRZ, and no complete OCR result in this call)")
            return null
        }

        val builder = ApiCredentials.Builder()
            .serverUrl(current.serverURL)
            .transactionID(current.transactionID)
            .mrzDocNo(mrz.documentNumber)
            .mrzBirthDate(mrz.dateOfBirth)
            .mrzExpireDate(mrz.expiryDate)
            .chipAnticloneMode(ChipAnticloneMode.auto)
        current.passiveAuthentication?.let { builder.isPassiveAuthenticationEnabled(it) }

        val params = Bundle()
        params.putSerializable(NFCRepeatHandler.PARAM_CREDENTIALS, builder.build() as Serializable)
        return params
    }

    // The OCR redo's result as BAC key material, or null when there is none or a field is
    // missing or not a date: nothing partial is ever used.
    private fun capturedMrz(): Mrz? {
        val lastOcr = LiveKYCCoordinator.getInstance().getLastResult(RepeatRole.OCR) ?: return null

        // Read reflectively rather than casting to io.udentify.android.ocr.model
        // .CardOCRMessage. Naming that type would put the OCR AAR on this module's
        // compile classpath, and ocr-rn-library is an independent package a
        // customer may not have installed - NFC alone is a supported setup.
        val docNo = lastOcr.stringGetter("getDocumentId")
        val birth = toMrzDate(lastOcr.stringGetter("getBirthDate"))
        val expiry = toMrzDate(lastOcr.stringGetter("getExpireDate"))
        if (docNo.isNullOrEmpty() || birth == null || expiry == null) return null
        return Mrz(docNo, birth, expiry)
    }

    private fun Any.stringGetter(name: String): String? = try {
        javaClass.getMethod(name).invoke(this) as? String
    } catch (t: Throwable) {
        Log.w(TAG, "Cached OCR result ${javaClass.name} has no readable $name()", t)
        null
    }

    /**
     * `CardOCRMessage` reports dates as `dd.MM.yyyy`; the MRZ/BAC key needs
     * `yyMMdd`. Returns null rather than throwing on anything that does not
     * parse, so a malformed OCR field refuses the repeat with a clear reason
     */
    private fun toMrzDate(ddMMyyyy: String?): String? {
        if (ddMMyyyy.isNullOrEmpty()) return null
        return try {
            val input = SimpleDateFormat("dd.MM.yyyy", Locale.US).apply { isLenient = false }
            val output = SimpleDateFormat("yyMMdd", Locale.US)
            output.format(input.parse(ddMMyyyy)!!)
        } catch (e: ParseException) {
            Log.w(TAG, "A date of the cached OCR result is not dd.MM.yyyy", e)
            null
        }
    }
}
