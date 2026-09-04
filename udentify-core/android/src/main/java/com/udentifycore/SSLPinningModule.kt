package com.udentifycore

import android.content.Context
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import io.udentify.android.commons.model.UdentifySettingsProvider
import java.io.InputStream
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate

/**
 * SSLPinningModule
 * React Native module for SSL certificate pinning using UdentifySettingsProvider
 */
class SSLPinningModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "SSLPinningModule"
    }
    
    override fun getName(): String {
        return "SSLPinningModule"
    }
    
    /**
     * Load a certificate from the Android assets folder and set it for SSL pinning
     */
    @ReactMethod
    fun loadCertificateFromAssets(
        certificateName: String,
        extension: String,
        promise: Promise
    ) {
        try {
            Log.d(TAG, "loadCertificateFromAssets called: $certificateName.$extension")
            
            val context = reactApplicationContext
            
            // Use UdentifySettingsProvider to load the certificate
            val certificate = UdentifySettingsProvider.loadDERCertificateData(
                context,
                certificateName,
                extension
            )
            
            if (certificate == null) {
                val errorMessage = "Failed to load certificate '$certificateName.$extension' from assets. Ensure the certificate file exists in the assets folder and is in DER format."
                Log.e(TAG, "Error: $errorMessage")
                promise.reject("LOAD_CERT_ERROR", errorMessage)
                return
            }
            
            Log.d(TAG, "Certificate loaded, subject: ${certificate.subjectDN}")
            
            // Set the certificate using UdentifySettingsProvider
            UdentifySettingsProvider.setSSLCertificate(certificate)
            
            Log.d(TAG, "Certificate set successfully")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "Exception: ${e.message}", e)
            promise.reject("LOAD_CERT_ERROR", e.message, e)
        }
    }
    
    /**
     * Set SSL certificate using base64 encoded data
     */
    @ReactMethod
    fun setSSLCertificateBase64(
        certificateBase64: String,
        promise: Promise
    ) {
        try {
            Log.d(TAG, "setSSLCertificateBase64 called")
            
            // Decode base64 string
            val certificateBytes = Base64.decode(certificateBase64, Base64.DEFAULT)
            
            Log.d(TAG, "Certificate data decoded, size: ${certificateBytes.size} bytes")
            
            // Convert bytes to X509Certificate
            val certificateFactory = CertificateFactory.getInstance("X.509")
            val certificate = certificateFactory.generateCertificate(
                certificateBytes.inputStream()
            ) as X509Certificate
            
            Log.d(TAG, "Certificate parsed, subject: ${certificate.subjectDN}")
            
            // Set the certificate using UdentifySettingsProvider
            UdentifySettingsProvider.setSSLCertificate(certificate)
            
            Log.d(TAG, "Certificate set successfully")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "Exception: ${e.message}", e)
            promise.reject("SET_CERT_ERROR", e.message, e)
        }
    }
    
    /**
     * Remove the currently set SSL certificate
     */
    @ReactMethod
    fun removeSSLCertificate(promise: Promise) {
        try {
            Log.d(TAG, "removeSSLCertificate called")
            
            // Remove certificate using UdentifySettingsProvider
            UdentifySettingsProvider.removeSSLCertificate()
            
            Log.d(TAG, "Certificate removed successfully")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "Exception: ${e.message}", e)
            promise.reject("REMOVE_CERT_ERROR", e.message, e)
        }
    }
    
    /**
     * Get the currently set SSL certificate as base64 string
     */
    @ReactMethod
    fun getSSLCertificateBase64(promise: Promise) {
        try {
            Log.d(TAG, "getSSLCertificateBase64 called")
            
            // Get certificate using UdentifySettingsProvider
            val certificate = UdentifySettingsProvider.getSSLCertificate()
            
            if (certificate == null) {
                Log.d(TAG, "No certificate is currently set")
                promise.resolve(null)
                return
            }
            
            // Convert certificate to base64
            val certificateBytes = certificate.encoded
            val base64String = Base64.encodeToString(certificateBytes, Base64.NO_WRAP)
            
            Log.d(TAG, "Certificate retrieved, size: ${certificateBytes.size} bytes")
            promise.resolve(base64String)
            
        } catch (e: Exception) {
            Log.e(TAG, "Exception: ${e.message}", e)
            promise.reject("GET_CERT_ERROR", e.message, e)
        }
    }
    
    /**
     * Check if SSL pinning is enabled
     */
    @ReactMethod
    fun isSSLPinningEnabled(promise: Promise) {
        try {
            Log.d(TAG, "isSSLPinningEnabled called")
            
            // Check SSL pinning status using UdentifySettingsProvider
            val isEnabled = UdentifySettingsProvider.isSSLPinningEnabled()
            
            Log.d(TAG, "SSL pinning enabled: $isEnabled")
            promise.resolve(isEnabled)

        } catch (e: Exception) {
            Log.e(TAG, "Exception: ${e.message}", e)
            promise.reject("CHECK_STATUS_ERROR", e.message, e)
        }
    }

    /**
     * 26.1.3: Fetch transaction properties (e.g. U18) for a transaction and cache them in
     * UdentifySettingsProvider so subsequent SDK flows honour them. Performs a network request,
     * so it runs off the main thread. Resolves with the list of property names.
     */
    @ReactMethod
    fun fetchTransactionProperties(serverURL: String, transactionID: String, promise: Promise) {
        Thread {
            try {
                val properties = UdentifySettingsProvider.getTransactionProperties(serverURL, transactionID)
                val names = Arguments.createArray()
                properties?.forEach { names.pushString(it.name) }
                Log.d(TAG, "fetchTransactionProperties resolved: ${properties?.map { it.name }}")
                promise.resolve(names)
            } catch (e: Exception) {
                Log.e(TAG, "fetchTransactionProperties error: ${e.message}", e)
                promise.reject("FETCH_TRANSACTION_PROPERTIES_ERROR", e.message, e)
            }
        }.start()
    }

    /**
     * 26.1.3: Clear any cached transaction properties.
     */
    @ReactMethod
    fun resetTransactionProperties(promise: Promise) {
        try {
            UdentifySettingsProvider.setTransactionProperties(null)
            Log.d(TAG, "resetTransactionProperties done")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "resetTransactionProperties error: ${e.message}", e)
            promise.reject("RESET_TRANSACTION_PROPERTIES_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setDeviceInfoSubPath(subPath: String?, promise: Promise) {
        try {
            UdentifySettingsProvider.setDeviceInfoSubPath(subPath)
            Log.d(TAG, "setDeviceInfoSubPath done, readback: ${UdentifySettingsProvider.getDeviceInfoSubPath()}")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "setDeviceInfoSubPath error: ${e.message}", e)
            promise.reject("SET_DEVICE_INFO_SUBPATH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getDeviceInfoSubPath(promise: Promise) {
        try {
            promise.resolve(UdentifySettingsProvider.getDeviceInfoSubPath())
        } catch (e: Exception) {
            Log.e(TAG, "getDeviceInfoSubPath error: ${e.message}", e)
            promise.reject("GET_DEVICE_INFO_SUBPATH_ERROR", e.message, e)
        }
    }
}

