package com.testapp.customscreens

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import com.testapp.R
import io.udentify.android.nfc.CardData
import io.udentify.android.nfc.reader.NFCRepeatBaseFragment
import io.udentify.android.nfc.reader.NFCState

/**
 * Example replacement for the SDK's NFC popup. The base class still reads the
 * chip and reports the outcome; this only draws the screen from the hooks.
 */
class ExampleNfcScreen : NFCRepeatBaseFragment() {

    private var status: TextView? = null
    private var bar: ProgressBar? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val context = inflater.context
        val density = context.resources.displayMetrics.density
        val pad = (20 * density).toInt()

        val title = TextView(context).apply {
            text = ExampleStrings.own(context, R.string.example_nfc_title)
            setTextColor(Color.WHITE)
            textSize = 18f
        }
        val statusView = TextView(context).apply {
            text = hold(context)
            setTextColor(Color.WHITE)
            setPadding(0, pad / 2, 0, pad / 2)
        }
        val progress = ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
        }
        val cancel = Button(context).apply {
            text = ExampleStrings.sdk(context, "udentify_nfc_repeat_cancel", "Cancel")
            setOnClickListener { cancelRepeat() }
        }
        status = statusView
        bar = progress

        val card = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#6A1B9A"))
                cornerRadius = 16 * density
            }
            addView(title)
            addView(statusView)
            addView(progress)
            addView(cancel)
        }
        return FrameLayout(context).apply {
            setBackgroundColor(Color.parseColor("#99000000"))
            addView(
                card,
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    Gravity.BOTTOM
                ).apply { setMargins(pad, pad, pad, pad * 2) }
            )
        }
    }

    /** The SDK popup's own instruction. */
    private fun hold(context: Context) = ExampleStrings.sdk(
        context, "udentify_nfc_repeat_explanation", "Hold your ID card or passport against the back of your phone.")

    override fun onNfcStateChanged(state: NFCState) {
        val context = status?.context ?: return
        status?.text = if (state == NFCState.DISABLED) {
            ExampleStrings.own(context, R.string.example_nfc_turn_on)
        } else {
            hold(context)
        }
    }

    override fun onReadProgress(progress: Int) {
        bar?.progress = progress
        status?.context?.let { status?.text = ExampleStrings.own(it, R.string.example_nfc_reading, progress) }
    }

    override fun onReadSucceeded(data: CardData) {
        bar?.progress = 100
        status?.context?.let { status?.text = ExampleStrings.own(it, R.string.example_nfc_done) }
    }

    override fun onReadFailed(reason: Throwable) {
        status?.context?.let { status?.text = ExampleStrings.own(it, R.string.example_nfc_failed) }
    }

    override fun onRepeatViewDestroyed() {
        status = null
        bar = null
    }
}
