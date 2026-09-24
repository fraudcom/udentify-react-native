// Video Call Models for React Native
// Based on Flutter video_call_models.dart

/**
 * What the remote operator sees of the customer while a LiveKYC "repeat" step
 * (an in-call OCR / Face / NFC redo, requested by the operator) is running.
 * Irrelevant outside that flow - it has no effect on an ordinary video call.
 * **Android only.** The iOS SDK has no equivalent setting, and passing this on
 */
export enum VideoCallObservationMode {
  /**
   * **Default.** The capture SDK's camera feeds the call's video track. No
   * screen-capture consent. The operator sees the camera only, and an NFC repeat
   * publishes no video since NFC opens no camera.
   */
  CAMERA_FEED = 'CAMERA_FEED',
  /**
   * **Beta.** Relays the customer's screen during the repeat, so the operator
   * also sees the capture UI. Consent is asked once per call. From Android 14
   * the system dialog preselects a single app rather than the whole screen, and
   * what is shared is the customer's choice — do not assume a full-device view.
   */
  SCREEN_SHARE = 'SCREEN_SHARE',
  /**
   * Legacy. Publishes a separate screen-share track; the dashboard renders only
   * one of a participant's tracks and which is not deterministic. Kept for
   * integrations that already depend on it.
   */
  PROGRESS_ONLY = 'PROGRESS_ONLY',
}

/**
 * Video Call Credentials for authentication and connection
 */
export interface VideoCallCredentials {
  serverURL: string;
  wssURL: string;
  userID: string;
  transactionID: string;
  clientName: string;
  idleTimeout?: string; // Default: "30"
  /**
   * See {@link VideoCallObservationMode}. Android only, and only meaningful when
   * the in-call repeat flow is in use. Omit to keep the native SDK's own
   * default, which is `CAMERA_FEED` as of 26.3.0923.
   */
  observationMode?: VideoCallObservationMode;
}

/**
 * Video Call Status enumeration
 */
export enum VideoCallStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  FAILED = 'failed',
  COMPLETED = 'completed',
}

/**
 * Video Call Error Types
 */
export enum VideoCallErrorType {
  UNKNOWN = 'ERR_UNKNOWN',
  CREDENTIALS_MISSING = 'ERR_CREDENTIALS_MISSING',
  SERVER_TIMEOUT = 'ERR_SERVER_TIMEOUT_EXCEPTION',
  TRANSACTION_NOT_FOUND = 'ERR_TRANSACTION_NOT_FOUND',
  TRANSACTION_FAILED = 'ERR_TRANSACTION_FAILED',
  TRANSACTION_EXPIRED = 'ERR_TRANSACTION_EXPIRED',
  TRANSACTION_ALREADY_COMPLETED = 'ERR_TRANSACTION_ALREADY_COMPLETED',
  SDK_NOT_AVAILABLE = 'ERR_SDK_NOT_AVAILABLE',
  /**
   * An error the native SDK reported that has no more specific type. Read
   * `message` for the detail. Without this member every native SDK error fell
   * through to `UNKNOWN`, which made a genuine failure indistinguishable from
   * an unrecognised one.
   */
  SDK = 'ERR_SDK',
  /**
   * The permission has not been asked for yet. The SDK checks camera and
   * microphone access but never requests it — request it, then remount
   * `<VideoCallView>`. **iOS only**; on Android the call simply fails.
   */
  CAMERA_PERMISSION_REQUIRED = 'ERR_CAMERA_PERMISSION_REQUIRED',
  /**
   * Refused, or unavailable because of a restriction (Screen Time, MDM).
   * Requesting again shows no prompt — send the user to Settings.
   */
  CAMERA_PERMISSION_DENIED = 'ERR_CAMERA_PERMISSION_DENIED',
  /** See {@link CAMERA_PERMISSION_REQUIRED}. */
  MICROPHONE_PERMISSION_REQUIRED = 'ERR_MICROPHONE_PERMISSION_REQUIRED',
  /** See {@link CAMERA_PERMISSION_DENIED}. */
  MICROPHONE_PERMISSION_DENIED = 'ERR_MICROPHONE_PERMISSION_DENIED',
}

