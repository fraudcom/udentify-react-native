# Udentify React Native SDK Suite

A comprehensive suite of React Native libraries for KYC (Know Your Customer) and identity verification, built with TurboModule support and powered by the Udentify SDK. This project provides multiple specialized libraries for document processing, biometric verification, and fraud detection.

## 📦 Library Suite

This project contains **5 React Native libraries** for comprehensive KYC solutions:

### Core Library

- **`udentify-core`** - Shared components and UdentifyCommons framework (required dependency)

### Feature Libraries

- **`ocr-rn-library`** - Document OCR and verification (ID cards, passports, driver's licenses)
- **`liveness-rn-library`** - Face recognition and liveness detection with anti-spoofing
- **`mrz-rn-library`** - Machine Readable Zone (MRZ) scanning and processing
- **`nfc-rn-library`** - NFC document reading for enhanced security verification

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
udentify-core-26.3.814.tgz            # UdentifyCommons.xcframework

# Feature libraries (each with specific native frameworks)
ocr-rn-library-26.3.814.tgz          # UdentifyOCR.xcframework
liveness-rn-library-26.3.814.tgz     # UdentifyFACE.xcframework + Lottie.xcframework
mrz-rn-library-26.3.814.tgz          # UdentifyMRZ.xcframework + GPUImage.xcframework + TesseractOCRSDKiOS.xcframework
nfc-rn-library-26.3.814.tgz          # UdentifyNFC.xcframework
```

### Installation Requirements

```bash
# 1. REQUIRED: Install core framework first
npm install ./udentify-core-26.3.814.tgz

# 2. Install desired feature libraries (install only what you need)
npm install ./ocr-rn-library-26.3.814.tgz        # For document OCR
npm install ./liveness-rn-library-26.3.814.tgz   # For face liveness
npm install ./mrz-rn-library-26.3.814.tgz        # For MRZ scanning
npm install ./nfc-rn-library-26.3.814.tgz        # For NFC reading
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
└── nfc-rn-library
    ├── UdentifyNFC.xcframework
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
- **iOS**: >= 11.0
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
- **Current Version**: 26.3.814
- **Distribution**: 5 TGZ packages (1 core + 4 feature libraries)
- **Compatibility**: React Native 0.73.0+ (libraries), 0.76.0+ (test-app)
- **Native SDK Version**: Udentify SDK 26.3.0814

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
- **Minimum iOS Version**: 11.0+
- **Xcode**: Latest stable version
- **CocoaPods**: Latest stable version
- **Required Permissions**:
  ```xml
  <key>NSCameraUsageDescription</key>
  <string>Camera access required for document scanning</string>
  <key>NSNFCReaderUsageDescription</key>
  <string>NFC access required for document verification</string>
  ```

### Android Requirements  
- **Minimum SDK**: API level 21 (Android 5.0)
- **Target SDK**: API level 34 (Android 14)
- **Compile SDK**: API level 34
- **Required Permissions**:
  ```xml
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.NFC" />
  <uses-permission android:name="android.permission.READ_PHONE_STATE" />
  ```

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

### Version 26.3.814 (Current — Native SDK 26.3.0814)
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
- ⚠️ `26.3.0814` is not valid semver, so npm package/tgz versions use
  `26.3.814` while native binary filenames keep the vendor's exact
  `26.3.0814` string

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
