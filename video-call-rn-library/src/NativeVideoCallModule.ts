import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type {
  VideoCallCredentials,
  VideoCallResult,
  VideoCallStatus,
  VideoCallConfig,
  VideoCallPermissionStatus,
  VideoCallCallbacks,
  VideoCallError,
} from './VideoCallModels';
import { VideoCallUtils } from './VideoCallModels';
import type { Spec } from './NativeVideoCallModuleSpec';

// Re-export types from spec for convenience
export type {
  VideoCallCredentials as VideoCallCredentials_TurboModule,
  VideoCallResult as VideoCallResult_TurboModule,
  VideoCallConfig as VideoCallConfig_TurboModule,
} from './NativeVideoCallModuleSpec';

const LINKING_ERROR =
  `The package 'video-call-rn-library' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'cd ios && pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const isTurboModuleEnabled = (global as any).__turboModuleProxy != null;

let VideoCallModule: any;

try {
  if (isTurboModuleEnabled) {
    // TurboModule approach - similar to OCR library
    VideoCallModule = TurboModuleRegistry.getEnforcing<Spec>('VideoCallModule');
    console.log('✅ VideoCall - TurboModule loaded successfully');
  } else {
    // Legacy fallback
    VideoCallModule = NativeModules.VideoCallModule;
    console.log('✅ VideoCall - Legacy module loaded successfully');
  }
} catch (error) {
  console.error('❌ VideoCall - Failed to load module:', error);
  // Fallback to legacy if TurboModule fails
  VideoCallModule = NativeModules.VideoCallModule;
  console.log('🔄 VideoCall - Falling back to legacy module');
}

if (!VideoCallModule) {
  throw new Error(LINKING_ERROR);
}

/**
 * Native Video Call Module - React Native bridge to native implementations
 * Provides the same functionality as Flutter VideoCallFlutter class
 */
export class NativeVideoCallModule {
  private static eventEmitter: NativeEventEmitter | null = null;
  private static callbacks: VideoCallCallbacks = {};

  /**
   * Initialize event emitter safely
   */
  private static getEventEmitter(): NativeEventEmitter | null {
    if (!this.eventEmitter && VideoCallModule) {
      try {
        this.eventEmitter = new NativeEventEmitter(VideoCallModule);
      } catch (error) {
        console.warn('VideoCall - Failed to create NativeEventEmitter:', error);
        this.eventEmitter = null;
      }
    }
    return this.eventEmitter;
  }

  /**
   * Initialize event listeners for callbacks
   */
  private static initializeEventListeners() {
    const eventEmitter = this.getEventEmitter();
    if (!eventEmitter) {
      console.warn('VideoCall - Event emitter not available');
      return;
    }

    // Status change events
    eventEmitter.addListener('VideoCall_onStatusChanged', (status: string) => {
      const videoCallStatus = VideoCallUtils.stringToStatus(status);
      this.callbacks.onStatusChanged?.(videoCallStatus);
    });

    // Error events
    eventEmitter.addListener('VideoCall_onError', (errorData: any) => {
      const error = VideoCallUtils.createErrorFromMap(errorData);
      this.callbacks.onError?.(error);
    });

    // User state change events
    eventEmitter.addListener('VideoCall_onUserStateChanged', (data: any) => {
      this.callbacks.onUserStateChanged?.(data.state);
    });

    // Participant state change events
    eventEmitter.addListener('VideoCall_onParticipantStateChanged', (data: any) => {
      this.callbacks.onParticipantStateChanged?.(data.participantType, data.state);
    });

    // Video call ended events
    eventEmitter.addListener('VideoCall_onVideoCallEnded', (data: any) => {
      this.callbacks.onVideoCallEnded?.(data.success);
    });

    // Video call dismissed events
    eventEmitter.addListener('VideoCall_onVideoCallDismissed', () => {
      this.callbacks.onVideoCallDismissed?.();
    });
  }

  /**
   * Set callbacks for video call events
   */
  static setCallbacks(callbacks: VideoCallCallbacks): void {
    this.callbacks = callbacks;
    this.initializeEventListeners();
  }

  /**
   * Clear all event listeners
   */
  static clearEventListeners(): void {
    const eventEmitter = this.getEventEmitter();
    if (!eventEmitter) {
      console.warn('VideoCall - Event emitter not available for cleanup');
      this.callbacks = {};
      return;
    }
    
    eventEmitter.removeAllListeners('VideoCall_onStatusChanged');
    eventEmitter.removeAllListeners('VideoCall_onError');
    eventEmitter.removeAllListeners('VideoCall_onUserStateChanged');
    eventEmitter.removeAllListeners('VideoCall_onParticipantStateChanged');
    eventEmitter.removeAllListeners('VideoCall_onVideoCallEnded');
    eventEmitter.removeAllListeners('VideoCall_onVideoCallDismissed');
    this.callbacks = {};
  }

  /**
   * Check current permissions status
   */
  static async checkPermissions(): Promise<VideoCallPermissionStatus> {
    if (!VideoCallModule) {
      console.error('VideoCall - Module not available for checkPermissions');
      return {
        hasCameraPermission: false,
        hasPhoneStatePermission: false,
        hasInternetPermission: false,
        hasRecordAudioPermission: false,
      };
    }
    
    try {
      const result = await VideoCallModule.checkPermissions();
      return VideoCallUtils.createPermissionsFromMap(result);
    } catch (error) {
      console.error('VideoCall - Error checking permissions:', error);
      return {
        hasCameraPermission: false,
        hasPhoneStatePermission: false,
        hasInternetPermission: false,
        hasRecordAudioPermission: false,
      };
    }
  }

  /**
   * Request necessary permissions for video call functionality
   */
  static async requestPermissions(): Promise<string> {
    if (!VideoCallModule) {
      console.error('VideoCall - Module not available for requestPermissions');
      return 'error';
    }
    
    try {
      return await VideoCallModule.requestPermissions();
    } catch (error) {
      console.error('VideoCall - Error requesting permissions:', error);
      return 'error';
    }
  }

  /**
   * Start video call with given credentials
   */
  static async startVideoCall(credentials: VideoCallCredentials): Promise<VideoCallResult> {
    if (!VideoCallModule) {
      console.error('VideoCall - Module not available for startVideoCall');
      return {
        success: false,
        error: {
          type: VideoCallUtils.stringToErrorType('ERR_MODULE_NOT_AVAILABLE'),
          message: 'VideoCall module not available. Please ensure the native module is properly linked.',
        },
      };
    }
    
    try {
      const credentialsMap = VideoCallUtils.credentialsToMap(credentials);
      const result = await VideoCallModule.startVideoCall(credentialsMap);
      return VideoCallUtils.createResultFromMap(result);
    } catch (error) {
      console.error('VideoCall - Error starting video call:', error);
      return {
        success: false,
        error: {
          type: VideoCallUtils.stringToErrorType('ERR_UNKNOWN'),
          message: `Failed to start video call: ${error}`,
        },
      };
    }
  }

  /**
   * End ongoing video call
   */
  static async endVideoCall(): Promise<VideoCallResult> {
    try {
      const result = await VideoCallModule.endVideoCall();
      return VideoCallUtils.createResultFromMap(result);
    } catch (error) {
      console.error('VideoCall - Error ending video call:', error);
      return {
        success: false,
        error: {
          type: VideoCallUtils.stringToErrorType('ERR_UNKNOWN'),
          message: `Failed to end video call: ${error}`,
        },
      };
    }
  }

  /**
   * Get current video call status
   */
  static async getVideoCallStatus(): Promise<VideoCallStatus> {
    try {
      const status = await VideoCallModule.getVideoCallStatus();
      return VideoCallUtils.stringToStatus(status);
    } catch (error) {
      console.error('VideoCall - Error getting video call status:', error);
      return VideoCallUtils.stringToStatus('idle');
    }
  }

  /**
   * Configure UI settings for Video Call camera
   * This method should be called before starting video call to apply custom UI settings
   */
  static async configureUISettings(uiConfig: VideoCallConfig): Promise<boolean> {
    try {
      console.log('📱 Configuring Video Call UI settings:', uiConfig);
      
      if (!VideoCallModule) {
        throw new Error('VideoCallModule not available. Please ensure the native module is properly linked.');
      }
      
      const configMap = VideoCallUtils.configToMap(uiConfig);
      return await VideoCallModule.configureUISettings(configMap);
    } catch (error) {
      console.error('VideoCallModule - configureUISettings error:', error);
      throw error;
    }
  }

  /**
   * Set video call UI configuration
   */
  static async setVideoCallConfig(config: VideoCallConfig): Promise<void> {
    try {
      const configMap = VideoCallUtils.configToMap(config);
      await VideoCallModule.setVideoCallConfig(configMap);
    } catch (error) {
      console.error('VideoCall - Error setting video call config:', error);
      throw new Error(`Failed to set video call config: ${error}`);
    }
  }

  /**
   * Toggle camera on/off
   */
  static async toggleCamera(): Promise<boolean> {
    try {
      return await VideoCallModule.toggleCamera();
    } catch (error) {
      console.error('VideoCall - Error toggling camera:', error);
      return false;
    }
  }

  /**
   * Switch between front and back camera
   */
  static async switchCamera(): Promise<boolean> {
    try {
      return await VideoCallModule.switchCamera();
    } catch (error) {
      console.error('VideoCall - Error switching camera:', error);
      return false;
    }
  }

  /**
   * Toggle microphone on/off
   */
  static async toggleMicrophone(): Promise<boolean> {
    try {
      return await VideoCallModule.toggleMicrophone();
    } catch (error) {
      console.error('VideoCall - Error toggling microphone:', error);
      return false;
    }
  }

  /**
   * Dismiss video call UI
   */
  static async dismissVideoCall(): Promise<void> {
    try {
      await VideoCallModule.dismissVideoCall();
    } catch (error) {
      console.error('VideoCall - Error dismissing video call:', error);
    }
  }
}

export default NativeVideoCallModule;