/**
 * State of a device phone call overlapping the video call. The video call keeps
 * running underneath, so `ENDED` is the cue that the user is back. Covers calls
 * placed as well as received.
 */
export enum VideoCallPhoneCallState {
  /** An incoming call is ringing; not answered yet. */
  INCOMING = 'incoming',
  /** An outgoing call is dialing; not answered yet. */
  OUTGOING = 'outgoing',
  /** The call was answered - the video call is now backgrounded. */
  CONNECTED = 'connected',
  /** The call ended; the video call flow can resume in the foreground. */
  ENDED = 'ended',
}

/**
 * Video Call Error
 */
export interface VideoCallError {
  type: VideoCallErrorType;
  message: string;
  details?: string;
}

/**
 * Video Call Result from operations
 */
export interface VideoCallResult {
  success: boolean;
  status?: VideoCallStatus;
  transactionID?: string;
  error?: VideoCallError;
  metadata?: Record<string, any>;
}

/**
 * Horizontal placement inside the call view.
 * - `center` — centered, then shifted by a signed `offset` (positive = trailing);
 *   `x` is ignored
 * - `left` / `right` — `offset` dp in from that edge
 */
export interface VideoCallHorizontalPosition {
  type: 'center' | 'left' | 'right' | 'custom';
  /**
   * Inset from the chosen edge for `left`/`right`, in dp. For `center` it is
   * instead a signed shift off center, positive towards the trailing edge.
   */
  offset?: number;
  /** Absolute distance from the leading edge, in dp. Used by `custom`. */
  x?: number;
}

/**
 * Vertical placement of a view element inside the call view. See
 * {@link VideoCallHorizontalPosition} for the semantics of each `type` -
 * except that `center` here has no offset support, since nothing needed a
 * vertically centered group.
 */
export interface VideoCallVerticalPosition {
  type: 'center' | 'top' | 'bottom' | 'custom';
  /** Inset from the chosen edge, in dp. Used by `top`/`bottom`. */
  offset?: number;
  /** Absolute distance from the top edge, in dp. Used by `custom`. */
  y?: number;
}

/**
 * Picture-in-picture (local camera preview) styling.
 * Platform defaults when a field is omitted: iOS 120x135 dp pinned
 * `right: 16` / `bottom: 0`; Android 120x160 dp pinned `right: 25` /
 * `bottom: 25`. Both default to a 2 dp border with a 10 dp corner radius.
 */
export interface VideoCallPipViewStyle {
  /** Hide the PiP preview entirely. Defaults to `true` (visible). */
  visible?: boolean;
  /** Fixed width in dp. Ignored when `horizontalAnchors` is set. */
  width?: number;
  /** Fixed height in dp. Ignored when `verticalAnchors` is set. */
  height?: number;
  horizontalPosition?: VideoCallHorizontalPosition;
  verticalPosition?: VideoCallVerticalPosition;
  /** Stretch horizontally between two insets instead of using a fixed `width`. */
  horizontalAnchors?: {leading: number; trailing: number};
  /** Stretch vertically between two insets instead of using a fixed `height`. */
  verticalAnchors?: {top: number; bottom: number};
  /** Fill shown behind the preview before the local camera track attaches. */
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
}

/**
 * Mute button styling. Rendered by the native SDK and visible once the call
 * connects. The colours below are re-applied whenever the SDK repaints the
 * button, so they stay consistent across both platforms.
 */
export interface VideoCallMuteButtonStyle {
  /** Defaults to `true` (visible). */
  visible?: boolean;
  /** Width and height in dp. Defaults to 50. */
  size?: number;
  /**
   * Tint used while the microphone is muted. Defaults to red on both
   * platforms - on Android via the SDK's own
   * `@color/udentify_vc_button_mic_off_color` resource, which an app can
   * override instead of setting this (see the library's `colors.xml`).
   */
  mutedColor?: string;
  /**
   * Tint used while the microphone is live. Defaults to white on both
   * platforms (Android: `@color/udentify_vc_button_mic_on_color`).
   */
  unmutedColor?: string;
  /** Defaults to `{type: 'center'}`. */
  horizontalPosition?: VideoCallHorizontalPosition;
  /** Defaults to `{type: 'bottom', offset: 20}`. */
  verticalPosition?: VideoCallVerticalPosition;
}

