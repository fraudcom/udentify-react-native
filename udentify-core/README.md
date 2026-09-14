# Udentify Core

Core shared components for Udentify React Native libraries, including SSL certificate pinning.

## Overview

`udentify-core` provides:
1. **SSL Certificate Pinning** - Secure SSL/TLS communication
2. **Remote Language Pack** - Dynamic localization updates from server
3. **Shared UdentifyCommons Framework** - Required by all Udentify libraries:
   - **OCR Library** (`ocr-rn-library`)
   - **NFC Library** (`nfc-rn-library`) 
   - **Liveness Library** (`liveness-rn-library`)

## Architecture

```
udentify-core (Provides UdentifyCommons + SSL Pinning + Remote Language Pack)
├── OCR Library (Uses UdentifyOCR + UdentifyCommons)
├── NFC Library (Uses UdentifyNFC + UdentifyCommons)  
└── Liveness Library (Uses UdentifyFACE + UdentifyCommons)
```

## SSL Certificate Pinning

SSL pinning is a security technique that allows your application to verify if the server certificate is the one it expects.

### Important

**SSL pinning and Remote Language Pack should be configured BEFORE using any Udentify modules** to ensure the configurations are applied correctly from the start of the application's lifecycle.

### Usage

#### Load Certificate from App Bundle/Assets (Recommended)

Place your certificate file (`.cer` or `.der` format, DER-encoded) in:
- **iOS**: Add to your Xcode project bundle
- **Android**: Place in `android/app/src/main/assets/`

```typescript
import { loadCertificateFromAssets } from 'udentify-core';

// Load and set certificate
await loadCertificateFromAssets('MyServerCertificate', 'cer');
```

#### Set Certificate from Base64 String

```typescript
import { setSSLCertificateBase64 } from 'udentify-core';

const base64Cert = "MIIDXTCCAkWgAwIBAgIJAK...";
await setSSLCertificateBase64(base64Cert);
```

#### Check SSL Pinning Status

```typescript
import { isSSLPinningEnabled } from 'udentify-core';

const isEnabled = await isSSLPinningEnabled();
console.log('SSL Pinning enabled:', isEnabled);
```

#### Remove Certificate

```typescript
import { removeSSLCertificate } from 'udentify-core';

await removeSSLCertificate();
```

### Complete Example

```typescript
import React, { useEffect } from 'react';
import { loadCertificateFromAssets } from 'udentify-core';

function App() {
  useEffect(() => {
    // Configure SSL pinning BEFORE using any Udentify modules
    setupSSLPinning();
  }, []);

  const setupSSLPinning = async () => {
    try {
      await loadCertificateFromAssets('MyServerCertificate', 'cer');
      console.log('SSL Pinning configured successfully');
    } catch (error) {
      console.warn('Failed to setup SSL pinning:', error);
    }
  };

  return (
    // Your app content
  );
}
```

### Certificate Format

- **Format**: DER (Distinguished Encoding Rules)
- **Extensions**: `.cer` or `.der`
- **Type**: X.509 certificate

To convert PEM to DER format:
```bash
openssl x509 -in certificate.pem -outform der -out certificate.cer
```

## API Reference

### `loadCertificateFromAssets(certificateName: string, extension: string): Promise<boolean>`

Load a certificate from the app bundle/assets and set it for SSL pinning.

- **certificateName**: Name of the certificate file without extension
- **extension**: File extension ('cer' or 'der')
- **Returns**: Promise resolving to true if successful

### `setSSLCertificateBase64(certificateBase64: string): Promise<boolean>`

Set SSL certificate using base64 encoded data.

- **certificateBase64**: Base64 encoded certificate data (DER format)
- **Returns**: Promise resolving to true if successful

### `removeSSLCertificate(): Promise<boolean>`

Remove the currently set SSL certificate, disabling SSL pinning.

- **Returns**: Promise resolving to true if successful

### `getSSLCertificateBase64(): Promise<string | null>`

Get the currently set SSL certificate as base64 string.

- **Returns**: Promise resolving to base64 string or null if not set

### `isSSLPinningEnabled(): Promise<boolean>`

Check if SSL pinning is currently enabled.

- **Returns**: Promise resolving to true if enabled

## Remote Language Pack

The Remote Language Pack feature allows you to update localization values in real-time without needing to update the mobile app itself. This enables you to modify localization values through the Udentify Dashboard.

### Important Notes

- It is crucial to retain default localization key-values in your localization files as a fallback
- Remote language pack should be configured before using other Udentify modules
- The SDK uses the localization map automatically in the background
- If the remote language pack cannot be retrieved, the app falls back to default values

### Usage

#### Instantiate Server-Based Localization

Download and apply localization from the server:

```typescript
import { 
  instantiateServerBasedLocalization, 
  mapSystemLanguageToEnum 
} from 'udentify-core';

// Get system language or use default
const systemLanguage = await mapSystemLanguageToEnum();
const language = systemLanguage || 'EN';

// Instantiate localization
await instantiateServerBasedLocalization(
  language,
  'https://api.udentify.com',
  'transaction-id-123',
  30 // timeout in seconds
);
```

#### Get Localization Map (Debugging)

Retrieve the current localization map:

