// Export all models and types
export * from './VideoCallModels';
export { NativeVideoCallModule } from './NativeVideoCallModule';

// Main Video Call class - equivalent to Flutter VideoCallFlutter
import type {
  VideoCallCredentials,
  VideoCallResult,
  VideoCallStatus,
  VideoCallConfig,
  VideoCallPermissionStatus,
  VideoCallCallbacks,
} from './VideoCallModels';
import { NativeVideoCallModule } from './NativeVideoCallModule';

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
   * Start video call with given credentials
   * @param credentials VideoCallCredentials object with server details and user info
   * @returns Promise<VideoCallResult> Result of the start operation
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
   * Configure UI settings for Video Call camera
   * This method should be called before starting video call to apply custom UI settings
   * @param uiConfig VideoCallConfig object with UI customization options
   * @returns Promise<boolean>
   */
  static async configureUISettings(uiConfig: VideoCallConfig): Promise<boolean> {
    return NativeVideoCallModule.configureUISettings(uiConfig);
  }

  /**
   * Set video call UI configuration
   * @param config VideoCallConfig object with UI customization options
   * @returns Promise<void>
   */
  static async setVideoCallConfig(config: VideoCallConfig): Promise<void> {
    return NativeVideoCallModule.setVideoCallConfig(config);
  }

  /**
   * Toggle camera on/off
   * @returns Promise<boolean> Current camera state after toggle (true = on, false = off)
   */
  static async toggleCamera(): Promise<boolean> {
    return NativeVideoCallModule.toggleCamera();
  }

  /**
   * Switch between front and back camera
   * @returns Promise<boolean> Success state of the camera switch operation
   */
  static async switchCamera(): Promise<boolean> {
    return NativeVideoCallModule.switchCamera();
  }

  /**
   * Toggle microphone on/off
   * @returns Promise<boolean> Current microphone state after toggle (true = on, false = off)
   */
  static async toggleMicrophone(): Promise<boolean> {
    return NativeVideoCallModule.toggleMicrophone();
  }

  /**
   * Dismiss video call UI
   * @returns Promise<void>
   */
  static async dismissVideoCall(): Promise<void> {
    return NativeVideoCallModule.dismissVideoCall();
  }

  /**
   * Set callbacks for video call events
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
   * Set status change callback
   * @param callback Function to handle status changes
   */
  static setOnStatusChanged(callback: (status: VideoCallStatus) => void): void {
    NativeVideoCallModule.setCallbacks({
      onStatusChanged: callback,
    });
  }

  /**
   * Set error callback
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
