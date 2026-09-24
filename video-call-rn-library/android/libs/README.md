# Android video call SDK binary

This directory holds the vendored Udentify video call SDK, shipped with the
package:

- `vc-26.3.0918.aar`

No action is needed to install it. `android/build.gradle` puts it on the compile
classpath, and the host app picks it up through the normal autolinking of this
package.

## Other dependencies

The video call SDK also needs:

- **Udentify Commons**, which ships in the separate `udentify-core` package. The
  two are versioned together, and this package peer-depends on a matching
  `udentify-core`; pairing it with an older core will fail at runtime rather than
  at build time.
- **LiveKit** (`io.livekit:livekit-android`) and a camera library, resolved from
  Maven. See the setup documentation for the versions your app needs to declare.

## Host app configuration

`CAMERA`, `RECORD_AUDIO` and the foreground-service permissions the SDK needs are
declared by this package and merge into your app automatically. `READ_PHONE_STATE`
is optional and only gates the `onPhoneCallStateChanged` event — denying it leaves
the call fully working.

The AAR filename carries the vendor's exact SDK version and changes with every SDK
update; do not reference it directly from your own build files.
