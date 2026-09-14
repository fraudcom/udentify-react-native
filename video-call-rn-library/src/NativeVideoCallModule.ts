import { TurboModuleRegistry } from 'react-native';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type { EmitterSubscription } from 'react-native';
import type {
  VideoCallCredentials,
  VideoCallResult,
  VideoCallStatus,
  VideoCallPermissionStatus,
  VideoCallCallbacks,
  VideoCallEventHandlers,
} from './VideoCallModels';
import { VideoCallUtils } from './VideoCallModels';
import type { Spec, VideoCallLocalizedStrings } from './NativeVideoCallModuleSpec';

// Re-export types from spec for convenience
export type {
  VideoCallCredentials as VideoCallCredentials_TurboModule,
  VideoCallResult as VideoCallResult_TurboModule,
  VideoCallLocalizedStrings,
} from './NativeVideoCallModuleSpec';

// English fallback, used only if the native call fails (module not linked,
// unexpected native error) - the native side is the source of truth and
// resolves these from the device's actual current language.
const FALLBACK_LOCALIZED_STRINGS: VideoCallLocalizedStrings = {
  endCallButtonLabel: 'End Call',
  endCallButtonEndingLabel: 'Ending call...',
};

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
  console.warn('❌ VideoCall - Failed to load module:', error);
  // Fallback to legacy if TurboModule fails
  VideoCallModule = NativeModules.VideoCallModule;
  console.log('🔄 VideoCall - Falling back to legacy module');
}

if (!VideoCallModule) {
  throw new Error(LINKING_ERROR);
}

/**
 * Subscribes to the native VideoCall_on* events for the lifetime of the
 * caller (typically one <VideoCallView> mount). Unlike
 * NativeVideoCallModule.setCallbacks() (a single global singleton
 * subscription, kept below for backward compatibility), this creates an
 * independent subscription per call, safe across multiple mount/unmount
 * cycles - callers own the returned handle and must call `.remove()` on
 * unmount. Native still emits every VideoCall_on* event at the module level
 * unchanged; only the JS-side subscription ownership moves here.
 */
