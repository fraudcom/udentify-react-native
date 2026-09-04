package com.ocrrnlibrary

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.BitmapFactory
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentTransaction
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import io.udentify.android.ocr.activities.CardFragment
import io.udentify.android.ocr.activities.CardRecognizerObject
import io.udentify.android.ocr.activities.DocumentLivenessListener
import io.udentify.android.ocr.activities.HologramFragment
import io.udentify.android.ocr.activities.DocumentType
import io.udentify.android.ocr.activities.IQAListener
import io.udentify.android.ocr.activities.Process
import io.udentify.android.ocr.model.IQAResponse
import io.udentify.android.ocr.model.OCRAndDocumentLivenessResponse
import kotlinx.coroutines.*
import java.io.ByteArrayOutputStream

class OCRModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "OCRModule"
        private const val TAKE_PHOTO_REQUEST_CODE = 9001
    }

    // Store captured images for performOCR (like iOS does)
    private var lastCapturedFrontImageBase64: String = ""
    private var lastCapturedBackImageBase64: String = ""
    private var currentServerURL: String? = null
    private var currentTransactionID: String? = null
    private var currentDocumentType: String? = null

    // Store UI configuration (like iOS does)
    private var uiConfiguration: Map<String, Any>? = null

    // Take photo promise
    private var takePhotoPromise: Promise? = null

    private val activityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode != TAKE_PHOTO_REQUEST_CODE) return

            val promise = takePhotoPromise ?: return
            takePhotoPromise = null

            if (resultCode != Activity.RESULT_OK) {
                promise.reject("TAKE_PHOTO_ERROR", reactApplicationContext.getString(R.string.ocr_error_photo_capture_cancelled))
                return
            }

            try {
                val bitmap = data?.extras?.get("data") as? Bitmap
                if (bitmap != null) {
                    val outputStream = ByteArrayOutputStream()
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
                    val base64 = Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
                    promise.resolve(base64)
                } else {
                    promise.reject("TAKE_PHOTO_ERROR", reactApplicationContext.getString(R.string.ocr_error_capture_failed))
                }
            } catch (e: Exception) {
                promise.reject("TAKE_PHOTO_ERROR", "Error processing captured image: ${e.message}")
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String {
        return "OCRModule"
    }
    
    @ReactMethod
    fun configureUISettings(
        uiConfig: ReadableMap,
        promise: Promise
    ) {
        try {
            Log.d(TAG, "🎨 OCRModule - configureUISettings called")
            Log.d(TAG, "🎨 OCRModule - Received config keys: ${uiConfig.entryIterator.asSequence().map { it.key }.toList()}")
            
            // Convert ReadableMap to Map<String, Any>
            val configMap = mutableMapOf<String, Any>()
            
            // Parse UI configuration parameters with detailed logging
            uiConfig.getString("backgroundColor")?.let { 
                configMap["backgroundColor"] = it 
                Log.d(TAG, "🎨 OCRModule - Added backgroundColor: $it")
            }
            
            uiConfig.getString("borderColor")?.let { 
                configMap["borderColor"] = it 
                Log.d(TAG, "🎨 OCRModule - Added borderColor: $it")
            }
            
            uiConfig.getString("placeholderTemplate")?.let { 
                configMap["placeholderTemplate"] = it 
                Log.d(TAG, "🎨 OCRModule - Added placeholderTemplate: $it")
            }
            
            uiConfig.getString("orientation")?.let { 
                configMap["orientation"] = it 
                Log.d(TAG, "🎨 OCRModule - Added orientation: $it")
            }
            
            if (uiConfig.hasKey("cornerRadius")) {
                val value = uiConfig.getInt("cornerRadius")
                configMap["cornerRadius"] = value
                Log.d(TAG, "🎨 OCRModule - Added cornerRadius: $value")
            }
            
            if (uiConfig.hasKey("detectionAccuracy")) {
                val value = uiConfig.getInt("detectionAccuracy")
                configMap["detectionAccuracy"] = value
                Log.d(TAG, "🎨 OCRModule - Added detectionAccuracy: $value")
            }
            
            if (uiConfig.hasKey("backButtonEnabled")) {
                val value = uiConfig.getBoolean("backButtonEnabled")
                configMap["backButtonEnabled"] = value
                Log.d(TAG, "🎨 OCRModule - Added backButtonEnabled: $value")
            }
            
            if (uiConfig.hasKey("reviewScreenEnabled")) {
                val value = uiConfig.getBoolean("reviewScreenEnabled")
                configMap["reviewScreenEnabled"] = value
                Log.d(TAG, "🎨 OCRModule - Added reviewScreenEnabled: $value")
            }

            if (uiConfig.hasKey("footerViewHidden")) {
                val value = uiConfig.getBoolean("footerViewHidden")
                configMap["footerViewHidden"] = value
                Log.d(TAG, "🎨 OCRModule - Added footerViewHidden: $value")
            }
            
            if (uiConfig.hasKey("blurCoefficient")) {
                val value = uiConfig.getDouble("blurCoefficient")
                configMap["blurCoefficient"] = value
                Log.d(TAG, "🎨 OCRModule - Added blurCoefficient: $value")
            }

            // 26.1.3: raw photo crop ratio (0.0-1.0). Applied to CardRecognizerCredentials in OCRCardRecognizer.
            if (uiConfig.hasKey("rawPhotoCropRatio")) {
                val value = uiConfig.getDouble("rawPhotoCropRatio")
                configMap["rawPhotoCropRatio"] = value
                Log.d(TAG, "🎨 OCRModule - Added rawPhotoCropRatio: $value")
            }

            // 26.1.3: hologram flash/bitrate configuration (applied in HologramRecognizer credentials)
            if (uiConfig.hasKey("noFlashDuration")) {
                configMap["noFlashDuration"] = uiConfig.getInt("noFlashDuration")
                Log.d(TAG, "🎨 OCRModule - Added noFlashDuration: ${configMap["noFlashDuration"]}")
            }
            if (uiConfig.hasKey("flashDuration")) {
                configMap["flashDuration"] = uiConfig.getInt("flashDuration")
                Log.d(TAG, "🎨 OCRModule - Added flashDuration: ${configMap["flashDuration"]}")
            }
            if (uiConfig.hasKey("totalDuration")) {
                configMap["totalDuration"] = uiConfig.getInt("totalDuration")
                Log.d(TAG, "🎨 OCRModule - Added totalDuration: ${configMap["totalDuration"]}")
            }
            if (uiConfig.hasKey("bitrate")) {
                configMap["bitrate"] = uiConfig.getDouble("bitrate")
                Log.d(TAG, "🎨 OCRModule - Added bitrate: ${configMap["bitrate"]}")
            }
            
            if (uiConfig.hasKey("requestTimeout")) {
                val value = uiConfig.getDouble("requestTimeout")
                configMap["requestTimeout"] = value
                Log.d(TAG, "🎨 OCRModule - Added requestTimeout: $value")
            }
            
            if (uiConfig.hasKey("manualCapture")) {
                val value = uiConfig.getBoolean("manualCapture")
                configMap["manualCapture"] = value
                Log.d(TAG, "🎨 OCRModule - Added manualCapture: $value")
            }
            
            if (uiConfig.hasKey("faceDetection")) {
                val value = uiConfig.getBoolean("faceDetection")
                configMap["faceDetection"] = value
                Log.d(TAG, "🎨 OCRModule - Added faceDetection: $value")
            }
            
            if (uiConfig.hasKey("isDocumentLivenessActive")) {
                val value = uiConfig.getBoolean("isDocumentLivenessActive")
                configMap["isDocumentLivenessActive"] = value
                Log.d(TAG, "🎨 OCRModule - Added isDocumentLivenessActive: $value")
            }
            
            if (uiConfig.hasKey("iqaEnabled")) {
                val value = uiConfig.getBoolean("iqaEnabled")
                configMap["iqaEnabled"] = value
                Log.d(TAG, "🎨 OCRModule - Added iqaEnabled: $value")
            }
            
            if (uiConfig.hasKey("isIQAServiceEnabled")) {
                val value = uiConfig.getBoolean("isIQAServiceEnabled")
                configMap["isIQAServiceEnabled"] = value
                Log.d(TAG, "🎨 OCRModule - Added isIQAServiceEnabled: $value")
            }
            
            if (uiConfig.hasKey("iqaSuccessAutoDismissDelay")) {
                val value = uiConfig.getInt("iqaSuccessAutoDismissDelay")
                configMap["iqaSuccessAutoDismissDelay"] = value
                Log.d(TAG, "🎨 OCRModule - Added iqaSuccessAutoDismissDelay: $value")
            }
            
            // Store the UI configuration
            this.uiConfiguration = configMap.toMap()
            
            // Apply Android-specific UI configurations if possible
            applyAndroidUIConfiguration(configMap)
            
            Log.d(TAG, "🎨 OCRModule - ✅ Final UI Configuration stored: $configMap")
            Log.d(TAG, "🎨 OCRModule - ✅ UI Configuration size: ${configMap.size} parameters")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "🎨 OCRModule - ❌ Error configuring UI settings: ${e.message}", e)
            promise.reject("UI_CONFIG_ERROR", "Failed to configure UI settings: ${e.message}")
        }
    }
    
    @ReactMethod
    fun startOCRScanning(
        serverURL: String,
        transactionID: String,
        documentType: String,
        documentSide: String,
        country: String,
        promise: Promise
    ) {
        Log.d(TAG, "OCRModule - Starting OCR scanning for $documentType")
        Log.d(TAG, "OCRModule - Server URL: $serverURL")
        Log.d(TAG, "OCRModule - Transaction ID: $transactionID")
        Log.d(TAG, "OCRModule - Document Type: $documentType")
        Log.d(TAG, "OCRModule - Document Side: $documentSide")
        Log.d(TAG, "OCRModule - Country: $country")
        
        val currentActivity = getCurrentActivity()
        if (currentActivity !is AppCompatActivity) {
            promise.reject("OCR_ERROR", reactApplicationContext.getString(R.string.ocr_error_no_activity))
            return
        }
        
        // Check camera permission
        if (ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.CAMERA) 
            != PackageManager.PERMISSION_GRANTED) {
            promise.reject("OCR_ERROR", reactApplicationContext.getString(R.string.ocr_permission_camera_required))
            return
        }
        
        // Check phone state permission (required by Udentify SDK)
        if (ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.READ_PHONE_STATE) 
            != PackageManager.PERMISSION_GRANTED) {
            promise.reject("OCR_ERROR", reactApplicationContext.getString(R.string.ocr_permission_phone_state_required))
            return
        }
        
        try {
            // Store parameters for later use (like iOS does)
            currentServerURL = serverURL
            currentTransactionID = transactionID
            currentDocumentType = documentType
            
            // Clear any previously stored images
            lastCapturedFrontImageBase64 = ""
            lastCapturedBackImageBase64 = ""
            
            // Create CardRecognizer implementation that stores images
            Log.d(TAG, "🚀 OCRModule - Creating OCRCardRecognizer with UI config: ${uiConfiguration != null}")
            if (uiConfiguration != null) {
                Log.d(TAG, "🚀 OCRModule - UI config has ${uiConfiguration!!.size} parameters: ${uiConfiguration!!.keys}")
            }
            
            val cardRecognizer = OCRCardRecognizer(
                activity = currentActivity,
                serverURL = serverURL,
                transactionID = transactionID,
                documentType = documentType,
                country = country,
                promise = promise,
                originalDocumentSide = documentSide,
                ocrModule = this,  // Pass reference to store images
                uiConfiguration = uiConfiguration  // Pass UI configuration
            )
            
            // Determine which side to scan
            val process = when (documentSide.uppercase()) {
                "FRONT", "FRONTSIDE" -> Process.frontSide
                "BACK", "BACKSIDE" -> Process.backSide
                "BOTH", "BOTHSIDES" -> Process.frontSide // Start with front side for both sides scanning
                else -> Process.frontSide // Default to front side, will handle back side in callback
            }
            
            // Create CardFragment using Udentify SDK
            // Apply orientation from UI configuration
            val cardOrientation = if (uiConfiguration?.get("orientation") == "vertical") true else false
            Log.d(TAG, "🚀 OCRModule - Applying card orientation: $cardOrientation (${uiConfiguration?.get("orientation")})")
            
            val cardFragment = CardFragment.newInstance(
                process,
                cardOrientation, // cardOrientation: false = horizontal, true = vertical
                cardRecognizer
            )
            
            // Add fragment to current activity
            currentActivity.runOnUiThread {
                try {
                    val fragmentManager = currentActivity.supportFragmentManager
                    val transaction: FragmentTransaction = fragmentManager.beginTransaction()
                    transaction.add(android.R.id.content, cardFragment)
                    transaction.addToBackStack(null)
                    transaction.commit()

                    Log.d(TAG, "OCRModule - Udentify OCR CardFragment added successfully")

                } catch (e: Exception) {
                    Log.e(TAG, "OCRModule - Error adding CardFragment: ${e.message}", e)
                    promise.reject("OCR_ERROR", "Failed to instantiate OCR camera controller")
                }
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "OCRModule - Error starting OCR scanning: ${e.message}", e)
            promise.reject("OCR_ERROR", "Failed to start OCR scanning: ${e.message}")
        }
    }
    
    @ReactMethod
    fun performOCR(
        serverURL: String,
        transactionID: String,
        frontSideImage: String,
        backSideImage: String,
        documentType: String,
        country: String,
        promise: Promise
    ) {
        Log.d(TAG, "OCRModule - Performing OCR with transaction ID: $transactionID")
        Log.d(TAG, "OCRModule - Country: $country")
        
        // Validate input parameters (like iOS does)
        if (serverURL.isEmpty()) {
            Log.e(TAG, "OCRModule - Error: Server URL is empty")
            promise.reject("OCR_ERROR", "Server URL cannot be empty")
            return
        }
        
        if (transactionID.isEmpty()) {
            Log.e(TAG, "OCRModule - Error: Transaction ID is empty")
            promise.reject("OCR_ERROR", "Transaction ID cannot be empty")
            return
        }
        
        val currentActivity = getCurrentActivity()
        if (currentActivity !is AppCompatActivity) {
            promise.reject("OCR_ERROR", "Current activity is not an AppCompatActivity")
            return
        }
        
        try {
            // Use stored images if provided images are empty (like iOS does)
            var frontImage = frontSideImage
            var backImage = backSideImage
            
            if (frontSideImage.isEmpty() && backSideImage.isEmpty()) {
                Log.d(TAG, "OCRModule - Using stored images from document scan")
                frontImage = lastCapturedFrontImageBase64
                backImage = lastCapturedBackImageBase64
                
                if (frontImage.isEmpty() && backImage.isEmpty()) {
                    promise.reject("OCR_ERROR", reactApplicationContext.getString(R.string.ocr_error_no_images))
                    return
                }
            }
            

            
            // Create CardRecognizer for API-only processing
            val cardRecognizer = OCRCardRecognizer(
                activity = currentActivity,
                serverURL = serverURL,
                transactionID = transactionID,
                documentType = documentType,
                country = country,
                promise = promise,
                originalDocumentSide = "API_ONLY",
                ocrModule = null,
                uiConfiguration = uiConfiguration  // Pass UI configuration
            )
            
            // Create CardRecognizerObject for processing provided images
            val cardRecognizerObject = CardRecognizerObject(
                cardRecognizer,
                currentActivity,
                frontImage,
                backImage
            )
            
            // Process OCR with provided images using Udentify SDK
            cardRecognizerObject.processOCR()
            
        } catch (e: Exception) {
            Log.e(TAG, "OCRModule - Error performing OCR: ${e.message}", e)
            promise.reject("OCR_ERROR", "OCR processing failed: ${e.message}")
        }
    }
    
    @ReactMethod
    fun performDocumentLiveness(
        serverURL: String,
        transactionID: String,
        frontSideImage: String,
        backSideImage: String,
        promise: Promise
    ) {
        Log.d(TAG, "OCRModule - Performing Document Liveness Check for transaction: $transactionID")
        
        val currentActivity = getCurrentActivity()
        if (currentActivity !is AppCompatActivity) {
            promise.reject("LIVENESS_ERROR", "Current activity is not an AppCompatActivity")
            return
        }
        
        try {
            // Use stored images if provided images are empty (like iOS does)
            var frontImage = frontSideImage
            var backImage = backSideImage
            
            if (frontSideImage.isEmpty() && backSideImage.isEmpty()) {
                frontImage = lastCapturedFrontImageBase64
                backImage = lastCapturedBackImageBase64
                
                if (frontImage.isEmpty() && backImage.isEmpty()) {
                    promise.reject("LIVENESS_ERROR", "Document liveness requires at least one valid base64 image. Both front and back images are empty, and no stored images available.")
                    return
                }
            }
            
            // Validate that at least one image is available
            if (frontImage.isEmpty() && backImage.isEmpty()) {
                promise.reject("LIVENESS_ERROR", "Failed to convert base64 strings to valid images for document liveness check.")
                return
            }
            

            
            // Create CardRecognizerObject for document liveness check (using single activity constructor)
            val cardRecognizerObject = CardRecognizerObject(
                currentActivity
            )
            
            // Perform document liveness check using Udentify SDK
            cardRecognizerObject.performDocumentLiveness(
                serverURL,
                transactionID,
                frontImage,
                backImage,
                object : DocumentLivenessListener {
                    override fun successResponse(response: OCRAndDocumentLivenessResponse?) {
                        Log.d(TAG, "OCRModule - Document Liveness API Success")
                        if (response != null) {
                            try {
                                val result = convertDocumentLivenessResponseToWritableMap(response, transactionID)
                                promise.resolve(result)
                            } catch (e: Exception) {
                                Log.e(TAG, "OCRModule - Error converting liveness response: ${e.message}", e)
                                promise.reject("LIVENESS_ERROR", "Error processing liveness response: ${e.message}")
                            }
                        } else {
                            promise.reject("LIVENESS_ERROR", reactApplicationContext.getString(R.string.ocr_error_no_liveness_response))
                        }
                    }
                    
                    override fun errorResponse(error: String?) {
                        Log.e(TAG, "OCRModule - Document Liveness API Error: $error")
                        promise.reject("LIVENESS_ERROR", error ?: reactApplicationContext.getString(R.string.ocr_error_liveness_check_failed))
                    }
                }
            )
            
        } catch (e: Exception) {
            Log.e(TAG, "OCRModule - Error performing document liveness: ${e.message}", e)
            promise.reject("LIVENESS_ERROR", "Document liveness check failed: ${e.message}")
        }
    }
    
    @ReactMethod
    fun performOCRAndDocumentLiveness(
        serverURL: String,
        transactionID: String,
        frontSideImage: String,
        backSideImage: String,
        documentType: String,
        country: String,
        promise: Promise
    ) {
        Log.d(TAG, "OCRModule - Performing OCR and Document Liveness Check for transaction: $transactionID")
        Log.d(TAG, "OCRModule - Country: $country")
        
        // Validate input parameters (like iOS does)
        if (serverURL.isEmpty()) {
            Log.e(TAG, "OCRModule - Error: Server URL is empty")
            promise.reject("OCR_AND_LIVENESS_ERROR", "Server URL cannot be empty")
            return
        }
        
        if (transactionID.isEmpty()) {
            Log.e(TAG, "OCRModule - Error: Transaction ID is empty")
            promise.reject("OCR_AND_LIVENESS_ERROR", "Transaction ID cannot be empty")
            return
        }
        
        if (documentType.isEmpty()) {
            Log.e(TAG, "OCRModule - Error: Document type is empty")
            promise.reject("OCR_AND_LIVENESS_ERROR", "Document type cannot be empty")
            return
        }
        
        val currentActivity = getCurrentActivity()
        if (currentActivity !is AppCompatActivity) {
            promise.reject("OCR_AND_LIVENESS_ERROR", "Current activity is not an AppCompatActivity")
            return
        }
        
        try {
            // Use stored images if provided images are empty (like iOS does)
            var frontImage = frontSideImage
            var backImage = backSideImage
            
            if (frontSideImage.isEmpty() && backSideImage.isEmpty()) {
                frontImage = lastCapturedFrontImageBase64
                backImage = lastCapturedBackImageBase64
                
                if (frontImage.isEmpty() && backImage.isEmpty()) {
                    promise.reject("OCR_AND_LIVENESS_ERROR", "OCR and document liveness requires at least one valid base64 image. Both front and back images are empty, and no stored images available.")
                    return
                }
            }
            
            // Validate that at least one image is available
            if (frontImage.isEmpty() && backImage.isEmpty()) {
                promise.reject("OCR_AND_LIVENESS_ERROR", "Failed to convert base64 strings to valid images for OCR and document liveness check.")
                return
            }
            

            
            // Create CardRecognizer for API-only processing with both OCR and liveness
            val cardRecognizer = OCRCardRecognizer(
                activity = currentActivity,
                serverURL = serverURL,
                transactionID = transactionID,
                documentType = documentType,
                country = country,
                promise = promise,
                originalDocumentSide = "API_ONLY",
                ocrModule = null,
                uiConfiguration = uiConfiguration  // Pass UI configuration
            )
            
            // Create CardRecognizerObject for processing provided images
            val cardRecognizerObject = CardRecognizerObject(
                cardRecognizer,
                currentActivity,
                frontImage,
                backImage
            )
            
            // Must call the dedicated performOCRAndDocumentLiveness() overload, not processOCR() —
            // decompiling the AAR confirms processOCR() never hits the /ocr/ocrAndLiveness endpoint
            // or invokes didFinishOcrAndDocumentLivenessCheck regardless of the credentials'
            // isDocumentLivenessActive flag; the zero-arg performOCRAndDocumentLiveness() overload
            // is bytecode-identical to processOCR() plus setting the internal liveness flag before
            // the network call, reusing the same CardRecognizer callback wired up above.
            cardRecognizerObject.performOCRAndDocumentLiveness()
            
        } catch (e: Exception) {
            Log.e(TAG, "OCRModule - Error performing OCR and document liveness: ${e.message}", e)
            promise.reject("OCR_AND_LIVENESS_ERROR", "OCR and document liveness check failed: ${e.message}")
        }
    }
    
    @ReactMethod
    fun startHologramCamera(
        serverURL: String,
        transactionID: String,
        promise: Promise
    ) {
        Log.e(TAG, "🚀🚀🚀 HOLOGRAM CAMERA STARTING 🚀🚀🚀")
        Log.d(TAG, "OCRModule - Starting Hologram Camera for transaction: $transactionID")
        
        val currentActivity = getCurrentActivity()
        if (currentActivity !is AppCompatActivity) {
            promise.reject("HOLOGRAM_ERROR", reactApplicationContext.getString(R.string.ocr_hologram_error_no_activity))
            return
        }
        
        // Check camera permission
        if (ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.CAMERA) 
            != PackageManager.PERMISSION_GRANTED) {
            promise.reject("HOLOGRAM_ERROR", reactApplicationContext.getString(R.string.ocr_hologram_permission_camera_required))
            return
        }
        
        // Check phone state permission (required by Udentify SDK)
        if (ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.READ_PHONE_STATE) 
            != PackageManager.PERMISSION_GRANTED) {
            promise.reject("HOLOGRAM_ERROR", reactApplicationContext.getString(R.string.ocr_permission_phone_state_required))
            return
        }
        
        try {
            // Store completion and parameters for later use (like iOS does)
            currentServerURL = serverURL
            currentTransactionID = transactionID
            
            // Create HologramRecognizer implementation
            val hologramRecognizer = HologramRecognizer(
                activity = currentActivity,
                serverURL = serverURL,
                transactionID = transactionID,
                promise = promise,
                ocrModule = this,  // Pass reference for event emission
                uiConfiguration = uiConfiguration  // 26.1.3: hologram flash/bitrate config
            )
            
            // Create HologramFragment using Udentify SDK
            // newInstance takes (cardOrientation: Boolean, hologramStages: HologramStages)
            val hologramFragment = HologramFragment.newInstance(
                false, // cardOrientation: false = horizontal, true = vertical
                hologramRecognizer
            )
            
            // Add fragment to current activity
            currentActivity.runOnUiThread {
                try {
                    val fragmentManager = currentActivity.supportFragmentManager
                    val transaction: FragmentTransaction = fragmentManager.beginTransaction()
                    transaction.add(android.R.id.content, hologramFragment)
                    transaction.addToBackStack(null)
                    transaction.commit()
                    
                    Log.d(TAG, "OCRModule - Udentify HologramFragment added successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "OCRModule - Error adding HologramFragment: ${e.message}", e)
                    promise.reject("HOLOGRAM_ERROR", "Failed to instantiate Hologram camera controller")
                }
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "OCRModule - Error starting hologram camera: ${e.message}", e)
            promise.reject("HOLOGRAM_ERROR", "Failed to start hologram camera: ${e.message}")
        }
    }
    
    @ReactMethod
    fun performHologramCheck(
        serverURL: String,
        transactionID: String,
        videoUrls: ReadableArray,
        promise: Promise
    ) {
        Log.d(TAG, "OCRModule - Performing Hologram Check with transaction ID: $transactionID")
        
        try {
            // Convert ReadableArray to List<String>
            val videoUrlList = mutableListOf<String>()
            for (i in 0 until videoUrls.size()) {
                videoUrlList.add(videoUrls.getString(i) ?: "")
            }
            
            if (videoUrlList.isEmpty()) {
                promise.reject("INVALID_PARAMS", "No video URLs provided for hologram check")
                return
            }
            
            // Note: For Android, the Udentify SDK typically handles hologram API calls
            // automatically through the HologramRecognizer callbacks when hologram recording
            // is completed. This method serves as a manual trigger if needed.
            
            // In a typical flow, the hologram result would already be received through
            // the HologramRecognizer.hologramResult() callback after video recording.
            // This method can be used for cases where manual API calls are needed.
            
            Log.w(TAG, "Manual hologram check not supported in current Android SDK version")
            Log.w(TAG, "Hologram results are automatically provided through HologramRecognizer callbacks")
            
            // Return a response indicating that hologram check should be handled through callbacks
            val result = WritableNativeMap()
            result.putBoolean("success", false)
            result.putString("message", "Android hologram check is handled automatically through camera callbacks")
            result.putString("transactionID", transactionID)
            result.putDouble("timestamp", System.currentTimeMillis().toDouble())
            
            promise.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error in performHologramCheck: ${e.message}", e)
            promise.reject("HOLOGRAM_ERROR", "Failed to perform hologram check: ${e.message}")
        }
    }
    
    @ReactMethod
    fun performIQA(
        serverURL: String,
        transactionID: String,
        imageBase64: String,
        documentType: String,
        documentSide: String,
        country: String,
        promise: Promise
    ) {
        Log.d(TAG, "OCRModule - performIQA called for transaction: $transactionID")

        try {
            val activity = currentActivity as? AppCompatActivity
            if (activity == null) {
                promise.reject("IQA_ERROR", "Activity not available")
                return
            }

            val ocrDocumentType = when (documentType.uppercase()) {
                "ID_CARD" -> DocumentType.OCR_ID_UPLOAD
                "PASSPORT" -> DocumentType.OCR_PASSPORT_UPLOAD
                "DRIVER_LICENSE" -> DocumentType.OCR_DRIVER_LICENCE_UPLOAD
                else -> DocumentType.OCR_ID_UPLOAD
            }

            val ocrDocumentSide = when (documentSide.uppercase()) {
                "FRONT", "FRONTSIDE" -> Process.frontSide
                "BACK", "BACKSIDE" -> Process.backSide
                else -> Process.frontSide
            }

            val cardRecognizerObject = CardRecognizerObject(activity)

            activity.runOnUiThread {
                cardRecognizerObject.performIQA(
                    serverURL,
                    transactionID,
                    imageBase64,
                    country,
                    ocrDocumentType,
                    ocrDocumentSide,
                    object : IQAListener {
                        override fun successResponse(iqaResponse: IQAResponse) {
                            Log.d(TAG, "OCRModule - performIQA success: qualified=${iqaResponse.isQualified}")
                            val result = WritableNativeMap()
                            result.putBoolean("qualified", iqaResponse.isQualified)
                            result.putString("displayMessage", iqaResponse.displayMessage ?: "")
                            result.putString("rawMessage", iqaResponse.rawMessage ?: "")
                            result.putString("documentSide", jsDocumentSideValue(iqaResponse.documentSide))
                            result.putDouble("timestamp", System.currentTimeMillis().toDouble())
                            promise.resolve(result)
                        }

                        override fun errorResponse(error: String) {
                            Log.e(TAG, "OCRModule - performIQA error: $error")
                            promise.reject("IQA_ERROR", error)
                        }
                    }
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "OCRModule - performIQA exception: ${e.message}", e)
            promise.reject("IQA_EXCEPTION", "Failed to perform IQA: ${e.message}")
        }
    }

    @ReactMethod
    fun takePhoto(promise: Promise) {
        Log.d(TAG, "OCRModule - takePhoto called")
        try {
            val activity = currentActivity
            if (activity == null) {
                promise.reject("TAKE_PHOTO_ERROR", "Activity not available")
                return
            }

            takePhotoPromise = promise

            val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            if (takePictureIntent.resolveActivity(activity.packageManager) != null) {
                activity.startActivityForResult(takePictureIntent, TAKE_PHOTO_REQUEST_CODE)
            } else {
                takePhotoPromise = null
                promise.reject("TAKE_PHOTO_ERROR", reactApplicationContext.getString(R.string.ocr_error_camera_unavailable))
            }
        } catch (e: Exception) {
            takePhotoPromise = null
            promise.reject("TAKE_PHOTO_ERROR", "Failed to open camera: ${e.message}")
        }
    }

    private fun convertDocumentLivenessResponseToWritableMap(
        response: OCRAndDocumentLivenessResponse,
        transactionID: String
    ): WritableMap {
        val result = WritableNativeMap()
        
        result.putBoolean("success", !response.isFailed)
        result.putString("transactionID", transactionID)
        result.putDouble("timestamp", System.currentTimeMillis().toDouble())
        
        // Add error information if available
        if (response.errorCode != null) {
            result.putString("error", response.errorCode)
        }
        
        // Add document liveness data - parse COMPLETE response using helper function
        if (response.documentLivenessDataFront != null) {
            try {
                val frontResult = parseDocumentLivenessData(response.documentLivenessDataFront, "front")
                val probability = frontResult.getDouble("aggregateDocumentLivenessProbability")
                result.putMap("frontDocumentLivenessData", frontResult)
                result.putDouble("frontSideProbability", probability) // backward compatibility
                Log.d(TAG, "OCRModule - Front document liveness data parsed successfully")
            } catch (e: Exception) {
                Log.e(TAG, "OCRModule - Error parsing front document liveness data: ${e.message}")
                result.putDouble("frontSideProbability", 0.85)
            }
        }
        
        if (response.documentLivenessDataBack != null) {
            try {
                val backResult = parseDocumentLivenessData(response.documentLivenessDataBack, "back")
                val probability = backResult.getDouble("aggregateDocumentLivenessProbability")
                result.putMap("backDocumentLivenessData", backResult)
                result.putDouble("backSideProbability", probability) // backward compatibility
                Log.d(TAG, "OCRModule - Back document liveness data parsed successfully")
            } catch (e: Exception) {
                Log.e(TAG, "OCRModule - Error parsing back document liveness data: ${e.message}")
                result.putDouble("backSideProbability", 0.85)
            }
        }
        
        // Add OCR data if available
        if (response.ocrData != null) {
            // OCR data will be handled by the CardRecognizer callback
            Log.d(TAG, "OCR data is available in liveness response")
        }
        
        return result
    }
    
    // Method to store captured images (like iOS does)
    fun storeDocumentScanImages(frontSideBase64: String, backSideBase64: String) {
        lastCapturedFrontImageBase64 = frontSideBase64
        lastCapturedBackImageBase64 = backSideBase64
        
        Log.d(TAG, "OCRModule - Document scan completed, images stored for performOCR")
    }
    
    // Method to get stored images for debugging (like iOS diagnostics)
    fun getStoredImages(): Pair<String, String> {
        return Pair(lastCapturedFrontImageBase64, lastCapturedBackImageBase64)
    }
    
    // Method to clear stored images
    fun clearStoredImages() {
        lastCapturedFrontImageBase64 = ""
        lastCapturedBackImageBase64 = ""
        Log.d(TAG, "OCRModule - Cleared stored images")
    }
    
    // Event emission methods for React Native communication
    fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "OCRModule - Error sending event $eventName: ${e.message}", e)
        }
    }
    
    fun emitHologramComplete(result: WritableMap) {
        Log.d(TAG, "OCRModule - Emitting onHologramComplete event")
        sendEvent("onHologramComplete", result)
    }
    
    fun emitHologramVideoRecorded(videoUrls: List<String>) {
        Log.d(TAG, "OCRModule - Emitting onHologramVideoRecorded event")
        val params = WritableNativeMap()
        val videoUrlsArray = com.facebook.react.bridge.Arguments.createArray()
        for (url in videoUrls) {
            videoUrlsArray.pushString(url)
        }
        params.putArray("videoUrls", videoUrlsArray)
        sendEvent("onHologramVideoRecorded", params)
    }
    
    fun emitHologramError(error: String) {
        Log.d(TAG, "OCRModule - Emitting onHologramError event")
        val params = WritableNativeMap()
        params.putString("message", error)
        sendEvent("onHologramError", params)
    }
    
    fun emitOCRComplete(result: WritableMap) {
        Log.d(TAG, "OCRModule - Emitting onOCRComplete event")
        sendEvent("onOCRComplete", result)
    }
    
    fun emitOCRError(error: String) {
        Log.d(TAG, "OCRModule - Emitting onOCRError event")
        val params = WritableNativeMap()
        params.putString("message", error)
        sendEvent("onOCRError", params)
    }

    fun emitIQAResult(result: WritableMap) {
        Log.d(TAG, "OCRModule - Emitting onIQAResult event")
        sendEvent("onIQAResult", result)
    }

    fun emitOCRDirectiveChanged(directive: String) {
        Log.d(TAG, "OCRModule - Emitting onOCRDirectiveChanged event")
        val params = WritableNativeMap()
        params.putString("directive", directive)
        params.putDouble("timestamp", System.currentTimeMillis().toDouble())
        sendEvent("onOCRDirectiveChanged", params)
    }

    fun emitHologramDirectiveChanged(directive: String) {
        Log.d(TAG, "OCRModule - Emitting onHologramDirectiveChanged event")
        val params = WritableNativeMap()
        params.putString("directive", directive)
        params.putDouble("timestamp", System.currentTimeMillis().toDouble())
        sendEvent("onHologramDirectiveChanged", params)
    }

    private fun parseColorString(colorString: String): Int? {
        return try {
            when (colorString.lowercase()) {
                "purple" -> Color.parseColor("#800080")
                "blue" -> Color.BLUE
                "green" -> Color.GREEN
                "red" -> Color.RED
                "black" -> Color.BLACK
                "white" -> Color.WHITE
                "gray", "grey" -> Color.GRAY
                "clear" -> Color.TRANSPARENT
                else -> if (colorString.startsWith("#")) Color.parseColor(colorString) else null
            }
        } catch (e: Exception) {
            Log.e(TAG, "OCRModule - Failed to parse color: $colorString")
            null
        }
    }

    // Method to apply Android-specific UI configuration
    private fun applyAndroidUIConfiguration(configMap: Map<String, Any>) {
        try {
            Log.d(TAG, "🎨 OCRModule - Applying Android-specific UI configuration")
            
            // Note: Android UI customization is primarily handled through:
            // 1. CardRecognizerCredentials parameters (behavior settings) - handled in OCRCardRecognizer
            // 2. Static resource overrides (colors, strings, styles) - requires app-level resources
            // 3. Fragment parameters (orientation) - handled in CardFragment.newInstance
            
            // For colors and visual styling, Android requires resource overrides
            // which can't be applied dynamically. These would need to be set in the app's
            // res/values/colors.xml, res/values/strings.xml, etc.
            
            configMap["backgroundColor"]?.let { color ->
                Log.d(TAG, "🎨 OCRModule - Note: backgroundColor '$color' requires app-level resource override")
                Log.d(TAG, "🎨 OCRModule - Add <color name=\"udentify_ocr_card_mask_view_background_color\">$color</color> to your app's colors.xml")
            }
            
            configMap["borderColor"]?.let { color ->
                Log.d(TAG, "🎨 OCRModule - Note: borderColor '$color' requires app-level resource override")
                Log.d(TAG, "🎨 OCRModule - Add <color name=\"udentify_ocr_card_mask_view_stroke_color\">$color</color> to your app's colors.xml")
            }
            
            configMap["cornerRadius"]?.let { radius ->
                Log.d(TAG, "🎨 OCRModule - Note: cornerRadius '$radius' requires app-level resource override")
                Log.d(TAG, "🎨 OCRModule - Add <dimen name=\"udentify_ocr_footer_btn_border_corner_radius\">${radius}dp</dimen> to your app's dimens.xml")
            }
            
            Log.d(TAG, "🎨 OCRModule - ✅ Android UI configuration guidance provided in logs")
            
        } catch (e: Exception) {
            Log.e(TAG, "🎨 OCRModule - Error applying Android UI configuration: ${e.message}", e)
        }
    }
    
    /**
     * OCRModule - Helper function to parse document liveness data using reflection
     * This avoids code duplication between front and back side parsing
     */
    private fun parseDocumentLivenessData(documentData: Any, side: String): WritableMap {
        val result = WritableNativeMap()
        val dataClass = documentData.javaClass
        
        // Parse aggregateDocumentLivenessProbability
        val aggregateMethod = dataClass.methods.find { it.name == "getAggregateDocumentLivenessProbability" }
        if (aggregateMethod != null) {
            val aggregateValue = aggregateMethod.invoke(documentData) as? String
            val probability = aggregateValue?.toDoubleOrNull() ?: 0.85
            result.putDouble("aggregateDocumentLivenessProbability", probability)
        } else {
            result.putDouble("aggregateDocumentLivenessProbability", 0.85)
        }
        
        // Parse pipelines data
        val pipelinesMethod = dataClass.methods.find { it.name == "getPipelines" }
        if (pipelinesMethod != null) {
            val pipelinesData = pipelinesMethod.invoke(documentData)
            if (pipelinesData != null) {
                val pipelineResult = WritableNativeMap()
                val pipelineClass = pipelinesData.javaClass
                
                // Get name
                val nameMethod = pipelineClass.methods.find { it.name == "getName" }
                if (nameMethod != null) {
                    val nameValue = nameMethod.invoke(pipelinesData) as? String
                    pipelineResult.putString("name", nameValue)
                }
                
                // Get calibration
                val calibrationMethod = pipelineClass.methods.find { it.name == "getCalibration" }
                if (calibrationMethod != null) {
                    val calibrationValue = calibrationMethod.invoke(pipelinesData) as? String
                    pipelineResult.putString("calibration", calibrationValue)
                }
                
                // Get documentLivenessScore
                val scoreMethod = pipelineClass.methods.find { it.name == "getDocumentLivenessScore" }
                if (scoreMethod != null) {
                    val scoreValue = scoreMethod.invoke(pipelinesData) as? String
                    pipelineResult.putString("documentLivenessScore", scoreValue)
                }
                
                // Get documentLivenessProbability
                val probMethod = pipelineClass.methods.find { it.name == "getDocumentLivenessProbability" }
                if (probMethod != null) {
                    val probValue = probMethod.invoke(pipelinesData) as? String
                    pipelineResult.putString("documentLivenessProbability", probValue)
                }
                
                // Get documentStatusCode
                val statusMethod = pipelineClass.methods.find { it.name == "getDocumentStatusCode" }
                if (statusMethod != null) {
                    val statusValue = statusMethod.invoke(pipelinesData) as? String
                    pipelineResult.putString("documentStatusCode", statusValue)
                }
                
                result.putMap("pipelines", pipelineResult)
            }
        }
        
        // Parse aggregateDocumentImageQualityWarnings
        val warningsMethod = dataClass.methods.find { it.name == "getAggregateDocumentImageQualityWarnings" }
        if (warningsMethod != null) {
            val warningsValue = warningsMethod.invoke(documentData) as? String
            result.putString("aggregateDocumentImageQualityWarnings", warningsValue)
        }
        
        Log.d(TAG, "OCRModule - Document liveness data parsed for $side side")
        return result
    }
}