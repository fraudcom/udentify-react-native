import {Platform, StatusBar} from 'react-native';
import type {VideoCallConfig} from 'video-call-rn-library';

/**
 * App-level native view configuration for the video call screen.
 *
 * Handed to `<VideoCallView config={...}>`, which applies it to the elements
 * the native SDKs draw themselves - the picture-in-picture self-view, the
 * mute / camera-switch / flash buttons, and the waiting-screen instruction
 * label. One object drives both platforms; see the "UI Customisation"
 * section of the repository README for the full field reference.
 *
 * Every field below is written out explicitly, including the ones that were
 * previously left to the SDK defaults, so this file is the single place to
 * see and change the whole surface. Two consequences worth knowing:
 *
 *  - The `config` prop is the ONLY way to set these. There is no imperative
 *    or module-level equivalent any more.
 *  - Where the two SDKs shipped *different* defaults, writing one value here
 *    pins both platforms to it. Each such field is marked `[was: iOS x /
 *    Android y]` so the original behaviour is recoverable - delete the line
 *    to hand that field back to each SDK's own default.
 */

/**
 * Positions are measured from the edges of the `VideoCallView` itself, not
 * from the safe area - the native SDKs constrain to the container's own
 * anchors, and an embedded RN view is not necessarily screen-edge-aligned,
 * so safe-area insets would be meaningless there.
 *
 * VideoCallActiveScreen renders the view with `StyleSheet.absoluteFill`, so
 * it does span the full screen including the status bar and any notch. A
 * top-anchored element therefore needs an offset large enough to clear that
 * itself. The test app has no safe-area-inset dependency, so this is a
 * deliberate approximation rather than a measured inset: Android reports its
 * status bar height, and iOS uses a constant that clears the tallest current
 * Dynamic Island.
 */
const TOP_INSET = Platform.select({
  android: (StatusBar.currentHeight ?? 24) + 12,
  default: 64,
});

/**
 * The two native in-call controls (camera switch, mute) sit at the bottom as
 * one centered group with `CONTROL_GAP` dp of air between them, both on the
 * same `CONTROL_BOTTOM` baseline.
 *
 * `horizontalPosition: {type: 'center'}` takes a signed `offset` measured
 * from the container's center, so each button moves half the group's width
 * off it: half a button plus half the gap.
 */
const CONTROL_SIZE = 50;
const CONTROL_GAP = 24;
const CONTROL_SHIFT = (CONTROL_SIZE + CONTROL_GAP) / 2;
const CONTROL_BOTTOM = 20;

