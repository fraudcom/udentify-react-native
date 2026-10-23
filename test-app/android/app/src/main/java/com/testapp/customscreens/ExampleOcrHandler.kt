package com.testapp.customscreens

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.fragment.app.FragmentManager
import com.testapp.R
import io.udentify.android.commons.livekyc.LiveKYCCoordinator
import io.udentify.android.commons.livekyc.RepeatCallback
import io.udentify.android.commons.livekyc.RepeatHandler
import io.udentify.android.commons.livekyc.RepeatRole
import io.udentify.android.ocr.CardRecognizerCredentials
import io.udentify.android.ocr.activities.CardFragment
import io.udentify.android.ocr.activities.CardRecognizerAdapter
import io.udentify.android.ocr.activities.CardRecognizerObject
import io.udentify.android.ocr.activities.CardRecognizerTeardownAware
import io.udentify.android.ocr.activities.DocumentType
import io.udentify.android.ocr.activities.IQAListener
import io.udentify.android.ocr.activities.Process
import io.udentify.android.ocr.livekyc.OCRRepeatHandler
import io.udentify.android.ocr.model.CardOCRMessage
import io.udentify.android.ocr.model.IQAResponse

/**
 * Example own OCR flow: the SDK's camera captures each side, but the quality check and its
 * Use / Retake screen are ours, over an opaque backdrop so the call never shows between
 * screens. One outcome is reported once the OCR request has answered, after caching the result;
 * a capture the SDK tears down first (back press, Return to Call) reports a cancel instead.
 */
class ExampleOcrHandler : RepeatHandler {

    private var activity: FragmentActivity? = null
    private var container: ViewGroup? = null
    private var callback: RepeatCallback? = null
    private var credentials: CardRecognizerCredentials? = null
    private var screen: View? = null
    private var backdrop: View? = null
    private var frontPath: String? = null
    private var passport = false
    private var reported = false
    // True from our own replace of the camera fragment until the old view is gone.
    @Volatile private var replacing = false
    // True once the camera has handed over an image: it dismisses itself then, which is not a cancel.
    @Volatile private var imageDelivered = false

    override fun handleRepeat(
        activity: Activity,
        container: ViewGroup,
        params: Bundle?,
        callback: RepeatCallback
    ) {
        this.callback = callback
        this.container = container
        this.screen = null
        this.backdrop = null
        this.frontPath = null
        this.reported = false
        this.replacing = false
        this.imageDelivered = false

        val original = params?.getSerializable(OCRRepeatHandler.PARAM_CREDENTIALS)
            as? CardRecognizerCredentials
        if (original == null) {
            report(false, "Missing CardRecognizerCredentials in repeat params")
            return
        }
        if (activity !is FragmentActivity) {
            report(false, "Host activity must be a FragmentActivity")
            return
        }
        this.activity = activity
        // A failed redo must not leave an earlier scan's result for a following NFC redo.
        LiveKYCCoordinator.getInstance().putLastResult(RepeatRole.OCR, null)
        passport = original.docType == DocumentType.OCR_PASSPORT_UPLOAD

        // Our own quality check and request: turn off the SDK's.
        credentials = CardRecognizerCredentials.Builder()
            .serverURL(original.serverURL)
            .userID(original.userID)
            .transactionID(original.transactionID)
            .countryCode(original.countryCode)
            .docType(original.docType)
            .iqaEnabled(false)
            .apiCallEnabled(false)
            .isDocumentLivenessActive(false)
            .build()
        addBackdrop()
        capture(Process.frontSide)
    }

    /** Opaque, under the camera and our screens: covers any moment with nothing else on screen. */
    private fun addBackdrop() {
        val host = activity ?: return
        val view = container ?: return
        host.runOnUiThread {
            val dark = FrameLayout(host).apply {
                setBackgroundColor(Color.parseColor("#FF102030"))
                isClickable = true
                addView(label(host, ExampleStrings.own(host, R.string.example_ocr_flow), 18f), FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER))
            }
            view.addView(dark, 0, ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            backdrop = dark
        }
    }

    private fun capture(side: Process) {
        val host = activity ?: return
        val view = container ?: return
        host.runOnUiThread {
            if (reported) return@runOnUiThread
            if (view.id == View.NO_ID) view.id = View.generateViewId()
            imageDelivered = false
            val fragments = host.supportFragmentManager
            // The old camera view is destroyed after the new one is created, so the flag
            // stays up until that old view is gone.
            fragments.findFragmentByTag(FRAGMENT_TAG)?.takeIf { it.view != null }?.let { old ->
                replacing = true
                fragments.registerFragmentLifecycleCallbacks(object : FragmentManager.FragmentLifecycleCallbacks() {
                    override fun onFragmentViewDestroyed(fm: FragmentManager, f: Fragment) {
                        if (f !== old) return
                        fm.unregisterFragmentLifecycleCallbacks(this)
                        replacing = false
                    }
                }, false)
            }
            // Our screen stays up until the new camera view exists, so nothing else shows in between.
            fragments.registerFragmentLifecycleCallbacks(object : FragmentManager.FragmentLifecycleCallbacks() {
                override fun onFragmentViewCreated(fm: FragmentManager, f: Fragment, v: View, savedInstanceState: Bundle?) {
                    if (f.tag != FRAGMENT_TAG) return
                    fm.unregisterFragmentLifecycleCallbacks(this)
                    removeScreen()
                }
            }, false)
            fragments.beginTransaction()
                .replace(view.id, CardFragment.newInstance(side, false, recognizer), FRAGMENT_TAG)
                .commitAllowingStateLoss()
        }
    }