/**
 * Front/back camera switch button styling. The button carries a single icon
 * on both platforms - there is no front/back state to render.
 */
export interface VideoCallCameraSwitchButtonStyle {
  /** Defaults to `true` (visible). */
  visible?: boolean;
  /** Width and height in dp. Defaults to 50. */
  size?: number;
  /**
   * Icon tint, the same whichever camera is active. Leave unset to use the SDK's
   * own colour.
   */
  color?: string;
  /** Defaults to `{type: 'left', offset: 16}`. */
  horizontalPosition?: VideoCallHorizontalPosition;
  /** Defaults to `{type: 'bottom', offset: 20}`. */
  verticalPosition?: VideoCallVerticalPosition;
}

/**
 * Torch/flash button styling. **Android only** — iOS has no flash button, so
 * this is ignored there. Hidden by default on Android too, for parity; set
 * `visible: true` to opt in.
 */
export interface VideoCallFlashButtonStyle {
  /** Defaults to `false` (hidden) - see the note above. */
  visible?: boolean;
  /** Width and height in dp. Defaults to 50. */
  size?: number;
  /** Icon tint. Defaults to white. */
  color?: string;
  /** Defaults to `{type: 'right', offset: 16}`. */
  horizontalPosition?: VideoCallHorizontalPosition;
  /** Defaults to `{type: 'bottom', offset: 20}`. */
  verticalPosition?: VideoCallVerticalPosition;
}

/**
 * Styling for the instruction/notification label shown on the waiting screen
 * before the agent joins (the "Video Call will be starting, please wait..."
 * text and its countdown/authorizing variants).
 */
export interface VideoCallInstructionLabelStyle {
  /** Point size. Defaults to 20 on iOS, 26 on Android. */
  fontSize?: number;
  /**
   * Defaults to `medium` on iOS and normal weight on Android. All four
   * values are distinguished on both platforms, except below Android API
   * 28, where the platform only has two weights and `regular`/`medium`
   * round to normal while `semibold`/`bold` round to bold.
   */
  fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
  /**
   * Font family name. On iOS this is a `UIFont` family/PostScript name; on
   * Android it is a font-family name resolvable by `Typeface.create`.
   * Omit to use the system font.
   */
  fontFamily?: string;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  /** `0` means "as many lines as needed". */
  numberOfLines?: number;
  /** Line-height multiplier; `0` leaves the platform default. */
  lineHeightMultiple?: number;
  /** Leading inset in dp. Defaults to 35 on iOS, 20 on Android. */
  leading?: number;
  /** Trailing inset in dp. Defaults to 35 on iOS, 20 on Android. */
  trailing?: number;
  /** Defaults to centered vertically on iOS, 15% from the top on Android. */
  verticalPosition?: VideoCallVerticalPosition;
}

/**
 * Video Call UI Configuration
 */
export interface VideoCallConfig {
  /** Fill behind the remote video and the waiting screen. */
  backgroundColor?: string;
  /**
   * Instruction label color. Shorthand for
   * `instructionLabelStyle.textColor`, which wins when both are set.
   */
  textColor?: string;
  /**
   * PiP border color. Shorthand for `pipViewStyle.borderColor`, which wins
   * when both are set.
   */
  pipViewBorderColor?: string;
  /**
   * @deprecated Inert on both platforms. Each SDK writes the waiting-screen
   * label from its own localization lookup and overwrites anything set here.
   * Use localization instead: `tableName` plus a strings file on iOS, or the
   * `udentify_vc_notification_label_*` string resources on Android.
   */
  notificationLabelDefault?: string;
  /** @deprecated Inert on both platforms - see `notificationLabelDefault`. */
  notificationLabelCountdown?: string;
  /** @deprecated Inert on both platforms - see `notificationLabelDefault`. */
  notificationLabelTokenFetch?: string;

