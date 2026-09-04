package com.mrzrnlibrary

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class MrzCameraViewManager(
    private val reactContext: ReactApplicationContext
) : SimpleViewManager<MrzCameraView>() {

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(ctx: ThemedReactContext): MrzCameraView {
        return MrzCameraView(ctx)
    }

    @ReactProp(name = "paused", defaultBoolean = false)
    fun setPaused(view: MrzCameraView, paused: Boolean) {
        view.setPaused(paused)
    }

    // `focusViewBorderColor` / `focusViewStrokeWidth` are accepted for API
    // parity with iOS but are currently not rendered natively — the JS
    // overlay supplies the visible focus frame on Android.
    @ReactProp(name = "focusViewBorderColor")
    fun setFocusViewBorderColor(view: MrzCameraView, color: String?) {
        // no-op
    }

    @ReactProp(name = "focusViewStrokeWidth", defaultFloat = 2f)
    fun setFocusViewStrokeWidth(view: MrzCameraView, width: Float) {
        // no-op
    }

    override fun getExportedCustomBubblingEventTypeConstants(): Map<String, Any> {
        return MapBuilder.builder<String, Any>()
            .put(
                "onMrzDetected",
                MapBuilder.of(
                    "phasedRegistrationNames",
                    MapBuilder.of("bubbled", "onMrzDetected")
                )
            )
            .put(
                "onMrzError",
                MapBuilder.of(
                    "phasedRegistrationNames",
                    MapBuilder.of("bubbled", "onMrzError")
                )
            )
            .build()
    }

    companion object {
        const val REACT_CLASS = "MrzCameraView"
    }
}
