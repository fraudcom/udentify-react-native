import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Modal,
  Linking,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, {Path, Rect, type SvgProps} from 'react-native-svg';
import {
  VideoCall,
  VideoCallView,
  VideoCallErrorType,
  type VideoCallCredentials,
  type VideoCallConfig,
  type VideoCallError,
  type VideoCallLocalizedStrings,
} from 'video-call-rn-library';

// The call cannot run without these, so the SDK refuses to start and reports one
// of them instead of failing somewhere less obvious later.
const PERMISSION_ERROR_TYPES = [
  VideoCallErrorType.CAMERA_PERMISSION_REQUIRED,
  VideoCallErrorType.CAMERA_PERMISSION_DENIED,
  VideoCallErrorType.MICROPHONE_PERMISSION_REQUIRED,
  VideoCallErrorType.MICROPHONE_PERMISSION_DENIED,
];

// An icon for the End Call button: either a component that takes SvgProps
// (an imported `.svg`, or any component accepting width/height/color - the
// overlay passes `iconSize` and `iconColor` to it), or a ready-made element
// when the caller wants full control over its props.
export type VideoCallOverlayIcon = React.ComponentType<SvgProps> | React.ReactElement;


// Default icon: a handset set down on its cradle, drawn at the same glyph
// weight as the SDK's own mic/camera-switch SF Symbols so the two read as
// one set, but tinted white to sit on the button's red fill.
function EndCallIcon({color, ...props}: SvgProps) {
  const fill = color ?? '#FFFFFF';
  return (
    <Svg viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M4 12.5 C4 4.5 20 4.5 20 12.5"
        stroke={fill}
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <Rect x={3} y={17} width={18} height={3} rx={1.5} fill={fill} />
    </Svg>
  );
}

// Sizing/position/style for the JS-rendered End Call button overlay. Every
// field is optional and falls back to DEFAULT_OVERLAY_CONFIG below: a red
// 50 dp circle with a white glyph, in the top-right corner. The 50 dp
// footprint and half-size glyph match the SDK's own on-call controls
// (VCMuteButtonStyle / VCCameraSwitchButtonStyle), while the filled circle
// and top placement keep End Call distinct from that bottom row.
export interface VideoCallOverlayConfig {
  /** Vertical edge to pin the button to. */
  vertical?: 'top' | 'bottom';
  /** Distance from that edge's safe area, in dp. */
  verticalOffset?: number;
  /** Horizontal placement within the overlay. */
  align?: 'left' | 'center' | 'right';
  /** Distance from the side edge when align is 'left'/'right', in dp. */
  sideOffset?: number;
  /** Fixed button width; omit for content-driven width via paddingHorizontal. */
  width?: number;
  height?: number;
  paddingHorizontal?: number;
  borderRadius?: number;
  backgroundColor?: string;
  disabledBackgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: TextStyle['fontWeight'];
  label?: string;
  endingLabel?: string;
  /** Icon rendered inside the button. Defaults to a hung-up handset. */
  icon?: VideoCallOverlayIcon;
  /** Icon shown while the call is ending; falls back to `icon`. */
  endingIcon?: VideoCallOverlayIcon;
  /** Which side of the label the icon sits on. Ignored while `iconOnly`. */
  iconPosition?: 'left' | 'right';
  /** Icon width/height in dp, 25 by default. Component-form icons only. */
  iconSize?: number;
  /** Icon color, white by default; '' follows `textColor`. Component-form icons only. */
  iconColor?: string;
  /** Gap between the icon and the label, in dp. Ignored while `iconOnly`. */
  iconSpacing?: number;
  /** Icon-only button, hiding the text label. Defaults to `true`. */
  iconOnly?: boolean;
}

// `endingIcon` has no default, and `icon` can be cleared back to nothing for
// a text-only button, so both stay optional after the defaults are merged in.
type ResolvedOverlayConfig = Required<Omit<VideoCallOverlayConfig, 'icon' | 'endingIcon'>> &
  Pick<VideoCallOverlayConfig, 'icon' | 'endingIcon'>;