  // View element styling - each element can be repositioned, resized,
  // recolored or hidden entirely from JS. Omitted fields keep the native
  // SDK's own default for that element.
  pipViewStyle?: VideoCallPipViewStyle;
  muteButtonStyle?: VideoCallMuteButtonStyle;
  cameraSwitchButtonStyle?: VideoCallCameraSwitchButtonStyle;
  /** Android only - see {@link VideoCallFlashButtonStyle}. */
  flashButtonStyle?: VideoCallFlashButtonStyle;
  instructionLabelStyle?: VideoCallInstructionLabelStyle;

  // Localization
  /** **iOS only** - Android resolves SDK strings through Android resources. */
  tableName?: string;
  /** **iOS only** - the Android AAR exposes no request timeout. */
  requestTimeout?: number;
}

/**
 * Permission Status for Video Call
 */
export interface VideoCallPermissionStatus {
  hasCameraPermission: boolean;
  hasPhoneStatePermission: boolean;
  hasInternetPermission: boolean;
  hasRecordAudioPermission: boolean;
}

/**
 * Video Call Event Callbacks
 */
export interface VideoCallCallbacks {
  onStatusChanged?: (status: VideoCallStatus) => void;
  onError?: (error: VideoCallError) => void;
  onUserStateChanged?: (state: string) => void;
  onParticipantStateChanged?: (participantType: string, state: string) => void;
  onVideoCallEnded?: (success: boolean) => void;
  onVideoCallDismissed?: () => void;
  /** See {@link VideoCallPhoneCallState}. */
  onPhoneCallStateChanged?: (state: VideoCallPhoneCallState) => void;
  /** The device screen was locked while the call was running. */
  onScreenLocked?: () => void;
  /** The device screen was unlocked again. */
  onScreenUnlocked?: () => void;
  /** See {@link VideoCallMicrophoneStateEvent}. */
  onMicrophoneStateChanged?: (enabled: boolean) => void;
}

/** Payload for <VideoCallView>'s onParticipantStateChanged prop. */
export interface VideoCallParticipantStateEvent {
  /**
   * `'agent'`, `'supervisor'`, or `'unknown'`. `'unknown'` where the role cannot
   * be determined — before the room is joined, or with two remote parties
   * present.
   */
  participantType: string;
  state: string;
}

/** Payload for <VideoCallView>'s onVideoCallEnded prop. */
export interface VideoCallEndedEvent {
  success: boolean;
}

/** Payload for <VideoCallView>'s onPhoneCallStateChanged prop. */
export interface VideoCallPhoneCallStateEvent {
  state: VideoCallPhoneCallState;
}

/** Payload for <VideoCallView>'s onMicrophoneStateChanged prop. */
export interface VideoCallMicrophoneStateEvent {
  /** `true` = live (unmuted), `false` = muted. */
  enabled: boolean;
}

/**
 * The capture flow an in-call repeat runs. `HOLOGRAM` exists in the native enum
 * but is unimplemented by the SDK and is deliberately not surfaced here.
 */
export enum VideoCallRepeatRole {
  OCR = 'OCR',
  FACE = 'FACE',
  NFC = 'NFC',
}

/**
 * Emitted when the operator asks for an in-call re-capture and the app supplied
 * credentials for it, so the capture UI is about to take over the call screen.
 * Not emitted when the repeat is refused - which is the default, until the
 * matching capture package has been opted in with its `setRepeatConfig`.
 */
export interface VideoCallRepeatStartedEvent {
  role: VideoCallRepeatRole;
}

/**
 * Emitted when an in-call re-capture finishes successfully; never on cancel or
 * failure. Reports only that a repeat completed, and for which role — fetch the
 * verification outcome from your backend as usual.
 */
export interface VideoCallRepeatResultEvent {
  role: VideoCallRepeatRole;
}

/** How an in-call re-capture ended. */
export type VideoCallRepeatOutcome = 'COMPLETED' | 'CANCELLED' | 'FAILED';

