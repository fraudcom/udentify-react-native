# Udentify Core

Core shared components for Udentify React Native libraries.

## Overview

`udentify-core` provides the shared `UdentifyCommons` framework that is required by all Udentify libraries:
- **OCR Library** (`ocr-rn-library`)
- **NFC Library** (`nfc-rn-library`) 
- **Liveness Library** (`liveness-rn-library`)

## Architecture

```
udentify-core (Provides UdentifyCommons)
├── OCR Library (Uses UdentifyOCR + UdentifyCommons)
├── NFC Library (Uses UdentifyNFC + UdentifyCommons)  
└── Liveness Library (Uses UdentifyFACE + UdentifyCommons)
```

## Platform Support

### iOS
- **Framework**: `UdentifyCommons.xcframework`
- **Location**: `ios/Frameworks/UdentifyCommons.xcframework`
- **Integration**: CocoaPods dependency in each library's podspec

### Android
- **Library**: `commons-25.2.0.aar`
- **Location**: `android/libs/commons-25.2.0.aar`
- **Integration**: Gradle project dependency `project(':udentify-core')`

## Usage

Each library declares `udentify-core` as a peer dependency:

**package.json:**
```json
{
  "peerDependencies": {
    "udentify-core": "^1.0.0"
  }
}
```

**iOS (podspec):**
```ruby
s.dependency "udentify-core"
```

**Android (build.gradle):**
```gradle
api project(':udentify-core')
```

## Installation

This module is automatically installed when using any Udentify library and should be included in your main app's dependencies.

## Files Structure

```
udentify-core/
├── index.js                 # Module entry point
├── package.json            # Package configuration
├── udentify-core.podspec   # iOS CocoaPods specification
├── ios/
│   └── Frameworks/
│       └── UdentifyCommons.xcframework/
└── android/
    ├── build.gradle        # Android build configuration
    ├── src/main/
    │   ├── AndroidManifest.xml
    │   └── java/com/udentifycore/
    │       └── UdentifyCorePackage.kt
    └── libs/
        └── commons-25.2.0.aar
```

## Version

Current version: **1.0.0**

Compatible with:
- React Native >= 0.60.0
- React >= 16.0.0