export function subscribeToVideoCallEvents(
  handlers: VideoCallEventHandlers
): {remove: () => void} {
  if (!VideoCallModule) {
    return {remove: () => {}};
  }
  let emitter: NativeEventEmitter;
  try {
    emitter = new NativeEventEmitter(VideoCallModule);
  } catch (error) {
    console.warn('VideoCall - Failed to create NativeEventEmitter:', error);
    return {remove: () => {}};
  }

  const subscriptions: EmitterSubscription[] = [];
  if (handlers.onStatusChanged) {
    subscriptions.push(
      emitter.addListener('VideoCall_onStatusChanged', (data: any) => {
        handlers.onStatusChanged?.(VideoCallUtils.stringToStatus(data?.status));
      })
    );
  }
  if (handlers.onError) {
    subscriptions.push(
      emitter.addListener('VideoCall_onError', (data: any) => {
        handlers.onError?.(VideoCallUtils.createErrorFromMap(data));
      })
    );
  }
  if (handlers.onUserStateChanged) {
    subscriptions.push(
      emitter.addListener('VideoCall_onUserStateChanged', (data: any) => {
        handlers.onUserStateChanged?.(data?.state);
      })
    );
  }
  if (handlers.onParticipantStateChanged) {
    subscriptions.push(
      emitter.addListener('VideoCall_onParticipantStateChanged', (data: any) => {
        handlers.onParticipantStateChanged?.({
          participantType: data?.participantType,
          state: data?.state,
        });
      })
    );
  }
  if (handlers.onVideoCallEnded) {
    subscriptions.push(
      emitter.addListener('VideoCall_onVideoCallEnded', (data: any) => {
        handlers.onVideoCallEnded?.({success: !!data?.success});
      })
    );
  }
  if (handlers.onVideoCallDismissed) {
    subscriptions.push(
      emitter.addListener('VideoCall_onVideoCallDismissed', () => {
        handlers.onVideoCallDismissed?.();
      })
    );
  }
  if (handlers.onPhoneCallStateChanged) {
    subscriptions.push(
      emitter.addListener('VideoCall_onPhoneCallStateChanged', (data: any) => {
        handlers.onPhoneCallStateChanged?.({
          state: VideoCallUtils.stringToPhoneCallState(data?.state),
        });
      })
    );
  }
  if (handlers.onScreenLocked) {
    subscriptions.push(
      emitter.addListener('VideoCall_onScreenLocked', () => {
        handlers.onScreenLocked?.();
      })
    );
  }
  if (handlers.onScreenUnlocked) {
    subscriptions.push(
      emitter.addListener('VideoCall_onScreenUnlocked', () => {
        handlers.onScreenUnlocked?.();
      })
    );
  }
  if (handlers.onMicrophoneStateChanged) {
    subscriptions.push(
      emitter.addListener('VideoCall_onMicrophoneStateChanged', (data: any) => {
        handlers.onMicrophoneStateChanged?.({enabled: !!data?.enabled});
      })
    );
  }

  return {
    remove: () => subscriptions.forEach(subscription => subscription.remove()),
  };
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
    eventEmitter.addListener('VideoCall_onStatusChanged', (data: any) => {
      const videoCallStatus = VideoCallUtils.stringToStatus(data?.status);
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

    // Device phone call interrupting the video call
    eventEmitter.addListener('VideoCall_onPhoneCallStateChanged', (data: any) => {
      this.callbacks.onPhoneCallStateChanged?.(
        VideoCallUtils.stringToPhoneCallState(data?.state)
      );
    });

    // Device screen lock/unlock during the call
    eventEmitter.addListener('VideoCall_onScreenLocked', () => {
      this.callbacks.onScreenLocked?.();
    });

    eventEmitter.addListener('VideoCall_onScreenUnlocked', () => {
      this.callbacks.onScreenUnlocked?.();
    });

    // Every microphone change the SDK makes, whatever caused it - the in-call
    // mute button, the operator, this library's own setMicrophoneEnabled(), or
    // the SDK muting on its own (app backgrounded, audio focus lost, a real
    // phone call answered) and unmuting again afterwards. Treat it as the
    // microphone's source of truth rather than tracking requests in JS.
    eventEmitter.addListener('VideoCall_onMicrophoneStateChanged', (data: any) => {
      this.callbacks.onMicrophoneStateChanged?.(!!data?.enabled);
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
    eventEmitter.removeAllListeners('VideoCall_onPhoneCallStateChanged');
    eventEmitter.removeAllListeners('VideoCall_onScreenLocked');
    eventEmitter.removeAllListeners('VideoCall_onScreenUnlocked');
    eventEmitter.removeAllListeners('VideoCall_onMicrophoneStateChanged');
    this.callbacks = {};
  }

  /**
   * Check current permissions status
   */
  static async checkPermissions(): Promise<VideoCallPermissionStatus> {
    if (!VideoCallModule) {
      console.warn('VideoCall - Module not available for checkPermissions');
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
      console.warn('VideoCall - Error checking permissions:', error);
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
      console.warn('VideoCall - Module not available for requestPermissions');
      return 'error';
    }
    
    try {
      return await VideoCallModule.requestPermissions();
    } catch (error) {
      console.warn('VideoCall - Error requesting permissions:', error);
      return 'error';
    }
  }

  /**
   * Start video call with given credentials
   */
  static async startVideoCall(credentials: VideoCallCredentials): Promise<VideoCallResult> {
    if (!VideoCallModule) {
      console.warn('VideoCall - Module not available for startVideoCall');
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
      console.warn('VideoCall - Error starting video call:', error);
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
      console.warn('VideoCall - Error ending video call:', error);
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
      console.warn('VideoCall - Error getting video call status:', error);
      return VideoCallUtils.stringToStatus('idle');
    }
  }

  /**
   * Resolves the SDK's own localized End Call button labels for the device's
   * current language. Falls back to English if the module isn't available or
   * the native call fails.
   */
  static async getLocalizedStrings(): Promise<VideoCallLocalizedStrings> {
    if (!VideoCallModule) {
      console.warn('VideoCall - Module not available for getLocalizedStrings');
      return FALLBACK_LOCALIZED_STRINGS;
    }

    try {
      return await VideoCallModule.getLocalizedStrings();
    } catch (error) {
      console.warn('VideoCall - Error getting localized strings:', error);
      return FALLBACK_LOCALIZED_STRINGS;
    }
  }

  /**
   * @deprecated Use setMicrophoneEnabled(). iOS-only, and it bypasses the
   * operator notification.
   */
  static async toggleMicrophone(): Promise<boolean> {
    try {
      return await VideoCallModule.toggleMicrophone();
    } catch (error) {
      console.warn('VideoCall - Error toggling microphone:', error);
      return false;
    }
  }

  /**
   * Turn the microphone on or off. Resolves whether the request was accepted,
   * not whether it has taken effect - listen for onMicrophoneStateChanged.
   */
  static async setMicrophoneEnabled(enabled: boolean): Promise<boolean> {
    try {
      return await VideoCallModule.setMicrophoneEnabled(enabled);
    } catch (error) {
      console.warn('VideoCall - Error setting microphone state:', error);
      return false;
    }
  }

  /**
   * One-shot read of the live microphone state.
   */
  static async isMicrophoneEnabled(): Promise<boolean> {
    try {
      return await VideoCallModule.isMicrophoneEnabled();
    } catch (error) {
      console.warn('VideoCall - Error reading microphone state:', error);
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
      console.warn('VideoCall - Error dismissing video call:', error);
    }
  }

  /**
   * Cancel an in-progress video call transaction on the server.
   * Requires an active/presented video call session.
   */
  static async cancelVideoCall(): Promise<VideoCallResult> {
    try {
      const result = await VideoCallModule.cancelVideoCall();
      return VideoCallUtils.createResultFromMap(result);
    } catch (error) {
      console.warn('VideoCall - Error cancelling video call:', error);
      return {
        success: false,
        error: {
          type: VideoCallUtils.stringToErrorType('ERR_UNKNOWN'),
          message: `Failed to cancel video call: ${error}`,
        },
      };
    }
  }
}

export default NativeVideoCallModule;
