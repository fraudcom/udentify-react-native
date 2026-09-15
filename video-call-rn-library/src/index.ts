// Export all models and types
export * from './VideoCallModels';
export { NativeVideoCallModule, subscribeToVideoCallEvents } from './NativeVideoCallModule';
export { VideoCallView } from './VideoCallView';
export type { VideoCallViewProps } from './VideoCallView';

// Main Video Call class - equivalent to Flutter VideoCallFlutter
import type {
  VideoCallCredentials,
  VideoCallResult,
  VideoCallStatus,
  VideoCallPermissionStatus,
  VideoCallCallbacks,
} from './VideoCallModels';
import { NativeVideoCallModule } from './NativeVideoCallModule';
import type { VideoCallLocalizedStrings } from './NativeVideoCallModule';
export type { VideoCallLocalizedStrings } from './NativeVideoCallModule';

/**
 * VideoCall - Main class for video call functionality
 * Equivalent to Flutter's VideoCallFlutter class
 * 
 * This class provides a simple interface for video calling using Udentify's SDK.
 * All methods are static and mirror the Flutter implementation.
 */
export class VideoCall {
  /**
   * Check current permissions status
   * @returns Promise<VideoCallPermissionStatus> Current permission status
   */
  static async checkPermissions(): Promise<VideoCallPermissionStatus> {
    return NativeVideoCallModule.checkPermissions();
  }

  /**
   * Request necessary permissions for video call functionality
   * @returns Promise<string> Result of permission request ('granted' | 'denied' | 'error')
   */
  static async requestPermissions(): Promise<string> {
    return NativeVideoCallModule.requestPermissions();
  }

  /**
   * @deprecated The call screen is no longer presented imperatively. Render
   * `<VideoCallView credentials={...} />` instead - see that component's
   * doc comment for the recommended usage pattern. This resolves
   * immediately with `{success: false, error: {...}}` and never starts a
   * call; kept only so existing call sites don't crash while migrating.
   */
  static async startVideoCall(credentials: VideoCallCredentials): Promise<VideoCallResult> {
    return NativeVideoCallModule.startVideoCall(credentials);
  }

  /**
   * End ongoing video call
   * @returns Promise<VideoCallResult> Result of the end operation
   */
  static async endVideoCall(): Promise<VideoCallResult> {
    return NativeVideoCallModule.endVideoCall();
  }

  /**
   * Get current video call status
   * @returns Promise<VideoCallStatus> Current status of the video call
   */
  static async getVideoCallStatus(): Promise<VideoCallStatus> {
    return NativeVideoCallModule.getVideoCallStatus();
  }

  /**
   * Resolves the SDK's own localized End Call button labels for the device's
   * current language ("End Call"/"Aramayı Sonlandır" and their in-progress
   * variants today). Use this to keep an app-rendered End Call button's text
   * consistent with the rest of the SDK's localization instead of hardcoding
   * a single-language label.
   */
  static async getLocalizedStrings(): Promise<VideoCallLocalizedStrings> {
    return NativeVideoCallModule.getLocalizedStrings();
  }

  /**
   * @deprecated Use setMicrophoneEnabled(true/false) instead. This is iOS-only
   * (Android rejects with `ERR_NOT_SUPPORTED`), it does not notify the
   * operator console, and its result is relative to a state the SDK can change
   * on its own - an automatic mute while the app is backgrounded, for example,
   * makes the next toggle flip the wrong way round.
   * @returns Promise<boolean> Current microphone state after toggle (true = on, false = off)
   */
  static async toggleMicrophone(): Promise<boolean> {
    return NativeVideoCallModule.toggleMicrophone();
  }

  /**
   * Turn the microphone on or off explicitly. The operator console is told
   * too, so its mute indicator stays in sync with an app-driven change.
   * @param enabled true = live, false = muted
   * @returns Promise<boolean> Whether the request was accepted (false = no
   * active call). Acceptance is not completion - the microphone changes
   * asynchronously, and `onMicrophoneStateChanged` reports the real outcome.
   */
  static async setMicrophoneEnabled(enabled: boolean): Promise<boolean> {
    return NativeVideoCallModule.setMicrophoneEnabled(enabled);
  }

  /**
   * Read the live microphone state once (false when no call is active). For
   * UI, prefer `<VideoCallView onMicrophoneStateChanged>`: the SDK also mutes
   * and unmutes on its own - app backgrounded, audio focus lost, a real phone
   * call answered - so a value read here goes stale without warning.
   */
  static async isMicrophoneEnabled(): Promise<boolean> {
    return NativeVideoCallModule.isMicrophoneEnabled();
  }

  /**
   * @deprecated Alias for endVideoCall(). Unmount `<VideoCallView>` from JS
   * instead of calling this to "dismiss" the call UI.
   */
  static async dismissVideoCall(): Promise<void> {
    return NativeVideoCallModule.dismissVideoCall();
  }

  /**
   * Cancel an in-progress video call transaction on the server.
   * Requires an active/presented video call session.
   * @returns Promise<VideoCallResult> Result of the cancel operation
   */
  static async cancelVideoCall(): Promise<VideoCallResult> {
    return NativeVideoCallModule.cancelVideoCall();
  }

  /**
   * @deprecated Global singleton subscription - prefer `<VideoCallView>`'s
   * own event props (or `subscribeToVideoCallEvents()` for a per-mount
   * subscription), which don't leak across mount/unmount cycles the way this
   * single shared listener set can.
   * @param callbacks VideoCallCallbacks object with event handlers
   */
  static setCallbacks(callbacks: VideoCallCallbacks): void {
    NativeVideoCallModule.setCallbacks(callbacks);
  }

  /**
   * Clear all event listeners
   */
  static clearEventListeners(): void {
    NativeVideoCallModule.clearEventListeners();
  }

  /**
   * @deprecated See setCallbacks().
   * @param callback Function to handle status changes
   */
  static setOnStatusChanged(callback: (status: VideoCallStatus) => void): void {
    NativeVideoCallModule.setCallbacks({
      onStatusChanged: callback,
    });
  }

  /**
   * @deprecated See setCallbacks().
   * @param callback Function to handle errors
   */
  static setOnError(callback: (error: any) => void): void {
    NativeVideoCallModule.setCallbacks({
      onError: callback,
    });
  }
}

// Default export
export default VideoCall;