// Component-form icons get sized/tinted from the config; element-form icons
// are rendered as-is, since the caller already chose their props.
function renderOverlayIcon(icon: VideoCallOverlayIcon, size: number, color: string) {
  if (React.isValidElement(icon)) return icon;
  const IconComponent = icon as React.ComponentType<SvgProps>;
  return <IconComponent width={size} height={size} color={color} />;
}

const DEFAULT_OVERLAY_CONFIG: ResolvedOverlayConfig = {
  // Top-right corner, clear of the SDK's own controls: it puts camera-switch
  // at `left: 16`, mute at `center` and flash at `right: 16`, all `bottom: 20`.
  vertical: 'top',
  verticalOffset: 16,
  align: 'right',
  sideOffset: 16,
  // 50 dp square, matching VCMuteButtonStyle/VCCameraSwitchButtonStyle.size.
  width: 50,
  height: 50,
  paddingHorizontal: 0,
  // Half the 50 dp square, i.e. a full circle.
  borderRadius: 25,
  backgroundColor: '#CC0000',
  // Same red while ending; the button also drops to 0.6 opacity below.
  disabledBackgroundColor: '#CC0000',
  textColor: '#FFFFFF',
  fontSize: 15,
  fontWeight: '700',
  // Not drawn while `iconOnly` is set, but still the button's accessibility
  // label. Used only until the SDK's own localized strings resolve (or if
  // that fetch fails) - see the getLocalizedStrings() effect below, which
  // overrides these with the device's actual current-language labels.
  label: 'Görüşmeyi Sonlandır',
  endingLabel: 'Sonlandırılıyor...',
  icon: EndCallIcon,
  iconOnly: true,
  iconPosition: 'left',
  // The SDK renders its symbols at `size / 2`.
  iconSize: 25,
  iconColor: '#FFFFFF',
  iconSpacing: 8,
};

interface VideoCallActiveScreenProps {
  credentials: VideoCallCredentials;
  config?: VideoCallConfig;
  /** Customizes the End Call button's size, position, icon, and style. */
  overlayConfig?: VideoCallOverlayConfig;
  // Called when the call ends, whether the user tapped End Call or the SDK
  // reported the call as finished (server hangup, error, idle timeout).
  onEnded: (success: boolean) => void;
  // Called when the SDK dismisses the call UI without a definitive
  // success/failure result (e.g. connection dropped before a room formed).
  onDismissed: () => void;
}

