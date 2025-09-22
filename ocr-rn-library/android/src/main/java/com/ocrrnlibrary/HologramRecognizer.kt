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
import io.udentify.android.ocr.model.CardOCRMessage
import io.udentify.android.ocr.model.HologramResponse
import io.udentify.android.ocr.model.OCRAndDocumentLivenessResponse
import java.io.ByteArrayOutputStream
import java.util.*

class HologramRecognizer(
    private val activity: AppCompatActivity,
    private val serverURL: String,
    private val transactionID: String,
    private val promise: Promise?,
    private val ocrModule: OCRModule? = null
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
        
        return CardRecognizerCredentials.Builder()
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
            .build()
    }

    override fun frontSideImage(frontSideImage: String?) {
        Log.d(TAG, "HologramRecognizer - Front side image captured: ${frontSideImage?.length ?: 0} chars")
        // Store front side image if needed for later processing
    }

    override fun backSideImage(backSideImage: String?) {
        Log.d(TAG, "HologramRecognizer - Back side image captured: ${backSideImage?.length ?: 0} chars")
        // Store back side image if needed for later processing
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
        ocrModule?.emitHologramError(error ?: "Hologram scanning failed")
        
        promise?.reject("HOLOGRAM_ERROR", error ?: "Hologram scanning failed")
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

    // HologramStages interface implementation
    override fun hologramStarted() {
        Log.e(TAG, "🔴 HologramRecognizer - HOLOGRAM RECORDING STARTED 🔴")
        // Hologram recording has started
    }

    override fun hologramFinished() {
        Log.e(TAG, "🟢 HologramRecognizer - HOLOGRAM RECORDING FINISHED 🟢")
        // Hologram recording completed successfully
        
        // Emit video recorded event (like iOS onVideoRecordFinished)
        Log.e(TAG, "🟢 EMITTING HOLOGRAM VIDEO RECORDED EVENT")
        ocrModule?.emitHologramVideoRecorded(listOf("hologram_video_recorded"))
        
        dismissCameraFragment()
        promise?.resolve(true)
    }

    override fun hologramResult(hologramResponse: HologramResponse?) {
        Log.e(TAG, "🟢🟢🟢 HologramRecognizer - HOLOGRAM RESULT RECEIVED 🟢🟢🟢")
        
        if (hologramResponse == null) {
            Log.e(TAG, "❌ HOLOGRAM RESPONSE IS NULL")
            promise?.reject("HOLOGRAM_ERROR", "No hologram result received")
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
        val errorMessage = hologramResponse?.getMessage() ?: "Hologram verification failed"
        
        // Emit error event (like iOS)
        ocrModule?.emitHologramError(errorMessage)
        
        dismissCameraFragment()
        promise?.reject("HOLOGRAM_ERROR", errorMessage)
    }
    
    private fun dismissCameraFragment() {
        try {
            activity.runOnUiThread {
                val fragmentManager = activity.supportFragmentManager
                
                // Try to pop from back stack
                if (fragmentManager.backStackEntryCount > 0) {
                    fragmentManager.popBackStackImmediate()
                }
                
                // Find and remove HologramFragment specifically
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
                
                // Clear all fragments if still present
                if (fragmentManager.fragments.isNotEmpty()) {
                    for (fragment in fragmentManager.fragments.toList()) {
                        val transaction = fragmentManager.beginTransaction()
                        transaction.remove(fragment)
                        transaction.commitNowAllowingStateLoss()
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
