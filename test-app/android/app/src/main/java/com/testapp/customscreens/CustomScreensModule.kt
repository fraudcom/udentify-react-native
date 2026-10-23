package com.testapp.customscreens

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

/** Switch for the example custom screens, in the app's language; resolves with the roles it covers. */
class CustomScreensModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CustomScreens"

  @ReactMethod
  fun setEnabled(enabled: Boolean, language: String?, promise: Promise) {
    try {
      if (enabled) {
        promise.resolve(Arguments.fromList(CustomScreens.enable(language)))
      } else {
        CustomScreens.disable()
        promise.resolve(Arguments.createArray())
      }
    } catch (e: Exception) {
      promise.reject("CUSTOM_SCREENS_FAILED", e.message, e)
    }
  }
}

class CustomScreensPackage : ReactPackage {
  override fun createNativeModules(
      reactContext: ReactApplicationContext
  ): List<NativeModule> = listOf(CustomScreensModule(reactContext))

  override fun createViewManagers(
      reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> = emptyList()
}
