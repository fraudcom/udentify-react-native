package com.udentifycore

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

/**
 * Typed reads of a `setRepeatConfig`-style map from JS. Every failure is an
 * IllegalArgumentException naming [caller] and the key, so a module can reject with
 * `INVALID_REPEAT_CONFIG`; the typed getters would throw UnexpectedNativeTypeException
 * and surface as a generic failure. A null value counts as absent.
 */
class RepeatConfigReader(private val map: ReadableMap, private val caller: String) {

    fun requireString(key: String): String {
        val value = optionalString(key)
        require(!value.isNullOrEmpty()) { "$caller: \"$key\" is required" }
        return value
    }

    fun optionalString(key: String): String? =
        if (present(key, ReadableType.String)) map.getString(key) else null

    fun optionalBoolean(key: String): Boolean? =
        if (present(key, ReadableType.Boolean)) map.getBoolean(key) else null

    /** [requirement] completes "must be a number ..." when [accepts] rejects the value. */
    fun optionalNumber(
        key: String,
        requirement: String = "",
        accepts: (Double) -> Boolean = { true }
    ): Double? {
        if (!present(key, ReadableType.Number)) return null
        val value = map.getDouble(key)
        require(value.isFinite() && accepts(value)) {
            "$caller: \"$key\" must be a number${if (requirement.isEmpty()) "" else " $requirement"}"
        }
        return value
    }

    private fun present(key: String, type: ReadableType): Boolean {
        if (!map.hasKey(key) || map.isNull(key)) return false
        require(map.getType(key) == type) { "$caller: \"$key\" must be a ${type.name.lowercase()}" }
        return true
    }
}
