# Liveness React Native Library

A comprehensive React Native TurboModule library for face recognition and liveness detection, powered by the Udentify SDK. This library provides secure biometric authentication capabilities with advanced anti-spoofing features.

## 🚀 Features

- **Face Recognition**: Registration and authentication using device camera
- **Active Liveness Detection**: Advanced gesture-based liveness verification
- **Hybrid Liveness Detection**: Combines active and passive liveness checks
- **Photo-based Recognition**: Recognition using provided base64 encoded images
- **List Management**: User identification and management in custom lists
- **Permission Management**: Automatic handling of camera and phone state permissions
- **UI Customization**: Extensive customization options for colors, fonts, and behaviors
- **Event-Driven Architecture**: Real-time callbacks for all operations
- **TurboModule Support**: Modern React Native architecture with backward compatibility

## 📋 Supported Platforms

- ✅ **Android** (API level 21+)
- ✅ **iOS** (iOS 11.0+)

## 🛠 Installation

Add the library to your React Native project:

```bash
# Install the library
npm install liveness-rn-library

# Install dependencies
npm install udentify-core
```

### iOS Setup

1. **Install iOS dependencies:**
   ```bash
   cd ios && pod install
   ```

2. **Add camera permissions to `Info.plist`:**
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>This app needs camera access for face recognition</string>
   ```

3. **Update your iOS deployment target to 11.0 or higher in Xcode**

### Android Setup

1. **Add permissions to `android/app/src/main/AndroidManifest.xml`:**
   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-permission android:name="android.permission.READ_PHONE_STATE" />
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   <uses-permission android:name="android.permission.INTERNET" />
   
   <!-- Android 12+ -->
   <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
   ```

2. **Ensure minimum SDK version in `android/app/build.gradle`:**
   ```gradle
   android {
       compileSdkVersion 34
       defaultConfig {
           minSdkVersion 21
           targetSdkVersion 34
       }
   }
   ```

## 📱 Usage

### Basic Setup

```typescript
import LivenessModule from 'liveness-rn-library';

// Check permissions
const permissionStatus = await LivenessModule.checkPermissions();
if (permissionStatus.camera !== 'granted') {
  await LivenessModule.requestPermissions();
}
```

### Face Recognition with Camera

```typescript
// Create credentials
const credentials = {
  serverURL: 'https://your-server.com',
  transactionID: 'TRX123456789',
  userID: 'user_12345',
  autoTake: true,
  blinkDetectionEnabled: true,
  requestTimeout: 30,
  eyesOpenThreshold: 0.75,
  maskConfidence: 0.95,
};

// Registration
const registrationResult = await LivenessModule.startFaceRecognitionRegistration(credentials);

// Authentication  
const authResult = await LivenessModule.startFaceRecognitionAuthentication(credentials);
```

### Liveness Detection

```typescript
// Active Liveness (gesture-based)
const activeLivenessResult = await LivenessModule.startActiveLiveness(credentials);

// Hybrid Liveness (active + passive)
const hybridLivenessResult = await LivenessModule.startHybridLiveness(credentials, isAuthentication);
```

### Photo-based Recognition

```typescript
// Registration with photo
const photoRegistrationResult = await LivenessModule.registerUserWithPhoto(
  credentials,
  base64EncodedImage
);

// Authentication with photo
const photoAuthResult = await LivenessModule.authenticateUserWithPhoto(
  credentials,
  base64EncodedImage
);
```

### Event Listeners

```typescript
// Set up event listeners for real-time updates
LivenessModule.setOnResultCallback((result) => {
  if (result.status === 'success') {
    console.log('Recognition successful:', result.faceIDMessage?.success);
  }
});

LivenessModule.setOnFailureCallback((error) => {
  console.log('Recognition failed:', error.message);
});

LivenessModule.setOnPhotoTakenCallback(() => {
  console.log('Photo captured');
});

LivenessModule.setOnSelfieTakenCallback((base64Image) => {
  console.log('Selfie captured');
});
```

### List Operations

