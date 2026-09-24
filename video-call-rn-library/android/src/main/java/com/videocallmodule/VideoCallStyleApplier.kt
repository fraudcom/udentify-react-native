package com.videocallmodule

import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.TextView
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

/**
 * Applies the JS `config` prop's view-element styles to the vendor
 * `VCFragment`'s inflated view tree, since the SDK only supports build-time
 * XML style overrides. See INTERNALS-REACT.md "Re-styling the vendor call layout
 */
internal class VideoCallStyleApplier(
    private val hostView: View,
    // The live SDK state the control buttons are reconciled against: whether
    // the microphone is on, and which camera is capturing ("front"/"back").
    // Both return null while the state is unknown (no room joined yet).
    // Supplied by the owning VideoCallView, which routes them to
    private val micEnabled: () -> Boolean?,
    private val cameraPosition: () -> String?
) {

    private val density = hostView.resources.displayMetrics.density

    // Guards the mute icon swap specifically - setBackgroundResource
    // re-inflates the drawable, which a tint-only change should not trigger.
    private var muteBackgroundResource = 0

    private val muteRenderer = StateRenderer({ micEnabled() }) {
            button, state, style ->
        // Only an explicit `false` is muted: null means the room has not
        // been joined yet, which is the unmuted icon the SDK itself starts
        // on.
        val muted = state == false
        val resource = drawableId(if (muted) "mic_off" else "mic_on")
        // Guarded separately because setBackgroundResource re-inflates the
        // drawable and requests a layout, which a tint-only change should
        // not.
        if (resource != 0 && resource != muteBackgroundResource) {
            button.setBackgroundResource(resource)
            muteBackgroundResource = resource
        }
        // After the drawable, never before: setBackgroundResource routes
        // through setBackgroundDrawable, which re-applies whatever tint is
        // stored, and a null tint restores the vector's own android:tint.
        val tint = if (muted) {
            color(style, "mutedColor") ?: color(style, "color")
        } else {
            color(style, "unmutedColor") ?: color(style, "color")
        }
        button.backgroundTintList = tint?.let { ColorStateList.valueOf(it) }
    }

    /**
     * Re-applies [config] to [root], the vendor fragment's inflated view.
     * Safe to call repeatedly with the same values: every write is either
     * idempotent or guarded by an equality check, so re-applying after a
     */
    fun apply(root: View, config: ReadableMap?) {
        try {
            applyBackground(root, config)
            applyPipView(root, config)
            applyButtons(root, config)
            applyInstructionLabel(root, config)
        } catch (t: Throwable) {
            // Styling is cosmetic - a vendor layout change that moves or
            // renames a view must not take the call itself down with it.
            Log.w(TAG, "Failed to apply video call view styles", t)
        }
    }

    // MARK: - Elements

    private fun applyBackground(root: View, config: ReadableMap?) {
        val backgroundColor = color(config, "backgroundColor") ?: return
        root.setBackgroundColor(backgroundColor)
        findView<View>(root, "overlay_video_call")?.setBackgroundColor(backgroundColor)
    }

    private fun applyPipView(root: View, config: ReadableMap?) {
        // The PiP container is the MaterialCardView wrapping the local
        // camera renderer; only the renderer itself carries an id.
        val card = findView<View>(root, "local_camera")?.parent as? View ?: return
        val style = map(config, "pipViewStyle")

        card.visibility = if (bool(style, "visible") ?: true) View.VISIBLE else View.GONE

        val params = card.layoutParams as? FrameLayout.LayoutParams ?: return
        val horizontalAnchors = map(style, "horizontalAnchors")
        val verticalAnchors = map(style, "verticalAnchors")

        val width = if (horizontalAnchors != null) {
            ViewGroup.LayoutParams.MATCH_PARENT
        } else {
            dp(dimen(style, "width") ?: DEFAULT_PIP_WIDTH)
        }
        val height = if (verticalAnchors != null) {
            ViewGroup.LayoutParams.MATCH_PARENT
        } else {
            dp(dimen(style, "height") ?: DEFAULT_PIP_HEIGHT)
        }

        var gravity = 0
        var marginStart = 0
        var marginEnd = 0
        var marginTop = 0
        var marginBottom = 0

        if (horizontalAnchors != null) {
            marginStart = dp(dimen(horizontalAnchors, "leading") ?: 0f)
            marginEnd = dp(dimen(horizontalAnchors, "trailing") ?: 0f)
        } else {
            val horizontal = resolveHorizontal(
                map(style, "horizontalPosition"), DEFAULT_PIP_HORIZONTAL)
            gravity = gravity or horizontal.gravity
            marginStart = horizontal.marginStart
            marginEnd = horizontal.marginEnd
        }

        if (verticalAnchors != null) {
            marginTop = dp(dimen(verticalAnchors, "top") ?: 0f)
            marginBottom = dp(dimen(verticalAnchors, "bottom") ?: 0f)
        } else {
            val vertical = resolveVertical(map(style, "verticalPosition"), DEFAULT_PIP_VERTICAL)
            gravity = gravity or vertical.gravity
            marginTop = vertical.marginTop
            marginBottom = vertical.marginBottom
        }

        val changed = params.width != width || params.height != height ||
            params.gravity != gravity || params.marginStart != marginStart ||
            params.marginEnd != marginEnd || params.topMargin != marginTop ||
            params.bottomMargin != marginBottom
        if (changed) {
            params.width = width
            params.height = height
            params.gravity = gravity
            params.marginStart = marginStart
            params.marginEnd = marginEnd
            params.topMargin = marginTop
            params.bottomMargin = marginBottom
            card.layoutParams = params
        }

        // Reflective: MaterialCardView is only on the host app's classpath. Uses
        // setCardBackgroundColor, never setBackgroundColor; see INTERNALS-REACT.md
        // "Re-styling the vendor call layout (VideoCallStyleApplier)".
        color(style, "backgroundColor")?.let {
            invoke(card, "setCardBackgroundColor", Int::class.javaPrimitiveType!!, it)
        }
        val borderColor = color(style, "borderColor") ?: color(config, "pipViewBorderColor")
        borderColor?.let { invoke(card, "setStrokeColor", Int::class.javaPrimitiveType!!, it) }
        dimen(style, "borderWidth")?.let {
            invoke(card, "setStrokeWidth", Int::class.javaPrimitiveType!!, dp(it))
        }
        dimen(style, "cornerRadius")?.let {
            invoke(card, "setRadius", Float::class.javaPrimitiveType!!, it * density)
        }
    }

    private fun applyButtons(root: View, config: ReadableMap?) {
        BUTTONS.forEach { spec ->
            val button = findView<ImageButton>(root, spec.idName) ?: return@forEach
            val style = map(config, spec.configKey)

            button.visibility =
                if (bool(style, "visible") ?: spec.defaultVisible) View.VISIBLE else View.GONE

            when (spec.idName) {
                MUTE_BUTTON_ID -> muteRenderer.bind(button, style)
                // No per-facing state to render, unlike mute: the SDK bakes its
                // own default into the vector drawable (camera_switch.xml /
                // @color/udentify_vc_button_camera_color).
                CAMERA_SWITCH_BUTTON_ID -> applyButtonTint(button, style)
                // Flash is left as the SDK renders it: it has the same broken
                // toggle flag as the other two, but its torch state is not
                // readable through LiveKit's public API, so there is nothing
                // to reconcile a tap against. It is also hidden by default
                // and has no iOS counterpart.
                else -> applyButtonTint(button, style)
            }

            reposition(root, button, spec, style)
        }
    }

    // Tints rather than swaps the drawable; see INTERNALS-REACT.md "Control button
    // workarounds (VideoCallStyleApplier)".
    private fun applyButtonTint(button: ImageButton, style: ReadableMap?) {
        color(style, "color")?.let { button.backgroundTintList = ColorStateList.valueOf(it) }
    }

    // MARK: - Control button state
    //
    // The SDK repaints the mute button itself, including its own colour, so this
    // restores the host's configured tint afterwards.

    /**
     * Repaints one control button from live SDK state.
     * Driven by [VideoCallOperator.onMicrophoneStateChanged] rather than a
     * timer: the SDK announces every microphone change - local tap, remote
     */
    private inner class StateRenderer(
        private val readState: () -> Any?,
        private val render: (button: ImageButton, state: Any?, style: ReadableMap?) -> Unit
    ) {
        private var button: ImageButton? = null
        private var style: ReadableMap? = null
        private var renderedState: Any? = NEVER_RENDERED
        private var renderedStyle: ReadableMap? = null

        fun bind(button: ImageButton, style: ReadableMap?) {
            this.style = style
            if (this.button !== button) {
                this.button = button
                renderedState = NEVER_RENDERED
                renderedStyle = null
            }
            renderNow()
        }

        private fun renderNow() {
            val button = button ?: return
            val state = readState()
            val style = style
            if (state == renderedState && style === renderedStyle) return
            renderedState = state
            renderedStyle = style
            render(button, state, style)
        }

        fun release() {
            button = null
            style = null
            renderedState = NEVER_RENDERED
            renderedStyle = null
        }
    }

    /** Releases the timers; the owning view calls this as the call tears down. */
    fun stop() {
        muteRenderer.release()
        muteBackgroundResource = 0
    }

    /**
     * Moves [button] out of the vendor's shared, permanently-`gone`
     * `LinearLayout` into the root `FrameLayout`, then positions it from
     * [style]. Appending it to the root keeps it above the video renderer in
     */
    private fun reposition(
        root: View,
        button: ImageButton,
        spec: ButtonSpec,
        style: ReadableMap?
    ) {
        val rootGroup = root as? FrameLayout ?: return

        if (button.parent !== rootGroup) {
            (button.parent as? ViewGroup)?.removeView(button)
            rootGroup.addView(button)
        }

        val size = dp(dimen(style, "size") ?: DEFAULT_BUTTON_SIZE)
        val horizontal = resolveHorizontal(map(style, "horizontalPosition"), spec.defaultHorizontal)
        val vertical = resolveVertical(map(style, "verticalPosition"), spec.defaultVertical)

        val current = button.layoutParams as? FrameLayout.LayoutParams
        val gravity = horizontal.gravity or vertical.gravity
        val unchanged = current != null && current.width == size && current.height == size &&
            current.gravity == gravity && current.marginStart == horizontal.marginStart &&
            current.marginEnd == horizontal.marginEnd &&
            current.topMargin == vertical.marginTop &&
            current.bottomMargin == vertical.marginBottom
        if (unchanged) return

        val params = FrameLayout.LayoutParams(size, size)
        params.gravity = gravity
        params.marginStart = horizontal.marginStart
        params.marginEnd = horizontal.marginEnd
        params.topMargin = vertical.marginTop
        params.bottomMargin = vertical.marginBottom
        button.layoutParams = params
    }

    private fun applyInstructionLabel(root: View, config: ReadableMap?) {
        val label = findView<TextView>(root, "text_notification_label") ?: return
        val style = map(config, "instructionLabelStyle")

        (color(style, "textColor") ?: color(config, "textColor"))?.let { label.setTextColor(it) }
        dimen(style, "fontSize")?.let { label.textSize = it }

        applyLabelTypeface(label, style)

        when (string(style, "textAlign")) {
            "left" -> label.gravity = Gravity.START or Gravity.CENTER_VERTICAL
            "right" -> label.gravity = Gravity.END or Gravity.CENTER_VERTICAL
            "center" -> label.gravity = Gravity.CENTER
        }

        int(style, "numberOfLines")?.let { lines ->
            // 0 means "as many as needed" in the JS API, matching iOS'
            // numberOfLines; Android spells that as a large maxLines.
            // minLines has to be relaxed too, because the vendor layout sets
            // android:lines="3", which pins the minimum at 3 as well.
            label.minLines = 1
            label.maxLines = if (lines <= 0) Int.MAX_VALUE else lines
        }
        dimen(style, "lineHeightMultiple")?.let {
            if (it > 0f) label.setLineSpacing(0f, it)
        }

        val leading = dimen(style, "leading")
        val trailing = dimen(style, "trailing")
        if (leading != null || trailing != null) {
            label.setPaddingRelative(
                dp(leading ?: 0f),
                label.paddingTop,
                dp(trailing ?: 0f),
                label.paddingBottom)
        }

        applyLabelVerticalPosition(label, map(style, "verticalPosition"))
    }

    /**
     * Resolves `fontFamily` + `fontWeight` onto [label].
     * API 28+ takes a real 100-900 weight; below that only NORMAL/BOLD exist,
     * so `medium` and `semibold` approximate.
     */
    private fun applyLabelTypeface(label: TextView, style: ReadableMap?) {
        val fontFamily = string(style, "fontFamily")
        val fontWeight = string(style, "fontWeight")
        if (fontFamily == null && fontWeight == null) return

        val base = if (fontFamily != null) {
            Typeface.create(fontFamily, Typeface.NORMAL)
        } else {
            label.typeface ?: Typeface.DEFAULT
        }

        if (fontWeight == null) {
            label.typeface = base
            return
        }

        val numericWeight = when (fontWeight) {
            "regular" -> 400
            "medium" -> 500
            "semibold" -> 600
            "bold" -> 700
            else -> null
        }
        if (numericWeight == null) {
            label.typeface = base
            return
        }

        label.typeface = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            Typeface.create(base, numericWeight, false)
        } else {
            // Pre-28: only two weights exist, so round to the nearer one.
            Typeface.create(base, if (numericWeight >= 600) Typeface.BOLD else Typeface.NORMAL)
        }
    }

    /**
     * The label is constrained to all four edges of the overlay
     * `ConstraintLayout`, so its vertical placement is a bias rather than a
     * gravity. The bias field is set reflectively for the same reason the
     */
    private fun applyLabelVerticalPosition(label: TextView, position: ReadableMap?) {
        if (position == null) return
        val params = label.layoutParams ?: return
        val offset = dp(dimen(position, "offset") ?: 0f)

        val bias: Float
        var topMargin = 0
        var bottomMargin = 0
        when (string(position, "type")) {
            "center" -> bias = 0.5f
            "top" -> { bias = 0f; topMargin = offset }
            "bottom" -> { bias = 1f; bottomMargin = offset }
            "custom" -> { bias = 0f; topMargin = dp(dimen(position, "y") ?: 0f) }
            else -> return
        }

        try {
            params.javaClass.getField("verticalBias").setFloat(params, bias)
        } catch (t: Throwable) {
            Log.w(TAG, "Instruction label is not in a ConstraintLayout; vertical bias skipped", t)
        }
        (params as? ViewGroup.MarginLayoutParams)?.let {
            it.topMargin = topMargin
            it.bottomMargin = bottomMargin
        }
        label.layoutParams = params
    }

    // MARK: - Position resolution

    private class Horizontal(val gravity: Int, val marginStart: Int, val marginEnd: Int)

    private class Vertical(val gravity: Int, val marginTop: Int, val marginBottom: Int)

    private fun resolveHorizontal(position: ReadableMap?, default: Position): Horizontal {
        val explicitType = string(position, "type")
        val type = explicitType ?: default.type
        // Once the app names an edge, an omitted offset means flush against
        // it - the platform default offset belongs to the default edge only.
        val offset = dp(dimen(position, "offset") ?: if (explicitType == null) default.offset else 0f)
        return when (type) {
            // For `center` the offset is a signed shift off centre rather than
            // an edge inset. FrameLayout lays a CENTER_HORIZONTAL child out at
            // `centre + leftMargin - rightMargin`, so the sign picks which
            // margin carries it - which is what lets two buttons share the
            // centre as a group with a fixed gap between them.
            "center" -> Horizontal(
                Gravity.CENTER_HORIZONTAL,
                if (offset > 0) offset else 0,
                if (offset < 0) -offset else 0)
            "right" -> Horizontal(Gravity.END, 0, offset)
            "custom" -> Horizontal(Gravity.START, dp(dimen(position, "x") ?: 0f), 0)
            else -> Horizontal(Gravity.START, offset, 0)
        }
    }

    private fun resolveVertical(position: ReadableMap?, default: Position): Vertical {
        val explicitType = string(position, "type")
        val type = explicitType ?: default.type
        val offset = dp(dimen(position, "offset") ?: if (explicitType == null) default.offset else 0f)
        return when (type) {
            "center" -> Vertical(Gravity.CENTER_VERTICAL, 0, 0)
            "top" -> Vertical(Gravity.TOP, offset, 0)
            "custom" -> Vertical(Gravity.TOP, dp(dimen(position, "y") ?: 0f), 0)
            else -> Vertical(Gravity.BOTTOM, 0, offset)
        }
    }

    // MARK: - Reading helpers

    private fun <T : View> findView(root: View, idName: String): T? {
        val id = hostView.resources.getIdentifier(idName, "id", hostView.context.packageName)
        if (id == 0) return null
        @Suppress("UNCHECKED_CAST")
        return root.findViewById<View>(id) as? T
    }

    private fun drawableId(name: String): Int =
        hostView.resources.getIdentifier(name, "drawable", hostView.context.packageName)

    private fun map(source: ReadableMap?, key: String): ReadableMap? =
        if (source != null && source.hasKey(key) && !source.isNull(key)) source.getMap(key) else null

    private fun string(source: ReadableMap?, key: String): String? =
        if (source != null && source.hasKey(key) && !source.isNull(key)) source.getString(key) else null

    private fun bool(source: ReadableMap?, key: String): Boolean? =
        if (source != null && source.hasKey(key) && source.getType(key) == ReadableType.Boolean) {
            source.getBoolean(key)
        } else {
            null
        }

    private fun dimen(source: ReadableMap?, key: String): Float? =
        if (source != null && source.hasKey(key) && source.getType(key) == ReadableType.Number) {
            source.getDouble(key).toFloat()
        } else {
            null
        }

    private fun int(source: ReadableMap?, key: String): Int? = dimen(source, key)?.toInt()

    /** Accepts `#RGB`, `#RRGGBB` and `#RRGGBBAA` - React Native's own color
     * string convention, so the same string works on iOS and in JS styles. */
    private fun color(source: ReadableMap?, key: String): Int? {
        val raw = string(source, key)?.trim() ?: return null
        if (!raw.startsWith("#")) return null
        val digits = raw.substring(1)
        val normalized = when (digits.length) {
            3 -> "#" + digits.map { "$it$it" }.joinToString("")
            6 -> raw
            // Color.parseColor expects #AARRGGBB, JS writes #RRGGBBAA.
            8 -> "#" + digits.substring(6, 8) + digits.substring(0, 6)
            else -> return null
        }
        return try {
            Color.parseColor(normalized)
        } catch (t: IllegalArgumentException) {
            Log.w(TAG, "Ignoring unparseable color '$raw' for '$key'")
            null
        }
    }

    private fun dp(value: Float): Int = (value * density).toInt()

    private fun invoke(target: Any, method: String, argType: Class<*>, arg: Any) {
        try {
            target.javaClass.getMethod(method, argType).invoke(target, arg)
        } catch (t: Throwable) {
            Log.w(TAG, "PiP view does not support $method on this SDK build", t)
        }
    }

    private class Position(val type: String, val offset: Float)

    private class ButtonSpec(
        val idName: String,
        val configKey: String,
        val defaultVisible: Boolean,
        val defaultHorizontal: Position,
        val defaultVertical: Position
    )

    companion object {
        private const val TAG = "VideoCallStyleApplier"

        // Distinct from any real state a StateRenderer might read (including
        // null, which is itself a legitimate "unknown" reading) so the first
        // bind() always renders.
        private val NEVER_RENDERED = Any()

        private const val MUTE_BUTTON_ID = "toggle_mic"
        private const val CAMERA_SWITCH_BUTTON_ID = "switch_camera"

        private const val DEFAULT_PIP_WIDTH = 120f
        private const val DEFAULT_PIP_HEIGHT = 160f
        private const val DEFAULT_BUTTON_SIZE = 50f

        private val DEFAULT_PIP_HORIZONTAL = Position("right", 25f)
        private val DEFAULT_PIP_VERTICAL = Position("bottom", 25f)

        // Defaults deliberately match the iOS SDK's own button layout
        // (camera switch bottom-left, mute bottom-center, both 50dp with a
        // 20dp bottom inset), so an app that sets no style at all gets the
        // same controls in the same places on both platforms. Flash stays
        private val BUTTONS = listOf(
            ButtonSpec(
                idName = CAMERA_SWITCH_BUTTON_ID,
                configKey = "cameraSwitchButtonStyle",
                defaultVisible = true,
                defaultHorizontal = Position("left", 16f),
                defaultVertical = Position("bottom", 20f)),
            ButtonSpec(
                idName = MUTE_BUTTON_ID,
                configKey = "muteButtonStyle",
                defaultVisible = true,
                defaultHorizontal = Position("center", 0f),
                defaultVertical = Position("bottom", 20f)),
            ButtonSpec(
                idName = "toggle_flash",
                configKey = "flashButtonStyle",
                defaultVisible = false,
                defaultHorizontal = Position("right", 16f),
                defaultVertical = Position("bottom", 20f)))
    }
}
