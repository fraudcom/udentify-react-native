package com.nfcrnlibrary

import android.content.Intent
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap

// UdentifyNFC SDK imports
import io.udentify.android.nfc.ApiCredentials
import io.udentify.android.nfc.CardData
import io.udentify.android.nfc.reader.NFCReaderActivity
import io.udentify.android.nfc.reader.NFCReaderFragment
import io.udentify.android.nfc.reader.NFCState

/**
 * Proper NFCReaderActivity wrapper that extends Udentify SDK's NFCReaderActivity
 * This is launched as a real Android Activity as the SDK intends
 */
class NFCReaderActivityWrapper : NFCReaderActivity() {

    companion object {
        private const val TAG = "NFCReaderActivityWrapper"
        
        // Static references for Activity communication
        var staticCredentials: ApiCredentials? = null
        var staticNFCModule: NFCModule? = null
        var staticPromise: Promise? = null
        private var currentFragment: NFCReaderFragment? = null
        
        // Method to start inline NFC reading using Fragment
        fun startInlineNFCReading(
            activity: AppCompatActivity, 
            apiCredentials: ApiCredentials, 
            nfcModule: NFCModule, 
            promise: Promise
        ) {
            try {
                Log.d(TAG, "Starting inline NFC reading with Udentify SDK Fragment")
                
                // Store static references
                staticCredentials = apiCredentials
                staticNFCModule = nfcModule
                staticPromise = promise
                
                // Ensure fragment operations run on main UI thread
                activity.runOnUiThread {
                    try {
                        // Create and configure NFCReaderFragment using the static class
                        currentFragment = InlineNFCReaderFragment()
                        
                        // Add fragment to current activity with proper container
                        val fragmentManager = activity.supportFragmentManager
                        val transaction = fragmentManager.beginTransaction()
                        
                        // Use android.R.id.content as container (main content view)
                        transaction.add(android.R.id.content, currentFragment!!, "nfc_reader_fragment")
                        transaction.commitAllowingStateLoss()
                        
                        // Ensure fragment is started
                        fragmentManager.executePendingTransactions()
                        
                        Log.d(TAG, "NFCReaderFragment added successfully on main thread")
                        
                        // NFC fragment started successfully
                        
                        // Fragment is now ready - Udentify SDK will handle real NFC events automatically
                        Log.d(TAG, "NFC fragment is ready for real NFC events")
                        
                    } catch (e: Exception) {
                        Log.e(TAG, "Error during fragment startup on main thread: ${e.message}", e)
                        promise.reject("NFC_ERROR", "Failed to start fragment on main thread: ${e.message}")
                    }
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Error starting inline NFC reading: ${e.message}", e)
                promise.reject("NFC_ERROR", "Failed to start inline NFC reading: ${e.message}")
            }
        }
        
        // Method to stop inline NFC reading
        fun stopInlineNFCReading(activity: AppCompatActivity) {
            try {
                activity.runOnUiThread {
                    currentFragment?.let { fragment ->
                        try {
                            val fragmentManager = activity.supportFragmentManager
                            val transaction = fragmentManager.beginTransaction()
                            transaction.remove(fragment)
                            transaction.commitAllowingStateLoss()
                            currentFragment = null
                            Log.d(TAG, "NFCReaderFragment removed successfully on main thread")
                        } catch (e: Exception) {
                            Log.e(TAG, "Error removing fragment on main thread: ${e.message}", e)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping inline NFC reading: ${e.message}", e)
            }
        }
        
        fun handleSuccess(cardData: CardData) {
            try {
                Log.d(TAG, "NFCReaderActivityWrapper - NFC reading successful")
                
                // Create separate WritableMap instances to avoid consumption issues
                val resultForEvent = convertCardDataToWritableMap(cardData)
                val resultForPromise = convertCardDataToWritableMap(cardData)
                
                // Emit success event first (like OCR module pattern)
                staticNFCModule?.emitNFCPassportSuccess(resultForEvent)
                
                // Then resolve promise if available with separate map instance
                staticPromise?.let { promise ->
                    promise.resolve(resultForPromise)
                    staticPromise = null
                } ?: run {
                    Log.w(TAG, "NFCReaderActivityWrapper - No promise available to resolve")
                }
                
                // Remove the fragment first, then clean up references
                currentFragment?.let { fragment ->
                    val activity = fragment.activity
                    if (activity is AppCompatActivity) {
                        activity.runOnUiThread {
                            try {
                                val fragmentManager = activity.supportFragmentManager
                                val transaction = fragmentManager.beginTransaction()
                                transaction.remove(fragment)
                                transaction.commitAllowingStateLoss()
                                currentFragment = null
                                Log.d(TAG, "NFCReaderActivityWrapper - Fragment removed after success")
                                
                                // Clean up references after fragment is removed
                                staticCredentials = null
                                staticNFCModule = null
                                Log.d(TAG, "NFCReaderActivityWrapper - Static references cleaned up")
                            } catch (e: Exception) {
                                Log.e(TAG, "NFCReaderActivityWrapper - Error removing fragment: ${e.message}", e)
                                // Clean up anyway
                                staticCredentials = null
                                staticNFCModule = null
                            }
                        }
                    } else {
                        // Clean up anyway if no proper activity
                        staticCredentials = null
                        staticNFCModule = null
                    }
                } ?: run {
                    // No current fragment, just clean up
                    staticCredentials = null
                    staticNFCModule = null
                    Log.d(TAG, "NFCReaderActivityWrapper - No fragment to remove, cleaned up references")
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "NFCReaderActivityWrapper - Error processing card data: ${e.message}", e)
                handleFailure(e)
            }
        }
        
        fun handleFailure(throwable: Throwable) {
            try {
                Log.e(TAG, "NFCReaderActivityWrapper - NFC reading failed: ${throwable.message}", throwable)
                
                // Emit error event first (like OCR module pattern)
                staticNFCModule?.emitNFCError(throwable.message ?: "Unknown NFC error")
                
                // Then reject promise if available
                staticPromise?.let { promise ->
                    promise.reject("NFC_ERROR", throwable.message ?: "NFC reading failed")
                    staticPromise = null
                } ?: run {
                    Log.w(TAG, "NFCReaderActivityWrapper - No promise available to reject")
                }
                
                // Clean up references
                staticCredentials = null
                staticNFCModule = null
                
            } catch (e: Exception) {
                Log.e(TAG, "NFCReaderActivityWrapper - Error handling failure: ${e.message}", e)
            }
        }
        
        fun handleStateChange(nfcState: NFCState) {
            when (nfcState) {
                NFCState.ENABLED -> {
                    Log.d(TAG, "NFC is enabled")
                }
                NFCState.DISABLED -> {
                    Log.w(TAG, "NFC is disabled")
                    staticNFCModule?.emitNFCError("NFC is disabled on this device")
                }
                NFCState.ENABLING -> {
                    Log.d(TAG, "NFC is enabling")
                }
                NFCState.DISABLING -> {
                    Log.d(TAG, "NFC is disabling")
                }
            }
        }
        
        private fun convertCardDataToWritableMap(cardData: CardData): WritableMap {
            val result = WritableNativeMap()
            
            result.putBoolean("success", true)
            result.putString("transactionID", staticCredentials?.transactionID ?: "")
            result.putDouble("timestamp", System.currentTimeMillis().toDouble())
            
            // Personal information from CardData
            cardData.firstName?.let { result.putString("firstName", it) }
            cardData.lastName?.let { result.putString("lastName", it) }
            cardData.documentNumber?.let { result.putString("documentNumber", it) }
            cardData.nationality?.let { result.putString("nationality", it) }
            cardData.birthDate?.let { result.putString("dateOfBirth", it) }
            cardData.expireDate?.let { result.putString("expiryDate", it) }
            cardData.gender?.let { result.putString("gender", it) }
            cardData.identityNo?.let { result.putString("personalNumber", it) }
            cardData.birthPlace?.let { result.putString("placeOfBirth", it) }
            cardData.documentType?.let { result.putString("documentType", it) }
            cardData.address?.let { result.putString("address", it) }
            cardData.phoneNumber?.let { result.putString("phoneNumber", it) }
            cardData.email?.let { result.putString("email", it) }
            
            // Authentication results
            cardData.passiveAuthInfo?.let { dgResponse ->
                result.putString("passedPA", if (dgResponse.toString().contains("success", true)) "true" else "false")
            }
            
            cardData.activeAuthInfo?.let { dgResponse ->
                result.putString("passedAA", if (dgResponse.toString().contains("success", true)) "true" else "false")
            }
            
            // Convert images to base64 if available
            cardData.rawPhoto?.let { bitmap ->
                try {
                    val base64String = staticNFCModule?.convertBitmapToBase64(bitmap)
                    result.putString("faceImage", base64String ?: "")
                } catch (e: Exception) {
                    Log.e(TAG, "Error converting face image to base64: ${e.message}", e)
                }
            }
            
            cardData.idImg?.let { bitmap ->
                try {
                    val base64String = staticNFCModule?.convertBitmapToBase64(bitmap)
                    result.putString("idImage", base64String ?: "")
                } catch (e: Exception) {
                    Log.e(TAG, "Error converting ID image to base64: ${e.message}", e)
                }
            }
            
            return result
        }
    }

    // Override required methods from NFCReaderActivity as per Udentify SDK documentation
    override fun getCallerActivity(): AppCompatActivity {
        return this // The Activity itself
    }

    override fun getApiCredentials(): ApiCredentials {
        return staticCredentials ?: throw IllegalStateException("ApiCredentials not set - call startNFCReading first")
    }

    override fun onSuccess(cardData: CardData) {
        Log.d(TAG, "NFC reading successful")
        
        try {
            // Create separate WritableMap instances to avoid consumption issues
            val resultForEvent = convertCardDataToWritableMap(cardData)
            val resultForPromise = convertCardDataToWritableMap(cardData)
            
            // Emit success event
            staticNFCModule?.emitNFCPassportSuccess(resultForEvent)
            
            // Resolve promise with separate map instance
            staticPromise?.resolve(resultForPromise)
            staticPromise = null
            
            // Close activity and clean up
            finish()
            staticCredentials = null
            staticNFCModule = null
            
        } catch (e: Exception) {
            Log.e(TAG, "Error processing card data: ${e.message}", e)
            onFailure(e)
        }
    }

    override fun onFailure(throwable: Throwable) {
        Log.e(TAG, "NFC reading failed: ${throwable.message}", throwable)
        
        // Emit error event
        staticNFCModule?.emitNFCError(throwable.message ?: "Unknown NFC error")
        
        // Reject promise
        staticPromise?.reject("NFC_ERROR", throwable.message ?: "NFC reading failed")
        staticPromise = null
        
        // Close activity and clean up
        finish()
        staticCredentials = null
        staticNFCModule = null
    }

    override fun onState(nfcState: NFCState) {
        Log.d(TAG, "NFC state changed: $nfcState")
        
        when (nfcState) {
            NFCState.ENABLED -> {
                Log.d(TAG, "NFC is enabled")
            }
            NFCState.DISABLED -> {
                Log.w(TAG, "NFC is disabled")
                staticNFCModule?.emitNFCError("NFC is disabled on this device")
            }
            NFCState.ENABLING -> {
                Log.d(TAG, "NFC is enabling")
            }
            NFCState.DISABLING -> {
                Log.d(TAG, "NFC is disabling")
            }
        }
    }

    override fun onProgress(progress: Int) {
        Log.d(TAG, "NFC reading progress: $progress%")
        // Progress updates are no longer emitted to UI
    }
    
    // Real CardData conversion - no mock data

    private fun convertCardDataToWritableMap(cardData: CardData): WritableMap {
        val result = WritableNativeMap()
        
        result.putBoolean("success", true)
        result.putString("transactionID", staticCredentials?.transactionID ?: "")
        result.putDouble("timestamp", System.currentTimeMillis().toDouble())
        
        // Personal information from CardData (using actual property names)
        cardData.firstName?.let { result.putString("firstName", it) }
        cardData.lastName?.let { result.putString("lastName", it) }
        cardData.documentNumber?.let { result.putString("documentNumber", it) }
        cardData.nationality?.let { result.putString("nationality", it) }
        cardData.birthDate?.let { result.putString("dateOfBirth", it) }
        cardData.expireDate?.let { result.putString("expiryDate", it) }
        cardData.gender?.let { result.putString("gender", it) }
        cardData.identityNo?.let { result.putString("personalNumber", it) }
        cardData.birthPlace?.let { result.putString("placeOfBirth", it) }
        cardData.documentType?.let { result.putString("documentType", it) }
        cardData.address?.let { result.putString("address", it) }
        cardData.phoneNumber?.let { result.putString("phoneNumber", it) }
        cardData.email?.let { result.putString("email", it) }
        
        // Authentication results from DGResponse objects
        cardData.passiveAuthInfo?.let { dgResponse ->
            // Convert DGResponse to readable format - this might need adjustment based on DGResponse structure
            result.putString("passedPA", if (dgResponse.toString().contains("success", true)) "true" else "false")
        }
        
        cardData.activeAuthInfo?.let { dgResponse ->
            // Convert DGResponse to readable format - this might need adjustment based on DGResponse structure
            result.putString("passedAA", if (dgResponse.toString().contains("success", true)) "true" else "false")
        }
        
        // Convert images to base64 if available
        cardData.rawPhoto?.let { bitmap ->
            try {
                val base64String = staticNFCModule?.convertBitmapToBase64(bitmap)
                result.putString("faceImage", base64String ?: "")
            } catch (e: Exception) {
                Log.e(TAG, "Error converting face image to base64: ${e.message}", e)
            }
        }
        
        cardData.idImg?.let { bitmap ->
            try {
                val base64String = staticNFCModule?.convertBitmapToBase64(bitmap)
                result.putString("idImage", base64String ?: "")
            } catch (e: Exception) {
                Log.e(TAG, "Error converting ID image to base64: ${e.message}", e)
            }
        }
        
        return result
    }
}

/**
 * Static fragment class that properly extends NFCReaderFragment
 * This is required for Android fragment recreation from instance state
 */
class InlineNFCReaderFragment : NFCReaderFragment() {
    
    override fun getCallerActivity(): AppCompatActivity {
        return activity as? AppCompatActivity 
            ?: throw IllegalStateException("Fragment must be attached to an AppCompatActivity")
    }
    
    override fun getApiCredentials(): ApiCredentials {
        return NFCReaderActivityWrapper.staticCredentials 
            ?: throw IllegalStateException("ApiCredentials not set - fragment should be removed after success")
    }
    
    override fun onSuccess(cardData: CardData) {
        Log.d("InlineNFCReaderFragment", "Inline NFC reading successful")
        NFCReaderActivityWrapper.handleSuccess(cardData)
    }
    
    override fun onFailure(throwable: Throwable) {
        Log.e("InlineNFCReaderFragment", "Inline NFC reading failed: ${throwable.message}", throwable)
        NFCReaderActivityWrapper.handleFailure(throwable)
    }
    
    override fun onState(nfcState: NFCState) {
        Log.d("InlineNFCReaderFragment", "NFC state changed: $nfcState")
        NFCReaderActivityWrapper.handleStateChange(nfcState)
    }
    
    override fun onProgress(progress: Int) {
        Log.d("InlineNFCReaderFragment", "NFC reading progress: $progress%")
        // Progress updates are no longer emitted to UI
    }
    
    override fun onResume() {
        try {
            // Check if credentials are still available before calling super.onResume()
            if (NFCReaderActivityWrapper.staticCredentials != null) {
                super.onResume()
                Log.d("InlineNFCReaderFragment", "Fragment resumed - NFC reading should start automatically")
                
                // Fragment is active and ready for NFC reading
            } else {
                Log.d("InlineNFCReaderFragment", "Fragment resumed but credentials cleared - likely after success, removing fragment")
                // Credentials were cleared (probably after success), remove this fragment
                activity?.let { activity ->
                    if (activity is AppCompatActivity) {
                        activity.runOnUiThread {
                            try {
                                val fragmentManager = activity.supportFragmentManager
                                val transaction = fragmentManager.beginTransaction()
                                transaction.remove(this)
                                transaction.commitAllowingStateLoss()
                                Log.d("InlineNFCReaderFragment", "Fragment removed successfully after credentials cleanup")
                            } catch (e: Exception) {
                                Log.e("InlineNFCReaderFragment", "Error removing fragment: ${e.message}", e)
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("InlineNFCReaderFragment", "Error in onResume: ${e.message}", e)
            // Try to remove the fragment to prevent further issues
            activity?.let { activity ->
                if (activity is AppCompatActivity) {
                    activity.runOnUiThread {
                        try {
                            val fragmentManager = activity.supportFragmentManager
                            val transaction = fragmentManager.beginTransaction()
                            transaction.remove(this)
                            transaction.commitAllowingStateLoss()
                        } catch (removeException: Exception) {
                            Log.e("InlineNFCReaderFragment", "Error removing fragment after exception: ${removeException.message}", removeException)
                        }
                    }
                }
            }
        }
    }
    
    override fun onPause() {
        super.onPause()
        Log.d("InlineNFCReaderFragment", "Fragment paused - NFC reading stopped")
    }
}


