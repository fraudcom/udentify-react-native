package com.livenessrnlibrary

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

/**
 * Face recognizer implementation for React Native
 * Based on the working Flutter implementation using reflection to access Udentify SDK
 */
class FaceRecognizerImpl(
    private val livenessModule: LivenessModule
) {
    private var inProgress: Boolean = false
    private var currentActivity: FragmentActivity? = null
    private var currentCredentials: FaceRecognizerCredentials? = null
    
    companion object {
        private const val TAG = "FaceRecognizerImpl"
    }

    fun isInProgress(): Boolean = inProgress

    fun cancelFaceRecognition() {
        inProgress = false
    }

    /**
     * Start face recognition with camera using actual SDK
     */
    fun startFaceRecognitionWithCamera(activity: FragmentActivity, credentials: FaceRecognizerCredentials, method: FaceRecognitionMethod): Boolean {
        currentActivity = activity
        currentCredentials = credentials // Store credentials for result mapping
        return try {
            Log.i(TAG, "🎯 Starting face recognition with camera - Method: $method")
            
            // Use reflection to access the SDK classes
            val methodEnum = Class.forName("io.udentify.android.face.activities.Method")
            val methodConst = when (method) {
                FaceRecognitionMethod.REGISTER -> methodEnum.getField("Register").get(null)
                FaceRecognitionMethod.AUTHENTICATION -> methodEnum.getField("Authentication").get(null)
            }

            val faceRecognizerInterface = Class.forName("io.udentify.android.face.activities.FaceRecognizer")
            val credsObj = buildFaceCredentials(credentials)
            
            // Create proxy for FaceRecognizer callbacks
            val recognizer = java.lang.reflect.Proxy.newProxyInstance(
                faceRecognizerInterface.classLoader,
                arrayOf(faceRecognizerInterface)
            ) { _, m, args ->
                when (m.name) {
                    "onResult" -> {
                        Log.i(TAG, "\n🎉 ========== FACE RECOGNITION SUCCESS ==========")
                        Log.i(TAG, "📱 Platform: Android")
                        Log.i(TAG, "🔧 Method: ${method.name}")
                        Log.i(TAG, "👤 User ID: ${currentCredentials?.userID}")
                        Log.i(TAG, "🆔 Transaction ID: ${currentCredentials?.transactionID}")
                        Log.i(TAG, "⏰ Timestamp: ${System.currentTimeMillis()}")
                        
                        // Extract server response data
                        val serverResponse = args?.getOrNull(0)
                        Log.i(TAG, "📡 Server response: $serverResponse")
                        
                        val detailedResponse = extractResponseData(serverResponse)
                        Log.i(TAG, "📋 Extracted response data: $detailedResponse")
                        
                        val resultMap = createResultMap(
                            success = true,
                            message = "Face ${method.name.lowercase()} completed successfully",
                            data = detailedResponse
                        )
                        
                        Log.i(TAG, "🚀 Sending result to React Native: $resultMap")
                        Log.i(TAG, "===============================================\n")
                        
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onFaceRecognitionResult", resultMap)
                        }
                        inProgress = false
                    }
                    "onFailure" -> {
                        val errorMessage = args?.getOrNull(0)?.toString() ?: "Unknown error"
                        Log.e(TAG, "❌ Face recognition failed: $errorMessage")
                        
                        // Dismiss the fragment
                        dismissCurrentFragment("face_camera_fragment")
                        
                        val errorMap = Arguments.createMap().apply {
                            putString("code", "FACE_RECOGNITION_ERROR")
                            putString("message", errorMessage)
                        }
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onFaceRecognitionError", errorMap)
                        }
                        inProgress = false
                    }
                    "onPhotoTaken" -> {
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onPhotoTaken", Arguments.createMap())
                        }
                    }
                    "onSelfieTaken" -> {
                        val base64 = args?.getOrNull(0)?.toString()
                        Handler(Looper.getMainLooper()).post {
                            val selfieMap = Arguments.createMap().apply {
                                putString("base64Image", base64 ?: "")
                            }
                            livenessModule.sendEvent("onSelfieTaken", selfieMap)
                        }
                    }
                    "getCredentials" -> {
                        return@newProxyInstance credsObj
                    }
                }
                null
            }

            // Create and launch the face camera fragment
            val fragmentClass = Class.forName("io.udentify.android.face.activities.FaceCameraFragment")
            val newInstance = fragmentClass.getMethod("newInstance", methodEnum, faceRecognizerInterface)
            val fragment = newInstance.invoke(null, methodConst, recognizer) as androidx.fragment.app.Fragment

            activity.supportFragmentManager.beginTransaction()
                .replace(android.R.id.content, fragment, "face_camera_fragment")
                .addToBackStack("face_camera_fragment")
                .commit()
            
            inProgress = true
            Log.i(TAG, "✅ Face camera fragment launched successfully")
            true
        } catch (e: Throwable) {
            Log.e(TAG, "❌ Failed to start face recognition with camera", e)
            false
        }
    }
    
    /**
     * Start active liveness detection using actual SDK
     */
    fun startActiveLiveness(activity: FragmentActivity, credentials: FaceRecognizerCredentials, isAuthentication: Boolean = false): Boolean {
        currentActivity = activity
        currentCredentials = credentials // Store credentials for result mapping
        Log.i(TAG, "🎭 Starting Active Liveness using ActiveLivenessFragment - Auth: $isAuthentication")

        return try {
            val methodEnum = Class.forName("io.udentify.android.face.activities.Method")
            // For Active Liveness, always use Method.ActiveLiveness
            val methodFieldName = "ActiveLiveness"
            Log.i(TAG, "🎯 Using method: $methodFieldName (isAuthentication: $isAuthentication)")
            val methodConst = methodEnum.getField(methodFieldName).get(null)
            val faceRecognizerInterface = Class.forName("io.udentify.android.face.activities.FaceRecognizer")
            val activeLivenessOperatorInterface = Class.forName("io.udentify.android.face.activities.ActiveLivenessOperator")

            val credsObj = buildFaceCredentials(credentials)

            // Create FaceRecognizer proxy
            val recognizer = java.lang.reflect.Proxy.newProxyInstance(
                faceRecognizerInterface.classLoader,
                arrayOf(faceRecognizerInterface)
            ) { _, m, args ->
                when (m.name) {
                    "getCredentials" -> {
                        return@newProxyInstance credsObj
                    }
                    else -> {
                        Log.d(TAG, "🔧 FaceRecognizer method called: ${m.name}")
                        null
                    }
                }
            }

            // Create ActiveLivenessOperator proxy
            val activeLivenessOperator = java.lang.reflect.Proxy.newProxyInstance(
                activeLivenessOperatorInterface.classLoader,
                arrayOf(activeLivenessOperatorInterface)
            ) { _, m, args ->
                when (m.name) {
                    "activeLivenessResult" -> {
                        Log.i(TAG, "🎉 Active Liveness completed successfully!")
                        val faceIDMessage = args?.getOrNull(0)
                        Log.i(TAG, "📡 Active Liveness result: $faceIDMessage")
                        
                        // Extract real data from server response
                        val extractedData = extractResponseData(faceIDMessage)
                        Log.i(TAG, "📋 Extracted active liveness data: $extractedData")
                        
                        val resultMap = createActiveLivenessResultMap(extractedData)
                        
                        Handler(Looper.getMainLooper()).post {
                            livenessModule.sendEvent("onActiveLivenessResult", resultMap)
                            inProgress = false
                        }
                        
                        // Dismiss the fragment
                        dismissCurrentFragment("active_liveness_fragment")
                        Unit
                    }
                    "activeLivenessFailure" -> {
                        val errorMessage = args?.getOrNull(0)?.toString() ?: "Active Liveness failed"
                        Log.e(TAG, "❌ Active Liveness failed: $errorMessage")
                        
                        val errorMap = Arguments.createMap().apply {
                            putString("code", "ACTIVE_LIVENESS_ERROR")
                            putString("message", errorMessage)
                        }
                        
                        Handler(Looper.getMainLooper()).post {
                            livenessModule.sendEvent("onActiveLivenessFailure", errorMap)
                            inProgress = false
                        }
                        
                        // Dismiss the fragment
                        dismissCurrentFragment("active_liveness_fragment")
                        Unit
                    }
                    else -> {
                        Log.d(TAG, "🔧 ActiveLivenessOperator method called: ${m.name}")
                        null
                    }
                }
            }

            // Create ActiveLivenessFragment
            val fragmentClass = Class.forName("io.udentify.android.face.activities.ActiveLivenessFragment")
            val newInstanceMethod = fragmentClass.getMethod(
                "newInstance",
                methodEnum,
                Boolean::class.javaObjectType,
                faceRecognizerInterface,
                activeLivenessOperatorInterface
            )
            
            val fragment = newInstanceMethod.invoke(
                null,
                methodConst,
                isAuthentication,
                recognizer,
                activeLivenessOperator
            ) as androidx.fragment.app.Fragment

            activity.supportFragmentManager.beginTransaction()
                .replace(android.R.id.content, fragment, "active_liveness_fragment")
                .addToBackStack("active_liveness_fragment")
                .commitAllowingStateLoss()
            
            inProgress = true
            Log.i(TAG, "✅ Active liveness fragment launched successfully")
            true
        } catch (e: Throwable) {
            Log.e(TAG, "❌ Failed to start active liveness", e)
            false
        }
    }
    
    /**
     * Start hybrid liveness detection using actual SDK
     */
    fun startHybridLiveness(activity: FragmentActivity, credentials: FaceRecognizerCredentials, isAuthentication: Boolean = false): Boolean {
        currentActivity = activity
        currentCredentials = credentials // Store credentials for result mapping
        return try {
            Log.i(TAG, "🔄 Starting hybrid liveness detection - Auth: $isAuthentication")
            
            val methodEnum = Class.forName("io.udentify.android.face.activities.Method")
            // For Hybrid Liveness, always use Method.HybridLiveness
            val methodFieldName = "HybridLiveness"
            Log.i(TAG, "🎯 Using method: $methodFieldName (isAuthentication: $isAuthentication)")
            val methodConst = methodEnum.getField(methodFieldName).get(null)

            val faceRecognizerInterface = Class.forName("io.udentify.android.face.activities.FaceRecognizer")
            val activeOpInterface = Class.forName("io.udentify.android.face.activities.ActiveLivenessOperator")
            val credsObj = buildFaceCredentials(credentials)
            
            val recognizer = java.lang.reflect.Proxy.newProxyInstance(
                faceRecognizerInterface.classLoader,
                arrayOf(faceRecognizerInterface)
            ) { _, m, args ->
                when (m.name) {
                    "getCredentials" -> {
                        return@newProxyInstance credsObj
                    }
                    else -> null
                }
            }

            val activeOperator = java.lang.reflect.Proxy.newProxyInstance(
                activeOpInterface.classLoader,
                arrayOf(activeOpInterface)
            ) { _, m, args ->
                when (m.name) {
                    "activeLivenessResult" -> {
                        Log.i(TAG, "🎉 Hybrid Liveness completed successfully!")
                        val faceIDMessage = args?.getOrNull(0)
                        Log.i(TAG, "📡 Hybrid Liveness result: $faceIDMessage")
                        
                        // Extract real data from server response
                        val extractedData = extractResponseData(faceIDMessage)
                        Log.i(TAG, "📋 Extracted hybrid liveness data: $extractedData")
                        
                        val resultMap = createHybridLivenessResultMap(extractedData)
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onActiveLivenessResult", resultMap)
                            inProgress = false
                        }
                        
                        // Dismiss the fragment
                        dismissCurrentFragment("hybrid_liveness_fragment")
                        Unit
                    }
                    "activeLivenessFailure" -> {
                        val errorMessage = args?.getOrNull(0)?.toString() ?: "Hybrid liveness failed"
                        Log.e(TAG, "❌ Hybrid Liveness failed: $errorMessage")
                        
                        val errorMap = Arguments.createMap().apply {
                            putString("code", "HYBRID_LIVENESS_ERROR")
                            putString("message", errorMessage)
                        }
                        
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onActiveLivenessFailure", errorMap)
                            inProgress = false
                        }
                        
                        // Dismiss the fragment
                        dismissCurrentFragment("hybrid_liveness_fragment")
                        Unit
                    }
                }
                null
            }

            val fragmentClass = Class.forName("io.udentify.android.face.activities.ActiveLivenessFragment")
            val newInstance = fragmentClass.getMethod(
                "newInstance",
                methodEnum,
                Boolean::class.javaObjectType,
                faceRecognizerInterface,
                activeOpInterface
            )
            val fragment = newInstance.invoke(
                null,
                methodConst,
                isAuthentication,
                recognizer,
                activeOperator
            ) as androidx.fragment.app.Fragment

            activity.supportFragmentManager.beginTransaction()
                .replace(android.R.id.content, fragment, "hybrid_liveness_fragment")
                .addToBackStack("hybrid_liveness_fragment")
                .commit()
            
            inProgress = true
            Log.i(TAG, "✅ Hybrid liveness fragment launched successfully")
            true
        } catch (e: Throwable) {
            Log.e(TAG, "❌ Failed to start hybrid liveness", e)
            false
        }
    }
    
    /**
     * Register user with photo using actual SDK
     */
    fun registerUserWithPhoto(credentials: FaceRecognizerCredentials, base64Image: String): Boolean {
        return try {
            val faceRecognizerInterface = Class.forName("io.udentify.android.face.activities.FaceRecognizer")
            val credsObj = buildFaceCredentials(credentials)
            
            val recognizer = java.lang.reflect.Proxy.newProxyInstance(
                faceRecognizerInterface.classLoader,
                arrayOf(faceRecognizerInterface)
            ) { _, m, args ->
                when (m.name) {
                    "onResult" -> {
                        val resultMap = createResultMap(
                            success = true,
                            message = "Photo registration completed successfully",
                            data = emptyMap()
                        )
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onFaceRecognitionResult", resultMap)
                        }
                        inProgress = false
                    }
                    "onFailure" -> {
                        val errorMap = Arguments.createMap().apply {
                            putString("code", "PHOTO_REGISTRATION_ERROR")
                            putString("message", args?.getOrNull(0)?.toString() ?: "Photo registration failed")
                        }
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onFaceRecognitionError", errorMap)
                        }
                        inProgress = false
                    }
                    "getCredentials" -> {
                        return@newProxyInstance credsObj
                    }
                }
                null
            }

            // Use the current activity if available, otherwise this won't work
            val activity = currentActivity ?: return false
            
            val clazz = Class.forName("io.udentify.android.face.activities.FaceRecognizerObject")
            val ctor = clazz.getConstructor(faceRecognizerInterface, android.app.Activity::class.java, String::class.java)
            val instance = ctor.newInstance(recognizer, activity, base64Image)
            val registerMethod = clazz.getMethod("registerUser")
            registerMethod.invoke(instance)
            
            inProgress = true
            true
        } catch (e: Throwable) {
            Log.e(TAG, "❌ Failed to register user with photo", e)
            false
        }
    }

    /**
     * Start selfie capture (equivalent to iOS .selfie mode)
     */
    fun startSelfieCapture(activity: FragmentActivity, credentials: FaceRecognizerCredentials): Boolean {
        currentActivity = activity
        currentCredentials = credentials
        return try {
            Log.i(TAG, "📸 Starting selfie capture using FaceCameraFragment with .selfie method")
            
            // Use reflection to access the SDK classes for selfie mode
            val methodEnum = Class.forName("io.udentify.android.face.activities.Method")
            // Use "Selfie" method for selfie capture
            val methodConst = methodEnum.getField("Selfie").get(null)

            val faceRecognizerInterface = Class.forName("io.udentify.android.face.activities.FaceRecognizer")
            val credsObj = buildFaceCredentials(credentials)
            
            // Create proxy for FaceRecognizer callbacks
            val recognizer = java.lang.reflect.Proxy.newProxyInstance(
                faceRecognizerInterface.classLoader,
                arrayOf(faceRecognizerInterface)
            ) { _, m, args ->
                when (m.name) {
                    "onSelfieTaken" -> {
                        val base64 = args?.getOrNull(0)?.toString()
                        Log.i(TAG, "📸 Selfie captured! Base64 length: ${base64?.length ?: 0}")
                        
                        Handler(Looper.getMainLooper()).post {
                            val selfieMap = Arguments.createMap().apply {
                                putString("base64Image", base64 ?: "")
                            }
                            livenessModule.sendEvent("onSelfieTaken", selfieMap)
                        }
                        inProgress = false
                        
                        // Dismiss the fragment after selfie is taken
                        dismissCurrentFragment("selfie_camera_fragment")
                    }
                    "onFailure" -> {
                        val errorMessage = args?.getOrNull(0)?.toString() ?: "Selfie capture failed"
                        Log.e(TAG, "❌ Selfie capture failed: $errorMessage")
                        
                        // Dismiss the fragment
                        dismissCurrentFragment("selfie_camera_fragment")
                        
                        val errorMap = Arguments.createMap().apply {
                            putString("code", "SELFIE_CAPTURE_ERROR")
                            putString("message", errorMessage)
                        }
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onFaceRecognitionError", errorMap)
                        }
                        inProgress = false
                    }
                    "getCredentials" -> {
                        return@newProxyInstance credsObj
                    }
                }
                null
            }

            // Create and launch the face camera fragment in selfie mode
            val fragmentClass = Class.forName("io.udentify.android.face.activities.FaceCameraFragment")
            val newInstance = fragmentClass.getMethod("newInstance", methodEnum, faceRecognizerInterface)
            val fragment = newInstance.invoke(null, methodConst, recognizer) as androidx.fragment.app.Fragment

            activity.supportFragmentManager.beginTransaction()
                .replace(android.R.id.content, fragment, "selfie_camera_fragment")
                .addToBackStack("selfie_camera_fragment")
                .commit()
            
            inProgress = true
            Log.i(TAG, "✅ Selfie camera fragment launched successfully")
            true
        } catch (e: Throwable) {
            Log.e(TAG, "❌ Failed to start selfie capture", e)
            false
        }
    }

    /**
     * Perform face recognition with selfie (equivalent to iOS performFaceIDandLiveness)
     */
    fun performFaceRecognitionWithSelfie(credentials: FaceRecognizerCredentials, base64Image: String, isAuthentication: Boolean): Boolean {
        currentCredentials = credentials
        return try {
            Log.i(TAG, "🔄 Performing face recognition with selfie (isAuth: $isAuthentication)")
            Log.i(TAG, "✅ Processing selfie with Face Recognition API")
            
            val method = if (isAuthentication) FaceRecognitionMethod.AUTHENTICATION else FaceRecognitionMethod.REGISTER
            
            // Get current activity from React Native module
            val activity = livenessModule.getActivity() ?: run {
                Log.e(TAG, "❌ No current activity available from React Native module")
                val errorMap = Arguments.createMap().apply {
                    putString("code", "NO_ACTIVITY_CONTEXT")
                    putString("message", "No activity context available for selfie processing")
                }
                Handler(Looper.getMainLooper()).post { 
                    livenessModule.sendEvent("onFaceRecognitionError", errorMap)
                }
                return false
            }
            
            Log.i(TAG, "✅ Got activity from React Native module: ${activity.javaClass.simpleName}")
            
            // Use FaceRecognizerObject to perform API call with image
            val faceRecognizerInterface = Class.forName("io.udentify.android.face.activities.FaceRecognizer")
            val credsObj = buildFaceCredentials(credentials)
            
            val recognizer = java.lang.reflect.Proxy.newProxyInstance(
                faceRecognizerInterface.classLoader,
                arrayOf(faceRecognizerInterface)
            ) { _, m, args ->
                when (m.name) {
                    "onResult" -> {
                        try {
                            Log.i(TAG, "\n🎉 ========== FACE RECOGNITION WITH SELFIE SUCCESS ==========")
                            Log.i(TAG, "📱 Platform: Android")
                            Log.i(TAG, "🔧 Method: ${method.name}")
                            Log.i(TAG, "👤 User ID: ${credentials.userID}")
                            Log.i(TAG, "🆔 Transaction ID: ${credentials.transactionID}")
                            Log.i(TAG, "⏰ Timestamp: ${System.currentTimeMillis()}")
                            
                            // Extract server response data
                            val serverResponse = args?.getOrNull(0)
                            Log.i(TAG, "📡 Server response: $serverResponse")
                            
                            val detailedResponse = extractResponseData(serverResponse)
                            Log.i(TAG, "📋 Extracted response data: $detailedResponse")
                            
                            // Create FaceIDMessage for result mapping
                            val resultMap = createSelfieRecognitionResultMap(
                                success = true,
                                message = "Face ${method.name.lowercase()} with selfie completed successfully",
                                data = detailedResponse,
                                isAuthentication = isAuthentication
                            )
                            
                            Log.i(TAG, "🚀 Sending result to React Native: $resultMap")
                            Log.i(TAG, "===============================================\n")
                            
                            Handler(Looper.getMainLooper()).post { 
                                livenessModule.sendEvent("onFaceRecognitionResult", resultMap)
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "❌ Exception in onResult callback: ${e.message}", e)
                            // Still send success result even if there are minor issues
                            Handler(Looper.getMainLooper()).post { 
                                val fallbackResult = Arguments.createMap().apply {
                                    putString("status", "success")
                                    putString("message", "Face recognition completed successfully (with minor callback issues)")
                                }
                                livenessModule.sendEvent("onFaceRecognitionResult", fallbackResult)
                            }
                        } finally {
                            inProgress = false
                        }
                    }
                    "onFailure" -> {
                        val errorMessage = args?.getOrNull(0)?.toString() ?: "Face recognition with selfie failed"
                        Log.e(TAG, "❌ Face recognition with selfie failed: $errorMessage")
                        
                        val errorMap = Arguments.createMap().apply {
                            putString("code", "FACE_RECOGNITION_SELFIE_ERROR")
                            putString("message", errorMessage)
                        }
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onFaceRecognitionError", errorMap)
                        }
                        inProgress = false
                    }
                    "getCredentials" -> {
                        return@newProxyInstance credsObj
                    }
                }
                null
            }

            // Use registerUser() or authenticateUser() based on operation type
            Log.i(TAG, "🔄 Using FaceRecognizerObject.${if (isAuthentication) "authenticateUser" else "registerUser"}()")
            
            // Create FaceRecognizerObject with image data
            val clazz = Class.forName("io.udentify.android.face.activities.FaceRecognizerObject")
            val ctor = clazz.getConstructor(faceRecognizerInterface, android.app.Activity::class.java, String::class.java)
            val faceRecognizerObject = ctor.newInstance(recognizer, activity, base64Image)
            
            // Call correct method based on operation type
            if (isAuthentication) {
                Log.i(TAG, "🔐 Calling authenticateUser() for authentication")
                val authMethod = clazz.getMethod("authenticateUser")
                authMethod.invoke(faceRecognizerObject)
            } else {
                Log.i(TAG, "📝 Calling registerUser() for registration")
                val registerMethod = clazz.getMethod("registerUser")
                registerMethod.invoke(faceRecognizerObject)
            }
            
            Log.i(TAG, "📤 Called ${if (isAuthentication) "authenticateUser" else "registerUser"}() method successfully")
            
            inProgress = true
            Log.i(TAG, "✅ Face recognition with selfie started successfully")
            true
        } catch (e: Throwable) {
            Log.e(TAG, "❌ Failed to perform face recognition with selfie", e)
            false
        }
    }

    /**
     * Authenticate user with photo using actual SDK
     */
    fun authenticateUserWithPhoto(credentials: FaceRecognizerCredentials, base64Image: String): Boolean {
        return try {
            val faceRecognizerInterface = Class.forName("io.udentify.android.face.activities.FaceRecognizer")
            val credsObj = buildFaceCredentials(credentials)
            
            val recognizer = java.lang.reflect.Proxy.newProxyInstance(
                faceRecognizerInterface.classLoader,
                arrayOf(faceRecognizerInterface)
            ) { _, m, args ->
                when (m.name) {
                    "onResult" -> {
                        val resultMap = createResultMap(
                            success = true,
                            message = "Photo authentication completed successfully",
                            data = emptyMap()
                        )
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onFaceRecognitionResult", resultMap)
                        }
                        inProgress = false
                    }
                    "onFailure" -> {
                        val errorMap = Arguments.createMap().apply {
                            putString("code", "PHOTO_AUTHENTICATION_ERROR")
                            putString("message", args?.getOrNull(0)?.toString() ?: "Photo authentication failed")
                        }
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onFaceRecognitionError", errorMap)
                        }
                        inProgress = false
                    }
                    "getCredentials" -> {
                        return@newProxyInstance credsObj
                    }
                }
                null
            }

            // Use the current activity if available, otherwise this won't work
            val activity = currentActivity ?: return false
            
            val clazz = Class.forName("io.udentify.android.face.activities.FaceRecognizerObject")
            val ctor = clazz.getConstructor(faceRecognizerInterface, android.app.Activity::class.java, String::class.java)
            val instance = ctor.newInstance(recognizer, activity, base64Image)
            val authMethod = clazz.getMethod("authenticateUser")
            authMethod.invoke(instance)
            
            inProgress = true
            true
        } catch (e: Throwable) {
            Log.e(TAG, "❌ Failed to authenticate user with photo", e)
            false
        }
    }

    // MARK: - Helper Methods
    
    /**
     * Build face credentials using SDK Builder pattern (from Flutter implementation)
     */
    private fun buildFaceCredentials(credentials: FaceRecognizerCredentials): Any? {
        return try {
            Log.i(TAG, "🔧 Building FaceRecognizerCredentials using SDK Builder pattern")
            
            val builderClass = Class.forName("io.udentify.android.face.FaceRecognizerCredentials\$Builder")
            var builder = builderClass.getDeclaredConstructor().newInstance()
            
            // Build credentials following SDK documentation
            builder = builderClass.getMethod("serverURL", String::class.java).invoke(builder, credentials.serverURL)
            builder = builderClass.getMethod("transactionID", String::class.java).invoke(builder, credentials.transactionID)
            builder = builderClass.getMethod("userID", String::class.java).invoke(builder, credentials.userID)
            builder = builderClass.getMethod("autoTake", Boolean::class.javaPrimitiveType).invoke(builder, credentials.autoTake)
            builder = builderClass.getMethod("errorDelay", Float::class.javaPrimitiveType).invoke(builder, credentials.errorDelay)
            builder = builderClass.getMethod("successDelay", Float::class.javaPrimitiveType).invoke(builder, credentials.successDelay)
            builder = builderClass.getMethod("runInBackground", Boolean::class.javaPrimitiveType).invoke(builder, credentials.runInBackground)
            builder = builderClass.getMethod("blinkDetectionEnabled", Boolean::class.javaPrimitiveType).invoke(builder, credentials.blinkDetectionEnabled)
            builder = builderClass.getMethod("requestTimeout", Int::class.javaPrimitiveType).invoke(builder, credentials.requestTimeout)
            builder = builderClass.getMethod("eyesOpenThreshold", Float::class.javaPrimitiveType).invoke(builder, credentials.eyesOpenThreshold)
            builder = builderClass.getMethod("invertedAnimation", Boolean::class.javaPrimitiveType).invoke(builder, credentials.invertedAnimation)
            builder = builderClass.getMethod("activeLivenessAutoNextEnabled", Boolean::class.javaPrimitiveType).invoke(builder, credentials.activeLivenessAutoNextEnabled)
            
            // Try to set maskConfidence - this is a critical parameter that can cause crashes if missing
            try {
                builder = builderClass.getMethod("maskConfidence", Double::class.javaPrimitiveType).invoke(builder, credentials.maskConfidence.toDouble())
                Log.d(TAG, "✅ Set maskConfidence to ${credentials.maskConfidence} (Double)")
            } catch (e: Exception) {
                Log.w(TAG, "⚠️ Could not set maskConfidence as Double, trying Float...")
                try {
                    builder = builderClass.getMethod("maskConfidence", Float::class.javaPrimitiveType).invoke(builder, credentials.maskConfidence)
                    Log.d(TAG, "✅ Set maskConfidence to ${credentials.maskConfidence} (Float)")
                } catch (e2: Exception) {
                    Log.w(TAG, "⚠️ Could not set maskConfidence at all: ${e2.message}")
                }
            }
            
            // Build the final credentials object
            val credentialsObj = builderClass.getMethod("build").invoke(builder)
            
            if (credentialsObj != null) {
                Log.i(TAG, "✅ FaceRecognizerCredentials built successfully")
                
                // Validate that maskConfidence is properly set (this was the source of crashes in Flutter)
                try {
                    val maskConfidenceMethod = credentialsObj.javaClass.getMethod("getMaskConfidence")
                    val maskConfidenceValue = maskConfidenceMethod.invoke(credentialsObj)
                    Log.d(TAG, "🎯 MaskConfidence value: $maskConfidenceValue (should not be null)")
                } catch (e: Exception) {
                    Log.w(TAG, "⚠️ Could not verify maskConfidence value: ${e.message}")
                }
            } else {
                Log.e(TAG, "❌ Built credentials object is null!")
            }
            
            credentialsObj
        } catch (e: Throwable) {
            Log.e(TAG, "❌ Failed to build FaceRecognizerCredentials with full builder", e)
            Log.i(TAG, "🔄 Attempting to create minimal working credentials object...")
            createMinimalCredentials(credentials)
        }
    }
    
    /**
     * Create minimal credentials as fallback
     */
    private fun createMinimalCredentials(credentials: FaceRecognizerCredentials): Any? {
        return try {
            Log.w(TAG, "🔄 Creating minimal credentials object with essential fields only")
            
            val builderClass = Class.forName("io.udentify.android.face.FaceRecognizerCredentials\$Builder")
            var builder = builderClass.getDeclaredConstructor().newInstance()
            
            Log.d(TAG, "📝 Setting only essential credential values...")
            
            // Set only the most essential fields
            builder = builderClass.getMethod("serverURL", String::class.java).invoke(builder, credentials.serverURL ?: "")
            builder = builderClass.getMethod("transactionID", String::class.java).invoke(builder, credentials.transactionID ?: "")
            builder = builderClass.getMethod("userID", String::class.java).invoke(builder, credentials.userID ?: "")
            
            // Try to set maskConfidence as the Flutter implementation shows this is critical
            try {
                builder = builderClass.getMethod("maskConfidence", Double::class.javaPrimitiveType).invoke(builder, 0.95)
                Log.d(TAG, "✅ Set minimal maskConfidence to 0.95 (Double)")
            } catch (e: Exception) {
                Log.w(TAG, "⚠️ Could not set minimal maskConfidence as Double, trying Float...")
                try {
                    builder = builderClass.getMethod("maskConfidence", Float::class.javaPrimitiveType).invoke(builder, 0.95f)
                    Log.d(TAG, "✅ Set minimal maskConfidence to 0.95 (Float)")
                } catch (e2: Exception) {
                    Log.w(TAG, "⚠️ Could not set minimal maskConfidence at all: ${e2.message}")
                }
            }
            
            // Build minimal credentials
            val credentialsObj = builderClass.getMethod("build").invoke(builder)
            
            if (credentialsObj != null) {
                Log.i(TAG, "✅ Minimal credentials created successfully")
                
                // Verify maskConfidence is set to prevent the original crash
                try {
                    val maskConfidenceMethod = credentialsObj.javaClass.getMethod("getMaskConfidence")
                    val value = maskConfidenceMethod.invoke(credentialsObj)
                    Log.d(TAG, "🎯 Minimal credentials maskConfidence: $value")
                } catch (e: Exception) {
                    Log.w(TAG, "⚠️ Could not verify minimal maskConfidence: ${e.message}")
                }
            } else {
                Log.e(TAG, "❌ Minimal credentials object is null")
            }
            
            credentialsObj
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to create minimal credentials", e)
            null
        }
    }
    
    /**
     * Extract response data from FaceIDMessage object like iOS does
     */
    private fun extractResponseData(serverResponse: Any?): Map<String, Any?> {
        return try {
            if (serverResponse == null) return emptyMap()
            
            val responseFields = mutableMapOf<String, Any?>()
            
            Log.i(TAG, "🔍 Extracting data from FaceIDMessage: ${serverResponse.javaClass.simpleName}")
            
            // Extract basic FaceIDMessage fields
            serverResponse.javaClass.declaredFields.forEach { field ->
                try {
                    field.isAccessible = true
                    val value = field.get(serverResponse)
                    
                    when (field.name) {
                        "faceIDResult" -> {
                            Log.i(TAG, "📊 Found faceIDResult: $value")
                            if (value != null) {
                                extractFaceIDResultData(value, responseFields)
                            }
                        }
                        "livenessResult" -> {
                            Log.i(TAG, "📊 Found livenessResult: $value")
                            if (value != null) {
                                extractLivenessResultData(value, responseFields)
                            }
                        }
                        "activeLivenessResult" -> {
                            Log.i(TAG, "📊 Found activeLivenessResult: $value")
                            if (value != null) {
                                extractActiveLivenessResultData(value, responseFields)
                            }
                        }
                        else -> {
                            when (value) {
                                is String, is Number, is Boolean, null -> {
                                    responseFields[field.name] = value
                                }
                                else -> {
                                    responseFields[field.name] = value.toString()
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.d(TAG, "⚠️ Could not access field ${field.name}: ${e.message}")
                }
            }
            
            Log.i(TAG, "✅ Extracted complete response data: $responseFields")
            responseFields
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error extracting response data: ${e.message}")
            emptyMap()
        }
    }
    
    /**
     * Extract FaceIDResult data like iOS does
     */
    private fun extractFaceIDResultData(faceIDResult: Any, responseFields: MutableMap<String, Any?>) {
        try {
            faceIDResult.javaClass.declaredFields.forEach { field ->
                try {
                    field.isAccessible = true
                    val value = field.get(faceIDResult)
                    when (value) {
                        is String, is Number, is Boolean, null -> {
                            responseFields[field.name] = value
                            Log.d(TAG, "📊 FaceIDResult.${field.name} = $value")
                        }
                        else -> {
                            responseFields[field.name] = value.toString()
                            Log.d(TAG, "📊 FaceIDResult.${field.name} = $value (toString)")
                        }
                    }
                } catch (e: Exception) {
                    Log.d(TAG, "⚠️ Could not access FaceIDResult.${field.name}: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error extracting FaceIDResult data: ${e.message}")
        }
    }
    
    /**
     * Extract LivenessResult data like iOS does
     */
    private fun extractLivenessResultData(livenessResult: Any, responseFields: MutableMap<String, Any?>) {
        try {
            livenessResult.javaClass.declaredFields.forEach { field ->
                try {
                    field.isAccessible = true
                    val value = field.get(livenessResult)
                    when (value) {
                        is String, is Number, is Boolean, null -> {
                            responseFields[field.name] = value
                            Log.d(TAG, "📊 LivenessResult.${field.name} = $value")
                        }
                        else -> {
                            responseFields[field.name] = value.toString()
                            Log.d(TAG, "📊 LivenessResult.${field.name} = $value (toString)")
                        }
                    }
                } catch (e: Exception) {
                    Log.d(TAG, "⚠️ Could not access LivenessResult.${field.name}: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error extracting LivenessResult data: ${e.message}")
        }
    }
    
    /**
     * Extract ActiveLivenessResult data
     */
    private fun extractActiveLivenessResultData(activeLivenessResult: Any, responseFields: MutableMap<String, Any?>) {
        try {
            activeLivenessResult.javaClass.declaredFields.forEach { field ->
                try {
                    field.isAccessible = true
                    val value = field.get(activeLivenessResult)
                    when (value) {
                        is String, is Number, is Boolean, null -> {
                            responseFields["active_${field.name}"] = value
                            Log.d(TAG, "📊 ActiveLivenessResult.${field.name} = $value")
                        }
                        is Map<*, *> -> {
                            responseFields["gestureResult"] = value
                            Log.d(TAG, "📊 ActiveLivenessResult.gestureResult = $value")
                        }
                        else -> {
                            responseFields["active_${field.name}"] = value.toString()
                            Log.d(TAG, "📊 ActiveLivenessResult.${field.name} = $value (toString)")
                        }
                    }
                } catch (e: Exception) {
                    Log.d(TAG, "⚠️ Could not access ActiveLivenessResult.${field.name}: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error extracting ActiveLivenessResult data: ${e.message}")
        }
    }

    /**
     * Create result map by passing through the actual server response - no artificial nesting
     */
    private fun createResultMap(success: Boolean, message: String, data: Map<String, Any?>): WritableMap {
        return Arguments.createMap().apply {
            // Add our own status indicator
            putString("status", if (success) "success" else "failure")
            
            // Pass through all server response data as-is
            data.forEach { (key, value) ->
                when (value) {
                    is String -> {
                        // Clean up "null" strings to actual nulls
                        if (value == "null") {
                            putNull(key)
                        } else {
                            putString(key, value)
                        }
                    }
                    is Number -> putDouble(key, value.toDouble())
                    is Boolean -> putBoolean(key, value)
                    is Map<*, *> -> {
                        // Handle nested objects like gestureResult
                        val nestedMap = Arguments.createMap()
                        value.forEach { (nestedKey, nestedValue) ->
                            when (nestedValue) {
                                is String -> nestedMap.putString(nestedKey.toString(), nestedValue)
                                is Number -> nestedMap.putDouble(nestedKey.toString(), nestedValue.toDouble())
                                is Boolean -> nestedMap.putBoolean(nestedKey.toString(), nestedValue)
                                else -> nestedMap.putString(nestedKey.toString(), nestedValue.toString())
                            }
                        }
                        putMap(key, nestedMap)
                    }
                    null -> putNull(key)
                    else -> putString(key, value.toString())
                }
            }
            
            // Add timestamp for tracking
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
    }

    /**
     * Create active liveness result map by passing through server response - no artificial nesting
     */
    private fun createActiveLivenessResultMap(data: Map<String, Any?> = emptyMap()): WritableMap {
        return createResultMap(
            success = data["verified"] as? Boolean ?: !(data["isFailed"] as? Boolean ?: true),
            message = "Active liveness completed",
            data = data
        )
    }


    /**
     * Create selfie recognition result map by passing through server response - no artificial nesting
     */
    private fun createSelfieRecognitionResultMap(success: Boolean, message: String, data: Map<String, Any?>, isAuthentication: Boolean): WritableMap {
        return createResultMap(success, message, data)
    }

    /**
     * Create hybrid liveness result map by passing through server response - no artificial nesting
     */
    private fun createHybridLivenessResultMap(data: Map<String, Any?> = emptyMap()): WritableMap {
        return createResultMap(
            success = data["verified"] as? Boolean ?: !(data["isFailed"] as? Boolean ?: true),
            message = "Hybrid liveness completed",
            data = data
        )
    }

    /**
     * Dismiss current fragment properly
     */
    private fun dismissCurrentFragment(tag: String) {
        try {
            currentActivity?.let { activity ->
                Handler(Looper.getMainLooper()).post {
                    val fragmentManager = activity.supportFragmentManager
                    val fragment = fragmentManager.findFragmentByTag(tag)
                    
                    fragment?.let {
                        fragmentManager.beginTransaction()
                            .remove(it)
                            .commitAllowingStateLoss()
                        
                        if (fragmentManager.backStackEntryCount > 0) {
                            fragmentManager.popBackStack()
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error dismissing fragment: ${e.message}")
        }
    }
}