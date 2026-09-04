package com.ocrrnlibrary

import android.graphics.Bitmap
import android.os.Parcel
import android.os.Parcelable
import android.util.Base64
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import io.udentify.android.ocr.CardRecognizerCredentials
import io.udentify.android.ocr.activities.CardRecognizer
import io.udentify.android.ocr.activities.DocumentType
import io.udentify.android.ocr.activities.HologramStages
import io.udentify.android.ocr.activities.PlaceholderTemplate
import io.udentify.android.ocr.activities.Process
import io.udentify.android.ocr.model.CardOCRMessage
import io.udentify.android.ocr.model.HologramDirective
import io.udentify.android.ocr.model.HologramResponse
import io.udentify.android.ocr.model.IQAFeedback
import io.udentify.android.ocr.model.IQAResponse
import io.udentify.android.ocr.model.OCRAndDocumentLivenessResponse
import io.udentify.android.ocr.model.OCRDirective
import java.io.ByteArrayOutputStream
import java.util.*

class HologramRecognizer(
    private val activity: AppCompatActivity,
    private val serverURL: String,
    private val transactionID: String,
    private val promise: Promise?,
    private val ocrModule: OCRModule? = null,
    private val uiConfiguration: Map<String, Any>? = null  // 26.1.3: hologram flash/bitrate config
) : CardRecognizer, HologramStages {

    companion object {
        private const val TAG = "HologramRecognizer"
        
        @JvmField
        val CREATOR = object : Parcelable.Creator<HologramRecognizer> {
            override fun createFromParcel(parcel: Parcel): HologramRecognizer {
                return HologramRecognizer(parcel)
            }

            override fun newArray(size: Int): Array<HologramRecognizer?> {
                return arrayOfNulls(size)
            }
        }
    }
    
    constructor(parcel: Parcel) : this(
        activity = AppCompatActivity(), // Create dummy activity for parcel
        serverURL = parcel.readString() ?: "",
        transactionID = parcel.readString() ?: "",
        promise = null, // Promise cannot be parceled
        ocrModule = null // OCRModule cannot be parceled
    )

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        // Don't serialize activity, just the strings
        parcel.writeString(serverURL)
        parcel.writeString(transactionID)
    }

    override fun describeContents(): Int {
        return 0
    }

    override fun getCredentials(): CardRecognizerCredentials {
        Log.d(TAG, "HologramRecognizer - Creating credentials for transaction: $transactionID")
        
        val builder = CardRecognizerCredentials.Builder()
            .serverURL(serverURL)
            .transactionID(transactionID)
            .userID(Date().time.toString())
            .docType(DocumentType.OCR_ID_UPLOAD) // Default document type for hologram
            .countryCode("TUR") // Default country, can be made configurable
            .successDelay(0.2f)
            .hardwareSupport(7)
            .faceDetection(false)
            .blurCoefficient(0.0f)
            .manualCapture(false)
            .isDocumentLivenessActive(false)
            .reviewScreenEnabled(true)
            .footerViewHidden(false)
            .placeholderTemplate(PlaceholderTemplate.defaultStyle)

        // 26.1.3: hologram flash/bitrate configuration (falls back to SDK defaults when unset)
        (uiConfiguration?.get("noFlashDuration") as? Int)?.let {
            builder.hologramNoFlashDuration(it)
            Log.d(TAG, "HologramRecognizer - Applied noFlashDuration: $it")
        }
        (uiConfiguration?.get("flashDuration") as? Int)?.let {
            builder.hologramFlashDuration(it)
            Log.d(TAG, "HologramRecognizer - Applied flashDuration: $it")
        }
        (uiConfiguration?.get("totalDuration") as? Int)?.let {
            builder.hologramTotalDuration(it)
            Log.d(TAG, "HologramRecognizer - Applied totalDuration: $it")
        }
        (uiConfiguration?.get("bitrate") as? Double)?.let {
            builder.hologramBitrate(it.toFloat())
            Log.d(TAG, "HologramRecognizer - Applied bitrate: $it")
        }

        return builder.build()
    }

    override fun frontSideImage(frontSideImage: String, croppedFrontSideImage: String) {
        Log.d(TAG, "HologramRecognizer - Front side image captured: ${frontSideImage.length} chars")
    }

    override fun backSideImage(backSideImage: String, croppedBackSideImage: String) {
        Log.d(TAG, "HologramRecognizer - Back side image captured: ${backSideImage.length} chars")
    }

    override fun cardScanFinished() {
        Log.d(TAG, "HologramRecognizer - Hologram scan finished")
        // Called when scanning is complete
    }

    override fun onResult(cardOCRMessage: CardOCRMessage?) {
        Log.d(TAG, "HologramRecognizer - OCR Result received (not expected for hologram)")
        // This shouldn't be called for hologram operations, but handle gracefully
        promise?.resolve(true)
    }

    override fun onFailure(error: String?) {
        Log.e(TAG, "HologramRecognizer - Hologram Failed: $error")
        dismissCameraFragment()
        
        // Emit error event (like iOS)
        ocrModule?.emitHologramError(error ?: activity.getString(R.string.ocr_hologram_error_scanning_failed))
        
        promise?.reject("HOLOGRAM_ERROR", error ?: activity.getString(R.string.ocr_hologram_error_scanning_failed))
    }

    override fun onPhotoTaken() {
        Log.d(TAG, "HologramRecognizer - Video recording started/completed")
        // Called when video recording starts or completes
    }

    override fun didFinishOcrAndDocumentLivenessCheck(response: OCRAndDocumentLivenessResponse?) {
        Log.d(TAG, "HologramRecognizer - OCR and Document Liveness finished (not expected for hologram)")
        // This shouldn't be called for hologram operations, but handle gracefully
        promise?.resolve(true)
    }

    override fun onIqaResult(iqaResponse: IQAResponse, iqaFeedback: IQAFeedback) {
        Log.d(TAG, "HologramRecognizer - IQA Result: feedback=${iqaFeedback.name}, side=${iqaResponse.documentSide?.name}")
        try {
            val result = WritableNativeMap()
            result.putString("documentSide", jsDocumentSideValue(iqaResponse.documentSide))
            result.putString("feedback", jsIqaFeedbackValue(iqaFeedback))
            result.putBoolean("qualified", iqaResponse.isQualified ?: false)
            result.putString("displayMessage", iqaResponse.displayMessage ?: "")
            result.putString("rawMessage", iqaResponse.rawMessage ?: "")
            result.putDouble("timestamp", System.currentTimeMillis().toDouble())
            ocrModule?.emitIQAResult(result)
        } catch (e: Exception) {
            Log.e(TAG, "HologramRecognizer - Error emitting IQA result: ${e.message}", e)
        }
    }

    override fun onOCRDirectiveChanged(directive: OCRDirective) {
        Log.d(TAG, "HologramRecognizer - OCR Directive changed: ${directive.name}")
        ocrModule?.emitOCRDirectiveChanged(directive.name)
    }

    // HologramStages interface implementation
    override fun hologramStarted() {
        Log.e(TAG, "🔴 HologramRecognizer - HOLOGRAM RECORDING STARTED 🔴")
        // Hologram recording has started
    }

    override fun hologramFinished() {
        Log.e(TAG, "🟢 HologramRecognizer - HOLOGRAM RECORDING FINISHED 🟢")
        // Hologram recording completed successfully
        
        // Emit video recorded event (like iOS onVideoRecordFinished). Unlike
        // iOS, the underlying Udentify Android SDK's HologramStages callback
        // doesn't hand back the recorded video's file path/URL here, so
        // there's no real value to report - emit an empty list rather than a
        // placeholder string that would look like a real URL to callers.
        Log.e(TAG, "🟢 EMITTING HOLOGRAM VIDEO RECORDED EVENT")
        ocrModule?.emitHologramVideoRecorded(emptyList())
        
        dismissCameraFragment()
        promise?.resolve(true)
    }

    override fun hologramResult(hologramResponse: HologramResponse?) {
        Log.e(TAG, "🟢🟢🟢 HologramRecognizer - HOLOGRAM RESULT RECEIVED 🟢🟢🟢")
        
        if (hologramResponse == null) {
            Log.e(TAG, "❌ HOLOGRAM RESPONSE IS NULL")
            promise?.reject("HOLOGRAM_ERROR", activity.getString(R.string.ocr_hologram_error_no_result))
            return
        }
        
        try {
            Log.e(TAG, "🟢 CONVERTING HOLOGRAM RESPONSE TO MAP")
            val result = convertHologramResponseToWritableMap(hologramResponse)
            
            // Emit success event (like iOS)
            Log.e(TAG, "🟢 EMITTING HOLOGRAM COMPLETE EVENT")
            ocrModule?.emitHologramComplete(result)
            
            dismissCameraFragment()
            promise?.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error converting hologram result: ${e.message}", e)
            
            // Emit error event
            ocrModule?.emitHologramError("Error processing hologram result: ${e.message}")
            
            dismissCameraFragment()
            promise?.reject("HOLOGRAM_ERROR", "Error processing hologram result: ${e.message}")
        }
    }

    override fun hologramFail(hologramResponse: HologramResponse?) {
        Log.e(TAG, "HologramRecognizer - Hologram Failed")
        val errorMessage = hologramResponse?.getMessage() ?: activity.getString(R.string.ocr_hologram_error_verification_failed)
        
        // Emit error event (like iOS)
        ocrModule?.emitHologramError(errorMessage)
        
        dismissCameraFragment()
        promise?.reject("HOLOGRAM_ERROR", errorMessage)
    }

    override fun onHologramDirectiveChanged(directive: HologramDirective) {
        Log.d(TAG, "HologramRecognizer - Hologram Directive changed: ${directive.name}")
        ocrModule?.emitHologramDirectiveChanged(directive.name)
    }
    
    private fun dismissCameraFragment() {
        try {
            activity.runOnUiThread {
                val fragmentManager = activity.supportFragmentManager
                val fragments = fragmentManager.fragments
                for (fragment in fragments) {
                    if (fragment.javaClass.simpleName.contains("HologramFragment") ||
                        fragment.javaClass.name.contains("HologramFragment")) {
                        val transaction = fragmentManager.beginTransaction()
                        transaction.remove(fragment)
                        transaction.commitNowAllowingStateLoss()
                        break
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "HologramRecognizer - Error dismissing camera fragment: ${e.message}", e)
        }
    }

    private fun convertHologramResponseToWritableMap(response: HologramResponse): WritableMap {
        val result = WritableNativeMap()
        
        result.putBoolean("success", response.getMessage() == null || !response.getMessage().contains("error", true))
        result.putString("transactionID", transactionID)
        result.putDouble("timestamp", System.currentTimeMillis().toDouble())
        
        // Add hologram specific data
        result.putString("idNumber", response.getHologramDocumentId() ?: "")
        result.putBoolean("hologramExists", response.getOcrHologramCheck() ?: false)
        result.putBoolean("ocrIdAndHologramIdMatch", response.getOcrHoloIdMatch() ?: false)
        result.putBoolean("ocrFaceAndHologramFaceMatch", response.getOcrHoloFaceMatch() ?: false)
        
        // Convert hologram face image to base64 if available
        if (response.getHologramFace() != null) {
            try {
                val base64String = convertBitmapToBase64(response.getHologramFace())
                result.putString("hologramFaceImageBase64", base64String)
            } catch (e: Exception) {
                Log.e(TAG, "Error converting hologram face image to base64: ${e.message}", e)
            }
        }
        
        // Add error information if available
        if (response.getMessage() != null) {
            result.putString("error", response.getMessage())
        }
        
        return result
    }

    private fun convertBitmapToBase64(bitmap: Bitmap): String {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
        val byteArray = outputStream.toByteArray()
        return Base64.encodeToString(byteArray, Base64.DEFAULT)
    }
}
