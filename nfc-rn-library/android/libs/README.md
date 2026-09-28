# Android NFC SDK binary

This directory holds the vendored Udentify NFC SDK, shipped with the package:

- `nfc-26.3.0918.aar`

No action is needed to install it. `android/build.gradle` puts it on the compile
classpath, and the host app picks it up through the normal autolinking of this
package.

## Relationship to `udentify-core`

The NFC SDK depends on the Udentify Commons binary, which ships in the separate
`udentify-core` package rather than here, so the two are versioned together.
`nfc-rn-library` peer-depends on a matching `udentify-core`; pairing this package
with an older core will fail at runtime rather than at build time.

## Host app configuration

The manifest permissions this SDK needs are declared by the package and merge into
your app automatically. NFC hardware is declared as optional
(`android:required="false"`), so the app still installs on devices without it —
check for NFC support before starting a read.

The AAR filename carries the vendor's exact SDK version and changes with every
SDK update; do not reference it directly from your own build files.
