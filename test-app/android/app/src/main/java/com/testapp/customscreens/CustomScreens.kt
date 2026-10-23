package com.testapp.customscreens

import android.app.Activity
import android.os.Bundle
import android.view.ViewGroup
import io.udentify.android.commons.livekyc.LiveKYCCoordinator
import io.udentify.android.commons.livekyc.RepeatCallback
import io.udentify.android.commons.livekyc.RepeatHandler
import io.udentify.android.commons.livekyc.RepeatRole
import io.udentify.android.face.livekyc.FaceRepeatHandler
import io.udentify.android.nfc.livekyc.NFCRepeatHandler
import io.udentify.android.nfc.reader.NFCRepeatBaseFragment
import io.udentify.android.nfc.reader.NFCRepeatFragmentFactory

/**
 * Example custom screens for the OCR, NFC and Face redos, off unless the app switches
 * them on. They wrap the handlers the libraries registered, so call this after the
 * JS opt-in; roles the app did not opt in to are left alone.
 */
object CustomScreens {

    private val originals = mutableMapOf<RepeatRole, RepeatHandler>()
    private val installed = mutableMapOf<RepeatRole, RepeatHandler>()

    @Synchronized
    fun enable(language: String?): List<String> {
        disable()
        ExampleStrings.language = language
        install(RepeatRole.OCR) { ExampleOcrHandler() }
        install(RepeatRole.NFC) { inner ->
            InjectingHandler(inner) { params, _ ->
                params.putParcelable(NFCRepeatHandler.PARAM_FRAGMENT_FACTORY, ExampleNfcFactory())
            }
        }
        install(RepeatRole.FACE) { inner -> FaceHandler(inner) }
        return installed.keys.map { it.name }
    }

    /** Puts back the library handlers, unless the app has already cleared or replaced them. */
    @Synchronized
    fun disable() {
        val coordinator = LiveKYCCoordinator.getInstance()
        installed.forEach { (role, ours) ->
            val original = originals[role]
            if (original != null && coordinator.getHandler(role) === ours) {
                coordinator.registerHandler(role, original)
            }
        }
        installed.clear()
        originals.clear()
    }

    private fun install(role: RepeatRole, build: (RepeatHandler) -> RepeatHandler) {
        val coordinator = LiveKYCCoordinator.getInstance()
        val inner = coordinator.getHandler(role) ?: return
        val ours = build(inner)
        originals[role] = inner
        installed[role] = ours
        coordinator.registerHandler(role, ours)
    }

    /** Adds an extra to the repeat's params, then lets the library handler run as usual. */
    private class InjectingHandler(
        private val inner: RepeatHandler,
        private val inject: (Bundle, Activity) -> Unit
    ) : RepeatHandler {
        override fun handleRepeat(
            activity: Activity,
            container: ViewGroup,
            params: Bundle?,
            callback: RepeatCallback
        ) {
            val extras = params ?: Bundle()
            inject(extras, activity)
            inner.handleRepeat(activity, container, extras, callback)
        }
    }

    /** Adds the Face overlay and clears it when the redo is cancelled or fails, however it ends. */
    private class FaceHandler(private val inner: RepeatHandler) : RepeatHandler {
        override fun handleRepeat(
            activity: Activity,
            container: ViewGroup,
            params: Bundle?,
            callback: RepeatCallback
        ) {
            val overlay = ExampleFaceOverlay(activity)
            val extras = params ?: Bundle()
            extras.putParcelable(FaceRepeatHandler.PARAM_LISTENER, overlay)
            inner.handleRepeat(activity, container, extras, object : RepeatCallback {
                override fun onRepeatCompleted(result: Any?) = callback.onRepeatCompleted(result)

                override fun onRepeatCancelled() {
                    overlay.dismiss()
                    callback.onRepeatCancelled()
                }

                override fun onRepeatFailed(reason: String?) {
                    overlay.dismissBanner()
                    callback.onRepeatFailed(reason)
                }
            })
        }
    }

    private class ExampleNfcFactory : NFCRepeatFragmentFactory() {
        override fun createRepeatFragment(): NFCRepeatBaseFragment = ExampleNfcScreen()
    }
}
