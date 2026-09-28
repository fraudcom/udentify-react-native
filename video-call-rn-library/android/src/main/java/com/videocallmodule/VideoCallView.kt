package com.videocallmodule

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
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
import com.udentifycore.LiveKycRepeatRegistry
import java.lang.ref.WeakReference

/**
 * A RN-hosted FrameLayout embedding the vendor VCFragment inline in the React
 * view tree. Inline rather than a full-screen Activity so an app can compose its
 * own controls - the End Call button above all - as sibling views over the call.
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

    // True between a repeat taking the screen (getRepeatParams) and handing it
    // back (onRepeatEnded). Both halves are the SDK's own callbacks.
    private var repeatActive = false

    // One cancel in flight at a time; later callers join it and get the same
    // result. Lock rather than UI-thread confinement: endCall/cancelCall are
    // documented callable from any thread.
    private val cancelLock = Any()
    private var cancelInFlight = false
    private val pendingCancelCallbacks = mutableListOf<(Boolean, String?) -> Unit>()
    // Whether any joined caller came in through endCall(), which tears down
    // whatever the server says; cancelCall() alone tears down only on success.
    private var cancelTearsDownUnconditionally = false

    // Re-styles the vendor fragment's inflated views from the `config` prop
    // (PiP preview, control buttons, waiting-screen label) and repairs the
    // control buttons' state handling, which the SDK gets wrong. The SDK's own
    // customisation story is compile-time XML style overrides, which a React
    // Native app can't drive per screen - see VideoCallStyleApplier.
    private val styleApplier = VideoCallStyleApplier(
        hostView = this,
        micEnabled = { operator?.isMicrophoneEnabled() })

    init {
        addView(containerView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        attached = true
        if (started) {
            // Re-attach of a still-running call: the session outlives a
            // detach, so restyle rather than restart.
            applyStyles()
            containerView.post { applyStyles() }
        } else {
            startIfReady()
        }
    }

    /**
     * Restores the layout mechanism the vendor's view tree expects.
     * React Native's `ReactViewGroup` hard no-ops `requestLayout()`, so a layout
     * request raised by any SDK view below us dies here and the view is never
     */
    override fun requestLayout() {
        super.requestLayout()
        // Reading a primitive field before the constructor has run yields false,
        // so both of these are safe even for the requestLayout() that addView()
        // raises from init.
        if (!bridgeLayoutRequests) return
        if (relayoutPosted) return
        relayoutPosted = true
        post { runPendingRelayout() }
    }

    private var relayoutPosted = false

    // Whether this call needs the requestLayout() bridge above. Resolved once,
    // when the fragment is mounted, rather than read per call: requestLayout()
    // fires many times a second during a layout pass, and the registry is a
    // process-wide lookup.
    private var bridgeLayoutRequests = false

    private fun runPendingRelayout() {
        relayoutPosted = false
        val w = width
        val h = height
        // Nothing to lay out into yet; the Yoga pass that gives this view its
        // bounds will trigger onLayout on its own.
        if (w <= 0 || h <= 0) return
        Log.d(TAG, "requestLayout() bridged to a real layout pass (${w}x$h)")
        measure(
            MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY))
        layout(left, top, left + w, top + h)
    }

    // Detaching from the window is NOT the end of the call. Navigating away
    // under react-native-screens detaches and re-attaches this view while the
    // session keeps running, so ending it here would drop live calls on a screen
    // change. Real end-of-life is React unmounting the component
    // (onDropViewInstance - see destroy()).
    override fun onDetachedFromWindow() {
        attached = false
        super.onDetachedFromWindow()
    }

    // React unmount, and where a back press lands. Routes through endCall() so
    // the server is told, rather than a bare teardown that leaves the
    // transaction dangling. An app wanting to confirm first should intercept
    // back in JS and call cancelVideoCall() itself.
    fun destroy() {
        // operator is null once a session has already ended - including the
        // last-one-wins teardown in endOtherLiveSession(), where firing a cancel
        // here would target the *replacement* call, since the SDK's cancel entry
        // point is static and always resolves to the most recently attached
        // fragment.
        if (operator == null) {
            teardown()
            return
        }
        endCall()
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
    // calls this again right after the transaction commits.
    //
    // The re-layout at the end is not optional: React Native lays out its own
    // views with Yoga and never runs a traditional measure/layout pass over
    // children it does not own, so a vendor view added underneath would stay at
    // zero size without it.
    private fun applyStyles() {
        val fragmentView = fragment?.view ?: return
        styleApplier.apply(fragmentView, pendingConfig)
    }

    fun getStatus(): String = operator?.getStatus() ?: "idle"

    // Cancels the transaction server-side before tearing the local session down:
    // the cancel is what ends the agent's session, since merely leaving the media
    // room looks like a network blip from their side. The teardown runs even when
    // the cancel fails, so a failure cannot strand the user on the call screen -
    // `onEnded` reports it instead. Callable from any thread; see endCallLocally.
    fun endCall(onEnded: ((Boolean, String?) -> Unit)? = null) {
        val op = operator
        if (op == null) {
            UiThreadUtil.runOnUiThread {
                teardown()
                onEnded?.invoke(false, "NO_ACTIVE_CALL")
            }
            return
        }
        cancelOnce(op, unconditionalTeardown = true) { success, error ->
            onEnded?.invoke(success, error)
        }
    }

    // Sends one cancel at a time; callers arriving while one is on the wire join
    // it instead of starting a second. See the cancelInFlight field for why.
    // `unconditionalTeardown` carries endCall()'s contract - it ends the local
    // session whatever the server says, so a failed cancel cannot strand the user
    private fun cancelOnce(
        op: VideoCallOperatorImpl,
        unconditionalTeardown: Boolean,
        onResult: (Boolean, String?) -> Unit,
    ) {
        val alreadyInFlight = synchronized(cancelLock) {
            pendingCancelCallbacks.add(onResult)
            if (unconditionalTeardown) cancelTearsDownUnconditionally = true
            val was = cancelInFlight
            cancelInFlight = true
            was
        }
        if (alreadyInFlight) return

        // The SDK's network callback may run off the main thread.
        op.cancelVideoCall { success, error ->
            UiThreadUtil.runOnUiThread {
                val waiting: List<(Boolean, String?) -> Unit>
                val tearDown: Boolean
                val endsSession: Boolean
                synchronized(cancelLock) {
                    cancelInFlight = false
                    endsSession = cancelTearsDownUnconditionally
                    tearDown = cancelTearsDownUnconditionally || success
                    cancelTearsDownUnconditionally = false
                    waiting = pendingCancelCallbacks.toList()
                    pendingCancelCallbacks.clear()
                }
                if (tearDown) {
                    // endCall() contract only - cancelCall() must not emit the
                    // extra 'disconnected'. `op`, not `operator`: the field may
                    // already be cleared by the time the cancel settles.
                    if (endsSession) op.endVideoCall()
                    teardown()
                }
                waiting.forEach { it.invoke(success, error) }
            }
        }
    }

    // The teardown half of endCall, with no server round-trip - all that is
    // possible once the host is going away (VideoCallModule.onHostDestroy).
    // Callable from any thread, since teardown()'s FragmentManager transaction
    // throws off the main thread. The hop is a post even from the main thread,
    fun endCallLocally() {
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
        // Shares endCall's in-flight guard: both send the same request, and a
        // cancel here followed by an unmount would otherwise duplicate it.
        // Teardown now happens in cancelOnce, before the callback rather than
        // after it - the call is over either way by the time this returns.
        cancelOnce(op, unconditionalTeardown = false) { success, error ->
            callback(success, error)
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
        val observationMode =
            if (creds.hasKey("observationMode")) creds.getString("observationMode") else null
        // JS numbers arrive as Double; absent must stay null, not become 0.
        val cameraFeedFrameRate =
            if (creds.hasKey("cameraFeedFrameRate") && !creds.isNull("cameraFeedFrameRate"))
                creds.getDouble("cameraFeedFrameRate").toFloat()
            else null

        val fm = supportFragmentManager() ?: return
        val reactContext = (context as? ThemedReactContext)?.reactApplicationContext
            ?: context as? ReactApplicationContext
            ?: return

        // VideoCallOperatorImpl implements the SDK's VideoCallOperator, so it
        // cannot even load when the app has not shipped the vc AAR - the failure
        // is a LinkageError here rather than something each method could probe
        // for. This is the one place that can still report it, and
        val op = try {
            VideoCallOperatorImpl(
                serverURL = serverURL,
                wssURL = wssURL,
                userID = userID,
                transactionID = transactionID,
                clientName = clientName,
                idleTimeout = idleTimeout,
                observationMode = observationMode,
                cameraFeedFrameRate = cameraFeedFrameRate,
                reactContext = reactContext,
                onSessionEnded = { Handler(Looper.getMainLooper()).post { teardown() } },
                onRepeatActiveChanged = { active ->
                    Handler(Looper.getMainLooper()).post { setRepeatActive(active) }
                },
                onMicrophoneStateChanged = {
                    Handler(Looper.getMainLooper()).post { applyStyles() }
                }
            )
        } catch (e: LinkageError) {
            val message = context.getString(R.string.udentify_vc_error_sdk_not_available)
            Log.e(TAG, "$message (${e.javaClass.simpleName}: ${e.message})")
            emitError("ERR_SDK_NOT_AVAILABLE", message)
            return
        }
        operator = op
        pendingConfig?.let { setConfig(it) }

        val frag = op.createFragment() ?: run {
            operator = null
            return
        }
        fragment = frag
        started = true

        // Registration tied to the session, not the view: this view can detach
        // and re-attach while one call runs, so the "current instance" must
        // follow the session.
        endOtherLiveSession()
        currentInstance = WeakReference(this)

        (reactContext.currentActivity as? FragmentActivity)?.window
            ?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        mountFragment(fm, frag)
    }

    // Last-one-wins: ends an earlier still-running session so this one can
    // start. The end of that earlier session does NOT reach JS cleanly - its
    // listeners may already be gone - so do not rely on an event for it.
    private fun endOtherLiveSession() {
        val previous = currentInstance?.get() ?: return
        if (previous === this) return
        Log.w(TAG, "Another video call was still running; ending it before starting this one")
        previous.teardown()
    }

    // Normally a synchronous commit; falls back to async when react-native-
    // screens is already running a fragment transaction of its own, since
    // committing inside one throws.
    // The fragment is always hosted in this view's own container, which is what
    private fun hostContainerId(): Int {
        // See requestLayout(). On for every call: the SDK raises layout requests
        // outside the repeat flow too - revealing its camera-off overlay is one -
        // and inline hosting is what every release ships.
        bridgeLayoutRequests = true
        return containerId
    }

    // True between a repeat taking the screen (getRepeatParams) and handing it
    // back (onRepeatEnded). Both halves are the SDK's own callbacks.
    private fun setRepeatActive(active: Boolean) {
        if (repeatActive == active) return
        repeatActive = active
    }

    private fun mountFragment(fm: FragmentManager, frag: Fragment) {
        val host = hostContainerId()
        try {
            fm.beginTransaction().replace(host, frag).commitNowAllowingStateLoss()
            applyStyles()
            containerView.post { applyStyles() }
        } catch (e: IllegalStateException) {
            try {
                fm.beginTransaction().replace(host, frag).commitAllowingStateLoss()
                applyStylesWhenFragmentViewExists()
            } catch (t: Throwable) {
                Log.e(TAG, "Failed to mount video call fragment", t)
            }
        } catch (t: Throwable) {
            Log.e(TAG, "Failed to mount video call fragment", t)
        }
    }

    // Polls a few frames for the fragment's view after an async commit, which
    // does not guarantee the view exists by the time it returns.
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

    // Only used for the SDK-missing case above; every other event comes from
    // VideoCallOperatorImpl, which cannot exist when that happens.
    private fun emitError(type: String, message: String) {
        val reactContext = context as? ReactContext ?: return
        try {
            val params = com.facebook.react.bridge.WritableNativeMap().apply {
                putString("type", type)
                putString("message", message)
            }
            reactContext
                .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("VideoCall_onError", params)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit $type", e)
        }
    }

    private fun teardown() {
        val frag = fragment
        fragment = null
        styleApplier.stop()
        repeatActive = false
        // Before dropping the reference, not after: the SDK still holds this
        // operator and will call onCallEnded() on it as the fragment goes away.
        // Clearing our own pointer does not stop that - only the operator
        // refusing to emit does.
        operator?.dispose()
        operator = null
        started = false
        pendingCredentials = null

        // Deregister here rather than in destroy(): the call can end while
        // this view is still mounted (endCall, cancelCall, or the SDK's own
        // onSessionEnded), and leaving a torn-down view registered would keep
        // handing it to VideoCallModule's getActiveInstance() lookups long
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
        // Clears the vendor layout's own elevations with room to spare.
        private const val REACT_ROOT_Z_MARGIN = 100f
        private var currentInstance: WeakReference<VideoCallView>? = null
        fun getActiveInstance(): VideoCallView? = currentInstance?.get()
    }
}
