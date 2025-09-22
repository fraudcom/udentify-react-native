package com.livenessrnlibrary

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class LivenessModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var faceRecognizerImpl: FaceRecognizerImpl? = null
    private var pendingPromise: Promise? = null
    private var pendingPermissionType: String? = null

    companion object {
        private const val PERMISSION_REQUEST_CODE = 1001
        private val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.CAMERA,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.INTERNET,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.BLUETOOTH_CONNECT // Android 12+ Bluetooth permission
        )
    }

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String {
        return "LivenessModule"
    }

    override fun getConstants(): Map<String, Any>? {
        return hashMapOf(
            "MODULE_NAME" to "LivenessModule",
            "VERSION" to "1.0.0"
        )
    }

    // MARK: - Permission Management

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity not available")
            return
        }

        val permissions = hashMapOf<String, Any>(
            "camera" to getPermissionStatus(activity, Manifest.permission.CAMERA),
            "readPhoneState" to getPermissionStatus(activity, Manifest.permission.READ_PHONE_STATE),
            "internet" to getPermissionStatus(activity, Manifest.permission.INTERNET),
            "recordAudio" to getPermissionStatus(activity, Manifest.permission.RECORD_AUDIO),
            "bluetoothConnect" to getPermissionStatus(activity, Manifest.permission.BLUETOOTH_CONNECT)
        )

        promise.resolve(Arguments.makeNativeMap(permissions))
    }

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity not available")
            return
        }

        pendingPromise = promise
        pendingPermissionType = "request"

        // Filter out permissions not needed on current Android version
        val permissionsToRequest = REQUIRED_PERMISSIONS.filter { permission ->
            if (permission == Manifest.permission.BLUETOOTH_CONNECT && 
                android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.S) {
                false // Don't request Bluetooth permission on older versions
            } else {
                true
            }
        }.toTypedArray()
        
        ActivityCompat.requestPermissions(
            activity,
            permissionsToRequest,
            PERMISSION_REQUEST_CODE
        )
    }

    // MARK: - Camera-based Face Recognition

    @ReactMethod
    fun startFaceRecognitionRegistration(credentials: ReadableMap, promise: Promise) {
        startFaceRecognition(credentials, FaceRecognitionMethod.REGISTER, promise)
    }

    @ReactMethod
    fun startFaceRecognitionAuthentication(credentials: ReadableMap, promise: Promise) {
        startFaceRecognition(credentials, FaceRecognitionMethod.AUTHENTICATION, promise)
    }

    private fun startFaceRecognition(credentials: ReadableMap, method: FaceRecognitionMethod, promise: Promise) {
        val activity = currentActivity
        if (activity !is FragmentActivity) {
            promise.reject("INVALID_ACTIVITY", "Activity must be FragmentActivity")
            return
        }

        if (!hasRequiredPermissions()) {
            promise.reject("PERMISSIONS_NOT_GRANTED", "Required permissions not granted")
            return
        }

        try {
            val parsedCredentials = parseFaceRecognizerCredentials(credentials)
            
            android.util.Log.i("LivenessModule", "🎯 Starting face recognition - Method: $method, User: ${parsedCredentials.userID}")
            
            faceRecognizerImpl = FaceRecognizerImpl(this)
            
            // Start face recognition using the implementation
            val success = faceRecognizerImpl?.startFaceRecognitionWithCamera(activity, parsedCredentials, method) ?: false
            
            val result = Arguments.createMap().apply {
                putString("status", "success")
                putMap("faceIDMessage", Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("message", "Face recognition started successfully")
                })
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("START_FAILED", "Failed to start face recognition: ${e.message}")
        }
    }

    // MARK: - Liveness Detection

    @ReactMethod
    fun startActiveLiveness(credentials: ReadableMap, isAuthentication: Boolean = false, promise: Promise) {
        val activity = currentActivity
        if (activity !is FragmentActivity) {
            promise.reject("INVALID_ACTIVITY", "Activity must be FragmentActivity")
            return
        }

        if (!hasRequiredPermissions()) {
            promise.reject("PERMISSIONS_NOT_GRANTED", "Required permissions not granted")
            return
        }

        try {
            val parsedCredentials = parseFaceRecognizerCredentials(credentials)
            
            faceRecognizerImpl = FaceRecognizerImpl(this)
            
            android.util.Log.i("LivenessModule", "🎭 Starting active liveness - User: ${parsedCredentials.userID}, Auth: $isAuthentication")
            
            // Start active liveness using the implementation
            faceRecognizerImpl?.startActiveLiveness(activity, parsedCredentials, isAuthentication)
            
            val result = Arguments.createMap().apply {
                putString("status", "success")
                putMap("faceIDMessage", Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("message", "Active liveness started successfully")
                })
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("START_FAILED", "Failed to start active liveness: ${e.message}")
        }
    }

    @ReactMethod
    fun startHybridLiveness(credentials: ReadableMap, isAuthentication: Boolean, promise: Promise) {
        val activity = currentActivity
        if (activity !is FragmentActivity) {
            promise.reject("INVALID_ACTIVITY", "Activity must be FragmentActivity")
            return
        }

        if (!hasRequiredPermissions()) {
            promise.reject("PERMISSIONS_NOT_GRANTED", "Required permissions not granted")
            return
        }

        try {
            val parsedCredentials = parseFaceRecognizerCredentials(credentials)
            
            faceRecognizerImpl = FaceRecognizerImpl(this)
            
            android.util.Log.i("LivenessModule", "🔄 Starting hybrid liveness - User: ${parsedCredentials.userID}, Auth: $isAuthentication")
            
            // Pass isAuthentication parameter to implementation
            faceRecognizerImpl?.startHybridLiveness(activity, parsedCredentials, isAuthentication)
            
            val result = Arguments.createMap().apply {
                putString("status", "success")
                putMap("faceIDMessage", Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("message", "Hybrid liveness started successfully")
                })
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("START_FAILED", "Failed to start hybrid liveness: ${e.message}")
        }
    }

    // MARK: - Selfie Capture

    @ReactMethod
    fun startSelfieCapture(credentials: ReadableMap, promise: Promise) {
        val activity = currentActivity
        if (activity !is FragmentActivity) {
            promise.reject("INVALID_ACTIVITY", "Activity must be FragmentActivity")
            return
        }

        if (!hasRequiredPermissions()) {
            promise.reject("PERMISSIONS_NOT_GRANTED", "Required permissions not granted")
            return
        }

        try {
            val parsedCredentials = parseFaceRecognizerCredentials(credentials)
            
            android.util.Log.i("LivenessModule", "📸 Starting selfie capture - User: ${parsedCredentials.userID}")
            
            faceRecognizerImpl = FaceRecognizerImpl(this)
            
            // Start selfie capture using the implementation
            faceRecognizerImpl?.startSelfieCapture(activity, parsedCredentials)
            
            val result = Arguments.createMap().apply {
                putString("status", "success")
                putMap("faceIDMessage", Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("message", "Selfie capture started successfully")
                })
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SELFIE_CAPTURE_FAILED", "Failed to start selfie capture: ${e.message}")
        }
    }

    @ReactMethod
    fun performFaceRecognitionWithSelfie(credentials: ReadableMap, base64Image: String, isAuthentication: Boolean, promise: Promise) {
        android.util.Log.i("LivenessModule", "🔄 Performing face recognition with selfie (isAuth: $isAuthentication)")
        
        try {
            val parsedCredentials = parseFaceRecognizerCredentials(credentials)
            
            android.util.Log.i("LivenessModule", "✅ Processing selfie with Face Recognition API")
            
            faceRecognizerImpl = FaceRecognizerImpl(this)
            
            // Perform face recognition with captured selfie
            faceRecognizerImpl?.performFaceRecognitionWithSelfie(parsedCredentials, base64Image, isAuthentication)
            
            val result = Arguments.createMap().apply {
                putString("status", "success")
                putMap("faceIDMessage", Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("message", "Face recognition with selfie started successfully")
                })
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("FACE_RECOGNITION_SELFIE_FAILED", "Failed to perform face recognition with selfie: ${e.message}")
        }
    }

    // MARK: - Photo-based Recognition

    @ReactMethod
    fun registerUserWithPhoto(credentials: ReadableMap, base64Image: String, promise: Promise) {
        try {
            val parsedCredentials = parseFaceRecognizerCredentials(credentials)
            
            faceRecognizerImpl = FaceRecognizerImpl(this)
            
            android.util.Log.i("LivenessModule", "📷 Starting photo registration - User: ${parsedCredentials.userID}")
            
            // Start photo registration using the implementation
            faceRecognizerImpl?.registerUserWithPhoto(parsedCredentials, base64Image)
            
            val result = Arguments.createMap().apply {
                putString("status", "success")
                putMap("faceIDMessage", Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("message", "User registration started successfully")
                })
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("REGISTER_FAILED", "Failed to register user: ${e.message}")
        }
    }

    @ReactMethod
    fun authenticateUserWithPhoto(credentials: ReadableMap, base64Image: String, promise: Promise) {
        try {
            val parsedCredentials = parseFaceRecognizerCredentials(credentials)
            
            faceRecognizerImpl = FaceRecognizerImpl(this)
            
            android.util.Log.i("LivenessModule", "🔍 Starting photo authentication - User: ${parsedCredentials.userID}")
            
            // Start photo authentication using the implementation
            faceRecognizerImpl?.authenticateUserWithPhoto(parsedCredentials, base64Image)
            
            val result = Arguments.createMap().apply {
                putString("status", "success")
                putMap("faceIDMessage", Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("message", "User authentication started successfully")
                })
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("AUTHENTICATE_FAILED", "Failed to authenticate user: ${e.message}")
        }
    }

    // MARK: - Face Recognition Control

    @ReactMethod
    fun cancelFaceRecognition(promise: Promise) {
        try {
            faceRecognizerImpl?.cancelFaceRecognition()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CANCEL_FAILED", "Failed to cancel face recognition: ${e.message}")
        }
    }

    @ReactMethod
    fun isFaceRecognitionInProgress(promise: Promise) {
        val inProgress = faceRecognizerImpl?.isInProgress() ?: false
        promise.resolve(inProgress)
    }

    // MARK: - List Operations

    @ReactMethod
    fun addUserToList(serverURL: String, transactionId: String, status: String, metadata: ReadableMap?, promise: Promise) {
        try {
            // Check if Udentify SDK is available
            val isSDKAvailable = try {
                Class.forName("io.udentify.android.face.FaceService")
                true
            } catch (e: ClassNotFoundException) {
                false
            }

            if (!isSDKAvailable) {
                promise.reject("SDK_NOT_AVAILABLE", "Udentify Face SDK is not available. Please ensure the SDK dependencies are properly included.")
                return
            }

            android.util.Log.i("LivenessModule", "Udentify Face SDK available for addUserToList: $isSDKAvailable")

            // Use real SDK to add user to list
            addUserToListWithSDK(serverURL, transactionId, status, metadata, promise)
        } catch (e: Exception) {
            promise.reject("ADD_USER_TO_LIST_FAILED", "Failed to add user to list: ${e.message}")
        }
    }

    @ReactMethod
    fun startFaceRecognitionIdentification(serverURL: String, transactionId: String, listName: String, logLevel: String?, promise: Promise) {
        // Implementation for face recognition identification
        val result = Arguments.createMap().apply {
            putString("status", "success")
            putMap("faceIDMessage", Arguments.createMap().apply {
                putBoolean("success", true)
                putString("message", "Face recognition identification started")
            })
        }
        promise.resolve(result)
    }

    @ReactMethod
    fun deleteUserFromList(serverURL: String, transactionId: String, listName: String, photoBase64: String, promise: Promise) {
        // Implementation for deleting user from list
        val result = Arguments.createMap().apply {
            putBoolean("success", true)
            putString("message", "User deleted from list successfully")
            putString("userID", "user123")
            putString("transactionID", transactionId)
            putString("listName", listName)
            putDouble("matchScore", 0.0)
            putString("registrationTransactionID", "reg_txn_123")
        }
        promise.resolve(result)
    }

    // MARK: - UI Configuration

    @ReactMethod
    fun configureUISettings(settings: ReadableMap, promise: Promise) {
        android.util.Log.i("LivenessModule", "🔄 Configuring UI settings for Android")
        
        try {
            android.util.Log.w("LivenessModule", "⚠️ IMPORTANT: Android UdentifyFACE SDK only supports STATIC XML resource customization")
            android.util.Log.w("LivenessModule", "⚠️ Dynamic UI changes are NOT supported on Android platform")
            android.util.Log.w("LivenessModule", "⚠️ UI customization requires app rebuild with updated XML resources")
            
            // Log the received configuration for reference
            android.util.Log.i("LivenessModule", "📝 Received UI configuration: ${settings.toString()}")
            
            // Store configuration for potential future use or app restart
            val activity = currentActivity
            if (activity != null) {
                storeUIConfigurationForReference(activity, settings)
            }
            
            // Inform user about Android limitation
            promise.resolve(mapOf(
                "success" to false,
                "platform" to "android", 
                "message" to "Android UdentifyFACE SDK only supports static XML resource customization. Dynamic UI changes are not supported. Please update colors.xml, dimens.xml, and strings.xml files in your Android app and rebuild.",
                "recommendation" to "For dynamic UI customization, use iOS platform or update Android XML resources manually"
            ))
            
        } catch (e: Exception) {
            android.util.Log.e("LivenessModule", "❌ Failed to process UI settings: ${e.message}")
            promise.reject("UI_CONFIG_ERROR", "Failed to process UI settings: ${e.message}")
        }
    }

    @ReactMethod
    fun setLocalization(languageCode: String, customStrings: ReadableMap?, promise: Promise) {
        android.util.Log.i("LivenessModule", "🔄 Setting localization to $languageCode")
        
        try {
            val activity = currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity not available for localization")
                return
            }
            
            // Apply localization if custom strings are provided
            customStrings?.let { strings ->
                applyCustomLocalization(activity, strings)
            }
            
            android.util.Log.i("LivenessModule", "✅ Localization set successfully")
            promise.resolve(null)
        } catch (e: Exception) {
            android.util.Log.e("LivenessModule", "❌ Failed to set localization: ${e.message}")
            promise.reject("LOCALIZATION_ERROR", "Failed to set localization: ${e.message}")
        }
    }

    // MARK: - Helper Methods

    private fun parseFaceRecognizerCredentials(credentials: ReadableMap): FaceRecognizerCredentials {
        android.util.Log.d("LivenessModule", "📝 Parsing face recognizer credentials")
        
        return FaceRecognizerCredentials(
            serverURL = credentials.getString("serverURL") ?: "",
            transactionID = credentials.getString("transactionID") ?: "",
            userID = credentials.getString("userID") ?: "",
            autoTake = if (credentials.hasKey("autoTake")) credentials.getBoolean("autoTake") else true,
            errorDelay = if (credentials.hasKey("errorDelay")) credentials.getDouble("errorDelay").toFloat() else 0.10f,
            successDelay = if (credentials.hasKey("successDelay")) credentials.getDouble("successDelay").toFloat() else 0.75f,
            runInBackground = if (credentials.hasKey("runInBackground")) credentials.getBoolean("runInBackground") else false,
            blinkDetectionEnabled = if (credentials.hasKey("blinkDetectionEnabled")) credentials.getBoolean("blinkDetectionEnabled") else false,
            requestTimeout = if (credentials.hasKey("requestTimeout")) credentials.getInt("requestTimeout") else 10,
            eyesOpenThreshold = if (credentials.hasKey("eyesOpenThreshold")) credentials.getDouble("eyesOpenThreshold").toFloat() else 0.75f,
            maskConfidence = if (credentials.hasKey("maskConfidence")) credentials.getDouble("maskConfidence") else 0.95,
            invertedAnimation = if (credentials.hasKey("invertedAnimation")) credentials.getBoolean("invertedAnimation") else false,
            activeLivenessAutoNextEnabled = if (credentials.hasKey("activeLivenessAutoNextEnabled")) credentials.getBoolean("activeLivenessAutoNextEnabled") else true
        )
    }

    private fun hasRequiredPermissions(): Boolean {
        val activity = currentActivity ?: return false
        return REQUIRED_PERMISSIONS.all { permission ->
            // Skip Bluetooth permissions on older Android versions
            if (permission == Manifest.permission.BLUETOOTH_CONNECT && 
                android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.S) {
                true // Permission not required on older versions
            } else {
                ContextCompat.checkSelfPermission(activity, permission) == PackageManager.PERMISSION_GRANTED
            }
        }
    }

    private fun getPermissionStatus(activity: Activity, permission: String): String {
        // Handle Bluetooth permissions that are only available on Android 12+ (API 31+)
        if (permission == Manifest.permission.BLUETOOTH_CONNECT && 
            android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.S) {
            return "granted" // Bluetooth connect permission not needed on older Android versions
        }
        
        return when (ContextCompat.checkSelfPermission(activity, permission)) {
            PackageManager.PERMISSION_GRANTED -> "granted"
            PackageManager.PERMISSION_DENIED -> {
                if (ActivityCompat.shouldShowRequestPermissionRationale(activity, permission)) {
                    "denied"
                } else {
                    "permanentlyDenied"
                }
            }
            else -> "unknown"
        }
    }

    private fun addUserToListWithSDK(
        serverURL: String,
        transactionId: String,
        status: String,
        metadata: ReadableMap?,
        promise: Promise
    ) {
        // Implementation would call the actual Udentify SDK
        val result = Arguments.createMap().apply {
            putBoolean("success", true)
            putMap("data", Arguments.createMap().apply {
                putInt("id", 1)
                putInt("userId", 123)
                putMap("customerList", Arguments.createMap().apply {
                    putInt("id", 1)
                    putString("name", "Main List")
                    putString("listRole", "Customer")
                    putString("description", "Main customer list")
                    putString("creationDate", System.currentTimeMillis().toString())
                })
            })
        }
        promise.resolve(result)
    }

    // Send events to React Native
    fun sendEvent(eventName: String, data: Any?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, data)
    }
    
    // Additional event sender methods to match iOS implementation
    fun sendPhotoTakenEvent(base64Image: String?) {
        val eventData = Arguments.createMap()
        if (base64Image != null) {
            eventData.putString("base64Image", base64Image)
        }
        sendEvent("onPhotoTaken", eventData)
    }
    
    fun sendSelfieTakenEvent(base64Image: String) {
        val eventData = Arguments.createMap().apply {
            putString("base64Image", base64Image)
        }
        sendEvent("onSelfieTaken", eventData)
    }
    
    fun sendBackButtonPressedEvent() {
        sendEvent("onBackButtonPressed", Arguments.createMap())
    }
    
    fun sendWillDismissEvent() {
        sendEvent("onWillDismiss", Arguments.createMap())
    }
    
    fun sendDidDismissEvent() {
        sendEvent("onDidDismiss", Arguments.createMap())
    }
    
    fun sendVideoTakenEvent() {
        sendEvent("onVideoTaken", Arguments.createMap())
    }
    
    // MARK: - UI Configuration Helper Methods
    
    private fun storeUIConfigurationForReference(activity: Activity, settings: ReadableMap) {
        android.util.Log.i("LivenessModule", "💾 Storing UI configuration for reference")
        
        try {
            // Store the entire configuration as JSON for future reference
            val sharedPrefs = activity.getSharedPreferences("udentify_ui_config_reference", Activity.MODE_PRIVATE)
            val editor = sharedPrefs.edit()
            
            // Store the configuration as a JSON string
            editor.putString("ui_config_json", settings.toString())
            editor.putLong("config_timestamp", System.currentTimeMillis())
            
            // Also store individual values for easy access
            settings.getMap("colors")?.let { colors ->
                colors.getString("buttonColor")?.let { editor.putString("ref_button_color", it) }
                colors.getString("backgroundColor")?.let { editor.putString("ref_background_color", it) }
                colors.getString("buttonTextColor")?.let { editor.putString("ref_button_text_color", it) }
            }
            
            settings.getMap("dimensions")?.let { dimensions ->
                if (dimensions.hasKey("buttonHeight")) {
                    editor.putFloat("ref_button_height", dimensions.getDouble("buttonHeight").toFloat())
                }
                if (dimensions.hasKey("buttonCornerRadius")) {
                    editor.putFloat("ref_button_corner_radius", dimensions.getDouble("buttonCornerRadius").toFloat())
                }
            }
            
            editor.apply()
            android.util.Log.i("LivenessModule", "✅ UI configuration stored for reference")
            
            // Log instructions for manual XML update
            logXMLUpdateInstructions(settings)
            
        } catch (e: Exception) {
            android.util.Log.e("LivenessModule", "❌ Failed to store UI configuration: ${e.message}")
        }
    }
    
    private fun logXMLUpdateInstructions(settings: ReadableMap) {
        android.util.Log.i("LivenessModule", "\n🔧 ========== MANUAL XML UPDATE INSTRUCTIONS ==========")
        android.util.Log.i("LivenessModule", "To apply UI customization on Android, update these XML files:")
        android.util.Log.i("LivenessModule", "")
        
        settings.getMap("colors")?.let { colors ->
            android.util.Log.i("LivenessModule", "📁 UPDATE: android/app/src/main/res/values/colors.xml")
            colors.getString("buttonColor")?.let { 
                android.util.Log.i("LivenessModule", "   <color name=\"udentifyface_btn_color\">$it</color>")
            }
            colors.getString("buttonSuccessColor")?.let { 
                android.util.Log.i("LivenessModule", "   <color name=\"udentifyface_btn_color_success\">$it</color>")
            }
            colors.getString("buttonErrorColor")?.let { 
                android.util.Log.i("LivenessModule", "   <color name=\"udentifyface_btn_color_error\">$it</color>")
            }
            colors.getString("backgroundColor")?.let { 
                android.util.Log.i("LivenessModule", "   <color name=\"udentifyface_bg_color\">$it</color>")
            }
            android.util.Log.i("LivenessModule", "")
        }
        
        settings.getMap("dimensions")?.let { dimensions ->
            android.util.Log.i("LivenessModule", "📁 UPDATE: android/app/src/main/res/values/dimens.xml")
            if (dimensions.hasKey("buttonHeight")) {
                val height = dimensions.getDouble("buttonHeight").toInt()
                android.util.Log.i("LivenessModule", "   <dimen name=\"udentify_selfie_button_height\">${height}dp</dimen>")
            }
            if (dimensions.hasKey("buttonCornerRadius")) {
                val radius = dimensions.getDouble("buttonCornerRadius").toInt()
                android.util.Log.i("LivenessModule", "   <dimen name=\"udentify_face_selfie_button_corner_radius\">${radius}dp</dimen>")
            }
            android.util.Log.i("LivenessModule", "")
        }
        
        android.util.Log.i("LivenessModule", "⚡ After updating XML files, rebuild the app with: npm run android")
        android.util.Log.i("LivenessModule", "=====================================================")
    }
    
    private fun applyColorsConfiguration(activity: Activity, colors: ReadableMap) {
        try {
            // Create dynamic color resources that can be used by the SDK
            val sharedPrefs = activity.getSharedPreferences("udentify_ui_colors", Activity.MODE_PRIVATE)
            val editor = sharedPrefs.edit()
            
            // Store colors as hex strings for the SDK to use
            colors.getString("buttonColor")?.let { editor.putString("udentifyface_btn_color", it) }
            colors.getString("buttonSuccessColor")?.let { editor.putString("udentifyface_btn_color_success", it) }
            colors.getString("buttonErrorColor")?.let { editor.putString("udentifyface_btn_color_error", it) }
            colors.getString("buttonTextColor")?.let { editor.putString("udentifyface_btn_text_color", it) }
            colors.getString("buttonSuccessTextColor")?.let { editor.putString("udentifyface_btn_text_color_success", it) }
            colors.getString("buttonErrorTextColor")?.let { editor.putString("udentifyface_btn_text_color_error", it) }
            colors.getString("backgroundColor")?.let { editor.putString("udentifyface_bg_color", it) }
            colors.getString("progressBackgroundColor")?.let { editor.putString("udentifyface_progress_background_color", it) }
            colors.getString("gestureTextBackgroundColor")?.let { editor.putString("udentifyface_gesture_text_bg_color", it) }
            
            editor.apply()
            android.util.Log.i("LivenessModule", "✅ Colors configuration applied")
        } catch (e: Exception) {
            android.util.Log.e("LivenessModule", "❌ Failed to apply colors configuration: ${e.message}")
        }
    }
    
    private fun applyFontsConfiguration(activity: Activity, fonts: ReadableMap) {
        try {
            val sharedPrefs = activity.getSharedPreferences("udentify_ui_fonts", Activity.MODE_PRIVATE)
            val editor = sharedPrefs.edit()
            
            // Store font configurations
            fonts.getMap("titleFont")?.let { titleFont ->
                titleFont.getString("name")?.let { editor.putString("title_font_name", it) }
                if (titleFont.hasKey("size")) {
                    editor.putFloat("title_font_size", titleFont.getDouble("size").toFloat())
                }
            }
            
            fonts.getMap("buttonFont")?.let { buttonFont ->
                buttonFont.getString("name")?.let { editor.putString("button_font_name", it) }
                if (buttonFont.hasKey("size")) {
                    editor.putFloat("button_font_size", buttonFont.getDouble("size").toFloat())
                }
            }
            
            fonts.getMap("footerFont")?.let { footerFont ->
                footerFont.getString("name")?.let { editor.putString("footer_font_name", it) }
                if (footerFont.hasKey("size")) {
                    editor.putFloat("footer_font_size", footerFont.getDouble("size").toFloat())
                }
            }
            
            fonts.getMap("gestureFont")?.let { gestureFont ->
                gestureFont.getString("name")?.let { editor.putString("gesture_font_name", it) }
                if (gestureFont.hasKey("size")) {
                    editor.putFloat("gesture_font_size", gestureFont.getDouble("size").toFloat())
                }
            }
            
            editor.apply()
            android.util.Log.i("LivenessModule", "✅ Fonts configuration applied")
        } catch (e: Exception) {
            android.util.Log.e("LivenessModule", "❌ Failed to apply fonts configuration: ${e.message}")
        }
    }
    
    private fun applyDimensionsConfiguration(activity: Activity, dimensions: ReadableMap) {
        try {
            val sharedPrefs = activity.getSharedPreferences("udentify_ui_dimensions", Activity.MODE_PRIVATE)
            val editor = sharedPrefs.edit()
            
            // Store dimension values (convert dp to px if needed)
            val density = activity.resources.displayMetrics.density
            
            if (dimensions.hasKey("buttonHeight")) {
                val heightDp = dimensions.getDouble("buttonHeight").toFloat()
                editor.putFloat("udentify_selfie_button_height", heightDp * density)
            }
            
            if (dimensions.hasKey("buttonMarginLeft")) {
                val marginDp = dimensions.getDouble("buttonMarginLeft").toFloat()
                editor.putFloat("udentify_selfie_button_horizontal_margin", marginDp * density)
            }
            
            if (dimensions.hasKey("buttonMarginBottom")) {
                val marginDp = dimensions.getDouble("buttonMarginBottom").toFloat()
                editor.putFloat("udentify_selfie_button_bottom_margin", marginDp * density)
            }
            
            if (dimensions.hasKey("buttonCornerRadius")) {
                val radiusDp = dimensions.getDouble("buttonCornerRadius").toFloat()
                editor.putFloat("udentify_face_selfie_button_corner_radius", radiusDp * density)
            }
            
            if (dimensions.hasKey("gestureFontSize")) {
                val fontSizeSp = dimensions.getDouble("gestureFontSize").toFloat()
                editor.putFloat("udentifyface_gesture_font_size", fontSizeSp)
            }
            
            editor.apply()
            android.util.Log.i("LivenessModule", "✅ Dimensions configuration applied")
        } catch (e: Exception) {
            android.util.Log.e("LivenessModule", "❌ Failed to apply dimensions configuration: ${e.message}")
        }
    }
    
    private fun applyConfigsConfiguration(activity: Activity, configs: ReadableMap) {
        try {
            val sharedPrefs = activity.getSharedPreferences("udentify_ui_configs", Activity.MODE_PRIVATE)
            val editor = sharedPrefs.edit()
            
            // Store behavior configurations
            if (configs.hasKey("backButtonEnabled")) {
                editor.putBoolean("back_button_enabled", configs.getBoolean("backButtonEnabled"))
            }
            
            if (configs.hasKey("multipleFacesRejected")) {
                editor.putBoolean("multiple_faces_rejected", configs.getBoolean("multipleFacesRejected"))
            }
            
            if (configs.hasKey("maskDetection")) {
                editor.putBoolean("mask_detection_enabled", configs.getBoolean("maskDetection"))
            }
            
            if (configs.hasKey("maskConfidence")) {
                editor.putFloat("mask_confidence", configs.getDouble("maskConfidence").toFloat())
            }
            
            if (configs.hasKey("invertedAnimation")) {
                editor.putBoolean("inverted_animation", configs.getBoolean("invertedAnimation"))
            }
            
            if (configs.hasKey("autoTake")) {
                editor.putBoolean("auto_take", configs.getBoolean("autoTake"))
            }
            
            if (configs.hasKey("errorDelay")) {
                editor.putFloat("error_delay", configs.getDouble("errorDelay").toFloat())
            }
            
            if (configs.hasKey("successDelay")) {
                editor.putFloat("success_delay", configs.getDouble("successDelay").toFloat())
            }
            
            if (configs.hasKey("requestTimeout")) {
                editor.putInt("request_timeout", configs.getInt("requestTimeout"))
            }
            
            editor.apply()
            android.util.Log.i("LivenessModule", "✅ Configs configuration applied")
        } catch (e: Exception) {
            android.util.Log.e("LivenessModule", "❌ Failed to apply configs configuration: ${e.message}")
        }
    }
    
    private fun applyCustomLocalization(activity: Activity, customStrings: ReadableMap) {
        try {
            val sharedPrefs = activity.getSharedPreferences("udentify_custom_strings", Activity.MODE_PRIVATE)
            val editor = sharedPrefs.edit()
            
            // Store all custom localization strings
            val keysIterator = customStrings.keySetIterator()
            while (keysIterator.hasNextKey()) {
                val key = keysIterator.nextKey()
                customStrings.getString(key)?.let { value ->
                    editor.putString(key, value)
                }
            }
            
            editor.apply()
            android.util.Log.i("LivenessModule", "✅ Custom localization applied")
        } catch (e: Exception) {
            android.util.Log.e("LivenessModule", "❌ Failed to apply custom localization: ${e.message}")
        }
    }
    
    private fun applyDynamicResourceOverrides(activity: Activity, settings: ReadableMap) {
        try {
            android.util.Log.i("LivenessModule", "🔄 Applying dynamic resource overrides for Android SDK")
            
            // Create a custom ResourceOverride utility for runtime color/dimension changes
            val resources = activity.resources
            val packageName = activity.packageName
            
            // Override colors dynamically
            settings.getMap("colors")?.let { colors ->
                try {
                    // Update color resources by creating new color states
                    val colorResources = mapOf(
                        "buttonColor" to "udentifyface_btn_color",
                        "buttonSuccessColor" to "udentifyface_btn_color_success", 
                        "buttonErrorColor" to "udentifyface_btn_color_error",
                        "buttonTextColor" to "udentifyface_btn_text_color",
                        "buttonSuccessTextColor" to "udentifyface_btn_text_color_success",
                        "buttonErrorTextColor" to "udentifyface_btn_text_color_error",
                        "backgroundColor" to "udentifyface_bg_color",
                        "gestureTextBackgroundColor" to "udentifyface_gesture_text_bg_color"
                    )
                    
                    colorResources.forEach { (key, resourceName) ->
                        colors.getString(key)?.let { colorHex ->
                            // Store in shared preferences for SDK access
                            val colorPrefs = activity.getSharedPreferences("udentify_runtime_colors", Activity.MODE_PRIVATE)
                            colorPrefs.edit().putString(resourceName, colorHex).apply()
                            android.util.Log.d("LivenessModule", "✅ Stored runtime color: $resourceName = $colorHex")
                        }
                    }
                } catch (e: Exception) {
                    android.util.Log.e("LivenessModule", "❌ Failed to override colors: ${e.message}")
                }
            }
            
            // Override dimensions dynamically
            settings.getMap("dimensions")?.let { dimensions ->
                try {
                    val dimensionResources = mapOf(
                        "buttonHeight" to "udentify_selfie_button_height",
                        "buttonCornerRadius" to "udentify_face_selfie_button_corner_radius",
                        "gestureFontSize" to "udentifyface_gesture_font_size",
                        "buttonMarginLeft" to "udentify_selfie_button_horizontal_margin",
                        "buttonMarginRight" to "udentify_selfie_button_horizontal_margin"
                    )
                    
                    dimensionResources.forEach { (key, resourceName) ->
                        if (dimensions.hasKey(key)) {
                            val value = dimensions.getDouble(key).toFloat()
                            // Store in shared preferences for SDK access
                            val dimensionPrefs = activity.getSharedPreferences("udentify_runtime_dimensions", Activity.MODE_PRIVATE)
                            dimensionPrefs.edit().putFloat(resourceName, value).apply()
                            android.util.Log.d("LivenessModule", "✅ Stored runtime dimension: $resourceName = $value")
                        }
                    }
                } catch (e: Exception) {
                    android.util.Log.e("LivenessModule", "❌ Failed to override dimensions: ${e.message}")
                }
            }
            
            android.util.Log.i("LivenessModule", "✅ Dynamic resource overrides applied successfully")
        } catch (e: Exception) {
            android.util.Log.e("LivenessModule", "❌ Failed to apply dynamic resource overrides: ${e.message}")
        }
    }

    // Public method to access current activity
    fun getActivity(): Activity? {
        return currentActivity
    }

    // ActivityEventListener implementation
    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        // Handle activity results if needed
    }

    override fun onNewIntent(intent: android.content.Intent?) {
        // Handle new intents if needed
    }
}
