# Udentify React Native SDK Suite

A comprehensive suite of React Native libraries for KYC (Know Your Customer) and identity verification, built with TurboModule support and powered by the Udentify SDK. This project provides multiple specialized libraries for document processing, biometric verification, and fraud detection.

## 📦 Library Suite

This project contains **6 React Native libraries** for comprehensive KYC solutions:

### Core Library

- **`udentify-core`** - Shared components and UdentifyCommons framework (required dependency)

### Feature Libraries

- **`ocr-rn-library`** - Document OCR and verification (ID cards, passports, driver's licenses)
- **`liveness-rn-library`** - Face recognition and liveness detection with anti-spoofing
- **`mrz-rn-library`** - Machine Readable Zone (MRZ) scanning and processing
- **`nfc-rn-library`** - NFC document reading for enhanced security verification
- **`video-call-rn-library`** - Embeddable video call screen for agent-assisted verification

### Key Features

- ⚡ **TurboModule Support** - Modern React Native architecture with backward compatibility
- 🔒 **Advanced Security** - Document liveness, hologram verification, and face anti-spoofing
- 📱 **Cross-Platform** - Full support for both iOS (11.0+) and Android (API 21+)
- 🎯 **Modular Design** - Use individual libraries or combine for complete KYC workflows
- 📊 **Real-time Processing** - Live camera feeds with instant feedback
- 🌍 **Multi-language Support** - Localized for multiple regions

## 📋 Table of Contents

- [Library Suite](#library-suite)
- [Distribution](#distribution)
- [Architecture](#architecture)
- [Installation](#installation)
- [Library Documentation](#library-documentation)
- [Example App](#example-app)
- [Build Process](#build-process)
- [Release Management](#release-management)
- [Platform Requirements](#platform-requirements)
- [Support](#support)

## 📦 Distribution

This SDK suite is distributed as individual `.tgz` packages with a peer dependency architecture. The `udentify-core` package provides shared native frameworks required by all feature libraries.

### Available TGZ Packages

```bash
# Core shared framework (required peer dependency)
udentify-core-26.4.1023.tgz            # UdentifyCommons.xcframework

# Feature libraries (each with specific native frameworks)
ocr-rn-library-26.4.1023.tgz          # UdentifyOCR.xcframework
liveness-rn-library-26.4.1023.tgz     # UdentifyFACE.xcframework + Lottie.xcframework
mrz-rn-library-26.4.1023.tgz          # UdentifyMRZ.xcframework + GPUImage.xcframework + TesseractOCRSDKiOS.xcframework
nfc-rn-library-26.4.1023.tgz          # UdentifyNFC.xcframework
video-call-rn-library-26.4.1023.tgz   # UdentifyVC.xcframework + UdentifyLiveKYC.xcframework (+ LiveKitWebRTC through CocoaPods)
```

### Installation Requirements

```bash
# 1. REQUIRED: Install core framework first
npm install ./udentify-core-26.4.1023.tgz

# 2. Install desired feature libraries (install only what you need)
npm install ./ocr-rn-library-26.4.1023.tgz        # For document OCR
npm install ./liveness-rn-library-26.4.1023.tgz   # For face liveness
npm install ./mrz-rn-library-26.4.1023.tgz        # For MRZ scanning
npm install ./nfc-rn-library-26.4.1023.tgz        # For NFC reading
npm install ./video-call-rn-library-26.4.1023.tgz # For agent-assisted video call
```

### Peer Dependency Architecture

- **`udentify-core`** provides `UdentifyCommons.xcframework` shared by all libraries
- **Feature libraries** declare `udentify-core` as a peer dependency (not bundled)
- **Native frameworks** are distributed separately for each specific functionality
- **Modular installation** - install only the feature libraries you need
- **Single core version** supports all feature libraries simultaneously

## 🏗 Architecture

The SDK suite follows a modular architecture with shared dependencies:

```
Feature Libraries (each depends on udentify-core):

├── ocr-rn-library 
│   ├── UdentifyOCR.xcframework
│   └── depends on: udentify-core (UdentifyCommons.xcframework)
│
├── liveness-rn-library
│   ├── UdentifyFACE.xcframework
│   ├── Lottie.xcframework
│   └── depends on: udentify-core (UdentifyCommons.xcframework)
│
├── mrz-rn-library
│   ├── UdentifyMRZ.xcframework
│   ├── GPUImage.xcframework
│   ├── TesseractOCRSDKiOS.xcframework
│   └── depends on: udentify-core (UdentifyCommons.xcframework)
│
├── nfc-rn-library
│   ├── UdentifyNFC.xcframework
│   └── depends on: udentify-core (UdentifyCommons.xcframework)
│
└── video-call-rn-library
    ├── UdentifyVC.xcframework, UdentifyLiveKYC.xcframework
    ├── LiveKitWebRTC (CocoaPods dependency)
    └── depends on: udentify-core (UdentifyCommons.xcframework)
```

### Dependency Management

- **`udentify-core`** provides shared `UdentifyCommons` framework
- Each library includes its specific native frameworks
- All libraries use peer dependencies for React Native compatibility
- TurboModule support with fallback to legacy bridge

## 🛠 Installation

### Prerequisites

- **React Native**: >= 0.73.0 (liveness), >= 0.76.0 (test-app)
- **iOS**: >= 13.0 for video call and liveness (see Platform Requirements)
- **Android**: >= API level 21 (Android 5.0)
- **Node.js**: >= 18.0.0

## 📚 Library Documentation

Each library in the suite has comprehensive documentation and examples:

### OCR Library (`ocr-rn-library`)
- **Purpose**: Document OCR, verification, liveness detection, and hologram verification
- **Features**: ID cards, passports, driver's licenses, camera integration
- **Documentation**: See `ocr-rn-library/README.md`

### Liveness Library (`liveness-rn-library`)
- **Purpose**: Face recognition and liveness detection with anti-spoofing
- **Features**: Active/hybrid liveness, photo recognition, user management
- **Documentation**: See `liveness-rn-library/README.md`

### MRZ Library (`mrz-rn-library`)
- **Purpose**: Machine Readable Zone scanning and processing
- **Features**: Camera/image-based MRZ, fast/accurate modes, BAC credentials
- **Documentation**: See `mrz-rn-library/README.md`

### NFC Library (`nfc-rn-library`)
- **Purpose**: NFC document reading for enhanced security
- **Features**: Secure document verification, encrypted data reading
- **Documentation**: See `nfc-rn-library/README.md`

### Core Library (`udentify-core`)
- **Purpose**: Shared components and frameworks for all libraries
- **Features**: Common native frameworks, dependency management
- **Documentation**: See `udentify-core/README.md`

### Video Call Library (`video-call-rn-library`)
- **Purpose**: Embeddable video call screen for agent-assisted verification
- **Features**: `<VideoCallView>` native component, app-rendered call controls, real-time call events, and native UI styling via the `config` prop
- **Documentation**: See [`video-call-rn-library/USAGE.md`](video-call-rn-library/USAGE.md)

## 🧪 Example App

The repository includes a comprehensive test application (`test-app/`) demonstrating all libraries. The test app consumes libraries from `.tgz` packages in the `packages/` folder.

```bash
# First, build and pack all libraries to packages/ (see Build Process)
# Then install and run the test app
cd test-app
npm install

# iOS
npm run ios

# Android  
npm run android
```

### Test App Features

- **Service Layer Architecture**: Mirrors repository patterns from native development
- **API Integration**: Complete Udentify API service implementation
- **Multi-Environment Support**: Dev, test, and production configurations
- **Permission Handling**: Automatic camera and NFC permission management
- **UI Components**: Ready-to-use components for each library
- **Error Handling**: Comprehensive error management and logging
- **Example Custom Screens**: Optional example screens for the in-call OCR, NFC and Face redos, off by default. Switch them on under Settings → Example Custom Screens before starting a call. The code is in `test-app/android/app/src/main/java/com/testapp/customscreens` (Android) and `test-app/ios/ExampleCustomScreens` (iOS)
- **MRZ or OCR data for the in-call NFC step**: Settings → Store MRZ Data for Live KYC and Store OCR Data for Live KYC (both off by default) keep the MRZ scanned in the MRZ tab, or the OCR data read before the call, and pass it to the call (`liveKYCOptions.nfcMRZ` on iOS, `mrz` in the NFC `setRepeatConfig` on Android), so the NFC step needs no OCR step first. The data is cleared when the call ends. Settings → Scanned MRZ Over Call OCR makes it win over an OCR step of the call; by default the call's OCR wins
- **Connection quality, relayed signals and background audio**: the call screen shows a small badge with both sides' connection quality and the last relayed signal. Settings → Keep Audio in Background turns on `keepAudioActiveInBackground`. On Android the SDK's microphone service and permission are kept in the test app's manifest so the option can be tried; on iOS the app declares the `audio` background mode

## 🔨 Build Process

### Creating TGZ Packages

Each library can be packaged for distribution. Output files go to `packages/` for use by the test app:

```bash
# From lib-react-private root
mkdir -p packages
cd udentify-core && npm pack && mv *.tgz ../packages/
cd ../ocr-rn-library && npm pack && mv *.tgz ../packages/
cd ../liveness-rn-library && npm pack && mv *.tgz ../packages/
cd ../mrz-rn-library && npm pack && mv *.tgz ../packages/
cd ../nfc-rn-library && npm pack && mv *.tgz ../packages/
cd ../video-call-rn-library && npm pack --ignore-scripts && mv *.tgz ../packages/
```

### Library Structure

Each library follows the same structure:
```
library-name/
├── src/                    # TypeScript source
├── ios/                    # iOS native implementation  
├── android/                # Android native implementation
├── package.json           # NPM package configuration
├── *.podspec              # iOS CocoaPods specification
└── README.md              # Library-specific documentation
```

## 📋 Release Management

### Version Control

All libraries maintain synchronized versions:
- **Current Version**: 26.4.1023 — all six packages
- **Distribution**: 6 TGZ packages (1 core + 5 feature libraries)
- **Compatibility**: React Native 0.73.0+ (libraries), 0.76.0+ (test-app)
- **Native SDK Version**: Udentify SDK `26.4.1023` on both platforms, with one exception: `mrz` is not part of these drops and stays where it was — Android on `26.3.0814`, which the vendor ships deliberately rather than rebuilding an unchanged module, and iOS `UdentifyMRZ` on `26.3.0928`

### Creating Releases

1. **Update Versions**: Ensure all `package.json` files have consistent versions
2. **Build Libraries**: Run build process for each library
3. **Package for Distribution**: Create `.tgz` files using `npm pack`
4. **Quality Assurance**: Test all libraries with the test app
5. **Documentation**: Update changelogs and documentation

### TGZ Generation Script

```bash
#!/bin/bash
# Build script for creating distribution packages

echo "Building Udentify React Native SDK Suite..."

mkdir -p packages
rm -f packages/*.tgz

cd udentify-core && npm pack && mv *.tgz ../packages/ && cd ..
echo "Core package created"

cd ocr-rn-library && npm pack && mv *.tgz ../packages/ && cd ..
cd liveness-rn-library && npm pack && mv *.tgz ../packages/ && cd ..
cd mrz-rn-library && npm pack && mv *.tgz ../packages/ && cd ..
cd nfc-rn-library && npm pack && mv *.tgz ../packages/ && cd ..
cd video-call-rn-library && npm pack --ignore-scripts && mv *.tgz ../packages/ && cd ..

echo "All packages created successfully in packages/"
ls -la packages/*.tgz
echo ""
echo "Note: Install udentify-core first, then feature libraries"
echo "Test app uses these packages from packages/ folder"
```

## 📋 Platform Requirements

### iOS Requirements
- **Minimum iOS Version**: 13.0+ for `video-call-rn-library` and `liveness-rn-library` (their SDKs' deployment target), 15.1+ for `nfc-rn-library`, 11.0+ for the others
- **Xcode**: Latest stable version
- **CocoaPods**: Latest stable version
- **Required Permissions**:
  ```xml
  <key>NSCameraUsageDescription</key>
  <string>Camera access required for document scanning</string>
  <key>NSMicrophoneUsageDescription</key>
  <string>Microphone access required for audio during video calls</string>
  <key>NFCReaderUsageDescription</key>
  <string>NFC access required for document verification</string>
  <key>com.apple.developer.nfc.readersession.iso7816.select-identifiers</key>
  <array>
      <string>A0000002471001</string>
  </array>
  ```
  The microphone key is needed by `video-call-rn-library`; the NFC keys by `nfc-rn-library`, which
  also needs the Near Field Communication Tag Reading capability with both `NDEF` and `TAG` in
  `com.apple.developer.nfc.readersession.formats`.
- **Podfile (video call)**: `video-call-rn-library` depends on `LiveKitWebRTC`, which comes from
  LiveKit's spec repository. Add it above your targets:
  ```ruby
  source 'https://cdn.cocoapods.org/'
  source 'https://github.com/livekit/podspecs.git'
  ```
- **Orientation**: the call screen and the module screens are designed for portrait; lock the screen
  that hosts them to portrait.
- **Background audio (optional)**: `credentials.keepAudioActiveInBackground` needs the
  app's `audio` background mode (`UIBackgroundModes` with `audio`). Nothing is added to
  the app on its own; the SDK's background handling has relied on the same mode since
  `26.3.0928`.
- **CoreNFC**: `UdentifyCommons` links `CoreNFC` and reports whether the device
  supports NFC reading, so an app that never installs `nfc-rn-library` still links
  it. Reading a chip needs the NFC entitlement and usage description above, as
  before; check archive validation for an app that does not use NFC.

### Android Requirements  
- **Minimum SDK**: API level 21 (Android 5.0); API level 24 for `video-call-rn-library`
- **Target SDK**: API level 34 (Android 14)
- **Compile SDK**: API level 34 or higher; API level 35 for `video-call-rn-library`
- **Required Permissions**:
  ```xml
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  <uses-permission android:name="android.permission.NFC" />
  ```
  `READ_PHONE_STATE` is optional: it only enables `onPhoneCallStateChanged`, and the
  call works fully without it.
- **Build settings** (OCR and Face models, and the SDKs' classes):
  ```groovy
  android {
      aaptOptions { noCompress "tflite" }
  }
  ```
  ```
  # proguard-rules.pro
  -keep public class io.udentify.** { *; }
  ```
  The activity that hosts a call must be a `FragmentActivity` (React Native's
  `ReactActivity` is).

### Development Environment
- **Node.js**: >= 18.0.0
- **React Native CLI**: Latest stable
- **npm/yarn**: Latest stable
- **Git**: For version control

## 🏗 Project Structure

```
OCR-RN/                                 # Root directory
├── udentify-core/                      # Shared core library
├── ocr-rn-library/                     # OCR and document verification
├── liveness-rn-library/                # Face recognition and liveness
├── mrz-rn-library/                     # MRZ scanning
├── nfc-rn-library/                     # NFC document reading
├── video-call-rn-library/              # Agent-assisted video call
├── test-app/                           # Comprehensive test application
│   ├── src/
│   │   ├── components/                 # UI components for each library
│   │   ├── services/                   # API service layer
│   │   ├── config/                     # Environment configurations
│   │   └── constants/                  # App constants
│   ├── ios/                            # iOS app configuration
│   └── android/                        # Android app configuration
└── README.md                           # This file
```

## 🆘 Support

### Documentation
- **Main Documentation**: This README file
- **Library-Specific Docs**: Individual README files in each library
- **API Reference**: See individual library documentation
- **Example Code**: Complete implementation in `test-app/`

### For SDK Integrators
- **Integration Guide**: Refer to individual library README files
- **Best Practices**: Follow patterns demonstrated in test app
- **Troubleshooting**: Check library-specific documentation
- **API Support**: Contact Udentify support team

## 📄 License

This project is licensed under the MIT License. See individual library LICENSE files for details.

## 📈 Version History

### Version 26.4.1023 (Current — Native SDK 26.4.1023 on both platforms)

Native SDK refresh on both platforms, plus three new video-call options. The
Android and iOS drops arrived separately and carry the same four additions.

- ✅ Android native SDKs refreshed to `26.4.1023`: `commons`, `ocr`, `face`, `nfc`
  and `vc`. `mrz` stays on `26.3.0814`. All of them must be on `26.4.1023` together
- ✅ iOS native SDKs refreshed to `26.4.1023`: `UdentifyCommons`, `UdentifyVC`,
  `UdentifyLiveKYC`, `UdentifyOCR`, `UdentifyFACE` and `UdentifyNFC`.
  `UdentifyMRZ` stays on `26.3.0928`. All of them must be on `26.4.1023` together,
  and the `LiveKitWebRTC` pin is unchanged
- ✅ **`onConnectionQualityChanged`** on `<VideoCallView>` — the media server's
  reading of the customer's own link and of the operator's, reported on changes
  only
- ✅ **`onSignalRelayed`** on `<VideoCallView>` — an operator-console signal the
  SDK has no behaviour for, handed to the app as its raw type string
- ✅ **`credentials.keepAudioActiveInBackground`** (off by default) — keeps the call
  audible in both directions while the app is in the background and cuts only the
  camera. See `video-call-rn-library/USAGE.md` section 4
- ⚠️ **Android: manifest change for every integrator.** The SDK now merges the
  `FOREGROUND_SERVICE_MICROPHONE` permission and a microphone foreground service
  (`VideoCallAudioService`) into the app, **whether or not the option is used**,
  and a foreground service type has to be justified in the Play Console. An app
  that will never use background audio can remove both with `tools:node="remove"`;
  the snippet is in `USAGE.md` section 4
- ⚠️ **iOS: the option needs the app's `audio` background mode.** Nothing is added to
  the app on its own. With the option on and the mode missing, the SDK logs a
  warning and the call behaves as with the option off. See `USAGE.md` section 4
- ✅ `nfc-rn-library`: `isNFCAvailable()` asks the SDK whether the device can
  read NFC and returns `false` where it cannot (an Android handset with no chip, an
  iPad or an iPhone older than the iPhone 7, the iOS simulator). On Android it
  reports `true` when NFC is switched off in the system settings; iOS has no such
  setting
- ✅ `nfc-rn-library`: the result carries `passedCA` (Chip Authentication),
  `documentCode`, `dateOfIssue`, `issuingAuthority` and `accessControlProtocol`
  (`'none'`, `'bac'` or `'pace'`) on both platforms, and `address` and `phoneNumber`
  on iOS. On Android `passedPA` and `passedAA` report the chip's verdict as `'true'`,
  `'false'`, `'disabled'` or `'notSupported'`, as on iOS
- ✅ Android OCR: `startOCRScanning` only captures. `performOCR`,
  `performDocumentLiveness` and `performOCRAndDocumentLiveness` make the request, and
  the captured photos are released once one of them has answered, as on iOS; scan
  again to process another document. With `isDocumentLivenessActive` the capture
  screen still sends the SDK's own document-liveness request. `rawPhotoCropRatio` is
  rounded to the nearest percent
- ✅ **Optional MRZ for the NFC redo on Android** (`nfc-rn-library`): `setRepeatConfig`
  takes an optional `mrz` (document number and two `YYMMDD` dates), so a customer
  whose MRZ or OCR data was read before the call can go straight to the chip read
  without an OCR redo in the call. The MRZ of an OCR redo in the call wins by default
  (`preferCapturedMRZ`), as on iOS with `liveKYCOptions.nfcMRZ`. Without it nothing
  changes. The MRZ and OCR data are personal data: your app must clear every copy
  after the call (`setRepeatConfig(null)` on Android). See
  `video-call-rn-library/USAGE.md` section 10
- ✅ Android `liveness-rn-library`: the face flows need the camera and phone-state
  permissions, the ones the face SDK uses. `requestPermissions()` resolves with the
  same status map as `checkPermissions()` once the dialog closes. `checkPermissions()`
  still lists `recordAudio` and `bluetoothConnect` for information, and the library no
  longer adds `BLUETOOTH_CONNECT` to the app's manifest
- ✅ Android `liveness-rn-library`: `gestureResult` carries booleans, as on iOS and in
  the TypeScript type
- ✅ iOS `liveness-rn-library`: an error inside a result carries the SDK's text in
  `message` (`description` is still there)
- ✅ The libraries log events and statuses, not scan results (MRZ values, face and
  liveness results)
- ✅ iOS `mrz-rn-library`: closing the scan screen removes only the views the library
  added
- ✅ Video call (Android and iOS): a call that ended with a result keeps its `completed`
  or `failed` status; `disconnected` is not reported after it
- ⚠️ `udentify-core` `26.4.1023` is required by every other package at this
  version — the peer dependency has been raised accordingly

### Version 26.4.1021 (Native SDK 26.4.1021 on iOS, 26.4.1014 on Android)

iOS-only native SDK refresh, plus one new video-call option. Android is not part
of this drop and keeps `26.4.1014`.

- ✅ iOS native SDKs refreshed to `26.4.1021`: `UdentifyCommons`, `UdentifyVC`,
  `UdentifyLiveKYC`, `UdentifyOCR`, `UdentifyFACE` and `UdentifyNFC`.
  `UdentifyMRZ` stays on `26.3.0928`. All of them must be on `26.4.1021` together
- ✅ **`liveKYCOptions.nfcMRZ`** on `<VideoCallView>` (iOS) — the MRZ your app
  already has, for the chip read of an agent-driven NFC redo, so a customer whose
  document was read before the call needs no OCR redo first. `preferCapturedMRZ`
  chooses between it and the MRZ an OCR redo of the call captured (the OCR redo
  by default). Android's NFC redo still takes the MRZ from the call's last OCR
  redo only. See `video-call-rn-library/USAGE.md` section 10
- ✅ `ocr-rn-library`: the compiled `lib/` includes `setHologramRepeatConfig`, and its
  TypeScript types declare it
- ⚠️ `udentify-core` `26.4.1021` is required by every other package at this
  version — the peer dependency has been raised accordingly

### Version 26.4.1014 (Native SDK 26.4.1014 on both platforms)

Native SDK refresh on both platforms, plus the Android hologram redo.

- ✅ Android native SDKs refreshed to `26.4.1014`: `commons`, `face`, `nfc`,
  `ocr` and `vc`. `mrz` stays on `26.3.0814`
- ✅ iOS native SDKs refreshed to `26.4.1014`: `UdentifyCommons`, `UdentifyVC`,
  `UdentifyLiveKYC`, `UdentifyOCR`, `UdentifyFACE` and `UdentifyNFC`.
  `UdentifyMRZ` stays on `26.3.0928`, and the `LiveKitWebRTC` pin is unchanged
- ✅ iOS: an Active or Hybrid Liveness redo returns the customer to the call as
  soon as the gesture videos are submitted. `onRepeatResult` and `onRepeatEnded`
  still arrive once the server has answered, so anything hidden between
  `onRepeatStarted` and `onRepeatEnded` stays hidden a few seconds longer. The
  call also stays visible behind the system NFC sheet
- ⚠️ When `onRepeatResult` and `onRepeatEnded` with `COMPLETED` arrive differs by
  platform: on Android as soon as the customer's part of an OCR, hologram or
  Active/Hybrid Liveness redo is done, on iOS once the server has answered. See
  `video-call-rn-library/USAGE.md` section 0
- ✅ Both platforms: `UdentifyCommons` now reports NFC support in the device
  information it sends, and on iOS links `CoreNFC` for it (see the iOS
  requirements)
- ✅ **`setHologramRepeatConfig`** on `ocr-rn-library` opts the Android app into
  the in-call hologram redo, separately from the OCR redo. Its `hologram*`
  recording options are named as on iOS's `liveKYCOptions`; pass `null` to opt
  back out. `HOLOGRAM` is now a member of `VideoCallRepeatRole`. It resolves
  `false` on iOS, where the redo is configured through `liveKYCOptions`
- ✅ Android: an Active or Hybrid Liveness redo returns to the call as soon as
  the gesture videos are submitted, the way an OCR redo already does.
  `onRepeatEnded` reports `COMPLETED` at that point, which means the customer
  finished the step, not that the step passed. `onRepeatResult` still fires on
  completion and carries no result data for these methods
- ✅ Android: the call stays visible behind the NFC popup for the whole chip read
- ✅ Android: a back press that reaches the native layer during a redo (that is,
  one no JS `BackHandler` consumed) ends only that redo and reports
  `onRepeatEnded` with `CANCELLED`; the call continues
- ✅ Android: a capture screen does not pass touches through to the call's mic
  and camera buttons, and the local preview is hidden while a redo holds the
  camera and shown again when the call resumes
- ⚠️ `udentify-core` `26.4.1014` is required by every other package at this
  version — the peer dependency has been raised accordingly

### Version 26.3.928 (Native SDK 26.3.0928 on both platforms)

Native SDK refresh on both platforms, plus one new video-call option.

- ✅ Android native SDKs refreshed to `26.3.0928`: `commons`, `face`, `nfc`,
  `ocr` and `vc`. `mrz` stays on `26.3.0814`, which the vendor ships
  deliberately rather than rebuilding an unchanged module
- ✅ iOS native SDKs refreshed to `26.3.0928`, all seven frameworks including
  `UdentifyMRZ`
- ✅ **`credentials.cameraFeedFrameRate`** on `<VideoCallView>` — frames per
  second for the camera and the published encoding, on both platforms. Omit it
  to keep each platform SDK's own default, which is the recommended setting
- ✅ **No app theme requirement on Android.** An integration can use React
  Native's default AppCompat theme; the native SDK themes its own layouts
- ⚠️ `udentify-core` `26.3.928` is required by every other package at this
  version — the peer dependency has been raised accordingly

### Version 26.3.923 (Native SDK Android 26.3.0923 / iOS 26.3.0917)

Android native SDK refresh, and the in-call LiveKYC redo flow is now available.

- ✅ Android native SDKs refreshed to `26.3.0923`: `commons`, `face`, `nfc`,
  `ocr` and `vc`. `mrz` stays on `26.3.0814`
- ✅ **In-call LiveKYC redos.** A video-call agent can ask the customer to redo
  an OCR, Face or NFC capture without leaving the call. Opt in per capture
  package with `setRepeatConfig(...)` before starting the call — available on
  `ocr-rn-library`, `liveness-rn-library` and `nfc-rn-library`. Pass `null` to
  opt back out. An app that does not opt in runs exactly as before
- ✅ **`onRepeatEnded` on `<VideoCallView>`** — fires once per redo that started,
  carrying the `role`, an `outcome` of `COMPLETED` / `CANCELLED` / `FAILED`, and
  an optional `reason`. `onRepeatStarted` and `onRepeatResult` are also
  available. See `video-call-rn-library/USAGE.md` section 0
- ✅ **`activeLivenessOpacity`** on `liveness-rn-library`'s `setRepeatConfig` —
  controls the backdrop drawn over the camera preview during an active-liveness
  capture; `0` shows the camera to the customer
- ✅ **`maskConfidence`** on the face credentials sets the on-device mask
  detection threshold. Defaults to `0.95`

### Version 26.3.918 (Native SDK Android 26.3.0918 / iOS 26.3.0917)

Android native SDK refresh across all six packages, which share one package version.

- ✅ Android native SDKs refreshed to `26.3.0918`: `commons`, `face`, `nfc`, `ocr`
  and `vc`. `mrz` stays on `26.3.0814`, which this drop does not ship
- ✅ New `credentials.mirrorMode` on `<VideoCallView>` (Android) — controls what
  the agent sees during an in-call OCR/Face/NFC redo. Omit it to keep the native
  SDK's own default, which on this SDK relays the customer's whole screen for the
  duration of a redo and asks their consent once per call. See
  `video-call-rn-library/USAGE.md` section 4 for the values and when the setting
  applies
- ✅ Android video call: backing out of the call screen now cancels the
  transaction server-side where it previously only tore the call down locally, so
  the agent's session ends instead of lingering until it times out

### `video-call-rn-library` 26.3.921 (Superseded — Native SDK iOS 26.3.0917 / Android 26.3.0921)
Android-only native SDK bump. No JS-facing or public native API change.
- ⚠️ Android native SDK `26.3.0916` → `26.3.0921`; iOS is unchanged on `26.3.0917`. LiveKit stays on `2.13.0` and `UdentifyCommons` on `26.3.0814` — the vendor AAR still resolves to the same `livekit.org.webrtc.CameraXHelper` and `LocalParticipant.setCameraEnabled` signatures the existing pin was verified against, so no other dependency moves

### `video-call-rn-library` 26.3.917 (Superseded — Native SDK iOS 26.3.0917 / Android 26.3.0916)
iOS native SDK bump, camera switch state synchronisation, and a session-lifetime fix. No JS-facing API change.
- ✅ iOS: switching the camera from the in-call button now also tells the agent console, so its camera indicator follows a user-driven switch instead of only an agent-driven one
- ✅ iOS: a camera switch requested while another is still in flight is refused rather than run concurrently, so the button keeps working when the client and the agent act at the same moment, or when it is tapped repeatedly
- ✅ iOS: a call that has ended stays ended. The call view does not start a second session for the same transaction when its screen is detached and re-attached — which is what `react-native-screens` does when another screen is pushed over the call screen and then popped, and what a `config` prop update after such a detach would also have reached
- ⚠️ iOS native SDK `26.3.0914` → `26.3.0917`; Android is unchanged on `26.3.0916`. LiveKit stays on `2.13.0` and `UdentifyCommons` on `26.3.0814`, so no other dependency moves

### `video-call-rn-library` 26.3.916 (Superseded — Native SDK iOS 26.3.0914 / Android 26.3.0916)
Android native SDK bump, and `endVideoCall()` ends the agent's session too. See `USAGE.md` section 0 for the integration-facing summary.
- ✅ `endVideoCall()` cancels the transaction server-side before tearing the local session down, so the call ends in the agent console as well. The cancellation is what the agent reacts to: leaving the media room on its own is indistinguishable from a network blip on their side, and there is no client-to-agent hangup signal to use instead
- ✅ The local teardown runs even when that cancellation fails, so a server error cannot strand the user on the call screen. `success` stays `true` and the failure is reported through the result’s `error` field — worth logging, since it means the agent's session may still be open
- ✅ `cancelVideoCall()` remains the right call for backing out while connecting: it rejects on failure and leaves the call up, rather than ending it regardless
- ✅ Android: the local camera track is now disabled while the app is backgrounded, so the agent sees a blank tile instead of a frozen frame of the user's face. The vendor SDK closes the camera device on background but leaves the published LiveKit track live
- ✅ Android: vendor AAR `vc-26.3.0916.aar` renames the SDK's call fragment to `UdentifyVideoCallFragment` (was `VideoCallFragment`) and its layout to `fragment_udentify_video_call.xml` (was `fragment_video_call.xml`), replacing generic names that could collide with a host app's own. This library's wrapper is updated to match; no JS-facing API changes
- ⚠️ iOS native SDK stays on `26.3.0914` — this drop is Android-only

### `video-call-rn-library` 26.3.914 (Superseded — Native SDK 26.3.0914, both platforms)
First microphone API with real parity on both platforms, and a removal to match. See `USAGE.md` section 0 for the integration-facing summary.
- ✅ New `onMicrophoneStateChanged` `<VideoCallView>` event — fires for every microphone change, including the ones the SDK makes on its own (app leaving the screen, audio focus lost, a real phone call answered, and the automatic unmute afterwards). Use it as the source of truth for a custom mute button
- ✅ New `VideoCall.setMicrophoneEnabled(enabled)` / `isMicrophoneEnabled()`; both platforms also notify the operator console, so its mute indicator stays in sync with an app-driven change
- ✅ A call with no camera/microphone access is now refused before any token is fetched or room joined, and reported through `onError` with a specific type (`ERR_CAMERA_PERMISSION_*` / `ERR_MICROPHONE_PERMISSION_*`) instead of failing obscurely
- ✅ New `VideoCallErrorType.SDK` — a native SDK error with no more specific type, so a real SDK failure is distinguishable from an unrecognised one
- ✅ Audio stops when the app leaves the screen: the microphone is muted through the normal signal path (so the operator sees an indicator) and the audio engine is stopped, both restored on return with the pre-existing mute state replayed
- ✅ Android: `requestPermissions()` resolves with the user's answer once the system dialog is dismissed
- ✅ Android: `onVideoCallEnded` reports `success: false` for a call that failed
- ✅ Android: the SDK restores the user's intended mute state after a reconnect, which LiveKit itself does not
- ⚠️ `toggleMicrophone()` deprecated — it stays iOS-only and still bypasses the operator notification; `setMicrophoneEnabled(enabled)` replaces it
- ⚠️ **Breaking:** `toggleCamera()` and `switchCamera()` removed. `toggleCamera()` was unsupported on both platforms, and `switchCamera()` only ever worked on iOS — use the camera-switch button the SDK renders in the call UI

### `video-call-rn-library` 26.3.911 (Superseded — Native SDK iOS 26.3.0911 / Android 26.3.0910)
iOS-only native SDK bump; the Android vendor AAR stays on `26.3.0910`.
- ✅ iOS: `onUserStateChanged` now reports `initiating` at the start of a call and `connecting` while the room connection is established, so the state sequence matches Android
- ✅ iOS: `connected` is now reported when the call actually starts (once the initiation countdown finishes and the camera/mic go live) rather than on the raw room join
- ✅ iOS: the call-initiation countdown runs once and is unaffected by the operator toggling their camera mid-call

### `video-call-rn-library` 26.3.910 (Native SDK 26.3.0910)
Native SDK bump scoped to `video-call-rn-library` only; the other five packages remain on the versions documented below.
- ✅ New `onPhoneCallStateChanged`/`onScreenLocked`/`onScreenUnlocked` `<VideoCallView>` events for device phone-call and lock-screen interruptions — informational only, the call itself is never torn down by these (see `USAGE.md` section 7)
- ✅ Android: per-state control-button colour resources (`udentify_vc_button_mic_on_color`/`_mic_off_color`/`_camera_color`) replace the single shared `udentify_vc_buttons_color`
- ✅ iOS: the screen stays awake for the duration of an active call; a muted remote camera shows a black overlay instead of a frozen frame (see `USAGE.md` section 7)
- ✅ Android: the new vendor callbacks are routed through this library's reflection proxy, default interface methods included

### Version 26.3.814 (Superseded — Native SDK 26.3.0814)
- ✅ Vendored binaries refreshed to Udentify native SDK `26.3.0814` across
  all six packages (`udentify-core`, `ocr-rn-library`, `liveness-rn-library`,
  `mrz-rn-library`, `nfc-rn-library`, `video-call-rn-library`)
- ✅ NFC: migrated from the removed
  `ApiCredentials.Builder.isActiveAuthenticationEnabled(Boolean)` to
  `.chipAnticloneMode(ChipAnticloneMode)` on both platforms, preserving the
  existing JS-facing boolean API
- ✅ iOS FACE: added required `onFaceDirectiveChanged`/
  `onActiveLivenessDirectiveChanged` delegate stubs for the updated
  `IDCameraControllerDelegate`/`ActiveCameraControllerDelegate` protocols

### Version 26.1.3
- ✅ All library `package.json` versions and the `udentify-core` peer
  dependency bumped to `26.1.3`
- ✅ Android `build.gradle` AAR references and regenerated `.tgz` packages
  updated to `26.1.3`
- ✅ `test-app` `Podfile.lock` and `udentify-core` framework listing
  refreshed for the new packages

### Version 25.4.0
- ✅ IQA Service v2 with passive processing mode
- ✅ iOS OCR: new `onOCRDirectiveChanged` and `onHologramDirectiveChanged` delegates
- ✅ iOS OCR: cropped review images in `onDocumentScan` callback
- ✅ iOS OCR: `onIqaResult` extended with `IQAResponse` parameter
- ✅ iOS FACE: custom Lottie animations via `ActiveLivenessConfigs`
- ✅ Android FACE: ML Kit migrated to `play-services-mlkit-face-detection`
- ✅ Android FACE: haptic feedback, shutter sound, camera-permission feedback
- ✅ Android: `VIBRATE` permission added to FACE and OCR modules
- ✅ NFC: `NFCSessionState` for improved timeout and cancellation handling

### Version 25.3.0
- ✅ Complete SDK suite with 5 libraries (1 core + 4 feature libraries)
- ✅ TurboModule support for modern React Native
- ✅ Comprehensive test application
- ✅ Full iOS and Android support
- ✅ Udentify SDK 25.3.0 integration
- ✅ Clear TGZ distribution with dependency management

---

**🔐 Built for KYC Excellence • Powered by Udentify SDK • React Native Ready**
