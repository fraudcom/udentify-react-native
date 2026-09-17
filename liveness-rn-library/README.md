# liveness-rn-library

React Native TurboModule for Face Recognition & Liveness Detection using the Udentify SDK.

- Minimum React Native: 0.77.0
- Minimum Android API: 21
- Minimum iOS: 12.0
- TurboModule-ready (with fallback for older RN versions)

---

## Installation

```bash
npm install liveness-rn-library udentify-core
# or
yarn add liveness-rn-library udentify-core
```

`udentify-core` is a required peer dependency.

### iOS

```bash
cd ios && pod install
```

### Android — Native AAR

The Udentify Face SDK is shipped as a local AAR inside the package. It must be referenced from the **host app** (not the library) so the host can manage the SDK version explicitly. Add to your `android/app/build.gradle`:

```gradle
dependencies {
  implementation files('../../node_modules/udentify-core/android/libs/commons-25.4.0.aar')
  implementation files('../../node_modules/liveness-rn-library/android/libs/face-25.4.0.aar')
}
```

---

## Required Host App Dependencies (Android)

Starting with v25.4.0, all ecosystem dependencies (TensorFlow Lite, ML Kit, OkHttp, etc.) are declared as `compileOnly` inside `liveness-rn-library/android/build.gradle`. This means the **host app must provide them as `implementation` dependencies**.

This decision moves version control to the host app, prevents silent "highest wins" overrides, and eliminates `DuplicateClassException` build failures when the host app uses other ML or networking libraries with different versions.

### Required block

Add the following to your `android/app/build.gradle` `dependencies` block:

```gradle
dependencies {
  // TensorFlow Lite (liveness model inference)
  implementation 'org.tensorflow:tensorflow-lite:2.13.0'
  implementation 'org.tensorflow:tensorflow-lite-gpu:2.13.0'
  implementation 'org.tensorflow:tensorflow-lite-support:0.4.4'

  // ML Kit (face detection)
  implementation 'com.google.android.gms:play-services-mlkit-face-detection:17.1.0'

  // Networking (Udentify REST API calls)
  // Pinned to 4.9.2 to match React Native 0.77+'s strictly-constrained version.
  implementation 'com.squareup.okhttp3:okhttp:4.9.2'
  implementation 'com.squareup.okhttp3:okhttp-tls:4.9.2'

  // Camera + UI
  implementation 'com.otaliastudios:cameraview:2.7.2'
  implementation 'com.google.android.material:material:1.9.0'
  implementation 'com.airbnb.android:lottie:6.1.0'

  // JSON
  implementation 'com.google.code.gson:gson:2.10.1'
}
```

AndroidX dependencies (`androidx.core:core-ktx`, `androidx.appcompat`, `androidx.fragment:fragment-ktx`, `androidx.activity:activity-ktx`) are also `compileOnly` in the library, but they are typically already present in any React Native Android project — you do not need to add them explicitly unless your project is unusually minimal.

### aaptOptions

Add this to your `android/app/build.gradle` `android` block so the TFLite model file is not compressed inside the APK:

```gradle
android {
  aaptOptions {
    noCompress "tflite"
  }
}
```

### Version Override

The versions listed above are the ones the library is tested against. You may use different versions — but note:

| Dependency | Override risk |
|---|---|
| `tensorflow-lite*` | Native API and shared library ABI may change between versions. Stay within the 2.x line. Tested with 2.13.0. |
| `play-services-mlkit-face-detection` | Face detection API is stable since 17.x. Newer minor versions are usually safe. |
| `okhttp` | Pinned to 4.9.2 to match React Native 0.77+. Overriding requires also overriding RN's transitive constraint. |
| `cameraview` | Stay on 2.7.x — the library uses its lifecycle integration. |
| `lottie` | Animation rendering only, version flexible within 6.x. |
| `material`, `gson`, AndroidX | Flexible, use whatever your project already has. |

If you hit a conflict with another library that pulls in a different TFLite or ML Kit version, force resolution at the host level:

```gradle
configurations.all {
  resolutionStrategy.eachDependency { details ->
    if (details.requested.group == 'org.tensorflow') {
      details.useVersion '2.13.0'
      details.because 'pinned to liveness-rn-library tested version'
    }
  }
}
```

---

## Migration from earlier 25.x to v25.4.0

If you are upgrading from an earlier 25.x release where the library declared its ecosystem dependencies as `implementation`, your build will fail at runtime with `ClassNotFoundException` or `NoClassDefFoundError` for classes like `org.tensorflow.lite.Interpreter` or `com.google.mlkit.vision.face.FaceDetector`.

**Fix**: copy the [Required block](#required-block) above into your `android/app/build.gradle` `dependencies` section. No other changes are required — your existing usage of the JavaScript API stays the same.

If you were already using TFLite, ML Kit, or any of these dependencies for other purposes in your app, you do not need to declare them twice — your existing declarations satisfy the library's `compileOnly` contract.

---

## iOS Setup

Add the following to your `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access for face recognition</string>
```

---

## Usage

```typescript
import { Liveness } from 'liveness-rn-library';

// see test-app for full integration examples
```

Refer to [test-app](../test-app/) for a complete reference integration including all required Android dependencies.
