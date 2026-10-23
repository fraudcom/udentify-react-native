package com.testapp.customscreens

import android.content.Context
import android.content.res.Configuration
import androidx.annotation.StringRes
import io.udentify.android.commons.model.UdentifySettingsProvider
import java.util.Locale

/** Texts for the example screens, in the app's language rather than the device's. */
object ExampleStrings {

    /** The app's language setting, for example "TR". Null follows the device. */
    @Volatile
    var language: String? = null

    private fun localized(context: Context): Context {
        val code = language?.lowercase(Locale.ROOT) ?: return context
        val config = Configuration(context.resources.configuration).apply { setLocale(Locale(code)) }
        return context.createConfigurationContext(config)
    }

    /** One of the test app's own strings. */
    fun own(context: Context, @StringRes id: Int, vararg args: Any): String =
        localized(context).getString(id, *args)

    /**
     * An SDK string by its key: the language pack first, then the SDK's own resource in the
     * app language, then [fallback].
     */
    fun sdk(context: Context, key: String, fallback: String): String {
        val inLanguage = localized(context)
        val id = inLanguage.resources.getIdentifier(key, "string", context.packageName)
        val resource = if (id != 0) inLanguage.getString(id) else fallback
        return UdentifySettingsProvider.localizedString(key, resource) ?: resource
    }
}