export const videoCallConfig: VideoCallConfig = {
  // ---------------------------------------------------------------------
  // Screen-level colors
  // ---------------------------------------------------------------------

  /** Fill behind the remote video and the waiting screen. */
  backgroundColor: '#000000',

  // `textColor` and `pipViewBorderColor` are pre-per-element shorthands kept
  // for back-compat. They are intentionally omitted here: the equivalent
  // fields on instructionLabelStyle / pipViewStyle below win whenever both
  // are set, so listing both would be dead weight.

  // ---------------------------------------------------------------------
  // Picture-in-picture self-view
  // ---------------------------------------------------------------------

  pipViewStyle: {
    visible: true,

    // NOT a default: this app deliberately moves the self-view to the top
    // left. [was: iOS right 16 / bottom 0, Android right 25 / bottom 25]
    horizontalPosition: {type: 'left', offset: 20},
    verticalPosition: {type: 'top', offset: TOP_INSET},

    width: 120,
    // [was: iOS 135 / Android 160] - invisible at the bottom right, obvious
    // once the view sits in the top left, so it is pinned for parity.
    height: 160,

    // Alternative to width/height: stretch between two insets instead of
    // using a fixed size. Setting either one makes the matching
    // width/height above inert, so both are left off.
    // horizontalAnchors: {leading: 20, trailing: 20},
    // verticalAnchors: {top: 20, bottom: 20},

    /**
     * Fill shown before the local camera track attaches. Colors are parsed
     * as hex only (`#RGB`, `#RRGGBB`, `#RRGGBBAA`) - a named color like
     * `transparent` is rejected and silently falls back to the default, so
     * fully-transparent is spelled out as an 8-digit value here.
     */
    backgroundColor: '#00000000',
    borderColor: '#FFFFFF',
    borderWidth: 2,
    // [was: iOS 10 / Android the MaterialCardView theme radius]
    cornerRadius: 10,
  },

  // ---------------------------------------------------------------------
  // In-call control buttons (native; revealed once the call connects)
  // ---------------------------------------------------------------------

  // Right half of the centered pair. NOT a default: the SDKs center this
  // one on its own, which puts it flush against the camera-switch button
  // once that moves in from the edge. [was: centered, no offset]
  muteButtonStyle: {
    visible: true,
    size: CONTROL_SIZE,
    // Applied on both platforms while the microphone is muted / live,
    // alongside the SDK's own crossed-out mic icon. These two now happen to
    // match both SDKs' own defaults - iOS' VCMuteButtonStyle has always used
    // .red / .white, and native SDK 26.3.0910 gave Android per-state colour
    // resources (udentify_vc_button_mic_off_color #FF0000 /
    // udentify_vc_button_mic_on_color #FFFFFF) that agree with it, where it
    // previously tinted both states one shared white. They are still written
    // out here rather than left to the SDKs, so a future vendor restyle
    // cannot silently change this app's mic colours. A JS value wins over the
    // Android resource either way.
    mutedColor: '#FF0000',
    unmutedColor: '#FFFFFF',
    horizontalPosition: {type: 'center', offset: CONTROL_SHIFT},
    verticalPosition: {type: 'bottom', offset: CONTROL_BOTTOM},
  },

  // Left half of the centered pair. NOT a default: both SDKs pin this to
  // the bottom-left corner. [was: left 16]
  cameraSwitchButtonStyle: {
    visible: true,
    size: CONTROL_SIZE,
    // Single tint regardless of which camera is active (no per-facing
    // distinction, unlike mute) - matches the SDK package's own default
    // (@color/udentify_vc_button_camera_color on Android, white on iOS),
    // spelled out here rather than left implicit.
    color: '#FFFFFF',
    horizontalPosition: {type: 'center', offset: -CONTROL_SHIFT},
    verticalPosition: {type: 'bottom', offset: CONTROL_BOTTOM},
  },

  /**
   * Android only. iOS drives the torch remotely from the agent over the
   * call's data channel and has no button to style, so this whole style is
   * accepted and ignored there - which is also why it defaults to hidden,
   * keeping the two platforms looking the same unless you opt in.
   */
  flashButtonStyle: {
    visible: false,
    size: CONTROL_SIZE,
    color: '#FFFFFF',
    // Left where the SDK puts it: it is hidden, and turning it on would mean
    // re-deciding the group's spacing for three buttons rather than two
    // (`{type: 'center', offset: CONTROL_SIZE + CONTROL_GAP}` and friends).
    horizontalPosition: {type: 'right', offset: 16},
    verticalPosition: {type: 'bottom', offset: CONTROL_BOTTOM},
  },

  // ---------------------------------------------------------------------
  // Waiting-screen instruction label
  // ---------------------------------------------------------------------

  instructionLabelStyle: {
    // [was: iOS 20 / Android 26]
    fontSize: 20,
    // [was: iOS medium / Android normal]. All four weights are honoured on
    // both platforms; below Android API 28 the OS has only two, so
    // regular/medium round to normal and semibold/bold round to bold.
    fontWeight: 'medium',
    // fontFamily: omitted on purpose - both platforms fall back to the
    // system font, and a name the app has not actually bundled would
    // silently degrade to it anyway.
    textColor: '#FFFFFF',
    textAlign: 'center',
    /** `0` means as many lines as needed. [was: iOS 0 / Android 3] */
    numberOfLines: 0,
    /** `0` leaves the platform's own line height. */
    lineHeightMultiple: 0,
    // [was: iOS 35 / Android 20]
    leading: 35,
    trailing: 35,
    // [was: iOS centered / Android 15% from the top]
    verticalPosition: {type: 'center'},
  },

  // ---------------------------------------------------------------------
  // Localization and networking - both iOS only. Android resolves SDK
  // strings through Android resources (its localization helper takes only a
  // Context, with no table concept), and the Android AAR exposes no request
  // timeout at all - the only timeout it accepts is the credentials'
  // `idleTimeout`.
  // ---------------------------------------------------------------------

  // tableName: 'CustomVideoCallStrings',
  /** Seconds before an SDK network request gives up. */
  requestTimeout: 30,

  // `notificationLabelDefault` / `notificationLabelCountdown` /
  // `notificationLabelTokenFetch` exist on the type but are inert on BOTH
  // platforms: each SDK writes the waiting-screen label from its own
  // localization lookup, overwriting anything passed here. To change that
  // text, ship a strings file and point `tableName` at it (iOS) or override
  // the `udentify_vc_notification_label_*` string resources (Android).
};
