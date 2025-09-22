package com.udentifycore

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * React Native package for udentify-core
 * This package provides the shared UdentifyCommons framework
 * but doesn't expose any modules (it's just a dependency provider)
 */
class UdentifyCorePackage : ReactPackage {
    
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        // No native modules - this is just a dependency provider
        return emptyList()
    }
    
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
