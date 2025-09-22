# video-call-rn-library

React Native Video Call Library using Udentify SDK - equivalent to the Flutter video-call-flutter library.

## Description

This React Native library provides comprehensive video calling functionality using Udentify's SDK. It supports real-time video communication, camera/microphone controls, and UI customization. This is the React Native equivalent of the Flutter video-call-flutter library.

## Features

- ✅ Real-time video communication
- ✅ Camera and microphone controls (toggle, switch)
- ✅ Permission management
- ✅ Customizable UI (colors, labels)
- ✅ WebSocket-based connection
- ✅ Transaction-based sessions
- ✅ Status monitoring with callbacks
- ✅ Error handling
- ✅ Cross-platform (iOS & Android)

## Installation

```bash
npm install video-call-rn-library
# or
yarn add video-call-rn-library
```

### iOS Setup

1. Run `cd ios && pod install`
2. Add UdentifyVC dependency to your iOS app via Swift Package Manager:
   - URL: `https://github.com/FraudcomMobile/UdentifyVC.git`
   - Required iOS version: 13.0+
3. Add required permissions to your `Info.plist` file:
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>This app requires access to the camera for video calling.</string>
   <key>NSMicrophoneUsageDescription</key>
   <string>This app requires access to the microphone for audio during video calls.</string>
   ```

### Android Setup

1. Add Udentify SDK AAR files to `android/app/libs/` directory
2. Ensure your `android/app/build.gradle` includes:
   ```gradle
   implementation fileTree(dir: "libs", include: ["*.jar", "*.aar"])
   ```

## Basic Usage

```typescript
import { VideoCall, VideoCallCredentials, VideoCallStatus } from 'video-call-rn-library';

// Set up callbacks
VideoCall.setCallbacks({
  onStatusChanged: (status: VideoCallStatus) => {
    console.log('Status changed:', status);
  },
  onError: (error) => {
    console.log('Error:', error.message);
  },
});

// Check permissions
const permissions = await VideoCall.checkPermissions();
if (!permissions.hasCameraPermission || !permissions.hasRecordAudioPermission) {
  await VideoCall.requestPermissions();
}

// Start video call
const credentials: VideoCallCredentials = {
  serverURL: 'https://api.udentify.com',
  wssURL: 'wss://api.udentify.com/v1',
  userID: 'unique-user-id',
  transactionID: 'transaction-id-from-server',
  clientName: 'MyApp',
  idleTimeout: '30',
};

const result = await VideoCall.startVideoCall(credentials);
if (result.success) {
  console.log('Video call started successfully');
} else {
  console.log('Failed to start video call:', result.error?.message);
}

// Control during call
await VideoCall.toggleCamera(); // Returns current camera state
await VideoCall.switchCamera(); // Switch front/back camera
await VideoCall.toggleMicrophone(); // Returns current microphone state

// End video call
await VideoCall.endVideoCall();
```

## API Reference

### VideoCall Class

#### Static Methods

##### Permission Management
- `checkPermissions(): Promise<VideoCallPermissionStatus>`
- `requestPermissions(): Promise<string>` - Returns 'granted', 'denied', or 'error'

##### Video Call Lifecycle
- `startVideoCall(credentials: VideoCallCredentials): Promise<VideoCallResult>`
- `endVideoCall(): Promise<VideoCallResult>`
- `getVideoCallStatus(): Promise<VideoCallStatus>`

##### Configuration
- `setVideoCallConfig(config: VideoCallConfig): Promise<void>`

##### Controls
- `toggleCamera(): Promise<boolean>` - Returns current state after toggle
- `switchCamera(): Promise<boolean>` - Returns success state
- `toggleMicrophone(): Promise<boolean>` - Returns current state after toggle
- `dismissVideoCall(): Promise<void>`

##### Event Handling
- `setCallbacks(callbacks: VideoCallCallbacks): void`
- `clearEventListeners(): void`
- `setOnStatusChanged(callback: (status: VideoCallStatus) => void): void`
- `setOnError(callback: (error: any) => void): void`

### Types

#### VideoCallCredentials
```typescript
interface VideoCallCredentials {
  serverURL: string;          // Udentify server URL
  wssURL: string;            // WebSocket URL
  userID: string;            // Unique user identifier
  transactionID: string;     // Transaction ID from server
  clientName: string;        // Client application name
  idleTimeout?: string;      // Timeout in seconds (default: "30")
}
```

#### VideoCallStatus
```typescript
enum VideoCallStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  FAILED = 'failed',
  COMPLETED = 'completed',
}
```

#### VideoCallConfig
```typescript
interface VideoCallConfig {
  backgroundColor?: string;              // Background color (hex with alpha)
  textColor?: string;                   // Text color (hex with alpha)
  pipViewBorderColor?: string;          // PIP view border color
  notificationLabelDefault?: string;     // Default notification text
  notificationLabelCountdown?: string;   // Countdown notification text
  notificationLabelTokenFetch?: string;  // Token fetch notification text
}
```

#### VideoCallCallbacks
```typescript
interface VideoCallCallbacks {
  onStatusChanged?: (status: VideoCallStatus) => void;
  onError?: (error: VideoCallError) => void;
  onUserStateChanged?: (state: string) => void;
  onParticipantStateChanged?: (participantType: string, state: string) => void;
  onVideoCallEnded?: (success: boolean) => void;
  onVideoCallDismissed?: () => void;
}
```

## Configuration Examples

### UI Customization
```typescript
const config: VideoCallConfig = {
  backgroundColor: '#FF000000',        // Black background
  textColor: '#FFFFFFFF',             // White text
  pipViewBorderColor: '#FFFFFFFF',    // White border for PIP view
  notificationLabelDefault: 'Video Call will be starting, please wait...',
  notificationLabelCountdown: 'Video Call will be started in %d sec/s.',
  notificationLabelTokenFetch: 'Authorizing the user...',
};

