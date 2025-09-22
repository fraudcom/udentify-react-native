package com.mrzrnlibrary

import android.Manifest
import android.annotation.TargetApi
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.ImageFormat
import android.graphics.Matrix
import android.graphics.Point
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.SurfaceTexture
import android.hardware.camera2.CameraAccessException
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CaptureRequest
import android.hardware.camera2.CaptureResult
import android.hardware.camera2.TotalCaptureResult
import android.hardware.camera2.params.StreamConfigurationMap
import android.media.ImageReader
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import android.util.Size
import android.util.SparseIntArray
import android.view.Surface
import android.view.TextureView
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast

import androidx.annotation.NonNull
import androidx.core.app.ActivityCompat

import org.json.JSONException
import org.json.JSONObject

import java.util.ArrayList
import java.util.Arrays
import java.util.Collections
import java.util.Comparator
import java.util.List
import java.util.concurrent.Semaphore
import java.util.concurrent.TimeUnit

import io.udentify.android.mrz.AutoFitTextureView
import io.udentify.android.mrz.enums.MrzReaderMode
import io.udentify.android.mrz.reader.MrzReaderActivity

class MrzCameraActivity : MrzReaderActivity() {

    companion object {
        private const val TAG = "MrzCameraActivity"
        const val RESULT_MRZ_DATA = "result"
        
        // MRZ JSON keys
        private const val MRZ_DOC_NO = "documentNumber"
        private const val MRZ_DATE_OF_BIRTH = "dateOfBirth"
        private const val MRZ_DATE_OF_EXPIRE = "dateOfExpiration"
        
        private const val REQUEST_VIDEO_PERMISSIONS = 1
        private val VIDEO_PERMISSIONS = arrayOf(Manifest.permission.CAMERA)
        
        private const val STATE_PREVIEW = 0
        private const val STATE_WAITING_LOCK = 1
        private const val STATE_WAITING_PRECAPTURE = 2
        private const val STATE_WAITING_NON_PRECAPTURE = 3
        private const val STATE_PICTURE_TAKEN = 4
        
        private const val MAX_PREVIEW_WIDTH = 1920
        private const val MAX_PREVIEW_HEIGHT = 1080
    }

    private val ORIENTATIONS = SparseIntArray().apply {
        append(Surface.ROTATION_0, 90)
        append(Surface.ROTATION_90, 0)
        append(Surface.ROTATION_180, 270)
        append(Surface.ROTATION_270, 180)
    }

    private var isCameraReady = false
    private var isProcessFinished = true
    private var completed = false
    private var mrzResult: String? = null
    
    private var mCameraId: String? = null
    private var mTextureView: AutoFitTextureView? = null
    private var mCaptureSession: CameraCaptureSession? = null
    private var mCameraDevice: CameraDevice? = null
    private var mPreviewSize: Size? = null
    private var mBackgroundThread: HandlerThread? = null
    private var mBackgroundHandler: Handler? = null
    private var mImageReader: ImageReader? = null
    private var rect: Rect? = null
    
    private var txtDocNo: TextView? = null
    private var txtBirthDate: TextView? = null
    private var txtExpireDate: TextView? = null
    private var btnNext: Button? = null
    
