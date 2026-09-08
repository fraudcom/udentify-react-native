package com.testapp

import android.app.Activity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Exposes the Android system navigation bar height (bottom inset) to JS.
 *
 * Under edge-to-edge (enforced on Android 15+), the app draws behind the
 * navigation bar and React Native's Dimensions report the full screen height,
 * so the inset is not available from JS. This reads the real WindowInsets so
 * bottom-anchored buttons can clear gesture and 3-button navigation bars alike.
 */
class InsetsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun getBottomInset(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.resolve(0.0)
      return
    }
    activity.runOnUiThread {
      try {
        val density = activity.resources.displayMetrics.density
        val decorView = activity.window.decorView
        val bottomPx =
            ViewCompat.getRootWindowInsets(decorView)
                ?.getInsets(WindowInsetsCompat.Type.navigationBars())
                ?.bottom
                ?: fallbackNavBarHeightPx(activity)
        promise.resolve((bottomPx / density).toDouble())
      } catch (e: Exception) {
        promise.resolve(0.0)
      }
    }
  }

  private fun fallbackNavBarHeightPx(activity: Activity): Int {
    val res = activity.resources
    val id = res.getIdentifier("navigation_bar_height", "dimen", "android")
    return if (id > 0) res.getDimensionPixelSize(id) else 0
  }

  companion object {
    const val NAME = "InsetsModule"
  }
}