export default function VideoCallActiveScreen({
  credentials,
  config,
  overlayConfig,
  onEnded,
  onDismissed,
}: VideoCallActiveScreenProps) {
  const [localizedStrings, setLocalizedStrings] = useState<VideoCallLocalizedStrings | null>(null);
  useEffect(() => {
    let cancelled = false;
    VideoCall.getLocalizedStrings().then(strings => {
      if (!cancelled) setLocalizedStrings(strings);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const overlay: ResolvedOverlayConfig = {
    ...DEFAULT_OVERLAY_CONFIG,
    ...(localizedStrings
      ? {
          label: localizedStrings.endCallButtonLabel,
          endingLabel: localizedStrings.endCallButtonEndingLabel,
        }
      : null),
    ...overlayConfig,
  };
  const [ending, setEnding] = useState(false);
  // Set when the SDK refuses to start for a missing permission. Also gates the
  // modal's primary action: once a re-request comes back refused, asking again
  // shows no system prompt, so the only way forward is Settings.
  const [permissionError, setPermissionError] = useState<VideoCallError | null>(null);
  const [permissionRetryRefused, setPermissionRetryRefused] = useState(false);

  const retryPermissions = async () => {
    try {
      const result = await VideoCall.requestPermissions();
      if (result === 'granted') {
        setPermissionError(null);
        setPermissionRetryRefused(false);
        // Not retried in place: `credentials` is read once per mount, so the
        // call has to be started again from the previous screen.
        onDismissed();
        return;
      }
      setPermissionRetryRefused(true);
    } catch (error) {
      console.error('VideoCallActiveScreen - permission retry failed:', error);
      setPermissionRetryRefused(true);
    }
  };
  // Guards against double-navigation: the promise resolution below and the
  // onVideoCallEnded/onVideoCallDismissed events can both fire for the same
  // call end (confirmed the native side reliably completes sendEvent, but
  // delivery back to this specific JS listener was found unreliable for the
  // manual end-call path on iOS - navigating on promise resolution directly
  // is the robust primary path; the event handlers below remain as a
  // fallback for server-initiated/automatic terminations that don't go
  // through this button).
  const hasNavigatedRef = useRef(false);

  const activeLabel = ending ? overlay.endingLabel : overlay.label;
  const activeIcon = ending ? overlay.endingIcon ?? overlay.icon : overlay.icon;

  const requestMicrophone = async (enabled: boolean) => {
    try {
      await VideoCall.setMicrophoneEnabled(enabled);
    } catch (error) {
      console.error('VideoCallActiveScreen - setMicrophoneEnabled error:', error);
    }
  };

  const handleEndCall = async () => {
    if (ending) return;
    setEnding(true);
    try {
      const result = await VideoCall.endVideoCall();
      // Not a reason to stay on the screen - the call has ended locally
      // regardless - but the agent's session may still be open.
      if (result.error) {
        console.warn(
          'VideoCallActiveScreen - call ended locally but not cancelled server-side:',
          result.error.message,
        );
      }
      if (!hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        onEnded(result.success !== false);
      }
    } catch (error) {
      console.error('VideoCallActiveScreen - endVideoCall error:', error);
      setEnding(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <VideoCallView
        style={StyleSheet.absoluteFill}
        credentials={credentials}
        config={config}
        onStatusChanged={status => {
          console.log('VideoCallActiveScreen - status changed:', status);
        }}
        onUserStateChanged={state => {
          console.log('VideoCallActiveScreen - user state changed:', state);
        }}
        onParticipantStateChanged={({participantType, state}) => {
          console.log(
            'VideoCallActiveScreen - participant state changed:',
            participantType,
            state,
          );
        }}
        onPhoneCallStateChanged={({state}) => {
          console.log('VideoCallActiveScreen - phone call state changed:', state);
        }}
        onScreenLocked={() => {
          console.log('VideoCallActiveScreen - screen locked');
        }}
        onScreenUnlocked={() => {
          console.log('VideoCallActiveScreen - screen unlocked');
        }}
        onMicrophoneStateChanged={({enabled}) => {
          console.log('VideoCallActiveScreen - microphone enabled:', enabled);
        }}
        onError={error => {
          console.error('VideoCallActiveScreen - error:', error);
          if (PERMISSION_ERROR_TYPES.includes(error?.type)) {
            // Claims the navigation before the onVideoCallEnded that always
            // follows a failure: otherwise the screen unmounts immediately and
            // takes the modal with it, leaving the user with no explanation.
            // The modal's own buttons navigate from here on.
            hasNavigatedRef.current = true;
            setPermissionError(error);
          }
        }}
        onVideoCallEnded={({success}) => {
          if (hasNavigatedRef.current) return;
          hasNavigatedRef.current = true;
          onEnded(success);
        }}
        onVideoCallDismissed={() => {
          if (hasNavigatedRef.current) return;
          hasNavigatedRef.current = true;
          onDismissed();
        }}
      />

      <SafeAreaView
        style={[
          styles.overlay,
          overlay.vertical === 'top' ? {top: 0} : {bottom: 0},
          {
            justifyContent: overlay.vertical === 'top' ? 'flex-start' : 'flex-end',
            alignItems:
              overlay.align === 'left'
                ? 'flex-start'
                : overlay.align === 'right'
                ? 'flex-end'
                : 'center',
            paddingHorizontal: overlay.align === 'center' ? 0 : overlay.sideOffset,
          },
        ]}
        pointerEvents="box-none">
        {/* Drives setMicrophoneEnabled() from inside an active call, which is the
            only place it has any effect. The SDK draws its own mute button too;
            these exercise the library's API instead. */}
        <View style={styles.micTestRow}>
          <TouchableOpacity
            style={styles.micTestButton}
            onPress={() => requestMicrophone(true)}
            accessibilityRole="button"
            accessibilityLabel="Microphone on">
            <Text style={styles.micTestButtonText}>MIC ON</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.micTestButton}
            onPress={() => requestMicrophone(false)}
            accessibilityRole="button"
            accessibilityLabel="Microphone off">
            <Text style={styles.micTestButtonText}>MIC OFF</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.endCallButton,
            {
              paddingHorizontal: overlay.paddingHorizontal,
              height: overlay.height,
              borderRadius: overlay.borderRadius,
              backgroundColor: ending ? overlay.disabledBackgroundColor : overlay.backgroundColor,
              opacity: ending ? 0.6 : 1,
            },
            overlay.vertical === 'top'
              ? {marginTop: overlay.verticalOffset}
              : {marginBottom: overlay.verticalOffset},
            overlay.width > 0 ? {width: overlay.width} : null,
            overlay.iconPosition === 'right' ? {flexDirection: 'row-reverse'} : null,
          ]}
          disabled={ending}
          onPress={handleEndCall}
          accessibilityRole="button"
          accessibilityLabel={activeLabel}>
          {activeIcon ? (
            <View
              style={
                overlay.iconOnly
                  ? null
                  : overlay.iconPosition === 'right'
                  ? {marginLeft: overlay.iconSpacing}
                  : {marginRight: overlay.iconSpacing}
              }>
              {renderOverlayIcon(activeIcon, overlay.iconSize, overlay.iconColor || overlay.textColor)}
            </View>
          ) : null}
          {overlay.iconOnly && activeIcon ? null : (
            <Text
              style={[
                styles.endCallButtonText,
                {
                  color: overlay.textColor,
                  fontSize: overlay.fontSize,
                  fontWeight: overlay.fontWeight,
                },
              ]}>
              {activeLabel}
            </Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>

      <Modal
        visible={permissionError !== null}
        transparent
        animationType="fade"
        onRequestClose={onDismissed}>
        <View style={styles.permissionBackdrop}>
          <View style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>İzin Gerekli</Text>
            <Text style={styles.permissionBody}>
              {permissionRetryRefused
                ? 'İzin verilmediği için görüşme başlatılamıyor. Ayarlar’dan kamera ve mikrofon iznini açtıktan sonra tekrar deneyin.'
                : 'Görüntülü görüşme için kamera ve mikrofon izni gerekiyor.'}
            </Text>
            <Text style={styles.permissionDetail}>{permissionError?.type}</Text>

            <TouchableOpacity
              style={styles.permissionPrimaryButton}
              onPress={permissionRetryRefused ? () => Linking.openSettings() : retryPermissions}
              accessibilityRole="button">
              <Text style={styles.permissionPrimaryText}>
                {permissionRetryRefused ? 'Ayarları Aç' : 'İzin Ver'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.permissionSecondaryButton}
              onPress={onDismissed}
              accessibilityRole="button">
              <Text style={styles.permissionSecondaryText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
  } as ViewStyle,
  endCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  endCallButtonText: {} as TextStyle,
  // Microphone control buttons, drawn over the call view.
  micTestRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  } as ViewStyle,
  micTestButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginHorizontal: 6,
  } as ViewStyle,
  micTestButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  } as TextStyle,
  permissionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  } as ViewStyle,
  permissionCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
  } as ViewStyle,
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
  } as TextStyle,
  permissionBody: {
    fontSize: 15,
    lineHeight: 21,
    color: '#333333',
  } as TextStyle,
  permissionDetail: {
    fontSize: 12,
    color: '#888888',
    marginTop: 8,
  } as TextStyle,
  permissionPrimaryButton: {
    marginTop: 18,
    backgroundColor: '#4B2FD1',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  } as ViewStyle,
  permissionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  } as TextStyle,
  permissionSecondaryButton: {
    marginTop: 8,
    paddingVertical: 11,
    alignItems: 'center',
  } as ViewStyle,
  permissionSecondaryText: {
    color: '#4B2FD1',
    fontSize: 15,
    fontWeight: '500',
  } as TextStyle,
});
