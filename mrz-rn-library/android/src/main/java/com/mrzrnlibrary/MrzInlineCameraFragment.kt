package com.mrzrnlibrary

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.content.res.Configuration
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
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import android.util.Size
import android.view.LayoutInflater
import android.view.Surface
import android.view.TextureView
import android.view.View
import android.view.ViewGroup
import androidx.core.app.ActivityCompat
import io.udentify.android.mrz.AutoFitTextureView
import io.udentify.android.mrz.enums.MrzReaderMode
import io.udentify.android.mrz.reader.MrzReaderFragment
import java.util.Arrays
import java.util.Collections
import java.util.concurrent.Semaphore
import java.util.concurrent.TimeUnit

/**
 * A Fragment hosted by [MrzCameraView] that runs the MRZ SDK recognizer
 * against a camera2 preview. This mirrors the pipeline in
 * `MrzCameraActivity` but is embeddable inside an RN view.
 *
 * The fragment does not render its own UI chrome — JS overlays sit above
 * the host view. It only needs the camera texture and an invisible focus
 * rect that the SDK uses to crop frames.
 */
class MrzInlineCameraFragment : MrzReaderFragment() {

    interface Listener {
        fun onMrzSuccess(mrzJson: String)
        fun onMrzFailure(throwable: Throwable)
    }

    var listener: Listener? = null

    private var mTextureView: AutoFitTextureView? = null
    private var focusRect: Rect? = null

    private var mCameraId: String? = null
    private var mCaptureSession: CameraCaptureSession? = null
    private var mCameraDevice: CameraDevice? = null
    private var mPreviewSize: Size? = null
    private var mBackgroundThread: HandlerThread? = null
    private var mBackgroundHandler: Handler? = null
    private var mPreviewRequestBuilder: CaptureRequest.Builder? = null
    private var mSensorOrientation = 0

    private val mCameraOpenCloseLock = Semaphore(1)
    private var isCameraReady = false
    private var isProcessFinished = true
    private var completed = false

    override fun getCallerActivity(): Activity = requireActivity()

    override fun getMrzReaderMode(): MrzReaderMode = MrzReaderMode.FAST

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        return inflater.inflate(R.layout.layout_mrz_inline_camera, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        mTextureView = view.findViewById(R.id.mrz_camera_texture)
        val focusView = view.findViewById<View>(R.id.mrz_preview)
        focusView.post {
            focusRect = Rect(focusView.left, focusView.top, focusView.right, focusView.bottom)
        }
    }

    override fun onResume() {
        super.onResume()
        completed = false
        isProcessFinished = true
        startBackgroundThread()

        val textureView = mTextureView ?: return
        if (textureView.isAvailable) {
            openCamera(textureView.width, textureView.height)
        } else {
            textureView.surfaceTextureListener = surfaceTextureListener
        }
    }

    override fun onPause() {
        closeCamera()
        stopBackgroundThread()
        super.onPause()
    }

    override fun onDestroyView() {
        mTextureView = null
        focusRect = null
        super.onDestroyView()
    }

    override fun onSuccess(s: String) {
        if (completed) return
        completed = true
        try {
            listener?.onMrzSuccess(s)
        } catch (e: Throwable) {
            Log.e(TAG, "Listener onMrzSuccess threw", e)
        }
    }

    override fun onFailure(throwable: Throwable) {
        isProcessFinished = true
        listener?.onMrzFailure(throwable)
    }

    // MARK: - Camera2 pipeline (ported from MrzCameraActivity)

