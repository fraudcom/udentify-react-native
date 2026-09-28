package com.testapp

import android.app.Activity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Exposes the system navigation bar height to JS. Under edge-to-edge the app
 * draws behind the nav bar and RN's Dimensions report the full screen height,
 * so bottom-anchored buttons need the real WindowInsets to clear it.
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