/**
 * Emitted once per in-call re-capture that started, whatever ended it. Prefer it
 * over `onRepeatResult`, which does not fire on a cancel and carries nothing for
 * `OCR`. On a completed repeat, `onRepeatResult` arrives first.
 */
export interface VideoCallRepeatEndedEvent {
  role: VideoCallRepeatRole | '';
  /** Android only; absent on SDKs older than 26.3.0923. */
  outcome?: VideoCallRepeatOutcome;
  /** Optional detail the SDK attaches, typically only on `FAILED`. */
  reason?: string;
}

export interface VideoCallEventHandlers {
  onStatusChanged?: (status: VideoCallStatus) => void;
  onError?: (error: VideoCallError) => void;
  onUserStateChanged?: (state: string) => void;
  onParticipantStateChanged?: (event: VideoCallParticipantStateEvent) => void;
  onVideoCallEnded?: (event: VideoCallEndedEvent) => void;
  onVideoCallDismissed?: () => void;
  onPhoneCallStateChanged?: (event: VideoCallPhoneCallStateEvent) => void;
  onScreenLocked?: () => void;
  onScreenUnlocked?: () => void;
  onMicrophoneStateChanged?: (event: VideoCallMicrophoneStateEvent) => void;
  /** Android only. See {@link VideoCallRepeatStartedEvent}. */
  onRepeatStarted?: (event: VideoCallRepeatStartedEvent) => void;
  /** Android only. See {@link VideoCallRepeatResultEvent}. */
  onRepeatResult?: (event: VideoCallRepeatResultEvent) => void;
  onRepeatEnded?: (event: VideoCallRepeatEndedEvent) => void;
}

/**
 * Helper functions for type conversion
 */
export class VideoCallUtils {
  /**
   * Convert string to VideoCallStatus enum
   */
  static stringToStatus(value: string): VideoCallStatus {
    switch (value?.toLowerCase()) {
      case 'idle':
        return VideoCallStatus.IDLE;
      case 'connecting':
        return VideoCallStatus.CONNECTING;
      case 'connected':
        return VideoCallStatus.CONNECTED;
      case 'disconnected':
        return VideoCallStatus.DISCONNECTED;
      case 'failed':
        return VideoCallStatus.FAILED;
      case 'completed':
        return VideoCallStatus.COMPLETED;
      default:
        return VideoCallStatus.IDLE;
    }
  }

  /**
   * Convert a native phone-call state to the enum. Case-insensitive;
   * unrecognised values fall back to `ENDED` so an app can resume.
   */
  static stringToPhoneCallState(value: string): VideoCallPhoneCallState {
    switch (value?.toLowerCase()) {
      case 'incoming':
        return VideoCallPhoneCallState.INCOMING;
      case 'outgoing':
        return VideoCallPhoneCallState.OUTGOING;
      case 'connected':
        return VideoCallPhoneCallState.CONNECTED;
      case 'ended':
        return VideoCallPhoneCallState.ENDED;
      default:
        return VideoCallPhoneCallState.ENDED;
    }
  }

  /**
   * Convert string to VideoCallErrorType enum
   */
  static stringToErrorType(value: string): VideoCallErrorType {
    switch (value) {
      case 'ERR_UNKNOWN':
        return VideoCallErrorType.UNKNOWN;
      case 'ERR_CREDENTIALS_MISSING':
        return VideoCallErrorType.CREDENTIALS_MISSING;
      case 'ERR_SERVER_TIMEOUT_EXCEPTION':
        return VideoCallErrorType.SERVER_TIMEOUT;
      case 'ERR_TRANSACTION_NOT_FOUND':
        return VideoCallErrorType.TRANSACTION_NOT_FOUND;
      case 'ERR_TRANSACTION_FAILED':
        return VideoCallErrorType.TRANSACTION_FAILED;
      case 'ERR_TRANSACTION_EXPIRED':
        return VideoCallErrorType.TRANSACTION_EXPIRED;
      case 'ERR_TRANSACTION_ALREADY_COMPLETED':
        return VideoCallErrorType.TRANSACTION_ALREADY_COMPLETED;
      case 'ERR_SDK_NOT_AVAILABLE':
        return VideoCallErrorType.SDK_NOT_AVAILABLE;
      case 'ERR_SDK':
        return VideoCallErrorType.SDK;
      case 'ERR_CAMERA_PERMISSION_REQUIRED':
        return VideoCallErrorType.CAMERA_PERMISSION_REQUIRED;
      case 'ERR_CAMERA_PERMISSION_DENIED':
        return VideoCallErrorType.CAMERA_PERMISSION_DENIED;
      case 'ERR_MICROPHONE_PERMISSION_REQUIRED':
        return VideoCallErrorType.MICROPHONE_PERMISSION_REQUIRED;
      case 'ERR_MICROPHONE_PERMISSION_DENIED':
        return VideoCallErrorType.MICROPHONE_PERMISSION_DENIED;
      default:
        return VideoCallErrorType.UNKNOWN;
    }
  }

