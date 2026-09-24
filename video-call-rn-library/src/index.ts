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
   * `<VideoCallView credentials={...} />` instead. This resolves immediately
   * with `{success: false, error: {...}}` and never starts a call; kept only
   * so existing call sites don't crash while migrating.
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
   * variants today), so an app-rendered End Call button stays consistent with
   * the rest of the SDK's localization instead of hardcoding the text.
   */
  static async getLocalizedStrings(): Promise<VideoCallLocalizedStrings> {
    return NativeVideoCallModule.getLocalizedStrings();
  }

  /**
   * @deprecated Use setMicrophoneEnabled(true/false) instead. iOS-only
   * (Android rejects with `ERR_NOT_SUPPORTED`), it does not notify the
   * operator console, and its result is relative to a state the SDK can change
   * on its own, so the next toggle can flip the wrong way round.
   * @returns Current microphone state after the toggle (true = on)
   */
  static async toggleMicrophone(): Promise<boolean> {
    return NativeVideoCallModule.toggleMicrophone();
  }

  /**
   * Turn the microphone on or off explicitly. The operator console is told
   * too, so its mute indicator stays in sync with an app-driven change.
   * Acceptance is not completion - the microphone changes asynchronously, and
   * `onMicrophoneStateChanged` reports the real outcome.
   * @param enabled true = live, false = muted
   * @returns Whether the request was accepted (false = no active call)
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
   * @deprecated Global singleton subscription - prefer `<VideoCallView>`'s own
   * event props (or `subscribeToVideoCallEvents()` for a per-mount
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
