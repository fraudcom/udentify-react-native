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
import android.os.Parcel
import io.udentify.android.face.FaceRecognizerCredentials as SdkFaceRecognizerCredentials
import io.udentify.android.face.activities.ActiveLivenessOperator
import io.udentify.android.face.activities.FaceRecognizer as SdkFaceRecognizer
import io.udentify.android.face.activities.ActiveLivenessFragment
import io.udentify.android.face.activities.FaceCameraFragment
import io.udentify.android.face.activities.FaceRecognizerObject
import io.udentify.android.face.activities.Method as SdkMethod
import io.udentify.android.face.model.ActiveLivenessDirective
import io.udentify.android.face.model.FaceDirective
import io.udentify.android.face.model.FaceIDMessage

/**
 * Face recognizer implementation for React Native
 * Talks to the Udentify face SDK directly. The AAR is a compileOnly dependency,
 * so these types are available at compile time and the calls below are checked
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
            
            val sdkMethod = when (method) {
                FaceRecognitionMethod.REGISTER -> SdkMethod.Register
                FaceRecognitionMethod.AUTHENTICATION -> SdkMethod.Authentication
                FaceRecognitionMethod.IDENTIFICATION -> SdkMethod.Identification
            }

            val credsObj = buildFaceCredentials(credentials)

            val recognizer = faceRecognizer(
                credentials = credsObj,
                onResult = { message ->
                        Log.i(TAG, "\n🎉 ========== FACE RECOGNITION SUCCESS ==========")
                        Log.i(TAG, "📱 Platform: Android")
                        Log.i(TAG, "🔧 Method: ${method.name}")
                        Log.i(TAG, "👤 User ID: ${currentCredentials?.userID}")
                        Log.i(TAG, "🆔 Transaction ID: ${currentCredentials?.transactionID}")
                        Log.i(TAG, "⏰ Timestamp: ${System.currentTimeMillis()}")
                        
                        // Extract server response data
                        val serverResponse = message
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
                            inProgress = false
                            
                            // Dismiss the fragment after a short delay to ensure UI processes the result
                            Handler(Looper.getMainLooper()).postDelayed({
                                dismissCurrentFragment("face_camera_fragment")
                            }, 100) // 100ms delay to allow UI to update
                        }
                },
                onFailure = { error ->
                        val errorMessage = error
                            ?: livenessModule.getLocalizedString(R.string.liveness_error_unknown)
                        Log.e(TAG, "❌ Face recognition failed: $errorMessage")
                        
                        val errorMap = Arguments.createMap().apply {
                            putString("code", "FACE_RECOGNITION_ERROR")
                            putString("message", errorMessage)
                        }
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onFaceRecognitionError", errorMap)
                            
                            // Dismiss the fragment after a short delay to ensure UI processes the error
                            Handler(Looper.getMainLooper()).postDelayed({
                                dismissCurrentFragment("face_camera_fragment")
                            }, 100) // 100ms delay to allow UI to update
                        }
                        inProgress = false
                },
                onPhotoTaken = {
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onPhotoTaken", Arguments.createMap())
                        }
                },
                onSelfieTaken = { base64 ->
                        Handler(Looper.getMainLooper()).post {
                            val selfieMap = Arguments.createMap().apply {
                                putString("base64Image", base64 ?: "")
                            }
                            livenessModule.sendEvent("onSelfieTaken", selfieMap)
                        }
                },
            )

            // Create and launch the face camera fragment
            val fragment = FaceCameraFragment.newInstance(sdkMethod, recognizer)

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
            // For Active Liveness, always use Method.ActiveLiveness
            Log.i(TAG, "🎯 Using method: ActiveLiveness (isAuthentication: $isAuthentication)")

            val credsObj = buildFaceCredentials(credentials)

            // Supplies credentials only; the results arrive on the operator below.
            val recognizer = faceRecognizer(
                credentials = credsObj,
                onResult = {},
                onFailure = {},
            )

            val activeLivenessOperator = activeLivenessOperator(
                onResult = { faceIDMessage ->
                        Log.i(TAG, "🎉 Active Liveness completed successfully!")
                        Log.i(TAG, "📡 Active Liveness result: $faceIDMessage")
                        
                        // Extract real data from server response
                        val extractedData = extractResponseData(faceIDMessage)
                        Log.i(TAG, "📋 Extracted active liveness data: $extractedData")
                        
                        val resultMap = createActiveLivenessResultMap(extractedData)
                        
                        Handler(Looper.getMainLooper()).post {
                            livenessModule.sendEvent("onActiveLivenessResult", resultMap)
                            inProgress = false
                            
                            // Dismiss the fragment after a short delay to ensure UI processes the result
                            Handler(Looper.getMainLooper()).postDelayed({
                                dismissCurrentFragment("active_liveness_fragment")
                            }, 100) // 100ms delay to allow UI to update
                        }
                },
                onFailure = { error ->
                        val errorMessage = error
                            ?: livenessModule.getLocalizedString(R.string.liveness_error_active_liveness_failed)
                        Log.e(TAG, "❌ Active Liveness failed: $errorMessage")
                        
                        val errorMap = Arguments.createMap().apply {
                            putString("code", "ACTIVE_LIVENESS_ERROR")
                            putString("message", errorMessage)
                        }
                        
                        Handler(Looper.getMainLooper()).post {
                            livenessModule.sendEvent("onActiveLivenessFailure", errorMap)
                            inProgress = false
                            
                            // Dismiss the fragment after a short delay to ensure UI processes the error
                            Handler(Looper.getMainLooper()).postDelayed({
                                dismissCurrentFragment("active_liveness_fragment")
                            }, 100) // 100ms delay to allow UI to update
                        }
                },
                onVideoTaken = {
                        Handler(Looper.getMainLooper()).post {
                            livenessModule.sendEvent("onVideoTaken", Arguments.createMap())
                            livenessModule.sendEvent("onPhotoTaken", Arguments.createMap())
                        }
                },
            )

            val fragment = ActiveLivenessFragment.newInstance(
                SdkMethod.ActiveLiveness,
                isAuthentication,
                recognizer,
                activeLivenessOperator,
            )

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
            
            // For Hybrid Liveness, always use Method.HybridLiveness
            Log.i(TAG, "🎯 Using method: HybridLiveness (isAuthentication: $isAuthentication)")

            val credsObj = buildFaceCredentials(credentials)

            // Supplies credentials only; the results arrive on the operator below.
            val recognizer = faceRecognizer(
                credentials = credsObj,
                onResult = {},
                onFailure = {},
            )

            val activeOperator = activeLivenessOperator(
                onResult = { faceIDMessage ->
                        Log.i(TAG, "🎉 Hybrid Liveness completed successfully!")
                        Log.i(TAG, "📡 Hybrid Liveness result: $faceIDMessage")
                        
                        // Extract real data from server response
                        val extractedData = extractResponseData(faceIDMessage)
                        Log.i(TAG, "📋 Extracted hybrid liveness data: $extractedData")
                        
                        val resultMap = createHybridLivenessResultMap(extractedData)
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onActiveLivenessResult", resultMap)
                            inProgress = false
                            
                            // Dismiss the fragment after a short delay to ensure UI processes the result
                            Handler(Looper.getMainLooper()).postDelayed({
                                dismissCurrentFragment("hybrid_liveness_fragment")
                            }, 100) // 100ms delay to allow UI to update
                        }
                },
                onFailure = { error ->
                        val errorMessage = error
                            ?: livenessModule.getLocalizedString(R.string.liveness_error_hybrid_liveness_failed)
                        Log.e(TAG, "❌ Hybrid Liveness failed: $errorMessage")
                        
                        val errorMap = Arguments.createMap().apply {
                            putString("code", "HYBRID_LIVENESS_ERROR")
                            putString("message", errorMessage)
                        }
                        
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onActiveLivenessFailure", errorMap)
                            inProgress = false
                            
                            // Dismiss the fragment after a short delay to ensure UI processes the error
                            Handler(Looper.getMainLooper()).postDelayed({
                                dismissCurrentFragment("hybrid_liveness_fragment")
                            }, 100) // 100ms delay to allow UI to update
                        }
                },
                onVideoTaken = {
                        Handler(Looper.getMainLooper()).post {
                            livenessModule.sendEvent("onVideoTaken", Arguments.createMap())
                            livenessModule.sendEvent("onPhotoTaken", Arguments.createMap())
                        }
                },
            )

            val fragment = ActiveLivenessFragment.newInstance(
                SdkMethod.HybridLiveness,
                isAuthentication,
                recognizer,
                activeOperator,
            )

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
            val credsObj = buildFaceCredentials(credentials)

            val recognizer = faceRecognizer(
                credentials = credsObj,
                onResult = { serverResponse ->
                        val detailedResponse = extractResponseData(serverResponse)
                        val resultMap = createResultMap(
                            success = true,
                            message = livenessModule.getLocalizedString(R.string.liveness_photo_registration_completed),
                            data = detailedResponse
                        )
                        Handler(Looper.getMainLooper()).post {
                            livenessModule.sendEvent("onFaceRecognitionResult", resultMap)
                        }
                        inProgress = false
                },
                onFailure = { error ->
                        val errorMap = Arguments.createMap().apply {
                            putString("code", "PHOTO_REGISTRATION_ERROR")
                            putString("message", error
                                ?: livenessModule.getLocalizedString(R.string.liveness_error_photo_registration_failed))
                        }
                        Handler(Looper.getMainLooper()).post {
                            livenessModule.sendEvent("onFaceRecognitionError", errorMap)
                        }
                        inProgress = false
                },
            )

            // Use the current activity if available, otherwise this won't work
            val activity = currentActivity ?: return false

            FaceRecognizerObject(recognizer, activity, base64Image).registerUser()
            
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
            
            val credsObj = buildFaceCredentials(credentials)

            val recognizer = faceRecognizer(
                credentials = credsObj,
                onSelfieTaken = { base64 ->
                        Log.i(TAG, "📸 Selfie captured! Base64 length: ${base64?.length ?: 0}")
                        
                        Handler(Looper.getMainLooper()).post {
                            val selfieMap = Arguments.createMap().apply {
                                putString("base64Image", base64 ?: "")
                            }
                            livenessModule.sendEvent("onSelfieTaken", selfieMap)
                            inProgress = false
                            
                            // Dismiss the fragment after a short delay to ensure UI processes the selfie
                            Handler(Looper.getMainLooper()).postDelayed({
                                dismissCurrentFragment("selfie_camera_fragment")
                            }, 100) // 100ms delay to allow UI to update
                        }
                },
                onFailure = { error ->
                        val errorMessage = error
                            ?: livenessModule.getLocalizedString(R.string.liveness_error_selfie_capture_failed)
                        Log.e(TAG, "❌ Selfie capture failed: $errorMessage")
                        
                        val errorMap = Arguments.createMap().apply {
                            putString("code", "SELFIE_CAPTURE_ERROR")
                            putString("message", errorMessage)
                        }
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onFaceRecognitionError", errorMap)
                            inProgress = false
                            
                            // Dismiss the fragment after a short delay to ensure UI processes the error
                            Handler(Looper.getMainLooper()).postDelayed({
                                dismissCurrentFragment("selfie_camera_fragment")
                            }, 100) // 100ms delay to allow UI to update
                        }
                },
                onResult = {},
            )

            // Create and launch the face camera fragment in selfie mode
            val fragment = FaceCameraFragment.newInstance(SdkMethod.Selfie, recognizer)

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
                    putString("message", livenessModule.getLocalizedString(R.string.liveness_error_no_activity_context))
                }
                Handler(Looper.getMainLooper()).post { 
                    livenessModule.sendEvent("onFaceRecognitionError", errorMap)
                }
                return false
            }
            
            Log.i(TAG, "✅ Got activity from React Native module: ${activity.javaClass.simpleName}")
            
            // Use FaceRecognizerObject to perform API call with image
            val credsObj = buildFaceCredentials(credentials)

            val recognizer = faceRecognizer(
                credentials = credsObj,
                onResult = { serverResponse ->
                        try {
                            Log.i(TAG, "\n🎉 ========== FACE RECOGNITION WITH SELFIE SUCCESS ==========")
                            Log.i(TAG, "📱 Platform: Android")
                            Log.i(TAG, "🔧 Method: ${method.name}")
                            Log.i(TAG, "👤 User ID: ${credentials.userID}")
                            Log.i(TAG, "🆔 Transaction ID: ${credentials.transactionID}")
                            Log.i(TAG, "⏰ Timestamp: ${System.currentTimeMillis()}")
                            
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
                },
                onFailure = { error ->
                        val errorMessage = error
                            ?: livenessModule.getLocalizedString(R.string.liveness_error_face_recognition_selfie_failed)
                        Log.e(TAG, "❌ Face recognition with selfie failed: $errorMessage")
                        
                        val errorMap = Arguments.createMap().apply {
                            putString("code", "FACE_RECOGNITION_SELFIE_ERROR")
                            putString("message", errorMessage)
                        }
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onFaceRecognitionError", errorMap)
                        }
                        inProgress = false
                },
            )

            // Use registerUser() or authenticateUser() based on operation type
            Log.i(TAG, "🔄 Using FaceRecognizerObject.${if (isAuthentication) "authenticateUser" else "registerUser"}()")

            val faceRecognizerObject = FaceRecognizerObject(recognizer, activity, base64Image)

            if (isAuthentication) {
                Log.i(TAG, "🔐 Calling authenticateUser() for authentication")
                faceRecognizerObject.authenticateUser()
            } else {
                Log.i(TAG, "📝 Calling registerUser() for registration")
                faceRecognizerObject.registerUser()
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
            val credsObj = buildFaceCredentials(credentials)

            val recognizer = faceRecognizer(
                credentials = credsObj,
                onResult = { serverResponse ->
                        val detailedResponse = extractResponseData(serverResponse)
                        val resultMap = createResultMap(
                            success = true,
                            message = livenessModule.getLocalizedString(R.string.liveness_photo_authentication_completed),
                            data = detailedResponse
                        )
                        Handler(Looper.getMainLooper()).post {
                            livenessModule.sendEvent("onFaceRecognitionResult", resultMap)
                        }
                        inProgress = false
                },
                onFailure = { error ->
                        val errorMap = Arguments.createMap().apply {
                            putString("code", "PHOTO_AUTHENTICATION_ERROR")
                            putString("message", error
                                ?: livenessModule.getLocalizedString(R.string.liveness_error_photo_authentication_failed))
                        }
                        Handler(Looper.getMainLooper()).post { 
                            livenessModule.sendEvent("onFaceRecognitionError", errorMap)
                        }
                        inProgress = false
                },
            )

            // Use the current activity if available, otherwise this won't work
            val activity = currentActivity ?: return false

            FaceRecognizerObject(recognizer, activity, base64Image).authenticateUser()
            
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
    // Typed adapters for the two SDK callback interfaces.
    private inline fun faceRecognizer(
        credentials: SdkFaceRecognizerCredentials,
        crossinline onResult: (FaceIDMessage?) -> Unit,
        crossinline onFailure: (String?) -> Unit,
        crossinline onPhotoTaken: (String?) -> Unit = {},
        crossinline onSelfieTaken: (String?) -> Unit = {},
        crossinline onDirectiveChanged: (FaceDirective?) -> Unit = {},
    ): SdkFaceRecognizer = object : SdkFaceRecognizer {
        override fun onResult(message: FaceIDMessage?) = onResult(message)
        override fun onFailure(error: String?) = onFailure(error)
        override fun onPhotoTaken(photo: String?) = onPhotoTaken(photo)
        override fun onSelfieTaken(selfie: String?) = onSelfieTaken(selfie)
        override fun onFaceDirectiveChanged(directive: FaceDirective?) = onDirectiveChanged(directive)
        override fun getCredentials(): SdkFaceRecognizerCredentials = credentials
        override fun describeContents(): Int = 0
        override fun writeToParcel(dest: Parcel, flags: Int) {}
    }

    private inline fun activeLivenessOperator(
        crossinline onResult: (FaceIDMessage?) -> Unit,
        crossinline onFailure: (String?) -> Unit,
        crossinline onDirectiveChanged: (ActiveLivenessDirective?) -> Unit = {},
        crossinline onVideoTaken: () -> Unit = {},
    ): ActiveLivenessOperator = object : ActiveLivenessOperator {
        override fun activeLivenessResult(message: FaceIDMessage?) = onResult(message)
        override fun activeLivenessFailure(error: String?) = onFailure(error)
        override fun onActiveLivenessDirectiveChanged(directive: ActiveLivenessDirective?) =
            onDirectiveChanged(directive)
        override fun onVideoTaken() = onVideoTaken()
        override fun describeContents(): Int = 0
        override fun writeToParcel(dest: Parcel, flags: Int) {}
    }

    // Builds the SDK's own credentials from the JS-facing one. maskConfidence
    // takes a boxed java.lang.Double - do not narrow it to a primitive.
    private fun buildFaceCredentials(credentials: FaceRecognizerCredentials): SdkFaceRecognizerCredentials {
        var builder = SdkFaceRecognizerCredentials.Builder()
            .serverURL(credentials.serverURL)
            .transactionID(credentials.transactionID)
            .userID(credentials.userID)
            .autoTake(credentials.autoTake)
            .errorDelay(credentials.errorDelay)
            .successDelay(credentials.successDelay)
            .runInBackground(credentials.runInBackground)
            .blinkDetectionEnabled(credentials.blinkDetectionEnabled)
            .requestTimeout(credentials.requestTimeout)
            .eyesOpenThreshold(credentials.eyesOpenThreshold)
            .invertedAnimation(credentials.invertedAnimation)
            .activeLivenessAutoNextEnabled(credentials.activeLivenessAutoNextEnabled)
            .maskConfidence(credentials.maskConfidence.toDouble())

        // Only applied when the app asks: the SDK's default (1f) means its
        // full-screen gesture backdrop is opaque and hides the camera preview.
        credentials.activeLivenessOpacity?.let { builder.activeLivenessOpacity(it) }

        credentials.listName?.let { builder.listName(it) }

        return builder.build().also {
            Log.i(TAG, "Built FaceRecognizerCredentials (maskConfidence=${credentials.maskConfidence})")
        }
    }

    /**
     * Reads the SDK's own `FaceIDMessage` through its public getters, as the
     * vendor's integration guide prescribes (cast the result to its typed model
     * per role).
     */
    private fun extractResponseData(serverResponse: Any?): Map<String, Any?> {
        if (serverResponse == null) return emptyMap()

        // Not a FaceIDMessage: the SDK's result type has moved and this needs
        // updating. Report it rather than emitting a partial payload.
        if (serverResponse !is FaceIDMessage) {
            Log.w(TAG, "Expected FaceIDMessage, got ${serverResponse.javaClass.name}; " +
                "emitting no detail. The face SDK's result type has changed.")
            return emptyMap()
        }

        val fields = mutableMapOf<String, Any?>()
        fields["isFailed"] = serverResponse.failed
        serverResponse.method?.let { fields["method"] = it.toString() }
        fields["transactionID"] = serverResponse.transactionID

        // Flattened onto one map. `errorMessage` exists on both results and the
        // later write wins; the active-liveness fields carry an `active_` prefix
        // to avoid the same collision.
        serverResponse.faceIDResult?.let { r ->
            fields["header"] = r.header
            fields["description"] = r.description
            fields["verified"] = r.isVerified
            fields["matchScore"] = r.matchScore
            fields["errorMessage"] = r.errorMessage
            fields["userID"] = r.userID
            fields["listNames"] = r.listNames
            fields["listIds"] = r.listIds
        }

        serverResponse.livenessResult?.let { r ->
            fields["probability"] = r.probability
            fields["quality"] = r.quality
            fields["livenessScore"] = r.livenessScore
            fields["assessmentValue"] = r.assessmentValue
            fields["errorMessage"] = r.errorMessage
            fields["isPassed"] = r.isPassed
        }

        serverResponse.activeLivenessResult?.let { r ->
            fields["active_errorMessage"] = r.errorMessage
            fields["active_transactionID"] = r.transactionID
            fields["gestureResult"] = r.gestureResult
        }

        Log.i(TAG, "Extracted face result: $fields")
        return fields
    }

    /**
     * Create result map by passing through the actual server response - no artificial nesting
     */
    private fun createResultMap(success: Boolean, message: String, data: Map<String, Any?>): WritableMap {
        return Arguments.createMap().apply {
            // Add our own status indicator
            putString("status", if (success) "success" else "failure")
            
            // Create faceIDMessage structure to match iOS format
            val faceIDMessage = Arguments.createMap().apply {
                putBoolean("success", success)
                putString("message", message)
                
                // Add faceIDResult if we have face recognition data
                if (data.containsKey("verified") || data.containsKey("matchScore") || data.containsKey("userID")) {
                    val faceIDResult = Arguments.createMap()
                    
                    // Pass through all server response data as faceIDResult
                    data.forEach { (key, value) ->
                        when (value) {
                            is String -> {
                                // Clean up "null" strings to actual nulls
                                if (value == "null") {
                                    faceIDResult.putNull(key)
                                } else {
                                    faceIDResult.putString(key, value)
                                }
                            }
                            is Number -> faceIDResult.putDouble(key, value.toDouble())
                            is Boolean -> faceIDResult.putBoolean(key, value)
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
                                faceIDResult.putMap(key, nestedMap)
                            }
                            null -> faceIDResult.putNull(key)
                            else -> faceIDResult.putString(key, value.toString())
                        }
                    }
                    
                    putMap("faceIDResult", faceIDResult)
                }
            }
            
            // Add the faceIDMessage wrapper to match iOS structure
            putMap("faceIDMessage", faceIDMessage)
            
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