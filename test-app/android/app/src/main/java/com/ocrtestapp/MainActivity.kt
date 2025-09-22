package com.ocrtestapp

import android.content.Intent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
  override fun getMainComponentName(): String = "FraudReactNativeTest"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    
    // Find the NFC fragment and call processNFC
    val nfcFragment = supportFragmentManager.findFragmentByTag("nfc_reader_fragment")
    if (nfcFragment != null && intent != null) {
      try {
        // Call processNFC method on the fragment using reflection
        val processNFCMethod = nfcFragment.javaClass.getMethod("processNFC", Intent::class.java)
        processNFCMethod.invoke(nfcFragment, intent)
        android.util.Log.d("MainActivity", "processNFC called from onNewIntent")
      } catch (e: Exception) {
        android.util.Log.e("MainActivity", "Error calling processNFC from onNewIntent: ${e.message}", e)
      }
    }
  }
}
