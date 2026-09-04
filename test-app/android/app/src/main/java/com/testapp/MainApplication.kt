package com.testapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.mrzrnlibrary.MRZPackage


class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
              add(MRZPackage()) // Manually add MRZ package since auto-linking is disabled
              add(InsetsPackage()) // Android navigation bar inset reader
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    installUdentifyLoggerCrashGuard()
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
  }

  /**
   * Workaround for a known Udentify SDK bug: io.udentify.android.commons.logger.LogHeader
   * serializes its LogItem list with Gson on a background thread while another thread mutates it,
   * throwing ConcurrentModificationException and crashing the whole app. That remote-telemetry
   * post is non-essential, so we swallow only exceptions originating in the SDK's logger package
   * and let every other exception crash normally.
   */
  private fun installUdentifyLoggerCrashGuard() {
    val previous = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
      if (isUdentifyLoggerCrash(throwable)) {
        android.util.Log.w(
          "MainApplication",
          "Swallowed known Udentify SDK logger crash on thread '${thread.name}' (non-fatal telemetry race)",
          throwable
        )
      } else {
        previous?.uncaughtException(thread, throwable)
      }
    }
  }

  private fun isUdentifyLoggerCrash(throwable: Throwable?): Boolean {
    var current = throwable
    while (current != null) {
      if (current.stackTrace.any { it.className.startsWith("io.udentify.android.commons.logger.") }) {
        return true
      }
      current = current.cause
    }
    return false
  }
}