await VideoCall.setVideoCallConfig(config);
```

### Complete Integration Example
```typescript
import React, { useState, useEffect } from 'react';
import { 
  VideoCall, 
  VideoCallStatus, 
  VideoCallCredentials,
  VideoCallPermissionStatus 
} from 'video-call-rn-library';

const VideoCallComponent = () => {
  const [status, setStatus] = useState<VideoCallStatus>(VideoCallStatus.IDLE);
  const [permissions, setPermissions] = useState<VideoCallPermissionStatus | null>(null);
  const [isInCall, setIsInCall] = useState(false);

  useEffect(() => {
    // Set up event listeners
    VideoCall.setCallbacks({
      onStatusChanged: (newStatus) => {
        setStatus(newStatus);
        setIsInCall(newStatus === VideoCallStatus.CONNECTED);
      },
      onError: (error) => {
        console.error('Video call error:', error);
      },
      onVideoCallEnded: (success) => {
        setIsInCall(false);
        setStatus(VideoCallStatus.DISCONNECTED);
      },
    });

    // Check permissions on mount
    checkPermissions();

    return () => {
      VideoCall.clearEventListeners();
    };
  }, []);

  const checkPermissions = async () => {
    const perms = await VideoCall.checkPermissions();
    setPermissions(perms);
  };

  const startCall = async () => {
    // Get transaction ID from your server
    const transactionId = await getTransactionIdFromServer();
    
    const credentials: VideoCallCredentials = {
      serverURL: 'https://api.udentify.com',
      wssURL: 'wss://api.udentify.com/v1',
      userID: `user_${Date.now()}`,
      transactionID: transactionId,
      clientName: 'MyApp',
    };

    const result = await VideoCall.startVideoCall(credentials);
    if (!result.success) {
      console.error('Failed to start call:', result.error?.message);
    }
  };

  // ... render UI
};
```

## Comparison with Flutter Implementation

This React Native library is designed to be functionally equivalent to the Flutter video-call-flutter library:

| Feature | Flutter | React Native |
|---------|---------|--------------|
| Main Class | `VideoCallFlutter` | `VideoCall` |
| Models | Dart classes | TypeScript interfaces |
| Platform Interface | `VideoCallFlutterPlatform` | `NativeVideoCallModule` |
| Method Channel | Flutter MethodChannel | React Native bridge |
| Android Implementation | Kotlin | Kotlin |
| iOS Implementation | Swift | Swift + Objective-C |
| Event Callbacks | Flutter callbacks | React Native EventEmitter |

## Permissions

### Android
- `android.permission.CAMERA`
- `android.permission.RECORD_AUDIO`
- `android.permission.INTERNET`
- `android.permission.READ_PHONE_STATE`

### iOS
- Camera permission (`NSCameraUsageDescription`)
- Microphone permission (`NSMicrophoneUsageDescription`)

## Error Handling

The library provides comprehensive error handling with specific error types:

```typescript
enum VideoCallErrorType {
  UNKNOWN = 'ERR_UNKNOWN',
  CREDENTIALS_MISSING = 'ERR_CREDENTIALS_MISSING',
  SERVER_TIMEOUT = 'ERR_SERVER_TIMEOUT_EXCEPTION',
  TRANSACTION_NOT_FOUND = 'ERR_TRANSACTION_NOT_FOUND',
  TRANSACTION_FAILED = 'ERR_TRANSACTION_FAILED',
  TRANSACTION_EXPIRED = 'ERR_TRANSACTION_EXPIRED',
  TRANSACTION_ALREADY_COMPLETED = 'ERR_TRANSACTION_ALREADY_COMPLETED',
  SDK_NOT_AVAILABLE = 'ERR_SDK_NOT_AVAILABLE',
}
```

## Troubleshooting

### Common Issues

1. **"UdentifyVC framework not available"**
   - Ensure UdentifyVC is properly added via Swift Package Manager (iOS)
   - Verify AAR files are in the correct location (Android)

2. **Permission denied errors**
   - Check that all required permissions are granted
   - Request permissions before starting video call

3. **Connection failures**
   - Verify server URL and WebSocket URL are correct
   - Ensure transaction ID is valid and not expired
   - Check network connectivity

### Debug Logging

Enable debug logging to troubleshoot issues:

```typescript
// The library includes comprehensive console logging
// Check React Native logs for detailed information about:
// - Permission checks
// - API calls
// - SDK integration status
// - Error details
```

## Requirements

- React Native >= 0.60
- iOS >= 13.0
- Android minSdkVersion >= 21
- Udentify SDK (provided separately)

## License

MIT

## Support

For issues related to:
- This React Native library: Create an issue in this repository
- Udentify SDK: Contact Udentify support
- Integration questions: Refer to the test app implementation in the repository
