import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Type definitions for VideoCall TurboModule
export interface VideoCallCredentials {
  serverURL: string;
  wssURL: string;
  userID: string;
  transactionID: string;
  clientName: string;
  idleTimeout?: string;
}

export interface VideoCallResult {
  success: boolean;
  status?: string;
  transactionID?: string;
  message?: string;
  errorType?: string;
}

export interface VideoCallConfig {
  backgroundColor?: string;
  textColor?: string;
  pipViewBorderColor?: string;
  notificationLabelDefault?: string;
  notificationLabelCountdown?: string;
  notificationLabelTokenFetch?: string;
  tableName?: string;
  requestTimeout?: number;
}

export interface VideoCallPermissions {
  hasCameraPermission: boolean;
  hasPhoneStatePermission: boolean;
  hasInternetPermission: boolean;
  hasRecordAudioPermission: boolean;
}

/**
 * TurboModule Spec for VideoCall functionality
 * This interface defines the native methods available through the TurboModule
 */
export interface Spec extends TurboModule {
  // Permission methods
  checkPermissions(): Promise<VideoCallPermissions>;
  requestPermissions(): Promise<string>;

  // Video call lifecycle methods
  startVideoCall(credentials: VideoCallCredentials): Promise<VideoCallResult>;
  endVideoCall(): Promise<VideoCallResult>;
  getVideoCallStatus(): Promise<string>;

  // Configuration methods
  configureUISettings(uiConfig: VideoCallConfig): Promise<boolean>;
  setVideoCallConfig(config: VideoCallConfig): Promise<void>;

  // Control methods
  toggleCamera(): Promise<boolean>;
  switchCamera(): Promise<boolean>;
  toggleMicrophone(): Promise<boolean>;
  dismissVideoCall(): Promise<VideoCallResult>;

  // Event emitter support (required for RCTEventEmitter)
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('VideoCallModule');