```typescript
import { getLocalizationMap } from 'udentify-core';

const localizationMap = await getLocalizationMap();
if (localizationMap) {
  console.log('Total entries:', Object.keys(localizationMap).length);
  console.log('Sample entry:', localizationMap['key']);
}
```

#### Clear Localization Cache

Remove cached localization for a specific language:

```typescript
import { clearLocalizationCache } from 'udentify-core';

await clearLocalizationCache('EN');
```

#### Map System Language

Detect the user's system language:

```typescript
import { mapSystemLanguageToEnum } from 'udentify-core';

const systemLanguage = await mapSystemLanguageToEnum();
console.log('System language:', systemLanguage); // e.g., 'EN'
```

### Complete Example

```typescript
import React, { useEffect } from 'react';
import { 
  loadCertificateFromAssets,
  instantiateServerBasedLocalization,
  mapSystemLanguageToEnum 
} from 'udentify-core';

function App() {
  useEffect(() => {
    // Configure SSL and localization BEFORE using Udentify modules
    initializeUdentify();
  }, []);

  const initializeUdentify = async () => {
    try {
      // 1. Setup SSL Pinning
      await loadCertificateFromAssets('MyServerCertificate', 'cer');
      console.log('SSL Pinning configured');

      // 2. Setup Remote Localization
      const language = await mapSystemLanguageToEnum() || 'EN';
      await instantiateServerBasedLocalization(
        language,
        'https://api.udentify.com',
        'your-transaction-id'
      );
      console.log('Localization configured');

      // 3. Now safe to use other Udentify modules
    } catch (error) {
      console.warn('Failed to initialize Udentify:', error);
    }
  };

  return (
    // Your app content
  );
}
```

### Supported Languages

The SDK supports the following language codes:
- `EN` - English
- `TR` - Turkish
- `FR` - French
- `DE` - German
- `ES` - Spanish
- `IT` - Italian
- `PT` - Portuguese
- `RU` - Russian
- `AR` - Arabic
- `ZH` - Chinese
- `JA` - Japanese
- `KO` - Korean

### Error Handling

```typescript
try {
  await instantiateServerBasedLocalization('EN', serverUrl, transactionId);
} catch (error) {
  // Handle errors:
  // - LOCALIZATION_ERROR: Invalid language or network error
  // - Network timeout or server unavailable
  console.warn('Localization error:', error);
  // App will fall back to default localization strings
}
```

## API Reference (Remote Language Pack)

### `instantiateServerBasedLocalization(language: string, serverUrl: string, transactionId: string, requestTimeout?: number): Promise<void>`

Download and instantiate server-based localization.

- **language**: Language code (e.g., 'EN', 'FR', 'TR')
- **serverUrl**: URL of the Udentify API Server
- **transactionId**: Transaction ID from Udentify API Server
- **requestTimeout**: Timeout in seconds (default: 30)
- **Returns**: Promise resolving when localization is instantiated

### `getLocalizationMap(): Promise<Record<string, string> | null>`

Get the current localization map (for debugging).

- **Returns**: Promise resolving to localization map or null if not available

### `clearLocalizationCache(language: string): Promise<void>`

Clear cached localization for a specific language.

- **language**: Language code to clear
- **Returns**: Promise resolving when cache is cleared

### `mapSystemLanguageToEnum(): Promise<string | null>`

Map system language to SDK language code.

- **Returns**: Promise resolving to language code or null if not supported

## Platform Support

### iOS
- **Framework**: `UdentifyCommons.xcframework`
- **Location**: `ios/Frameworks/UdentifyCommons.xcframework`
- **Integration**: CocoaPods dependency in each library's podspec
- **Min Version**: iOS 11.0+

### Android
- **Library**: `commons-25.4.0.aar`
- **Location**: `android/libs/commons-25.4.0.aar`
- **Integration**: Gradle project dependency `project(':udentify-core')`
- **Min Version**: Android API Level 21+

## Installation

This module is automatically installed when using any Udentify library and should be included in your main app's dependencies.

```bash
npm install udentify-core
```

For iOS:
```bash
cd ios && pod install
```

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

## Files Structure

```
udentify-core/
├── index.js                    # Module entry point
├── package.json                # Package configuration
├── udentify-core.podspec       # iOS CocoaPods specification
├── src/
│   ├── index.ts                # TypeScript exports
│   └── NativeSSLPinningModule.ts  # TurboModule spec
├── ios/
│   ├── SSLPinningModule.h      # Bridge header
│   ├── SSLPinningModule.mm     # Bridge implementation
│   ├── SSLPinningManager.swift # Swift implementation
│   └── Frameworks/
│       └── UdentifyCommons.xcframework/
└── android/
    ├── build.gradle            # Android build configuration
    ├── src/main/
    │   ├── AndroidManifest.xml
    │   └── java/com/udentifycore/
    │       ├── SSLPinningModule.kt
    │       └── UdentifyCorePackage.kt
    └── libs/
        └── commons-25.4.0.aar
```

## Version

Current version: **1.0.0**

Compatible with:
- React Native >= 0.60.0
- React >= 16.0.0

## License

MIT

## Support

For issues, questions, or feature requests, please contact Udentify support.