    private var mPreviewRequestBuilder: CaptureRequest.Builder? = null
    private var mPreviewRequest: CaptureRequest? = null
    private var mState = STATE_PREVIEW
    private val mCameraOpenCloseLock = Semaphore(1)
    private var mFlashSupported = false
    private var mSensorOrientation = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_mrz_camera)
        
        txtDocNo = findViewById(R.id.txtDocNo)
        txtBirthDate = findViewById(R.id.txtBirthDate)
        txtExpireDate = findViewById(R.id.txtExpirationDate)
        btnNext = findViewById(R.id.btnNext)
        
        btnNext?.setOnClickListener {
            val returnIntent = Intent().apply {
                putExtra(RESULT_MRZ_DATA, mrzResult)
            }
            setResult(Activity.RESULT_OK, returnIntent)
            finish()
        }
    }

    override fun onResume() {
        super.onResume()
        resetViews()
        
        val previewView = findViewById<View>(R.id.mrz_preview)
        previewView?.post {
            rect = Rect(
                previewView.left,
                previewView.top,
                previewView.right,
                previewView.bottom
            )
        }
        
        mTextureView = findViewById(R.id.mrz_camera_texture)
        
        startBackgroundThread()
        completed = false
        isProcessFinished = true
        
        mTextureView?.let { textureView ->
            if (textureView.isAvailable) {
                openCamera(textureView.width, textureView.height)
            } else {
                textureView.surfaceTextureListener = mSurfaceTextureListener
            }
        }
    }
    
    override fun onPause() {
        closeCamera()
        stopBackgroundThread()
        super.onPause()
    }
    
    private fun resetViews() {
        btnNext?.visibility = View.GONE
        txtDocNo?.text = ""
        txtBirthDate?.text = ""
        txtExpireDate?.text = ""
    }
    
    override fun getCallerActivity(): Activity = this
    
    override fun getMrzReaderMode(): MrzReaderMode = MrzReaderMode.FAST
    
    override fun onSuccess(s: String) {
        try {
            Log.i(TAG, "✅ MRZ scanning successful")
            Log.i(TAG, "🔍 Raw MRZ data received: $s")
            
            mrzResult = s
            
            // Let's see what the actual JSON structure looks like
            val mrzDataObject = JSONObject(s)
            Log.i(TAG, "📋 JSON Keys available: ${mrzDataObject.keys().asSequence().toList()}")
            
            // Try multiple possible key names for document number
            val docNo = when {
                mrzDataObject.has("documentNumber") -> mrzDataObject.optString("documentNumber", "")
                mrzDataObject.has("docNo") -> mrzDataObject.optString("docNo", "")
                mrzDataObject.has("document_number") -> mrzDataObject.optString("document_number", "")
                mrzDataObject.has("doc_no") -> mrzDataObject.optString("doc_no", "")
                else -> {
                    Log.w(TAG, "⚠️ Document number key not found in available keys")
                    ""
                }
            }
            
            // Try multiple possible key names for birth date
            val birthDate = when {
                mrzDataObject.has("dateOfBirth") -> mrzDataObject.optString("dateOfBirth", "")
                mrzDataObject.has("birthDate") -> mrzDataObject.optString("birthDate", "")
                mrzDataObject.has("date_of_birth") -> mrzDataObject.optString("date_of_birth", "")
                mrzDataObject.has("birth_date") -> mrzDataObject.optString("birth_date", "")
                else -> {
                    Log.w(TAG, "⚠️ Birth date key not found in available keys")
                    ""
                }
            }
            
            // Try multiple possible key names for expiration date
            val expireDate = when {
                mrzDataObject.has("date_of_expire") -> mrzDataObject.optString("date_of_expire", "")
                mrzDataObject.has("dateOfExpiration") -> mrzDataObject.optString("dateOfExpiration", "")
                mrzDataObject.has("expirationDate") -> mrzDataObject.optString("expirationDate", "")
                mrzDataObject.has("expireDate") -> mrzDataObject.optString("expireDate", "")
                mrzDataObject.has("date_of_expiration") -> mrzDataObject.optString("date_of_expiration", "")
                mrzDataObject.has("expiration_date") -> mrzDataObject.optString("expiration_date", "")
                else -> {
                    Log.w(TAG, "⚠️ Expiration date key not found in available keys")
                    ""
                }
            }
            
            Log.i(TAG, "📝 Extracted data - Doc: $docNo, Birth: $birthDate, Expire: $expireDate")
            
            isProcessFinished = false
            completed = true
            
            runOnUiThread {
                btnNext?.visibility = View.VISIBLE
                txtDocNo?.text = docNo
                txtBirthDate?.text = birthDate
                txtExpireDate?.text = expireDate
            }
            
        } catch (e: JSONException) {
            Log.e(TAG, "❌ Error parsing MRZ JSON: ${e.message}", e)
            onFailure(e)
        }
    }

    override fun onFailure(throwable: Throwable) {
        isProcessFinished = true
        Log.i(TAG, "❌ MRZ scanning failed: ${throwable.message}")
    }
    
    private val mSurfaceTextureListener = object : TextureView.SurfaceTextureListener {
        override fun onSurfaceTextureAvailable(texture: SurfaceTexture, width: Int, height: Int) {
            openCamera(width, height)
        }
        
        override fun onSurfaceTextureSizeChanged(texture: SurfaceTexture, width: Int, height: Int) {
            configureTransform(width, height)
        }
        
        override fun onSurfaceTextureDestroyed(texture: SurfaceTexture): Boolean = true
        
        override fun onSurfaceTextureUpdated(texture: SurfaceTexture) {
            if (isCameraReady && !completed && rect != null) {
                if (!isProcessFinished) return
                
                isProcessFinished = false
                mTextureView?.let { textureView ->
                    val photo = textureView.getBitmap()
                    rect?.let { r -> readMRZ(photo, r) }
                }
            }
        }
    }
    
    private val mStateCallback = object : CameraDevice.StateCallback() {
        override fun onOpened(cameraDevice: CameraDevice) {
            mCameraOpenCloseLock.release()
            mCameraDevice = cameraDevice
            createCameraPreviewSession()
        }
        
        override fun onDisconnected(cameraDevice: CameraDevice) {
            mCameraOpenCloseLock.release()
            cameraDevice.close()
            mCameraDevice = null
        }
        
        override fun onError(cameraDevice: CameraDevice, error: Int) {
            mCameraOpenCloseLock.release()
            cameraDevice.close()
            mCameraDevice = null
            finish()
        }
    }
    
    private fun startBackgroundThread() {
        mBackgroundThread = HandlerThread("CameraBackground")
        mBackgroundThread?.start()
        mBackgroundHandler = Handler(mBackgroundThread?.looper!!)
    }
    
    private fun stopBackgroundThread() {
        mBackgroundThread?.quitSafely()
        try {
            mBackgroundThread?.join()
            mBackgroundThread = null
            mBackgroundHandler = null
        } catch (e: InterruptedException) {
            e.printStackTrace()
        }
    }
    
    @TargetApi(Build.VERSION_CODES.M)
    private fun requestVideoPermissions() {
        requestPermissions(VIDEO_PERMISSIONS, REQUEST_VIDEO_PERMISSIONS)
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        if (requestCode == REQUEST_VIDEO_PERMISSIONS) {
            if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                // Permissions granted
            } else {
                finish()
            }
        } else {
            super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        }
    }
    
    private fun hasPermissionsGranted(permissions: Array<String>): Boolean {
        return permissions.all {
            ActivityCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    @Suppress("MissingPermission")
    private fun openCamera(width: Int, height: Int) {
        if (!hasPermissionsGranted(VIDEO_PERMISSIONS)) {
            requestVideoPermissions()
            return
        }
        
        setUpCameraOutputs(width, height)
        configureTransform(width, height)
        
        val manager = getSystemService(Context.CAMERA_SERVICE) as CameraManager
        try {
            if (!mCameraOpenCloseLock.tryAcquire(2500, TimeUnit.MILLISECONDS)) {
                throw RuntimeException("Time out waiting to lock camera opening.")
            }
            mCameraId?.let { cameraId ->
                manager.openCamera(cameraId, mStateCallback, mBackgroundHandler)
                isCameraReady = true
            }
        } catch (e: CameraAccessException) {
            e.printStackTrace()
        } catch (e: InterruptedException) {
            throw RuntimeException("Interrupted while trying to lock camera opening.", e)
        }
    }
    
    private fun closeCamera() {
        try {
            mCameraOpenCloseLock.acquire()
            mCaptureSession?.close()
            mCaptureSession = null
            mCameraDevice?.close()
            mCameraDevice = null
            mImageReader?.close()
            mImageReader = null
            isCameraReady = false
        } catch (e: InterruptedException) {
            throw RuntimeException("Interrupted while trying to lock camera closing.", e)
        } finally {
            mCameraOpenCloseLock.release()
        }
    }
    
    private fun setUpCameraOutputs(width: Int, height: Int) {
        val manager = getSystemService(Context.CAMERA_SERVICE) as CameraManager
        try {
            for (cameraId in manager.cameraIdList) {
                val characteristics = manager.getCameraCharacteristics(cameraId)
                
                val facing = characteristics.get(CameraCharacteristics.LENS_FACING)
                if (facing != null && facing == CameraCharacteristics.LENS_FACING_FRONT) {
                    continue
                }
                
                val map = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
                    ?: continue
                
                val largest = chooseFullScreenPreview(map.getOutputSizes(ImageFormat.JPEG))
                val standard = Size(1280, 720)
                
                val finalSize = if (largest.width > standard.width && largest.height > standard.height) {
                    standard
                } else {
                    largest
                }
                
                mImageReader = ImageReader.newInstance(finalSize.width, finalSize.height, ImageFormat.JPEG, 1)
                
                val displayRotation = windowManager.defaultDisplay.rotation
                mSensorOrientation = characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0
                
                var swappedDimensions = false
                when (displayRotation) {
                    Surface.ROTATION_0, Surface.ROTATION_180 -> {
                        if (mSensorOrientation == 90 || mSensorOrientation == 270) {
                            swappedDimensions = true
                        }
                    }
                    Surface.ROTATION_90, Surface.ROTATION_270 -> {
                        if (mSensorOrientation == 0 || mSensorOrientation == 180) {
                            swappedDimensions = true
                        }
                    }
                }
                
                val displaySize = Point()
                windowManager.defaultDisplay.getSize(displaySize)
                
                var rotatedPreviewWidth = width
                var rotatedPreviewHeight = height
                var maxPreviewWidth = displaySize.x
                var maxPreviewHeight = displaySize.y
                
                if (swappedDimensions) {
                    rotatedPreviewWidth = height
                    rotatedPreviewHeight = width
                    maxPreviewWidth = displaySize.y
                    maxPreviewHeight = displaySize.x
                }
                
                if (maxPreviewWidth > MAX_PREVIEW_WIDTH) {
                    maxPreviewWidth = MAX_PREVIEW_WIDTH
                }
                
                if (maxPreviewHeight > MAX_PREVIEW_HEIGHT) {
                    maxPreviewHeight = MAX_PREVIEW_HEIGHT
                }
                
                mPreviewSize = chooseOptimalSize(
                    map.getOutputSizes(SurfaceTexture::class.java),
                    rotatedPreviewWidth, rotatedPreviewHeight,
                    maxPreviewWidth, maxPreviewHeight, finalSize
                )
                
                val orientation = resources.configuration.orientation
                if (orientation == Configuration.ORIENTATION_LANDSCAPE) {
                    mTextureView?.setAspectRatio(mPreviewSize?.width ?: 0, mPreviewSize?.height ?: 0)
                } else {
                    mTextureView?.setAspectRatio(displaySize.x, displaySize.y)
                }
                
                val available = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE)
                mFlashSupported = available ?: false
                
                mCameraId = cameraId
                return
            }
        } catch (e: CameraAccessException) {
            e.printStackTrace()
        } catch (e: NullPointerException) {
            Toast.makeText(this, "Camera2 not supported", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun createCameraPreviewSession() {
        try {
            val texture = mTextureView?.surfaceTexture ?: return
            
            texture.setDefaultBufferSize(mPreviewSize?.width ?: 0, mPreviewSize?.height ?: 0)
            val surface = Surface(texture)
            
            mPreviewRequestBuilder = mCameraDevice?.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW)
            mPreviewRequestBuilder?.addTarget(surface)
            
            mCameraDevice?.createCaptureSession(
                Arrays.asList(surface, mImageReader?.surface),
                object : CameraCaptureSession.StateCallback() {
                    override fun onConfigured(cameraCaptureSession: CameraCaptureSession) {
                        if (mCameraDevice == null) return
                        
                        mCaptureSession = cameraCaptureSession
                        try {
                            mPreviewRequestBuilder?.set(
                                CaptureRequest.CONTROL_AF_MODE,
                                CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE
                            )
                            
                            setAutoFlash(mPreviewRequestBuilder)
                            
                            mPreviewRequest = mPreviewRequestBuilder?.build()
                            mPreviewRequest?.let { request ->
                                mCaptureSession?.setRepeatingRequest(request, null, mBackgroundHandler)
                            }
                        } catch (e: CameraAccessException) {
                            e.printStackTrace()
                        }
                    }
                    
                    override fun onConfigureFailed(cameraCaptureSession: CameraCaptureSession) {
                        Toast.makeText(this@MrzCameraActivity, "Failed", Toast.LENGTH_SHORT).show()
                    }
                }, null
            )
        } catch (e: CameraAccessException) {
            e.printStackTrace()
        }
    }
    
    private fun configureTransform(viewWidth: Int, viewHeight: Int) {
        val textureView = mTextureView ?: return
        val previewSize = mPreviewSize ?: return
        
        val rotation = windowManager.defaultDisplay.rotation
        val matrix = Matrix()
        val viewRect = RectF(0f, 0f, viewWidth.toFloat(), viewHeight.toFloat())
        val bufferRect = RectF(0f, 0f, previewSize.height.toFloat(), previewSize.width.toFloat())
        val centerX = viewRect.centerX()
        val centerY = viewRect.centerY()
        
        if (Surface.ROTATION_90 == rotation || Surface.ROTATION_270 == rotation) {
            bufferRect.offset(centerX - bufferRect.centerX(), centerY - bufferRect.centerY())
            matrix.setRectToRect(viewRect, bufferRect, Matrix.ScaleToFit.FILL)
            val scale = Math.max(
                viewHeight.toFloat() / previewSize.height,
                viewWidth.toFloat() / previewSize.width
            )
            matrix.postScale(scale, scale, centerX, centerY)
            matrix.postRotate(90f * (rotation - 2), centerX, centerY)
        } else if (Surface.ROTATION_180 == rotation) {
            matrix.postRotate(180f, centerX, centerY)
        }
        textureView.setTransform(matrix)
    }
    
    private fun setAutoFlash(requestBuilder: CaptureRequest.Builder?) {
        if (mFlashSupported) {
            requestBuilder?.set(
                CaptureRequest.CONTROL_AE_MODE,
                CaptureRequest.CONTROL_AE_MODE_ON_AUTO_FLASH
            )
        }
    }
    
    private fun chooseOptimalSize(
        choices: Array<Size>,
        textureViewWidth: Int,
        textureViewHeight: Int,
        maxWidth: Int,
        maxHeight: Int,
        aspectRatio: Size
    ): Size {
        val bigEnough = ArrayList<Size>()
        val notBigEnough = ArrayList<Size>()
        val w = aspectRatio.width
        val h = aspectRatio.height
        
        for (option in choices) {
            if (option.width <= maxWidth && option.height <= maxHeight &&
                option.height == option.width * h / w
            ) {
                if (option.width >= textureViewWidth && option.height >= textureViewHeight) {
                    bigEnough.add(option)
                } else {
                    notBigEnough.add(option)
                }
            }
        }
        
        return when {
            bigEnough.size > 0 -> Collections.min(bigEnough, CompareSizesByArea())
            notBigEnough.size > 0 -> Collections.max(notBigEnough, CompareSizesByArea())
            else -> {
                Log.e(TAG, "Couldn't find any suitable preview size")
                choices[1]
            }
        }
    }
    
    private fun chooseFullScreenPreview(sizes: Array<Size>): Size {
        val fullScreenSizes = ArrayList<Size>()
        for (size in sizes) {
            if (size.width > size.height) {
                if (size.height * 16 / size.width == 9) {
                    fullScreenSizes.add(size)
                }
            } else {
                if (size.width * 16 / size.height == 9) {
                    fullScreenSizes.add(size)
                }
            }
        }
        return if (fullScreenSizes.isNotEmpty()) {
            Collections.max(fullScreenSizes, CompareSizesByArea())
        } else {
            sizes[0]
        }
    }
    
    class CompareSizesByArea : Comparator<Size> {
        override fun compare(lhs: Size, rhs: Size): Int {
            return java.lang.Long.signum(
                lhs.width.toLong() * lhs.height - rhs.width.toLong() * rhs.height
            )
        }
    }
}
