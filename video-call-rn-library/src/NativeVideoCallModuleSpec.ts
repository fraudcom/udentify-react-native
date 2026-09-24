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
  /**
   * A `VideoCallObservationMode` name (see VideoCallModels). Typed as a plain string
   * here because codegen specs cannot reference a TS enum; the view prop's
   * `VideoCallCredentials` is the typed surface callers should use.
   */
  observationMode?: string;
}

export interface VideoCallResult {
  success: boolean;
  status?: string;
  transactionID?: string;
  message?: string;
  errorType?: string;
}

export interface VideoCallPermissions {
  hasCameraPermission: boolean;
  hasPhoneStatePermission: boolean;
  hasInternetPermission: boolean;
  hasRecordAudioPermission: boolean;
}

export interface VideoCallLocalizedStrings {
  /** Localized "End Call" button label, resolved from the device's current language. */
  endCallButtonLabel: string;
  /** Localized label shown while the call is in the process of ending. */
  endCallButtonEndingLabel: string;
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
  /**
   * @deprecated The call screen is no longer presented imperatively. Render
   * <VideoCallView credentials={...} /> instead. This resolves immediately
   * with `{success: false, error: {...}}` and never starts a call.
   */
  startVideoCall(credentials: VideoCallCredentials): Promise<VideoCallResult>;
  /** Ends the call on the currently-mounted <VideoCallView>, if any. */
  endVideoCall(): Promise<VideoCallResult>;
  /** Status of the currently-mounted <VideoCallView>, or 'idle' if none. */
  getVideoCallStatus(): Promise<string>;

  /**
   * Resolves the SDK's own localized End Call button labels (bundled on both
   * platforms as `udentify_vc_button_end_call`/`udentify_vc_button_ending_call`),
   * using the device's current language the same way the SDK's other native
   * strings (e.g. the waiting-for-agent notification) resolve theirs.
   */
  getLocalizedStrings(): Promise<VideoCallLocalizedStrings>;

  // Control methods
  //
  // Microphone only: the vendor SDKs expose no cross-platform camera control.
  // toggleCamera()/switchCamera() used to live here but were never supported on
  // Android (and toggleCamera on neither), so they were removed rather than
  // kept as a promise the library can only honour on one platform. The camera
  // switch remains available through the SDK's own in-call button.
  /**
   * @deprecated iOS-only, and it writes the microphone track directly, so the
   * operator console's mute indicator does not follow it. Use
   * setMicrophoneEnabled() - explicit rather than relative to a state the SDK
   * changes on its own. Rejects with ERR_NOT_SUPPORTED on Android.
   */
  toggleMicrophone(): Promise<boolean>;
  /**
   * Turns the microphone on or off on the currently-mounted <VideoCallView>.
   * Resolves `false` when there is no active call; `true` only means the
   * request was accepted, since the change is applied asynchronously -
   * `VideoCall_onMicrophoneStateChanged` reports the actual outcome.
   */
  setMicrophoneEnabled(enabled: boolean): Promise<boolean>;
  /**
   * One-shot read of the live microphone state; `false` when there is no
   * active call. Can still return the old value immediately after
   * setMicrophoneEnabled(), so drive UI from the event instead.
   */
  isMicrophoneEnabled(): Promise<boolean>;
  /**
   * @deprecated Alias for endVideoCall(). Unmount <VideoCallView> from JS
   * instead of calling this to "dismiss" the call UI.
   */
  dismissVideoCall(): Promise<void>;
  /** Cancels the call on the currently-mounted <VideoCallView>, if any. */
  cancelVideoCall(): Promise<VideoCallResult>;

  // Event emitter support (required for RCTEventEmitter)
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('VideoCallModule');