    private val recognizer = object : CardRecognizerAdapter(), CardRecognizerTeardownAware {
        // Qualified: a bare `credentials` here is this object's own getter, and recurses.
        override fun getCredentials(): CardRecognizerCredentials? = this@ExampleOcrHandler.credentials

        override fun frontSideImage(image: String?, preview: String?) = checkQuality(image, Process.frontSide)

        override fun backSideImage(image: String?, preview: String?) = checkQuality(image, Process.backSide)

        override fun onResult(message: CardOCRMessage?) {
            // A late answer after a cancel must not cache a result for a following NFC redo.
            if (reported) return
            if (message != null && message.failed != true) {
                LiveKYCCoordinator.getInstance().putLastResult(RepeatRole.OCR, message)
                report(true, null)
            } else {
                report(false, "OCR failed")
            }
        }

        override fun onFailure(description: String?) = report(false, description)

        // The SDK also calls this for our own fragment swaps (`replacing`) and when it dismisses
        // the camera after an image (`imageDelivered`); only a teardown before any image is a cancel.
        override fun onCardFragmentDestroyedBeforeResult() {
            if (!replacing && !imageDelivered) cancelled()
        }
    }

    private fun checkQuality(image: String?, side: Process) {
        imageDelivered = true
        val host = activity ?: return
        val creds = credentials ?: return
        showScreen(side, ExampleStrings.sdk(host, "udentify_iqa_screen_title", "Checking image quality"), null, withButtons = false)
        CardRecognizerObject(host).performIQA(
            creds.serverURL, creds.transactionID, image, creds.countryCode, creds.docType, side,
            object : IQAListener {
                override fun successResponse(response: IQAResponse?) {
                    val qualified = response?.isQualified == true
                    showScreen(side, verdictText(host, side, qualified, response?.displayMessage),
                        if (qualified) response else null)
                }

                override fun errorResponse(error: String?) =
                    showScreen(side, ExampleStrings.own(host, R.string.example_quality_failed, error ?: ""), null)
            })
    }

    /** The SDK's own "front side passed" / "back side quality check failed" title, then the server's message. */
    private fun verdictText(host: Activity, side: Process, qualified: Boolean, message: String?): String {
        val part = if (side == Process.frontSide) "front" else "back"
        val outcome = if (qualified) "success" else "failed"
        val fallback = (if (side == Process.frontSide) "Front side " else "Back side ") +
            if (qualified) "passed" else "quality check failed"
        val title = ExampleStrings.sdk(host, "udentify_iqa_${part}_capture_quality_${outcome}_title", fallback)
        return if (message.isNullOrBlank()) title else "$title\n$message"
    }

    private fun accept(side: Process, response: IQAResponse) {
        if (side == Process.frontSide) {
            frontPath = response.path
            // A passport has no back side; every other document is captured on both.
            if (passport) finish(null) else capture(Process.backSide)
        } else {
            finish(response.path)
        }
    }

    private fun finish(backPath: String?) {
        val host = activity ?: return
        // Hold the step until the request answers, so a following NFC redo finds the result.
        showScreen(null, ExampleStrings.own(host, R.string.example_sending_ocr), null, withButtons = false)
        CardRecognizerObject(recognizer, host, frontPath, backPath, true).processOCR()
    }

    private fun report(completed: Boolean, reason: String?) {
        if (reported) return
        reported = true
        activity?.runOnUiThread { removeViews() }
        if (completed) callback?.onRepeatCompleted(null) else callback?.onRepeatFailed(reason ?: "OCR failed")
    }

    private fun cancelled() {
        if (reported) return
        reported = true
        activity?.runOnUiThread { removeViews() }
        callback?.onRepeatCancelled()
    }

    /** Buttons only once the check has finished, as on iOS; while it runs there is just the status. */
    private fun showScreen(side: Process?, message: String, accepted: IQAResponse?, withButtons: Boolean = true) {
        val host = activity ?: return
        val view = container ?: return
        host.runOnUiThread {
            if (reported) return@runOnUiThread
            removeScreen()
            val pad = (20 * host.resources.displayMetrics.density).toInt()
            val column = LinearLayout(host).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setPadding(pad, pad, pad, pad)
                addView(label(host, ExampleStrings.own(host, R.string.example_ocr_title), 18f))
                addView(label(host, message, 16f))
                if (withButtons && side != null) {
                    addView(Button(host).apply {
                        text = ExampleStrings.sdk(host, "udentify_ocr_button_retake_title", "Retake")
                        setOnClickListener { capture(side) }
                    })
                    if (accepted != null) {
                        addView(Button(host).apply {
                            text = ExampleStrings.sdk(host, "udentify_ocr_button_use_title", "Use")
                            setOnClickListener { accept(side, accepted) }
                        })
                    }
                    addView(Button(host).apply {
                        text = ExampleStrings.own(host, R.string.example_cancel)
                        setOnClickListener { cancelled() }
                    })
                }
            }
            val overlay = FrameLayout(host).apply {
                setBackgroundColor(Color.parseColor("#FF102030"))
                isClickable = true
                addView(column, FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER))
            }
            view.addView(overlay, ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            screen = overlay
        }
    }

    private fun removeScreen() {
        screen?.let { (it.parent as? ViewGroup)?.removeView(it) }
        screen = null
    }

    private fun removeViews() {
        removeScreen()
        backdrop?.let { (it.parent as? ViewGroup)?.removeView(it) }
        backdrop = null
    }

    private fun label(host: Activity, text: String, size: Float) = TextView(host).apply {
        this.text = text
        textSize = size
        setTextColor(Color.WHITE)
        gravity = Gravity.CENTER
        setPadding(0, 8, 0, 8)
    }

    private companion object {
        const val FRAGMENT_TAG = "custom_ocr_capture"
    }
}
