package com.videocallmodule

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.fragment.app.FragmentManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.ThemedReactContext
import java.lang.ref.WeakReference

/**
 * A RN-hosted FrameLayout that embeds the Udentify vendor VCFragment inline
 * inside the React Native view tree, mirroring MrzCameraView's pattern. See
 * INTERNALS.md "Embedding the vendor fragment (VideoCallView)".
 */
class VideoCallView(context: Context) : FrameLayout(context) {

    private val containerId: Int = View.generateViewId()
    private val containerView = FrameLayout(context).apply { id = containerId }

    private var operator: VideoCallOperatorImpl? = null
    private var fragment: Fragment? = null
    private var pendingCredentials: ReadableMap? = null
    private var pendingConfig: ReadableMap? = null
    private var attached = false
    private var started = false
    private var observedFragmentRoot: ViewGroup? = null

    // Re-styles the vendor fragment's inflated views from the `config` prop
    // (PiP preview, control buttons, waiting-screen label) and repairs the
    // control buttons' state handling, which the SDK gets wrong. The SDK's own
    // customisation story is compile-time XML style overrides, which a React
    // Native app can't drive per screen - see VideoCallStyleApplier.
    private val styleApplier = VideoCallStyleApplier(
        hostView = this,
        micEnabled = { operator?.isMicrophoneEnabled() },
        cameraPosition = { operator?.cameraPosition() })

    init {
        addView(containerView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        attached = true
        if (started) {
            // Re-attach of a still-running call; see INTERNALS.md "Android view
            // lifecycle under react-native-screens".
            applyStyles()
            containerView.post { applyStyles() }
        } else {
            startIfReady()
        }
    }

    // RN's ancestor ViewGroups no-op requestLayout(), which otherwise leaves the
    // fragment's view stuck at 0x0; see INTERNALS.md "Fragment layout under
    // RN's Yoga-only layout".
    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        layoutFragmentContainerChildren()
    }

    // Re-lays out the fragment when the SDK adds a view to its own hierarchy
    // mid-call (e.g. the camera-off overlay); see INTERNALS.md "Fragment layout
    // under RN's Yoga-only layout".
    private val fragmentHierarchyListener = object : ViewGroup.OnHierarchyChangeListener {
        override fun onChildViewAdded(parent: View, child: View) {
            containerView.post { layoutFragmentContainerChildren() }
        }

        override fun onChildViewRemoved(parent: View, child: View) {}
    }

    private fun observeFragmentHierarchy(fragmentView: View) {
        val root = fragmentView as? ViewGroup ?: return
        if (observedFragmentRoot === root) return
        observedFragmentRoot?.setOnHierarchyChangeListener(null)
        root.setOnHierarchyChangeListener(fragmentHierarchyListener)
        observedFragmentRoot = root
    }

    private fun layoutFragmentContainerChildren() {
        val w = containerView.width
        val h = containerView.height
        if (w <= 0 || h <= 0) return
        val widthSpec = View.MeasureSpec.makeMeasureSpec(w, View.MeasureSpec.EXACTLY)
        val heightSpec = View.MeasureSpec.makeMeasureSpec(h, View.MeasureSpec.EXACTLY)
        for (i in 0 until containerView.childCount) {
            val child = containerView.getChildAt(i)
            child.measure(widthSpec, heightSpec)
            child.layout(0, 0, w, h)
        }
    }

    // Detaching from the window is NOT the end of the call; see INTERNALS.md
    // "Android view lifecycle under react-native-screens". Real end-of-life is
    // React unmounting the component (onDropViewInstance - see destroy()).
    override fun onDetachedFromWindow() {
        attached = false
        super.onDetachedFromWindow()
    }

    // React unmounted this component; see VideoCallViewManager.onDropViewInstance.
    // Runs on the UI thread, as all UIManager view operations do, which
    // teardown()'s FragmentManager transaction requires.
    fun destroy() {
        teardown()
    }

    fun setCredentials(credentials: ReadableMap?) {
        pendingCredentials = credentials
        startIfReady()
    }

    fun setConfig(config: ReadableMap?) {
        pendingConfig = config
        applyStyles()
    }

    // No-op until the fragment has actually inflated its view; startIfReady()
    // calls this again right after the transaction commits. The re-layout at
    // the end is not optional; see INTERNALS.md "Fragment layout under RN's
    // Yoga-only layout".
    private fun applyStyles() {
        val fragmentView = fragment?.view ?: return
        observeFragmentHierarchy(fragmentView)
        styleApplier.apply(fragmentView, pendingConfig)
        layoutFragmentContainerChildren()
    }

    fun getStatus(): String = operator?.getStatus() ?: "idle"

    // Callable from any thread: bridge module methods (VideoCallModule.kt's
    // endVideoCall/cancelVideoCall) run on RN's native-modules thread, not
    // the UI thread, but teardown() below does a FragmentManager transaction,
    // which throws CalledFromWrongThreadException off the main thread.
    fun endCall() {
        UiThreadUtil.runOnUiThread {
            operator?.endVideoCall()
            teardown()
        }
    }

    fun cancelCall(callback: (Boolean, String?) -> Unit) {
        val op = operator
        if (op == null) {
            callback(false, "NO_ACTIVE_CALL")
            return
        }
        // The SDK's network callback may also run off the main thread.
        op.cancelVideoCall { success, error ->
            UiThreadUtil.runOnUiThread {
                callback(success, error)
                if (success) teardown()
            }
        }
    }

