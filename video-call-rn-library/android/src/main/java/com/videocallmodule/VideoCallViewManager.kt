package com.videocallmodule

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

/**
 * Registers `VideoCallView` (see VideoCallView.kt) as an embeddable RN native
 * component, mirroring mrz-rn-library's MrzCameraViewManager.
 */
class VideoCallViewManager(
    private val reactContext: ReactApplicationContext
) : SimpleViewManager<VideoCallView>() {

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(ctx: ThemedReactContext): VideoCallView {
        return VideoCallView(ctx)
    }

    @ReactProp(name = "credentials")
    fun setCredentials(view: VideoCallView, credentials: ReadableMap?) {
        view.setCredentials(credentials)
    }

    @ReactProp(name = "config")
    fun setConfig(view: VideoCallView, config: ReadableMap?) {
        view.setConfig(config)
    }

    // The only signal that the call is really over. VideoCallView deliberately
    // survives onDetachedFromWindow so that a react-native-screens push/pop
    // does not kill a live SDK session - see the comment there.
    override fun onDropViewInstance(view: VideoCallView) {
        view.destroy()
        super.onDropViewInstance(view)
    }

    companion object {
        const val REACT_CLASS = "VideoCallView"
    }
}