```typescript
// Add user to identification list
const addResult = await LivenessModule.addUserToList(
  'https://your-server.com',
  'transaction_123',
  'Registered',
  { customField: 'value' }
);

// Face recognition identification
const identificationResult = await LivenessModule.startFaceRecognitionIdentification(
  'https://your-server.com',
  'transaction_123',
  'main_list'
);

// Delete user from list
const deleteResult = await LivenessModule.deleteUserFromList(
  'https://your-server.com',
  'transaction_123',
  'main_list',
  userPhotoBase64
);
```

### UI Customization

```typescript
const uiSettings = {
  colors: {
    titleColor: '#000000',
    buttonColor: '#007bff',
    backgroundColor: '#ffffff',
  },
  fonts: {
    titleFont: { name: 'System', size: 18 },
    buttonFont: { name: 'System', size: 16 },
  },
  configs: {
    cameraPosition: 'front',
    autoTake: true,
    backButtonEnabled: true,
  }
};

await LivenessModule.configureUISettings(uiSettings);
```

## 🔧 API Reference

### Types

```typescript
interface FaceRecognizerCredentials {
  serverURL: string;
  transactionID: string;
  userID: string;
  autoTake?: boolean;
  errorDelay?: number;
  successDelay?: number;
  runInBackground?: boolean;
  blinkDetectionEnabled?: boolean;
  requestTimeout?: number;
  eyesOpenThreshold?: number;
  maskConfidence?: number;
  invertedAnimation?: boolean;
  activeLivenessAutoNextEnabled?: boolean;
}

interface FaceRecognitionResult {
  status: 'success' | 'failure' | 'error';
  faceIDMessage?: FaceIDMessage;
  error?: FaceRecognitionError;
  base64Image?: string;
}

interface FaceRecognitionPermissionStatus {
  camera: 'granted' | 'denied' | 'permanentlyDenied' | 'unknown';
  readPhoneState: 'granted' | 'denied' | 'permanentlyDenied' | 'unknown';
  internet: 'granted' | 'denied' | 'permanentlyDenied' | 'unknown';
  recordAudio?: 'granted' | 'denied' | 'permanentlyDenied' | 'unknown';
  bluetoothConnect?: 'granted' | 'denied' | 'permanentlyDenied' | 'unknown';
}
```

### Main Functions

- `checkPermissions()`: Check current permission status
- `requestPermissions()`: Request required permissions
- `startFaceRecognitionRegistration(credentials)`: Start camera-based registration
- `startFaceRecognitionAuthentication(credentials)`: Start camera-based authentication
- `startActiveLiveness(credentials)`: Start active liveness detection
- `startHybridLiveness(credentials, isAuth)`: Start hybrid liveness detection
- `registerUserWithPhoto(credentials, base64)`: Register with provided photo
- `authenticateUserWithPhoto(credentials, base64)`: Authenticate with provided photo
- `cancelFaceRecognition()`: Cancel current operation
- `isFaceRecognitionInProgress()`: Check operation status
- `configureUISettings(settings)`: Customize UI appearance

## 🎨 UI Customization

The library provides extensive UI customization options:

- **Colors**: Title, buttons, backgrounds, text colors
- **Fonts**: Custom fonts for different UI elements
- **Configs**: Camera position, timing, behaviors
- **Progress Bar**: Style and colors for progress indicators
- **Localization**: Multi-language support

## 🔍 Error Handling

```typescript
try {
  const result = await LivenessModule.startFaceRecognitionRegistration(credentials);
  
  switch (result.status) {
    case 'success':
      // Handle success
      break;
    case 'failure':
    case 'error':
      // Handle error
      console.log('Error:', result.error?.message);
      break;
  }
} catch (e) {
  console.log('Exception:', e);
}
```

## 🏗 Project Structure

This library is part of the Udentify SDK integration suite:

- **udentify-core**: Shared core framework (UdentifyCommons)
- **liveness-rn-library**: Face recognition and liveness detection
- **ocr-rn-library**: Document OCR and verification
- **nfc-rn-library**: NFC passport reading

## 🤝 Dependencies

- **React Native**: >=0.76.0
- **udentify-core**: Provides shared UdentifyCommons framework
- **UdentifyFACE SDK**: Native face recognition capabilities
- **Lottie**: Animation support

## 📄 License

This library is part of the Udentify SDK integration suite.

## 🆘 Support

For technical support and documentation, please contact the Udentify team.

---

**Built with ❤️ using React Native TurboModule and Udentify SDK**
