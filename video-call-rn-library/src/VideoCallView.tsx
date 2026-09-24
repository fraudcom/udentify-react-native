import React, {useEffect} from 'react';
import {requireNativeComponent, StyleProp, ViewStyle, Platform, View} from 'react-native';
import type {
  VideoCallCredentials,
  VideoCallConfig,
  VideoCallStatus,
  VideoCallError,
  VideoCallParticipantStateEvent,
  VideoCallEndedEvent,
  VideoCallPhoneCallStateEvent,
  VideoCallMicrophoneStateEvent,
  VideoCallRepeatStartedEvent,
  VideoCallRepeatResultEvent,
  VideoCallRepeatEndedEvent,
} from './VideoCallModels';
import {subscribeToVideoCallEvents} from './NativeVideoCallModule';

interface NativeVideoCallViewProps {
  style?: StyleProp<ViewStyle>;
  credentials: VideoCallCredentials;
  config?: VideoCallConfig;
}

const NativeVideoCallView =
  Platform.OS === 'ios' || Platform.OS === 'android'
    ? requireNativeComponent<NativeVideoCallViewProps>('VideoCallView')
    : null;

export interface VideoCallViewProps {
  style?: StyleProp<ViewStyle>;
  /**
   * Set once per mount - treat as immutable for the lifetime of this
   * component. To start a new call with different credentials, unmount and
   * remount (e.g. by changing the component's `key`) rather than updating
   * this prop in place.
   */
  credentials: VideoCallCredentials;
  /** UI styling for this view: colors, notification labels, and the
   * size/position/visibility of the elements the native SDKs draw
   * themselves. This prop is the only way to configure them - see the
   * "UI Customisation" section of the repository README. */
  config?: VideoCallConfig;
  onStatusChanged?: (status: VideoCallStatus) => void;
  onError?: (error: VideoCallError) => void;
  onUserStateChanged?: (state: string) => void;
  onParticipantStateChanged?: (event: VideoCallParticipantStateEvent) => void;
  onVideoCallEnded?: (event: VideoCallEndedEvent) => void;
  onVideoCallDismissed?: () => void;
  /**
   * A phone call on the device (cellular, FaceTime, another VoIP app) started
   * or ended while this view was mounted. The video call keeps running
   * underneath the system call UI, so this is for the app's own reaction -
   * e.g. hiding its overlay chrome until the state comes back as `ended`.
   */
  onPhoneCallStateChanged?: (event: VideoCallPhoneCallStateEvent) => void;
  /** The device screen was locked while the call was running. */
  onScreenLocked?: () => void;
  /** The device screen was unlocked again. */
  onScreenUnlocked?: () => void;
  /**
   * The microphone was muted or unmuted, whatever caused it: the SDK's own
   * mute button, the operator, `VideoCall.setMicrophoneEnabled()`, or the SDK
   * muting by itself (app backgrounded, audio focus lost, a real phone call
   * answered) and unmuting once that ends. Drive a custom mute button from
   */
  onMicrophoneStateChanged?: (event: VideoCallMicrophoneStateEvent) => void;
  /** Android only — see VideoCallRepeatStartedEvent. */
  onRepeatStarted?: (event: VideoCallRepeatStartedEvent) => void;
  /** Android only — see VideoCallRepeatResultEvent. */
  onRepeatResult?: (event: VideoCallRepeatResultEvent) => void;
  /** Android only — see VideoCallRepeatEndedEvent. Fires whatever ended the
   * re-capture, including an operator cancelling it, so it is the right signal
   * for restoring app UI hidden while the capture was on screen. Prefer it over
   * `onRepeatResult`, which does not fire on a cancel and carries nothing for
   * an OCR repeat. */
  onRepeatEnded?: (event: VideoCallRepeatEndedEvent) => void;
}

/**
 * Embeddable video call view. Unlike the deprecated startVideoCall()
 * imperative API, this renders the call UI inline in the React Native view
 * tree, so you can compose your own controls (e.g. an End Call button) as
 * ordinary sibling views on top of it - mirroring how
 */
export const VideoCallView: React.FC<VideoCallViewProps> = ({
  style,
  credentials,
  config,
  onStatusChanged,
  onError,
  onUserStateChanged,
  onParticipantStateChanged,
  onVideoCallEnded,
  onVideoCallDismissed,
  onPhoneCallStateChanged,
  onScreenLocked,
  onScreenUnlocked,
  onMicrophoneStateChanged,
  onRepeatStarted,
  onRepeatResult,
  onRepeatEnded,
}) => {
  useEffect(() => {
    const subscription = subscribeToVideoCallEvents({
      onStatusChanged,
      onError,
      onUserStateChanged,
      onParticipantStateChanged,
      onVideoCallEnded,
      onVideoCallDismissed,
      onPhoneCallStateChanged,
      onScreenLocked,
      onScreenUnlocked,
      onMicrophoneStateChanged,
      onRepeatStarted,
      onRepeatResult,
      onRepeatEnded,
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!NativeVideoCallView) {
    return <View style={style} />;
  }
  return (
    <NativeVideoCallView
      style={style}
      credentials={credentials}
      config={config}
    />
  );
};

export default VideoCallView;