  /**
   * Check if all permissions are granted
   */
  static areAllPermissionsGranted(permissions: VideoCallPermissionStatus): boolean {
    return (
      permissions.hasCameraPermission &&
      permissions.hasPhoneStatePermission &&
      permissions.hasInternetPermission &&
      permissions.hasRecordAudioPermission
    );
  }

  /**
   * Create a VideoCallError from native response
   */
  static createErrorFromMap(errorMap: any): VideoCallError {
    return {
      type: VideoCallUtils.stringToErrorType(errorMap.type || 'ERR_UNKNOWN'),
      message: errorMap.message || 'Unknown error',
      details: errorMap.details,
    };
  }

  /**
   * Create a VideoCallResult from native response
   */
  static createResultFromMap(resultMap: any): VideoCallResult {
    return {
      success: resultMap.success || false,
      status: resultMap.status ? VideoCallUtils.stringToStatus(resultMap.status) : undefined,
      transactionID: resultMap.transactionID,
      error: resultMap.error ? VideoCallUtils.createErrorFromMap(resultMap.error) : undefined,
      metadata: resultMap.metadata,
    };
  }

  /**
   * Convert VideoCallCredentials to map for native bridge
   */
  static credentialsToMap(credentials: VideoCallCredentials): Record<string, any> {
    return {
      serverURL: credentials.serverURL,
      wssURL: credentials.wssURL,
      userID: credentials.userID,
      transactionID: credentials.transactionID,
      clientName: credentials.clientName,
      idleTimeout: credentials.idleTimeout || '30',
    };
  }

  /**
   * Convert VideoCallConfig to map for native bridge
   */
  static configToMap(config: VideoCallConfig): Record<string, any> {
    return {
      backgroundColor: config.backgroundColor,
      textColor: config.textColor,
      pipViewBorderColor: config.pipViewBorderColor,
      notificationLabelDefault: config.notificationLabelDefault,
      notificationLabelCountdown: config.notificationLabelCountdown,
      notificationLabelTokenFetch: config.notificationLabelTokenFetch,
      // Passed through as nested maps; both native sides read them key by
      // key and fall back to their own defaults for anything missing, so
      // partial styles (e.g. only `muteButtonStyle.size`) are valid.
      pipViewStyle: config.pipViewStyle,
      muteButtonStyle: config.muteButtonStyle,
      cameraSwitchButtonStyle: config.cameraSwitchButtonStyle,
      flashButtonStyle: config.flashButtonStyle,
      instructionLabelStyle: config.instructionLabelStyle,
      tableName: config.tableName,
      requestTimeout: config.requestTimeout,
    };
  }

  /**
   * Create VideoCallPermissionStatus from native response
   */
  static createPermissionsFromMap(permissionsMap: any): VideoCallPermissionStatus {
    return {
      hasCameraPermission: permissionsMap.hasCameraPermission || false,
      hasPhoneStatePermission: permissionsMap.hasPhoneStatePermission || false,
      hasInternetPermission: permissionsMap.hasInternetPermission || false,
      hasRecordAudioPermission: permissionsMap.hasRecordAudioPermission || false,
    };
  }
}
