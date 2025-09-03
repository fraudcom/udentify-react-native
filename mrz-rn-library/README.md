# MRZ React Native Library

A React Native TurboModule for reading MRZ (Machine Readable Zone) from documents using the Udentify SDK.

## Features

- 📱 Camera-based MRZ scanning
- 🖼️ Image-based MRZ processing
- 🔍 Fast and Accurate modes
- 📊 Real-time progress tracking
- 🔒 Secure document verification
- 🎯 BAC credentials for NFC integration
- ⚡ TurboModule support for improved performance

## Installation

```bash
npm install mrz-rn-library
# or
yarn add mrz-rn-library
```

### iOS Setup

1. **Add MRZ frameworks** to your iOS project's `ios/Frameworks/` directory:
   - `UdentifyCommons.xcframework` (from udentify-core)
   - `UdentifyMRZ.xcframework` (from Udentify SDK)
   - `TesseractOCRSDKiOS.xcframework` (from Udentify SDK)
   - `GPUImage.xcframework` (from Udentify SDK)

2. **Add permissions** to `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required for scanning document MRZ</string>
```

3. **Run pod install**:

```bash
cd ios && pod install
```

### Android Setup

1. **Add MRZ AAR files** to `android/libs/` directory:
   - `mrz-25.2.0.aar` (from Udentify SDK)
   - `commons-25.2.0.aar` (from Udentify SDK)

2. **Add dependencies** to your app-level `build.gradle`:

```gradle
dependencies {
    // MRZ dependencies
    implementation 'com.github.adaptech-cz:Tesseract4Android:2.1.0'
    implementation 'org.jmrtd:jmrtd:0.7.17'
    implementation 'edu.ucar:jj2000:5.2'
    implementation 'com.github.mhshams:jnbis:1.1.0'
    
    // Local AAR files
    implementation fileTree(dir: '../../../mrz-rn-library/android/libs', include: ['*.aar'])
}
```

3. **Add permissions** to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA"/>
```

4. **Register the package** in `MainApplication.java`:

```java
import com.mrzrnlibrary.MRZPackage;

@Override
protected List<ReactPackage> getPackages() {
    return Arrays.<ReactPackage>asList(
        new MainReactPackage(),
        new MRZPackage() // Add this line
    );
}
```

## Usage

### Basic Example

```typescript
import {
  checkPermissions,
  requestPermissions,
  startMrzCamera,
  processMrzImage,
  MrzReaderMode,
  type MrzResult,
  type MrzData
} from 'mrz-rn-library';

// Check camera permissions
const hasPermission = await checkPermissions();
if (!hasPermission) {
  const result = await requestPermissions();
  if (result !== 'granted') {
    // Handle permission denied
    return;
  }
}

// Start MRZ camera scanning
try {
  const result: MrzResult = await startMrzCamera(
    MrzReaderMode.ACCURATE,
    (progress) => {
      console.log('MRZ scanning progress:', progress, '%');
    }
  );
  
  if (result.success && result.mrzData) {
    const mrzData: MrzData = result.mrzData;
    console.log('Document Type:', mrzData.documentType);
    console.log('Document Number:', mrzData.documentNumber);
    console.log('Full Name:', `${mrzData.givenNames} ${mrzData.surname}`);
    console.log('Nationality:', mrzData.nationality);
    console.log('Gender:', mrzData.gender);
    console.log('Date of Birth:', mrzData.dateOfBirth);
    console.log('Date of Expiration:', mrzData.dateOfExpiration);
    
    // Get BAC credentials for NFC reading
    if (result.bacCredentials) {
      console.log('BAC Credentials:', result.bacCredentials);
    }
  } else {
    console.log('MRZ scanning failed:', result.errorMessage);
  }
} catch (error) {
  console.error('Error:', error);
}
```

### Process Image

```typescript
// Process MRZ from a Base64 encoded image
const imageBase64 = "..."; // Your Base64 image data

const result: MrzResult = await processMrzImage(
  imageBase64,
  MrzReaderMode.FAST
);

if (result.success && result.mrzData) {
  console.log('MRZ data extracted successfully');
  const mrzData = result.mrzData;
  console.log('Document Number:', mrzData.documentNumber);
  console.log('Full Name:', `${mrzData.givenNames} ${mrzData.surname}`);
} else {
  console.log('Failed to extract MRZ:', result.errorMessage);
}
```

### Cancel Scanning

```typescript
// Cancel ongoing MRZ scanning
await cancelMrzScanning();
```

## API Reference

### Methods

- `checkPermissions()` → `Promise<boolean>` - Check camera permissions
- `requestPermissions()` → `Promise<string>` - Request camera permissions
- `startMrzCamera(mode, onProgress?)` → `Promise<MrzResult>` - Start camera scanning
- `processMrzImage(imageBase64, mode)` → `Promise<MrzResult>` - Process image
- `cancelMrzScanning()` → `Promise<void>` - Cancel scanning

### Types

#### MrzResult
```typescript
interface MrzResult {
  success: boolean;
  mrzData?: MrzData;
  errorMessage?: string;
  bacCredentials?: BACCredentials;
  // Legacy properties for backward compatibility
  documentNumber?: string;
  dateOfBirth?: string;
  dateOfExpiration?: string;
}
```

#### MrzData
```typescript
interface MrzData {
  documentType: string;        // Document type (P for passport, I for ID card, etc.)
  issuingCountry: string;      // Country code that issued the document (3 letters)
  documentNumber: string;      // Document/passport number
  optionalData1?: string;      // Optional data field 1
  dateOfBirth: string;         // Date of birth in YYMMDD format
  gender: string;              // Gender (M/F/X)
  dateOfExpiration: string;    // Expiration date in YYMMDD format
  nationality: string;         // Nationality code (3 letters)
  optionalData2?: string;      // Optional data field 2
  surname: string;             // Family name/surname
  givenNames: string;          // Given names/first names
}
```

#### BACCredentials
```typescript
interface BACCredentials {
  documentNumber: string;      // Document number
  dateOfBirth: string;         // Date of birth (YYMMDD)
  dateOfExpiration: string;    // Expiration date (YYMMDD)
}
```

#### MrzReaderMode
```typescript
enum MrzReaderMode {
  FAST = 'fast',              // Fast but less accurate
  ACCURATE = 'accurate'       // Slower but more accurate
}
```

### Utilities

```typescript
// Get full name from MRZ data
const fullName = getFullName(mrzData);

// Format date from YYMMDD to readable format
const formattedDate = formatMrzDate(mrzData.dateOfBirth, 'DD/MM/YYYY');

// Validate MRZ data completeness
const missingFields = validateMrzData(mrzData);
```

## Error Handling

The library provides detailed error messages for common issues:

- `ERR_MRZ_NOT_FOUND` - MRZ field not found in image
- `ERR_INVALID_DATE_OF_BIRTH` - Invalid date of birth format
- `ERR_INVALID_DATE_OF_EXPIRE` - Invalid expiration date format
- `ERR_INVALID_DOC_NO` - Invalid document number format
- `PERMISSION_DENIED` - Camera permission not granted
- `CAMERA_ERROR` - Camera initialization failed
- `SDK_NOT_AVAILABLE` - Udentify SDK not properly configured
- `USER_CANCELLED` - User cancelled the scanning process

## Requirements

⚠️ **Important**: This library requires the official Udentify SDK files:
- For Android: `mrz-25.2.0.aar` and `commons-25.2.0.aar` files
- For iOS: `UdentifyMRZ.xcframework` and related frameworks

Without these files, the library will return appropriate SDK_NOT_AVAILABLE errors.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
