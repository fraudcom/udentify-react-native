package com.mrzrnlibrary

import android.content.Context
import android.util.Log
import android.view.View
import android.widget.FrameLayout
import androidx.fragment.app.FragmentActivity
import androidx.fragment.app.FragmentManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter
import io.udentify.android.mrz.reader.MrzListener
import org.json.JSONObject

/**
 * A RN-hosted FrameLayout that mounts [MrzInlineCameraFragment] to render
 * the MRZ SDK camera inline inside the React Native view tree.
 * Events:
 */
class MrzCameraView(context: Context) : FrameLayout(context) {

    private val containerId: Int = View.generateViewId()
    private val containerView = FrameLayout(context).apply { id = containerId }

    private var fragment: MrzInlineCameraFragment? = null
    private var pendingPaused: Boolean = false
    private var attached = false

    init {
        addView(
            containerView,
            LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        )
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        attached = true
        attachFragmentIfPossible()
    }

    override fun onDetachedFromWindow() {
        attached = false
        detachFragment()
        super.onDetachedFromWindow()
    }

    fun setPaused(paused: Boolean) {
        pendingPaused = paused
        // Camera open/close follows the Fragment's lifecycle. For a true
        // "pause while keeping the fragment mounted" the SDK would need to
        // expose that; for now we simulate by detaching/attaching the
        // fragment. Kept minimal to avoid behavioural surprises.
        val frag = fragment ?: return
        val fm = supportFragmentManager() ?: return
        if (paused) {
            if (!frag.isHidden) {
                fm.beginTransaction().hide(frag).commitAllowingStateLoss()
            }
        } else {
            if (frag.isHidden) {
                fm.beginTransaction().show(frag).commitAllowingStateLoss()
            }
        }
    }

    private fun attachFragmentIfPossible() {
        if (!attached) return
        val fm = supportFragmentManager() ?: run {
            emitError("FRAGMENT_MANAGER_UNAVAILABLE - ${context.getString(R.string.mrz_fragment_manager_unavailable)}")
            return
        }
        if (fragment != null) return

        val existing = fm.findFragmentById(containerId) as? MrzInlineCameraFragment
        val frag = existing ?: MrzInlineCameraFragment()
        frag.listener = object : MrzInlineCameraFragment.Listener {
            override fun onMrzSuccess(mrzJson: String) {
                emitDetected(mrzJson)
            }
            override fun onMrzFailure(throwable: Throwable) {
                emitError(throwable.message ?: "UNKNOWN_ERROR")
            }
        }
        fragment = frag

        if (existing == null) {
            try {
                fm.beginTransaction()
                    .replace(containerId, frag)
                    .commitAllowingStateLoss()
            } catch (t: Throwable) {
                Log.e(TAG, "Failed to add fragment", t)
                emitError("FRAGMENT_ADD_FAILED - ${t.message ?: context.getString(R.string.mrz_fragment_add_failed)}")
            }
        }
    }

    private fun detachFragment() {
        val frag = fragment ?: return
        val fm = supportFragmentManager() ?: return
        try {
            fm.beginTransaction().remove(frag).commitAllowingStateLoss()
        } catch (t: Throwable) {
            Log.e(TAG, "Failed to remove fragment", t)
        }
        frag.listener = null
        fragment = null
    }

    private fun supportFragmentManager(): FragmentManager? {
        val reactContext = context as? ReactContext
        val activity = reactContext?.currentActivity as? FragmentActivity
        return activity?.supportFragmentManager
    }

    private fun emitDetected(mrzJson: String) {
        val payload = Arguments.createMap()
        try {
            // The SDK's result carries exactly these three keys.
            val obj = JSONObject(mrzJson)
            payload.putString("documentNumber", obj.optString(MrzListener.MRZ_DOC_NO, ""))
            payload.putString("dateOfBirth", obj.optString(MrzListener.MRZ_DATE_OF_BIRTH, ""))
            payload.putString("dateOfExpiration", obj.optString(MrzListener.MRZ_DATE_OF_EXPIRE, ""))
        } catch (t: Throwable) {
            Log.e(TAG, "Failed to parse MRZ JSON", t)
            payload.putString("documentNumber", "")
            payload.putString("dateOfBirth", "")
            payload.putString("dateOfExpiration", "")
        }
        dispatchEvent("onMrzDetected", payload)
    }

    private fun emitError(message: String) {
        val payload = Arguments.createMap().apply {
            putString("errorMessage", message)
        }
        dispatchEvent("onMrzError", payload)
    }

    private fun dispatchEvent(name: String, payload: com.facebook.react.bridge.WritableMap) {
        val reactContext = context as? ThemedReactContext ?: context as? ReactContext ?: return
        reactContext.getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, name, payload)
    }

    companion object {
        private const val TAG = "MrzCameraView"
    }
}
