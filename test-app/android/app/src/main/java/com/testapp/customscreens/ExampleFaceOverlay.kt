package com.testapp.customscreens

import android.app.Activity
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.testapp.R
import io.udentify.android.face.activities.ActiveLivenessOperatorAdapter
import io.udentify.android.face.model.ActiveLivenessDirective
import io.udentify.android.face.model.FaceIDMessage

/**
 * Example. Observes an Active/Hybrid Liveness redo: a banner with the current gesture,
 * then a compact card from the moment capture ends: "submitted", and the verdict when it
 * arrives, with a Close button. Small on purpose: the call resumes behind it.
 */
class ExampleFaceOverlay(private val activity: Activity) : ActiveLivenessOperatorAdapter() {

    private var banner: TextView? = null
    private var card: LinearLayout? = null

    override fun onActiveLivenessDirectiveChanged(directive: ActiveLivenessDirective?) {
        showBanner(ExampleStrings.own(activity, R.string.example_face_overlay, gesture(directive)))
    }

    override fun onActiveLivenessCapturingCompleted() = showPage(listOf(ExampleStrings.own(activity, R.string.example_face_submitted)))

    override fun activeLivenessResult(message: FaceIDMessage?) {
        val verdict = if (message?.failed == false) R.string.example_face_passed else R.string.example_face_failed
        val lines = mutableListOf(ExampleStrings.own(activity, verdict))
        message?.activeLivenessResult?.gestureResult?.forEach { (gesture, result) -> lines += "$gesture: $result" }
        showPage(lines)
    }

    override fun activeLivenessFailure(error: String?) = showPage(listOf(ExampleStrings.own(activity, R.string.example_face_check_failed, error ?: "")))

    /** Removes the gesture banner; the verdict card, if any, stays until closed. */
    fun dismissBanner() = activity.runOnUiThread {
        banner?.let { (it.parent as? ViewGroup)?.removeView(it) }
        banner = null
    }

    /** The redo was cancelled, so no verdict will come: remove everything. */
    fun dismiss() {
        dismissBanner()
        activity.runOnUiThread { closePage() }
    }

    private fun showBanner(text: String) = activity.runOnUiThread {
        val view = banner ?: TextView(activity).apply {
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#CC6A1B9A"))
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(24, 96, 24, 24)
            decor().addView(
                this,
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    Gravity.TOP
                )
            )
            banner = this
        }
        view.text = text
    }

    private fun showPage(lines: List<String>) = activity.runOnUiThread {
        banner?.let { (it.parent as? ViewGroup)?.removeView(it) }
        banner = null
        val content = card ?: createCard()
        content.removeAllViews()
        content.addView(label(ExampleStrings.own(activity, R.string.example_face_title), 16f))
        lines.forEach { content.addView(label(it, 14f)) }
        content.addView(Button(activity).apply {
            text = ExampleStrings.own(activity, R.string.example_close)
            setOnClickListener { closePage() }
        })
    }

    /** A compact card at the bottom of the window; returns it to fill. */
    private fun createCard(): LinearLayout {
        val density = activity.resources.displayMetrics.density
        val content = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val pad = (16 * density).toInt()
            setPadding(pad, pad, pad, pad)
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#F2102030"))
                cornerRadius = 16 * density
            }
            isClickable = true
        }
        val margin = (16 * density).toInt()
        decor().addView(content, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM
        ).apply { setMargins(margin, 0, margin, (56 * density).toInt()) })
        card = content
        return content
    }

    private fun gesture(directive: ActiveLivenessDirective?): String = ExampleStrings.own(activity, when (directive) {
        ActiveLivenessDirective.turnHeadLeft -> R.string.example_gesture_turn_left
        ActiveLivenessDirective.turnHeadRight -> R.string.example_gesture_turn_right
        ActiveLivenessDirective.turnHeadUp -> R.string.example_gesture_turn_up
        ActiveLivenessDirective.turnHeadDown -> R.string.example_gesture_turn_down
        ActiveLivenessDirective.blink -> R.string.example_gesture_blink
        else -> R.string.example_gesture_smile
    })

    private fun closePage() {
        card?.let { (it.parent as? ViewGroup)?.removeView(it) }
        card = null
    }

    private fun decor() = activity.window.decorView as ViewGroup

    private fun label(text: String, size: Float) = TextView(activity).apply {
        this.text = text
        textSize = size
        setTextColor(Color.WHITE)
        gravity = Gravity.CENTER
        setPadding(0, 8, 0, 8)
    }
}