    private fun startIfReady() {
        if (started || !attached) return
        val creds = pendingCredentials ?: return
        val serverURL = creds.getString("serverURL") ?: return
        val wssURL = creds.getString("wssURL") ?: return
        val transactionID = creds.getString("transactionID") ?: return
        val clientName = creds.getString("clientName") ?: return
        val userID = if (creds.hasKey("userID")) creds.getString("userID") ?: "" else ""
        val idleTimeout = if (creds.hasKey("idleTimeout")) creds.getString("idleTimeout") ?: "30" else "30"

        val fm = supportFragmentManager() ?: return
        val reactContext = (context as? ThemedReactContext)?.reactApplicationContext
            ?: context as? ReactApplicationContext
            ?: return

        val op = VideoCallOperatorImpl(
            serverURL = serverURL,
            wssURL = wssURL,
            userID = userID,
            transactionID = transactionID,
            clientName = clientName,
            idleTimeout = idleTimeout,
            reactContext = reactContext,
            onSessionEnded = { Handler(Looper.getMainLooper()).post { teardown() } }
        )
        operator = op
        pendingConfig?.let { setConfig(it) }

        val frag = op.createFragment() ?: run {
            operator = null
            return
        }
        fragment = frag
        started = true

        // Registration tied to the session, not the view; see INTERNALS.md
        // "Mounting the fragment inside react-native-screens' own transaction".
        endOtherLiveSession()
        currentInstance = WeakReference(this)

        (reactContext.currentActivity as? FragmentActivity)?.window
            ?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        mountFragment(fm, frag)
    }

    // Last-one-wins: ends an earlier still-running session so this one can
    // start. Does NOT reach JS cleanly; see INTERNALS.md "Android view
    // lifecycle under react-native-screens".
    private fun endOtherLiveSession() {
        val previous = currentInstance?.get() ?: return
        if (previous === this) return
        Log.w(TAG, "Another video call was still running; ending it before starting this one")
        previous.teardown()
    }

    // Normally a synchronous commit; falls back to async inside RN screens'
    // own transaction. See INTERNALS.md "Mounting the fragment inside
    // react-native-screens' own transaction".
    private fun mountFragment(fm: FragmentManager, frag: Fragment) {
        try {
            fm.beginTransaction().replace(containerId, frag).commitNowAllowingStateLoss()
            applyStyles()
            containerView.post { applyStyles() }
        } catch (e: IllegalStateException) {
            try {
                fm.beginTransaction().replace(containerId, frag).commitAllowingStateLoss()
                applyStylesWhenFragmentViewExists()
            } catch (t: Throwable) {
                Log.e(TAG, "Failed to mount video call fragment", t)
            }
        } catch (t: Throwable) {
            Log.e(TAG, "Failed to mount video call fragment", t)
        }
    }

    // Polls a few frames for the fragment's view after an async commit; see
    // INTERNALS.md "Mounting the fragment inside react-native-screens' own
    // transaction".
    private fun applyStylesWhenFragmentViewExists(attemptsLeft: Int = STYLE_RETRY_FRAMES) {
        containerView.post {
            if (fragment == null) return@post
            if (fragment?.view != null) {
                applyStyles()
                // Same 0x0 caveat as the synchronous path.
                containerView.post { applyStyles() }
            } else if (attemptsLeft > 0) {
                applyStylesWhenFragmentViewExists(attemptsLeft - 1)
            } else {
                Log.w(TAG, "Video call fragment view never appeared; styles not applied")
            }
        }
    }

    private fun teardown() {
        val frag = fragment
        fragment = null
        styleApplier.stop()
        // The fragment's view goes away with the transaction below, so the
        // listener dies with it either way; dropping the reference keeps this
        // view from holding a destroyed root alive until it is itself dropped.
        observedFragmentRoot?.setOnHierarchyChangeListener(null)
        observedFragmentRoot = null
        operator = null
        started = false
        pendingCredentials = null

        // Deregister here rather than in destroy(): the call can end while
        // this view is still mounted (endCall, cancelCall, or the SDK's own
        // onSessionEnded), and leaving a torn-down view registered would keep
        // handing it to VideoCallModule's getActiveInstance() lookups long
        // after there is anything to act on. Guarded because a replacement
        // view may already have registered itself - React can create the new
        // instance before dropping the old one on a remount, and that newer
        // registration must win.
        if (currentInstance?.get() === this) {
            currentInstance = null
        }

        val reactContext = context as? ReactContext
        (reactContext?.currentActivity as? FragmentActivity)?.window
            ?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        if (frag != null) {
            try {
                // parentFragmentManager throws if the fragment was never
                // attached, which is possible when teardown races an async
                // mount that has not executed yet - fall back to the activity's
                // manager so the queued add is still undone.
                val fm = if (frag.isAdded) frag.parentFragmentManager else supportFragmentManager()
                fm?.beginTransaction()?.remove(frag)?.commitAllowingStateLoss()
            } catch (t: Throwable) {
                Log.w(TAG, "Failed to remove video call fragment", t)
            }
        }
    }

    private fun supportFragmentManager(): FragmentManager? {
        val reactContext = context as? ReactContext
        val activity = reactContext?.currentActivity as? FragmentActivity
        return activity?.supportFragmentManager
    }

    companion object {
        private const val TAG = "VideoCallView"
        private const val STYLE_RETRY_FRAMES = 5
        private var currentInstance: WeakReference<VideoCallView>? = null
        fun getActiveInstance(): VideoCallView? = currentInstance?.get()
    }
}