    private val surfaceTextureListener = object : TextureView.SurfaceTextureListener {
        override fun onSurfaceTextureAvailable(texture: SurfaceTexture, width: Int, height: Int) {
            openCamera(width, height)
        }

        override fun onSurfaceTextureSizeChanged(texture: SurfaceTexture, width: Int, height: Int) {
            configureTransform(width, height)
        }

        override fun onSurfaceTextureDestroyed(texture: SurfaceTexture): Boolean = true

        override fun onSurfaceTextureUpdated(texture: SurfaceTexture) {
            if (!isCameraReady || completed) return
            val rect = focusRect ?: return
            val textureView = mTextureView ?: return
            if (!isProcessFinished) return
            isProcessFinished = false
            val bitmap = textureView.bitmap ?: run {
                isProcessFinished = true
                return
            }
            readMRZ(bitmap, rect)
            // readMRZ is async inside the SDK; onSuccess / onFailure will flip
            // isProcessFinished back via the listener callbacks.
            isProcessFinished = true
        }
    }

    private val cameraStateCallback = object : CameraDevice.StateCallback() {
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
            listener?.onMrzFailure(RuntimeException("${context?.getString(R.string.mrz_camera_error)}: $error"))
        }
    }

    private fun startBackgroundThread() {
        mBackgroundThread = HandlerThread("MrzInlineCameraBackground").apply { start() }
        mBackgroundHandler = Handler(mBackgroundThread!!.looper)
    }

    private fun stopBackgroundThread() {
        mBackgroundThread?.quitSafely()
        try {
            mBackgroundThread?.join()
        } catch (e: InterruptedException) {
            Log.e(TAG, "Interrupted stopping background thread", e)
        }
        mBackgroundThread = null
        mBackgroundHandler = null
    }

    @SuppressLint("MissingPermission")
    private fun openCamera(width: Int, height: Int) {
        val activity = activity ?: return
        if (ActivityCompat.checkSelfPermission(activity, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED
        ) {
            listener?.onMrzFailure(SecurityException(activity.getString(R.string.mrz_permission_required)))
            return
        }
        setUpCameraOutputs(width, height)
        configureTransform(width, height)

        val manager = activity.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        try {
            if (!mCameraOpenCloseLock.tryAcquire(2500, TimeUnit.MILLISECONDS)) {
                throw RuntimeException("Time out waiting to lock camera opening.")
            }
            mCameraId?.let { id ->
                manager.openCamera(id, cameraStateCallback, mBackgroundHandler)
                isCameraReady = true
            }
        } catch (e: CameraAccessException) {
            Log.e(TAG, "Camera access", e)
            listener?.onMrzFailure(e)
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
            isCameraReady = false
        } catch (e: InterruptedException) {
            throw RuntimeException("Interrupted while trying to lock camera closing.", e)
        } finally {
            mCameraOpenCloseLock.release()
        }
    }

    private fun setUpCameraOutputs(width: Int, height: Int) {
        val activity = activity ?: return
        val manager = activity.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        try {
            for (cameraId in manager.cameraIdList) {
                val characteristics = manager.getCameraCharacteristics(cameraId)
                val facing = characteristics.get(CameraCharacteristics.LENS_FACING)
                if (facing != null && facing == CameraCharacteristics.LENS_FACING_FRONT) continue

                val map = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
                    ?: continue

                val largest = chooseFullScreenPreview(map.getOutputSizes(ImageFormat.JPEG))
                val standard = Size(1280, 720)
                val finalSize =
                    if (largest.width > standard.width && largest.height > standard.height)
                        standard else largest

                val displayRotation = activity.windowManager.defaultDisplay.rotation
                mSensorOrientation =
                    characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0

                var swapped = false
                when (displayRotation) {
                    Surface.ROTATION_0, Surface.ROTATION_180 ->
                        if (mSensorOrientation == 90 || mSensorOrientation == 270) swapped = true
                    Surface.ROTATION_90, Surface.ROTATION_270 ->
                        if (mSensorOrientation == 0 || mSensorOrientation == 180) swapped = true
                }

                val displaySize = Point()
                activity.windowManager.defaultDisplay.getSize(displaySize)

                var rotatedWidth = width
                var rotatedHeight = height
                var maxWidth = displaySize.x.coerceAtMost(MAX_PREVIEW_WIDTH)
                var maxHeight = displaySize.y.coerceAtMost(MAX_PREVIEW_HEIGHT)
                if (swapped) {
                    rotatedWidth = height
                    rotatedHeight = width
                    maxWidth = displaySize.y.coerceAtMost(MAX_PREVIEW_WIDTH)
                    maxHeight = displaySize.x.coerceAtMost(MAX_PREVIEW_HEIGHT)
                }

                mPreviewSize = chooseOptimalSize(
                    map.getOutputSizes(SurfaceTexture::class.java),
                    rotatedWidth, rotatedHeight, maxWidth, maxHeight, finalSize
                )

                val orientation = resources.configuration.orientation
                if (orientation == Configuration.ORIENTATION_LANDSCAPE) {
                    mTextureView?.setAspectRatio(
                        mPreviewSize?.width ?: 0, mPreviewSize?.height ?: 0
                    )
                } else {
                    mTextureView?.setAspectRatio(displaySize.x, displaySize.y)
                }

                mCameraId = cameraId
                return
            }
        } catch (e: CameraAccessException) {
            Log.e(TAG, "setUpCameraOutputs", e)
        } catch (e: NullPointerException) {
            Log.e(TAG, "Camera2 not supported on this device", e)
        }
    }

    private fun createCameraPreviewSession() {
        try {
            val texture = mTextureView?.surfaceTexture ?: return
            val previewSize = mPreviewSize ?: return
            texture.setDefaultBufferSize(previewSize.width, previewSize.height)
            val surface = Surface(texture)

            mPreviewRequestBuilder = mCameraDevice?.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW)
            mPreviewRequestBuilder?.addTarget(surface)

            mCameraDevice?.createCaptureSession(
                Arrays.asList(surface),
                object : CameraCaptureSession.StateCallback() {
                    override fun onConfigured(session: CameraCaptureSession) {
                        if (mCameraDevice == null) return
                        mCaptureSession = session
                        try {
                            mPreviewRequestBuilder?.set(
                                CaptureRequest.CONTROL_AF_MODE,
                                CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE
                            )
                            mPreviewRequestBuilder?.build()?.let {
                                mCaptureSession?.setRepeatingRequest(it, null, mBackgroundHandler)
                            }
                        } catch (e: CameraAccessException) {
                            Log.e(TAG, "setRepeatingRequest", e)
                        }
                    }

                    override fun onConfigureFailed(session: CameraCaptureSession) {
                        Log.e(TAG, "Camera session configuration failed")
                    }
                },
                null
            )
        } catch (e: CameraAccessException) {
            Log.e(TAG, "createCameraPreviewSession", e)
        }
    }

    private fun configureTransform(viewWidth: Int, viewHeight: Int) {
        val textureView = mTextureView ?: return
        val previewSize = mPreviewSize ?: return
        val activity = activity ?: return

        val rotation = activity.windowManager.defaultDisplay.rotation
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
            bigEnough.isNotEmpty() -> Collections.min(bigEnough, CompareSizesByArea())
            notBigEnough.isNotEmpty() -> Collections.max(notBigEnough, CompareSizesByArea())
            else -> choices[choices.size.coerceAtLeast(1) - 1]
        }
    }

    private fun chooseFullScreenPreview(sizes: Array<Size>): Size {
        val fs = ArrayList<Size>()
        for (size in sizes) {
            if (size.width > size.height) {
                if (size.height * 16 / size.width == 9) fs.add(size)
            } else {
                if (size.width * 16 / size.height == 9) fs.add(size)
            }
        }
        return if (fs.isNotEmpty()) Collections.max(fs, CompareSizesByArea()) else sizes[0]
    }

    private class CompareSizesByArea : Comparator<Size> {
        override fun compare(lhs: Size, rhs: Size): Int =
            java.lang.Long.signum(
                lhs.width.toLong() * lhs.height - rhs.width.toLong() * rhs.height
            )
    }

    companion object {
        private const val TAG = "MrzInlineCameraFragment"
        private const val MAX_PREVIEW_WIDTH = 1920
        private const val MAX_PREVIEW_HEIGHT = 1080
    }
}
