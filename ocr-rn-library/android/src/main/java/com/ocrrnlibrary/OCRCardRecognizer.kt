package com.ocrrnlibrary

import android.os.Parcel
import android.os.Parcelable
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import io.udentify.android.ocr.CardRecognizerCredentials
import io.udentify.android.ocr.activities.CardFragment
import io.udentify.android.ocr.activities.CardRecognizer
import io.udentify.android.ocr.activities.CardRecognizerObject
import io.udentify.android.ocr.activities.DocumentType
import io.udentify.android.ocr.activities.PlaceholderTemplate
import io.udentify.android.ocr.activities.Process
import io.udentify.android.ocr.model.CardOCRMessage
import io.udentify.android.ocr.model.IQAFeedback
import io.udentify.android.ocr.model.IQAResponse
import io.udentify.android.ocr.model.OCRAndDocumentLivenessResponse
import io.udentify.android.ocr.model.OCRDirective
import java.util.*

class OCRCardRecognizer(
    private val activity: AppCompatActivity,
    private val serverURL: String,
    private val transactionID: String,
    private val documentType: String,
    private val country: String = "TUR",
    private val promise: Promise?,
    private val originalDocumentSide: String = "BOTH",
    private val ocrModule: OCRModule? = null,  // Reference to store images like iOS
    private val uiConfiguration: Map<String, Any>? = null  // UI configuration like iOS
) : CardRecognizer {

    companion object {
        private const val TAG = "OCRCardRecognizer"
        
        @JvmField
        val CREATOR = object : Parcelable.Creator<OCRCardRecognizer> {
            override fun createFromParcel(parcel: Parcel): OCRCardRecognizer {
                return OCRCardRecognizer(parcel)
            }

            override fun newArray(size: Int): Array<OCRCardRecognizer?> {
                return arrayOfNulls(size)
            }
        }
    }
    
    private var storedFrontSideImage: String? = null
    
    constructor(parcel: Parcel) : this(
        activity = AppCompatActivity(), // Create dummy activity for parcel
        serverURL = parcel.readString() ?: "",
        transactionID = parcel.readString() ?: "",
        documentType = parcel.readString() ?: "ID_CARD",
        country = parcel.readString() ?: "TUR",
        promise = null, // Promise cannot be parceled
        originalDocumentSide = parcel.readString() ?: "BOTH",
        ocrModule = null, // Cannot parcel OCRModule reference
        uiConfiguration = null // Cannot parcel UI configuration
    )

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        // Don't serialize activity or ocrModule, just the strings
        parcel.writeString(serverURL)
        parcel.writeString(transactionID)
        parcel.writeString(documentType)
        parcel.writeString(country)
        parcel.writeString(originalDocumentSide)
    }

    override fun describeContents(): Int {
        return 0
    }

    override fun getCredentials(): CardRecognizerCredentials {
        Log.d(TAG, "🔧 OCRCardRecognizer - Creating credentials for transaction: $transactionID")
        Log.d(TAG, "🔧 OCRCardRecognizer - UI Configuration available: ${uiConfiguration != null}")
        Log.d(TAG, "🔧 OCRCardRecognizer - UI Configuration: $uiConfiguration")
        
        val docType = when (documentType.uppercase()) {
            "ID_CARD" -> DocumentType.OCR_ID_UPLOAD
            "PASSPORT" -> DocumentType.OCR_PASSPORT_UPLOAD
            "DRIVER_LICENSE", "DRIVE_LICENCE" -> DocumentType.OCR_DRIVER_LICENCE_UPLOAD
            else -> DocumentType.OCR_ID_UPLOAD
        }
        
        // Convert country code using shared mapper
        val mappedCountryCode = CountryCodeMapper.toCountryCode(country)
        Log.d(TAG, "OCRCardRecognizer - Country: $country -> $mappedCountryCode")
        
        val builder = CardRecognizerCredentials.Builder()
            .serverURL(serverURL)
            .transactionID(transactionID)
            .userID(Date().time.toString())
            .docType(docType)
            .countryCode(mappedCountryCode)
            
        // Apply UI configuration if available
        uiConfiguration?.let { config ->
            Log.d(TAG, "🔧 OCRCardRecognizer - Applying UI configuration with ${config.size} parameters")
            
            // Detection and behavior settings
            config["detectionAccuracy"]?.let { 
                val value = (it as? Int ?: 7)
                builder.hardwareSupport(value)
                Log.d(TAG, "🔧 OCRCardRecognizer - Applied detectionAccuracy (hardwareSupport): $value")
            } ?: run {
                builder.hardwareSupport(7)
                Log.d(TAG, "🔧 OCRCardRecognizer - Using default hardwareSupport: 7")
            }
            
            config["blurCoefficient"]?.let { 
                val value = (it as? Double ?: 0.0).toFloat()
                builder.blurCoefficient(value)
                Log.d(TAG, "🔧 OCRCardRecognizer - Applied blurCoefficient: $value")
            } ?: run {
                builder.blurCoefficient(0.0f)
                Log.d(TAG, "🔧 OCRCardRecognizer - Using default blurCoefficient: 0.0")
            }
            
            config["manualCapture"]?.let {
                val value = it as? Boolean ?: false
                builder.manualCapture(value)
                Log.d(TAG, "🔧 OCRCardRecognizer - Applied manualCapture: $value")
            } ?: run {
                builder.manualCapture(false)
                Log.d(TAG, "🔧 OCRCardRecognizer - Using default manualCapture: false")
            }
            
            config["faceDetection"]?.let {
                val value = it as? Boolean ?: false
                builder.faceDetection(value)
                Log.d(TAG, "🔧 OCRCardRecognizer - Applied faceDetection: $value")
            } ?: run {
                builder.faceDetection(false)
                Log.d(TAG, "🔧 OCRCardRecognizer - Using default faceDetection: false")
            }
            
            config["isDocumentLivenessActive"]?.let {
                val value = it as? Boolean ?: false
                builder.isDocumentLivenessActive(value)
                Log.d(TAG, "🔧 OCRCardRecognizer - Applied isDocumentLivenessActive: $value")
            } ?: run {
                builder.isDocumentLivenessActive(false)
                Log.d(TAG, "🔧 OCRCardRecognizer - Using default isDocumentLivenessActive: false")
            }
            
            config["reviewScreenEnabled"]?.let {
                val value = it as? Boolean ?: true
                builder.reviewScreenEnabled(value)
                Log.d(TAG, "🔧 OCRCardRecognizer - Applied reviewScreenEnabled: $value")
            } ?: run {
                builder.reviewScreenEnabled(true)
                Log.d(TAG, "🔧 OCRCardRecognizer - Using default reviewScreenEnabled: true")
            }

            config["footerViewHidden"]?.let {
                val value = it as? Boolean ?: false
                builder.footerViewHidden(value)
                Log.d(TAG, "🔧 OCRCardRecognizer - Applied footerViewHidden: $value")
            } ?: run {
                builder.footerViewHidden(false)
                Log.d(TAG, "🔧 OCRCardRecognizer - Using default footerViewHidden: false")
            }
            
            // Placeholder template setting
            config["placeholderTemplate"]?.let { templateString ->
                val template = when ((templateString as? String)?.lowercase()) {
                    "hidden" -> PlaceholderTemplate.hidden
                    "defaultstyle", "default" -> PlaceholderTemplate.defaultStyle
                    "countryspecificstyle", "countryspecific" -> PlaceholderTemplate.countrySpecificStyle
                    else -> PlaceholderTemplate.defaultStyle
                }
                builder.placeholderTemplate(template)
                Log.d(TAG, "🔧 OCRCardRecognizer - Applied placeholderTemplate: $templateString -> $template")
            } ?: run {
                builder.placeholderTemplate(PlaceholderTemplate.defaultStyle)
                Log.d(TAG, "🔧 OCRCardRecognizer - Using default placeholderTemplate: defaultStyle")
            }
            
            // Check for both iqaEnabled and isIQAServiceEnabled (iOS naming)
            val iqaEnabledValue = config["iqaEnabled"] as? Boolean 
                ?: config["isIQAServiceEnabled"] as? Boolean 
                ?: true
            builder.iqaEnabled(iqaEnabledValue)
            Log.d(TAG, "🔧 OCRCardRecognizer - Applied iqaEnabled: $iqaEnabledValue (from ${if (config.containsKey("iqaEnabled")) "iqaEnabled" else if (config.containsKey("isIQAServiceEnabled")) "isIQAServiceEnabled" else "default"})")
            
            config["iqaSuccessAutoDismissDelay"]?.let {
                val value = it as? Int ?: -1
                builder.iqaSuccessAutoDismissDelay(value)
                Log.d(TAG, "🔧 OCRCardRecognizer - Applied iqaSuccessAutoDismissDelay: $value")
            } ?: run {
                builder.iqaSuccessAutoDismissDelay(-1)
                Log.d(TAG, "🔧 OCRCardRecognizer - Using default iqaSuccessAutoDismissDelay: -1")
            }
            
            config["requestTimeout"]?.let {
                val value = (it as? Double ?: 30.0).toInt()
                builder.requestTimeout(value)
                Log.d(TAG, "🔧 OCRCardRecognizer - Applied requestTimeout: $value")
            } ?: run {
                builder.requestTimeout(30)
                Log.d(TAG, "🔧 OCRCardRecognizer - Using default requestTimeout: 30")
            }
            
            // Success delay (fixed value for now)
            builder.successDelay(0.2f)
            Log.d(TAG, "🔧 OCRCardRecognizer - Applied successDelay: 0.2f")

            // 26.1.3: raw photo crop ratio. JS uses a 0.0-1.0 ratio like iOS; SDK expects a percentage (default 35).
            config["rawPhotoCropRatio"]?.let {
                val ratio = (it as? Double) ?: 0.35
                val percent = (ratio * 100).toInt()
                builder.rawPhotoCropRatio(percent)
                Log.d(TAG, "🔧 OCRCardRecognizer - Applied rawPhotoCropRatio: $percent%")
            }

        } ?: run {
            Log.d(TAG, "🔧 OCRCardRecognizer - No UI configuration provided, using all defaults")
            // Apply default values when no UI configuration is provided
            builder.successDelay(0.2f)
                .hardwareSupport(7)
                .faceDetection(false)
                .blurCoefficient(0.0f)
                .manualCapture(false)
                .isDocumentLivenessActive(false)
                .reviewScreenEnabled(true)
                .footerViewHidden(false)
                .placeholderTemplate(PlaceholderTemplate.defaultStyle)
                .iqaEnabled(true)
                .iqaSuccessAutoDismissDelay(-1)
                .requestTimeout(30)
        }
        
        return builder.build()
    }

    override fun frontSideImage(frontSideImage: String, croppedFrontSideImage: String) {
        Log.d(TAG, "OCRCardRecognizer - Front side image captured: ${frontSideImage.length} chars, cropped: ${croppedFrontSideImage.length} chars")
        
        // Store front side image for later processing (locally and in OCRModule like iOS)
        storedFrontSideImage = frontSideImage
        ocrModule?.storeDocumentScanImages(frontSideImage, "")
        
        // If we're scanning both sides, automatically start back side scanning
        if (originalDocumentSide.uppercase() in listOf("BOTH", "BOTHSIDES")) {
            Log.d(TAG, "OCRCardRecognizer - Starting back side scanning")
            
            activity.runOnUiThread {
                try {
                    // Create new CardRecognizer for back side with front side image
                    val backSideCardRecognizer = OCRCardRecognizer(
                        activity = activity,
                        serverURL = serverURL,
                        transactionID = transactionID,
                        documentType = documentType,
                        country = country,  // Pass country to back side
                        promise = promise,
                        originalDocumentSide = "BACK", // Mark as back side to avoid infinite loop
                        ocrModule = ocrModule,  // Pass OCRModule reference
                        uiConfiguration = uiConfiguration  // Pass UI configuration to back side
                    )
                    
                    // Set the stored front side image
                    backSideCardRecognizer.storedFrontSideImage = frontSideImage
                    
                    // Apply orientation from UI configuration (same as front side)
                    val cardOrientation = if (uiConfiguration?.get("orientation") == "vertical") true else false
                    
                    // Create CardFragment for back side scanning
                    val backSideCardFragment = CardFragment.newInstance(
                        Process.backSide,
                        cardOrientation, // cardOrientation: false = horizontal, true = vertical
                        backSideCardRecognizer
                    )
                    
                    // Replace current fragment with back side scanner
                    val fragmentManager = activity.supportFragmentManager
                    val transaction = fragmentManager.beginTransaction()
                    transaction.replace(android.R.id.content, backSideCardFragment)
                    transaction.addToBackStack(null)
                    transaction.commit()
                    
                    Log.d(TAG, "OCRCardRecognizer - Back side CardFragment added successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "OCRCardRecognizer - Error starting back side scanning: ${e.message}", e)
                    promise?.reject("OCR_ERROR", "Failed to start back side scanning: ${e.message}")
                }
            }
        } else {
            // For single side scanning, dismiss camera and resolve with success (like iOS pattern)
            Log.d(TAG, "OCRCardRecognizer - Document scan completed, images ready for performOCR")
            dismissCameraFragment()
            promise?.resolve(true)
        }
    }

    override fun backSideImage(backSideImage: String, croppedBackSideImage: String) {
        Log.d(TAG, "OCRCardRecognizer - Back side image captured: ${backSideImage.length} chars, cropped: ${croppedBackSideImage.length} chars")
        
        // Store both images in OCRModule (like iOS does)
        ocrModule?.storeDocumentScanImages(storedFrontSideImage ?: "", backSideImage)
        
        // For both sides scanning, dismiss camera and complete the scanning process successfully (like iOS pattern)
        Log.d(TAG, "OCRCardRecognizer - Document scan completed, images ready for performOCR")
        dismissCameraFragment()
        promise?.resolve(true)
    }

    override fun cardScanFinished() {
        Log.d(TAG, "OCRCardRecognizer - Card scan finished")
        // Called when scanning is complete - matches iOS delegate pattern
    }
    
    private fun dismissCameraFragment() {
        try {
            activity.runOnUiThread {
                val fragmentManager = activity.supportFragmentManager
                val fragments = fragmentManager.fragments
                for (fragment in fragments) {
                    if (fragment.javaClass.simpleName.contains("CardFragment") ||
                        fragment.javaClass.name.contains("CardFragment")) {
                        val transaction = fragmentManager.beginTransaction()
                        transaction.remove(fragment)
                        transaction.commitNowAllowingStateLoss()
                        break
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "OCRCardRecognizer - Error dismissing camera fragment: ${e.message}", e)
        }
    }

    override fun onResult(cardOCRMessage: CardOCRMessage?) {
        if (originalDocumentSide == "API_ONLY") {
            // This is from manual performOCR call - process the result
            Log.d(TAG, "OCRCardRecognizer - OCR API Success")
            
            if (cardOCRMessage == null) {
                promise?.reject("OCR_ERROR", "No OCR result received")
                return
            }
            
            try {
                val result = convertCardOCRMessageToWritableMap(cardOCRMessage)
                promise?.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "OCRCardRecognizer - Error converting OCR result: ${e.message}", e)
                promise?.reject("OCR_ERROR", "Error processing OCR result: ${e.message}")
            }
        } else {
            // This is from automatic camera scanning - ignore it
            Log.d(TAG, "OCRCardRecognizer - SDK Auto API call ignored (originalDocumentSide: $originalDocumentSide)")
            Log.d(TAG, "OCRCardRecognizer - Result received but not processing (message null: ${cardOCRMessage == null})")
        }
    }

    override fun onFailure(error: String?) {
        if (originalDocumentSide == "API_ONLY") {
            // This is from manual performOCR call - process the error
            Log.e(TAG, "OCRCardRecognizer - OCR API Error: $error")
            promise?.reject("OCR_ERROR", error ?: "OCR processing failed")
        } else {
            // This is from automatic camera scanning - dismiss camera and ignore error
            Log.d(TAG, "OCRCardRecognizer - SDK Auto API error ignored (originalDocumentSide: $originalDocumentSide)")
            Log.e(TAG, "OCRCardRecognizer - SDK Auto API error details: $error")
            dismissCameraFragment()
        }
    }

    override fun onPhotoTaken() {
        Log.d(TAG, "OCRCardRecognizer - Photo taken")
        // Called when a photo is captured - matches iOS delegate pattern
    }

    override fun didFinishOcrAndDocumentLivenessCheck(response: OCRAndDocumentLivenessResponse?) {
        Log.d(TAG, "OCRCardRecognizer - OCR and Document Liveness API Success")
        
        if (response == null) {
            promise?.reject("OCR_AND_LIVENESS_ERROR", "No document liveness response received")
            return
        }
        
        try {
            val result = convertOCRAndDocumentLivenessResponseToWritableMap(response)
            promise?.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "OCRCardRecognizer - Error converting liveness result: ${e.message}", e)
            promise?.reject("OCR_AND_LIVENESS_ERROR", "Error processing liveness result: ${e.message}")
        }
    }

    override fun onIqaResult(iqaResponse: IQAResponse, iqaFeedback: IQAFeedback) {
        Log.d(TAG, "OCRCardRecognizer - IQA Result: feedback=${iqaFeedback.name}, side=${iqaResponse.documentSide?.name}, qualified=${iqaResponse.isQualified}")
        try {
            val result = WritableNativeMap()
            result.putString("documentSide", jsDocumentSideValue(iqaResponse.documentSide))
            result.putString("feedback", jsIqaFeedbackValue(iqaFeedback))
            result.putBoolean("qualified", iqaResponse.isQualified ?: false)
            result.putString("displayMessage", iqaResponse.displayMessage ?: "")
            result.putString("rawMessage", iqaResponse.rawMessage ?: "")
            // 26.1.3: per-module IQA check results (e.g. photoCheatSatisfied, chipExistenceSatisfied)
            val checksMap = WritableNativeMap()
            iqaResponse.checks?.forEach { (checkType, value) ->
                if (value != null) {
                    checksMap.putBoolean(checkType.name, value)
                }
            }
            result.putMap("checks", checksMap)
            result.putDouble("timestamp", System.currentTimeMillis().toDouble())
            ocrModule?.emitIQAResult(result)
        } catch (e: Exception) {
            Log.e(TAG, "OCRCardRecognizer - Error emitting IQA result: ${e.message}", e)
        }
    }

    override fun onOCRDirectiveChanged(directive: OCRDirective) {
        Log.d(TAG, "OCRCardRecognizer - OCR Directive changed: ${directive.name}")
        ocrModule?.emitOCRDirectiveChanged(directive.name)
    }


    private fun convertCardOCRMessageToWritableMap(cardOCRMessage: CardOCRMessage): WritableMap {
        val result = WritableNativeMap()
        
        result.putBoolean("success", cardOCRMessage.getFailed() != true)
        result.putString("transactionID", transactionID)
        result.putDouble("timestamp", System.currentTimeMillis().toDouble())
        result.putString("documentType", documentType)
        
        // Basic information
        result.putString("faceImage", cardOCRMessage.getFcaseImg() ?: "")
        result.putString("name", cardOCRMessage.getName() ?: "")
        result.putString("surname", cardOCRMessage.getSurname() ?: "")
        result.putString("identityNo", cardOCRMessage.getIdentityNo() ?: "")
        result.putString("birthDate", cardOCRMessage.getBirthDate() ?: "")
        result.putString("gender", cardOCRMessage.getGender() ?: "")
        result.putString("nationality", cardOCRMessage.getNationality() ?: "")
        result.putString("expireDate", cardOCRMessage.getExpireDate() ?: "")
        result.putString("documentNumber", cardOCRMessage.getDocumentId() ?: "")
        result.putString("documentType", cardOCRMessage.getDocumentType() ?: "")
        result.putString("documentCountry", cardOCRMessage.getDocumentCountry() ?: "")
        result.putString("documentIssuer", cardOCRMessage.getDocumentIssuer() ?: "")
        result.putString("motherName", cardOCRMessage.getMotherName() ?: "")
        result.putString("fatherName", cardOCRMessage.getFatherName() ?: "")
        result.putString("dateOfIssue", cardOCRMessage.getDateOfIssue() ?: "")
        result.putString("mrzString", cardOCRMessage.getMrzString() ?: "")
        
        // Validation flags
        result.putString("ocrPhotoExists", cardOCRMessage.getOcrPhotoExists() ?: "false")
        result.putString("ocrSignatureExists", cardOCRMessage.getOcrSignatureExists() ?: "false")
        result.putString("ocrDocumentExpired", cardOCRMessage.getOcrDocumentExpired() ?: "false")
        result.putString("ocrIdValid", cardOCRMessage.getOcrIdValid() ?: "false")
        
        // Create extracted data object for compatibility with iOS
        val extractedData = WritableNativeMap()
        extractedData.putString("firstName", cardOCRMessage.getName() ?: "")
        extractedData.putString("lastName", cardOCRMessage.getSurname() ?: "")
        extractedData.putString("documentNumber", cardOCRMessage.getDocumentId() ?: "")
        extractedData.putString("identityNo", cardOCRMessage.getIdentityNo() ?: "")
        extractedData.putString("expiryDate", cardOCRMessage.getExpireDate() ?: "")
        extractedData.putString("birthDate", cardOCRMessage.getBirthDate() ?: "")
        extractedData.putString("nationality", cardOCRMessage.getNationality() ?: "")
        extractedData.putString("gender", cardOCRMessage.getGender() ?: "")
        extractedData.putString("documentIssuer", cardOCRMessage.getDocumentIssuer() ?: "")
        extractedData.putString("motherName", cardOCRMessage.getMotherName() ?: "")
        extractedData.putString("fatherName", cardOCRMessage.getFatherName() ?: "")
        extractedData.putBoolean("isDocumentExpired", cardOCRMessage.getOcrDocumentExpired() == "true")
        extractedData.putBoolean("isIDValid", cardOCRMessage.getOcrIdValid() == "true")
        extractedData.putBoolean("hasPhoto", cardOCRMessage.getOcrPhotoExists() == "true")
        extractedData.putBoolean("hasSignature", cardOCRMessage.getOcrSignatureExists() == "true")

        // 26.1.3: native-script name/gender fields (populated only for native-script documents)
        val idCardOCRResponse = cardOCRMessage.getIdCardOCRResponse()
        extractedData.putString("nativeFirstName", idCardOCRResponse?.getNativeFirstName() ?: "")
        extractedData.putString("nativeLastName", idCardOCRResponse?.getNativeLastName() ?: "")
        extractedData.putString("nativeGender", idCardOCRResponse?.getNativeGender() ?: "")

        cardOCRMessage.getFcaseImg()?.takeIf { it.isNotEmpty() }?.let {
            extractedData.putString("faceImage", it)
        }

        result.putMap("extractedData", extractedData)
        
        return result
    }

    private fun convertOCRAndDocumentLivenessResponseToWritableMap(response: OCRAndDocumentLivenessResponse): WritableMap {
        val result = WritableNativeMap()
        
        result.putBoolean("success", !response.isFailed())
        result.putString("transactionID", transactionID)
        result.putDouble("timestamp", System.currentTimeMillis().toDouble())
        
        // Add error information if available
        if (response.getErrorCode() != null) {
            result.putString("error", response.getErrorCode())
        }
        
        // Add OCR data if available
        if (response.getOcrData() != null) {
            val ocrData = convertCardOCRMessageToWritableMap(response.getOcrData())
            result.putMap("ocrData", ocrData)
        }
        
        // Add document liveness data (simplified for now)
        if (response.getDocumentLivenessDataFront() != null) {
            result.putDouble("frontSideProbability", 0.85) // Placeholder
        }
        
        if (response.getDocumentLivenessDataBack() != null) {
            result.putDouble("backSideProbability", 0.85) // Placeholder
        }
        
        return result
    }
}
