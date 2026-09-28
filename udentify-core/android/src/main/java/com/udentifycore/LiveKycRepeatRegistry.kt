package com.udentifycore

import android.os.Bundle
import android.util.Log
import java.util.concurrent.ConcurrentHashMap

/**
 * Lets the video call library ask the OCR/Face/NFC libraries for the credentials
 * an in-call repeat needs, without depending on any of them.
 * The vendor SDKs wire themselves together through their own `LiveKYCCoordinator`.
 */
object LiveKycRepeatRegistry {

    /** `RepeatRole.OCR.name` - roles are passed as strings so this module needs no Commons import. */
    const val ROLE_OCR = "OCR"
    const val ROLE_FACE = "FACE"
    const val ROLE_NFC = "NFC"

    /**
     * Builds the parameter Bundle for one repeat, or returns null to refuse it.
     * Called on whichever thread the video call SDK asks the host for credentials
     * on, once per repeat - so implementations should read already-prepared
     */
    fun interface ParamsProvider {
        fun build(role: String): Bundle?
    }

    private const val TAG = "LiveKycRepeatRegistry"

    private val providers = ConcurrentHashMap<String, ParamsProvider>()

    /** Registering a role twice replaces the previous provider; the last one wins. */
    fun register(role: String, provider: ParamsProvider) {
        providers[role] = provider
        Log.d(TAG, "Registered repeat params provider for role $role")
    }

    fun unregister(role: String) {
        if (providers.remove(role) != null) {
            Log.d(TAG, "Unregistered repeat params provider for role $role")
        }
    }

    /**
     * The Bundle for this role, or null when no provider is registered or the
     * provider declined.
     * A provider that throws is treated as declining. This runs on the video call
     */
    fun paramsFor(role: String): Bundle? {
        val provider = providers[role]
        if (provider == null) {
            Log.d(TAG, "No repeat params provider registered for role $role")
            return null
        }
        return try {
            provider.build(role)
        } catch (t: Throwable) {
            Log.e(TAG, "Repeat params provider for role $role threw; refusing the repeat", t)
            null
        }
    }

    /** Which roles currently have a provider. Intended for diagnostics. */
    fun registeredRoles(): Set<String> = providers.keys.toSet()
}
