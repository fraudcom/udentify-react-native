# iOS NFC SDK framework

This directory holds the vendored Udentify NFC framework, shipped with the
package:

- `UdentifyNFC.xcframework` — NFC chip reading

No action is needed to install it. `nfc-rn-library.podspec` links it, so a normal
`pod install` in your app's `ios/` directory picks it up.

## Relationship to `udentify-core`

`UdentifyCommons.xcframework` is **not** in this directory and is not needed here.
It ships in the separate `udentify-core` package, which this package depends on,
so the two are versioned together.
