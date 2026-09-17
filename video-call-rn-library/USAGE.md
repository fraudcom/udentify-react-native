# video-call-rn-library — Integration Guide

How to integrate Udentify video calling into a React Native app: requesting
permissions, rendering the call screen, handling call events, controlling the
call, and styling the native UI.

This guide covers the JavaScript/TypeScript API. For installing the package
and its native dependencies, see the setup documentation.

**Contents**

0. [What's new](#0-whats-new)
1. [How the API is shaped](#1-how-the-api-is-shaped)
2. [Quick start](#2-quick-start)
3. [Permissions](#3-permissions)
4. [Credentials](#4-credentials)
5. [Rendering the call screen](#5-rendering-the-call-screen)
6. [Call lifecycle](#6-call-lifecycle)
7. [Event reference](#7-event-reference)
8. [Controlling the call](#8-controlling-the-call)
9. [Ending the call](#9-ending-the-call)
10. [UI configuration](#10-ui-configuration)
11. [Platform notes](#11-platform-notes)
12. [Troubleshooting](#12-troubleshooting)

---

## 0. What's new

Native SDK `26.3.0916` on Android, `26.3.0914` on iOS.

### Ending a call ends it for the agent too

`endVideoCall()` cancels the transaction on the server before tearing the local
session down, so the call ends in the agent console as well.

```tsx
const result = await VideoCall.endVideoCall();
if (result.error) {
  // Ended locally, but the agent's session may still be open
  console.warn('Server-side cancellation failed:', result.error.message);
}
```

- The local teardown runs even when the cancellation fails, so a server error
  can never strand the user on the call screen.
- `success` means "there was a call to end". A failed cancellation does not
  make it `false` — it appears in the result’s `error` field instead.
- `cancelVideoCall()` rejects on failure and leaves the call up, which is what
  you want when backing out while still connecting.

### Microphone control

```tsx
<VideoCallView
  credentials={credentials}
  onMicrophoneStateChanged={({enabled}) => setMicOn(enabled)}
/>

await VideoCall.setMicrophoneEnabled(false);   // mute
await VideoCall.isMicrophoneEnabled();         // one-shot read
```

**`setMicrophoneEnabled(enabled)`**

- Mutes or unmutes the microphone of the active call.
- Also notifies the operator console, so its mute indicator stays in sync with
  a change your app made.
- Resolves `true` when the request was **accepted**, `false` when there is no
  active call. Acceptance is not completion — the change is applied
  asynchronously.
- Requesting the state it is already in is a no-op: it resolves `true`, the
  operator is still notified, and no change event fires.

**`isMicrophoneEnabled()`**

- One-shot read of the live state; `false` when there is no active call.
- May still return the previous value immediately after a
  `setMicrophoneEnabled()` call. Use it for one-off queries, not to drive UI.

**`onMicrophoneStateChanged({enabled})`**

- Fires for **every** real change, whatever caused it:
  - your own `setMicrophoneEnabled()` calls
  - the mute button the SDK draws in the call UI
  - the operator muting or unmuting from their console
  - automatic mutes the SDK makes on its own — the app leaving the screen,
    audio focus being lost, a real phone call being answered
  - the automatic unmute once those conditions end
- Consecutive duplicates are suppressed, so every event is a genuine change.
- Fires when the change has actually taken effect, not when it was requested.
- **Use this as the source of truth for your own mute button.** Tracking what
  you last requested will drift out of sync the first time the microphone
  changes without your app asking — and several of the sources above do
  exactly that.

**`toggleMicrophone()`** is deprecated — see the table at the end of this
section.

### Typed permission errors, and a gate that stops the call early

A call with no camera or microphone access fails early and specifically. The
SDK refuses to start — no access token is fetched, no room is joined — and
reports the reason through `onError` with its own type:

```tsx
onError={(error) => {
  switch (error.type) {
    case VideoCallErrorType.CAMERA_PERMISSION_DENIED:
    case VideoCallErrorType.MICROPHONE_PERMISSION_DENIED:
      // Refused: asking again shows no prompt, send the user to Settings
      break;
    case VideoCallErrorType.CAMERA_PERMISSION_REQUIRED:
    case VideoCallErrorType.MICROPHONE_PERMISSION_REQUIRED:
      // Not asked yet: request, then remount <VideoCallView>
      break;
  }
}}
```

**This SDK checks permissions but never requests them.** iOS shows each system
prompt only once per install, and the text comes from your `Info.plist`, so
your app owns both the wording and the single moment that prompt can be spent.
Request them at a point in your flow where you can explain why.

Two platform differences worth knowing:

- Android reports only `*_DENIED`, never `*_REQUIRED`. It cannot distinguish
  "never asked" from "denied permanently" without state the SDK does not have;
  iOS can only do so because AVFoundation reports `.notDetermined` separately.
- When both permissions are missing, the reported type is the camera one. The
  full list is in `error.message`.

`VideoCallErrorType.SDK` is also new — a native SDK error with no more
specific type, which keeps a real SDK failure distinguishable from an
unrecognised one.

### Audio stops when the app leaves the screen

An app that keeps running in the background stops capturing the microphone
and playing the operator's voice while the user is somewhere else entirely.

- Leaving the app mutes the microphone through the normal signal path, so
  the operator sees a mute indicator rather than unexplained silence.
- The audio engine is then stopped, which also ends playback — muting the
  microphone alone would leave the operator audible to an absent user.
- Returning to the app restores both.
- The mute state from *before* leaving is replayed rather than unmuting
  outright, so a user who had muted themselves — or whom the operator had
  muted — stays muted on return.

Nothing to wire up. `onMicrophoneStateChanged` reports it like any other
change.

### Removed and deprecated

| API | Status |
|---|---|
| `toggleCamera()` | **Removed.** Never supported on either platform. |
| `switchCamera()` | **Removed.** iOS-only. Use the SDK's own in-call camera-switch button. |
| `toggleMicrophone()` | **Deprecated.** iOS-only, and it bypasses the operator notification. Use `setMicrophoneEnabled()`. |

---

## 1. How the API is shaped

Three things explain the whole API.

**The call screen is a React component.** You render `<VideoCallView />`
inside your own view tree, much like `react-native-vision-camera`'s
`<Camera />`. The SDK draws the remote video, the local picture-in-picture
preview, and its own mute / camera-switch buttons inside that view's bounds.
Anything else — an End Call button, a header, your own overlay — is ordinary
React Native rendered as a sibling on top of it.

**Mounting starts the call.** The call begins as soon as `<VideoCallView>`
mounts with valid `credentials`, and ends when you unmount it or call
`VideoCall.endVideoCall()` / `VideoCall.cancelVideoCall()`.

**Call controls are static methods.** Because one call is active at a time,
`<VideoCallView>` has no imperative ref. Methods on `VideoCall`
(`endVideoCall`, `setMicrophoneEnabled`, `isMicrophoneEnabled`, …) act on
whichever `<VideoCallView>` is currently mounted.

```
Your screen
├── <VideoCallView>          ← native video + the SDK's own controls
│      ↑ mounting starts the call, unmounting ends it
└── <YourEndCallButton>      ← plain RN, calls VideoCall.endVideoCall()
```

```ts
import {
  VideoCall,                  // call control + queries
  VideoCallView,              // the call screen component
  VideoCallUtils,             // conversion / validation helpers
  subscribeToVideoCallEvents, // event subscription outside the component
  type VideoCallCredentials,
  type VideoCallConfig,
  type VideoCallStatus,
  type VideoCallError,
} from 'video-call-rn-library';
```

---

## 2. Quick start

A complete call screen: check permissions, mount the view, leave when the
call ends.

```tsx
import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Button} from 'react-native';
import {
  VideoCall,
  VideoCallView,
  VideoCallUtils,
  type VideoCallCredentials,
} from 'video-call-rn-library';

export default function CallScreen({
  credentials,
  onDone,
}: {
  credentials: VideoCallCredentials;
  onDone: () => void;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await VideoCall.checkPermissions();
      if (VideoCallUtils.areAllPermissionsGranted(status)) {
        setReady(true);
        return;
      }
      const result = await VideoCall.requestPermissions();
      setReady(result === 'granted');
    })();
  }, []);

  if (!ready) return <View style={styles.fill} />;

  return (
    <View style={styles.fill}>
      <VideoCallView
        style={StyleSheet.absoluteFill}
        credentials={credentials}
        onVideoCallEnded={() => onDone()}
        onVideoCallDismissed={() => onDone()}
        onError={error => console.error('video call error', error)}
      />
      <Button title="End Call" onPress={() => VideoCall.endVideoCall().then(onDone)} />
    </View>
  );
}

const styles = StyleSheet.create({fill: {flex: 1, backgroundColor: '#000'}});
```

For production, add the single-exit guard from section 9.

---

## 3. Permissions

A call requires camera and microphone access. Android additionally requires
phone-state and internet permissions; on iOS those two are always reported as
granted, since iOS needs no equivalent runtime grant.

### Checking

```ts
const status = await VideoCall.checkPermissions();
// {
//   hasCameraPermission: boolean,
//   hasRecordAudioPermission: boolean,
//   hasPhoneStatePermission: boolean,  // always true on iOS
//   hasInternetPermission: boolean,    // always true on iOS
// }

if (VideoCallUtils.areAllPermissionsGranted(status)) {
  // safe to mount <VideoCallView>
}
```

### Requesting

```ts
const result = await VideoCall.requestPermissions();
// 'granted' | 'denied' | 'error'
```

`'granted'` means every required permission was granted. Neither method
throws — a failure resolves as `'error'` (or, for `checkPermissions`, as all
fields `false`).

On iOS, the system shows each permission prompt only once per install: a
permission the user previously denied resolves straight to `'denied'`, and
the user has to change it in Settings. Handle that case with a message
pointing them there rather than re-requesting in a loop.

Always gate mounting on permissions — the call needs the camera and
microphone the moment it joins.

---

## 4. Credentials

`credentials` identifies the connection and the transaction for one call.
All values come from your backend's video-call transaction setup.

| Field | Type | Meaning |
|---|---|---|
| `serverURL` | `string` | Udentify REST base URL. |
| `wssURL` | `string` | WebSocket URL for call signalling. |
| `userID` | `string` | The end user's identifier in your Udentify tenant. |
| `transactionID` | `string` | The video-call transaction to join. One transaction = one call. |
| `clientName` | `string` | Your client/tenant name as registered with Udentify. |
| `idleTimeout` | `string?` | Seconds to wait for an agent before giving up. Defaults to `"30"`. Note this is a **string**. |

```ts
const credentials: VideoCallCredentials = {
  serverURL: 'https://example.udentify.io',
  wssURL: 'wss://example.udentify.io',
  userID: 'user-123',
  transactionID: 'txn-abc',
  clientName: 'my-app',
  idleTimeout: '30',
};
```

**`credentials` is read once, when the view mounts.** Treat it as immutable
for the component's lifetime. To start a new call, remount the component —
the idiomatic way is to key it by transaction:

```tsx
<VideoCallView key={credentials.transactionID} credentials={credentials} />
```

---

## 5. Rendering the call screen

```tsx
<VideoCallView
  style={StyleSheet.absoluteFill}
  credentials={credentials}
  config={videoCallConfig}        // optional — see section 10
  onStatusChanged={status => {}}
  onError={error => {}}
  onUserStateChanged={state => {}}
  onParticipantStateChanged={({participantType, state}) => {}}
  onVideoCallEnded={({success}) => {}}
  onVideoCallDismissed={() => {}} // iOS — see section 7
  onPhoneCallStateChanged={({state}) => {}}
  onScreenLocked={() => {}}
  onScreenUnlocked={() => {}}
  onMicrophoneStateChanged={({enabled}) => {}}
/>
```

- **Give the view real bounds.** It fills the frame you give it;
  `StyleSheet.absoluteFill` inside a `flex: 1` parent is the usual choice. A
  view with no height renders nothing and the call appears to hang.
- **Draw your own controls as siblings**, after the view so they sit on top.
  Use `pointerEvents="box-none"` on a full-screen overlay container so taps
  still reach the SDK's own buttons underneath.
- **All event props are optional**, and are subscribed once on mount. If a
  handler needs the latest component state, read it from a ref.

**Size an overlay to its content, not full-screen.** Even with
`pointerEvents="box-none"` and a transparent background, a full-screen
sibling view still occupies that entire region in the native view hierarchy.
For a button pinned to one edge, give the overlay `position: 'absolute'` with
only the edges it needs (e.g. `left`/`right`/`bottom`, no `top`) so its
height stays intrinsic:

```ts
// ❌ Avoid — occupies the full screen even though it draws one button
overlay: {...StyleSheet.absoluteFillObject, justifyContent: 'flex-end'},

// ✅ Prefer — sized to its content
overlay: {position: 'absolute', left: 0, right: 0, bottom: 0, justifyContent: 'flex-end'},
```

---

## 6. Call lifecycle

A typical successful call. Treat this as the shape of the flow rather than a
guarantee — states can be skipped or repeated (notably `reconnecting`).

```
mount <VideoCallView credentials=… />
   │
   ├─ onUserStateChanged: 'initiating'
   ├─ onUserStateChanged: 'tokenFetching'      ← fetching a room token
   ├─ onUserStateChanged: 'tokenFetched'
   ├─ onUserStateChanged: 'connecting'         ← joining the room
   ├─ onStatusChanged:    'connecting'
   │
   │   … the waiting screen shows here, until an agent joins …
   │
   ├─ onUserStateChanged: 'connected'          ← local user in the room
   ├─ onStatusChanged:    'connected'
   ├─ onParticipantStateChanged: {state: 'connected', …}
   ├─ onParticipantStateChanged: {state: 'videoTrackActivated', …}
   │
   │   … the call is live; mute / camera-switch controls are visible …
   │   … onPhoneCallStateChanged / onScreenLocked / onScreenUnlocked may
   │     interleave at any time without ending the call …
   │
   └─ call ends:
        ├─ onVideoCallEnded: {success: true}      ← normal termination
        │  + onStatusChanged: 'completed'
        ├─ onVideoCallDismissed (iOS)              ← no definitive result
        │  + onStatusChanged: 'disconnected'
        └─ onError + onStatusChanged: 'failed'     ← failure path
```

`onError` is terminal: the session is over when it fires, unless you are
only logging.

---

## 7. Event reference

Each `<VideoCallView>` prop corresponds to one call event. Payload shapes are
the same on both platforms; the few platform differences are noted here and
summarized in section 11.

### `onStatusChanged(status: VideoCallStatus)`

Coarse call status: `'idle' | 'connecting' | 'connected' | 'disconnected' |
'failed' | 'completed'`.

| Situation | Status |
|---|---|
| Joining (token fetch, connecting, reconnecting) | `'connecting'` |
| Local user in the room | `'connected'` |
| Normal end | `'completed'` |
| Error or failure | `'failed'` |
| Disconnected | `'disconnected'` |

It fires only when the value **changes**, so several join steps collapse into
a single `'connecting'` event. Use `onUserStateChanged` when you need every
transition, including reconnects.

### `onUserStateChanged(state: string)`

The local user's progress through joining and connecting — the most detailed
progress signal, identical on both platforms:

`'initiating'` → `'tokenFetching'` → `'tokenFetched'` → `'connecting'` →
`'connected'`, plus `'disconnected'` and `'reconnecting'`.

### `onParticipantStateChanged({participantType, state})`

A remote party's state changed.

- `state`: `'connected' | 'videoTrackActivated' | 'videoTrackPaused' |
  'disconnected'`
- `participantType`: `'agent' | 'supervisor' | 'unknown'`

On Android the role is not always determinable — for example before a remote
party has joined, or when an agent and a supervisor are both present — and is
reported as `'unknown'` in those cases. **Always handle `'unknown'`** if you
branch on `participantType`.

### `onVideoCallEnded({success: boolean})`

The session terminated. `success` is `true` for a normal end, including a
server-side hangup. This is the primary "call is over" signal on **both**
platforms — always handle it.

### `onVideoCallDismissed()` — iOS

The call UI was dismissed without a definitive success/failure result, e.g.
the connection dropped before the call was established.

This is iOS-only. On Android the equivalent exit arrives through
`onVideoCallEnded`, so handle both and your exit path works everywhere.

### `onPhoneCallStateChanged({state})`

A phone call on the device — cellular, FaceTime, or another VoIP app —
started or ended during the video call. `state` is `'incoming' | 'outgoing' |
'connected' | 'ended'`, and covers outgoing calls as well as incoming ones.

Informational only: **the video call is not torn down.** Both platforms keep
the session connected while the system call UI is in front, so `'ended'` is
your cue that the user is back. Useful for hiding your own overlay chrome
during the interruption.

### `onScreenLocked()` / `onScreenUnlocked()`

The device screen was locked or unlocked during the call. Also informational
— neither ends the session.

### `onMicrophoneStateChanged({enabled})`

The microphone was muted or unmuted. Fires for **every** cause, not just your
own calls: the SDK's in-call mute button, a mute/unmute from the operator,
`VideoCall.setMicrophoneEnabled()`, and the SDK's own automatic mutes — the
app being backgrounded, audio focus being lost, a real phone call being
answered — plus the automatic unmute once those end.

Consecutive duplicates are suppressed natively, so every event is a real
change. If you render your own mute button, this event is what should drive
it; tracking what you last requested will drift out of sync the first time
the SDK mutes on its own.

### Automatic behavior during a call (no event, nothing to wire up)

Two things happen on their own while a call is active, so they aren't a
surprise if you notice them:

- **iOS:** the device's automatic screen-lock timeout is suspended for the
  duration of the call and restored to whatever it was once the call ends.
  A manual lock (the side button, or `onScreenLocked` above) still works —
  only the *automatic* timeout is affected.
- **iOS:** while the remote party's camera is muted, the call view shows a
  plain black overlay in place of their video rather than their last frame.
  No action needed on your side; Android's SDK already behaves this way.

### Subscribing outside the component

To listen without a mounted `<VideoCallView>` — before mounting it, or from a
service module — use `subscribeToVideoCallEvents()`. It takes the same
handlers and returns a handle you **must** remove on cleanup:

```ts
import {subscribeToVideoCallEvents} from 'video-call-rn-library';

useEffect(() => {
  const sub = subscribeToVideoCallEvents({
    onVideoCallEnded: ({success}) => console.log('ended', success),
    onError: error => console.error(error),
  });
  return () => sub.remove();
}, []);
```

Each call creates an independent subscription, so it is safe across repeated
mount/unmount cycles.

---

## 8. Controlling the call

All static on `VideoCall`, acting on the currently-mounted
`<VideoCallView>`.

| Method | Returns | Notes |
|---|---|---|
| `endVideoCall()` | `VideoCallResult` | Ends the active call, cancelling the transaction server-side so the agent's session ends too. `success` is `false` if no call was active. Safe to call when nothing is running. |
| `cancelVideoCall()` | `VideoCallResult` | Cancels the transaction server-side *without* tearing the call down if it fails — for backing out while still connecting. Rejects with `NO_ACTIVE_CALL` if no call is mounted. |
| `getVideoCallStatus()` | `VideoCallStatus` | Current status, or `'idle'` when no call is mounted. |
| `getLocalizedStrings()` | `{endCallButtonLabel, endCallButtonEndingLabel}` | Localized End Call labels for the device's language. |
| `setMicrophoneEnabled(enabled)` | `boolean` | Mutes/unmutes, and tells the operator console so its indicator stays in sync. Returns whether the request was *accepted* (`false` = no active call) — not whether it took effect; `onMicrophoneStateChanged` reports that. |
| `isMicrophoneEnabled()` | `boolean` | One-shot read; `false` when no call is active. May still read stale immediately after a set — drive UI from `onMicrophoneStateChanged` instead. |
| `toggleMicrophone()` | `boolean` | **Deprecated.** iOS-only (Android rejects with `ERR_NOT_SUPPORTED`), and it writes the microphone track directly, so the operator console's indicator does not follow it. Use `setMicrophoneEnabled()`. |
| `checkPermissions()` / `requestPermissions()` | see section 3 | |

There is no camera control here. The SDKs expose none on Android, and the
one-platform `toggleCamera()` / `switchCamera()` that used to sit in this
table were removed — users switch the camera with the SDK's own in-call
button on both platforms.

Use `getLocalizedStrings()` when you render your own End Call button, so its
label matches the language of the SDK's own UI instead of hardcoding one:

```tsx
const [labels, setLabels] = useState(null);
useEffect(() => {
  VideoCall.getLocalizedStrings().then(setLabels);
}, []);

<Button title={ending ? labels?.endCallButtonEndingLabel : labels?.endCallButtonLabel} … />
```

`getVideoCallStatus()` returns the status at the moment you call it; prefer
the `onStatusChanged` / `onUserStateChanged` events over polling it.

Camera on/off cannot be toggled independently of the SDK's own camera
control, and `startVideoCall()` / `dismissVideoCall()` / `setCallbacks()` are
deprecated — render `<VideoCallView>` to start a call, `endVideoCall()` to
end one, and the component's event props (or
`subscribeToVideoCallEvents()`) to observe it.

---

## 9. Ending the call

Two independent paths can end the same call, and both can fire:

1. **Your own button** → `endVideoCall()` / `cancelVideoCall()` resolves.
2. **The call itself ends** → `onVideoCallEnded` (or, on iOS,
   `onVideoCallDismissed`) fires. This is the only path for server-initiated
   hangups, idle timeouts, and errors.

Handle both, and make the exit idempotent so you navigate only once:

```tsx
const hasEndedRef = useRef(false);

const finish = (fn: () => void) => {
  if (hasEndedRef.current) return;
  hasEndedRef.current = true;
  fn();
};

const handleEndCall = async () => {
  const result = await VideoCall.endVideoCall();
  finish(() => onEnded(result.success !== false));
};

<VideoCallView
  onVideoCallEnded={({success}) => finish(() => onEnded(success))}
  onVideoCallDismissed={() => finish(onDismissed)}
  // …
/>
```

For an end the user triggered, act on the returned promise — it tells you the
outcome directly. Keep the event handlers for terminations you did not
trigger.

### Ending it on the agent's side too

`endVideoCall()` cancels the transaction on the server before tearing the
local session down. That cancellation is what ends the session in the agent
console: simply leaving the media room is indistinguishable, from the agent's
side, from a network blip or a backgrounded app. There is no client-side
"hangup" signal — `TERMINATE_SESSION_SIGNAL` travels agent → client only.

The local teardown runs even when that cancellation fails, so the user is
never stranded on the call screen. You get `success: true` with an `error`
describing the failure — log it, because it means the agent's session may
still be open:

```tsx
const result = await VideoCall.endVideoCall();
if (result.error) {
  console.warn('Call ended locally but not cancelled server-side:', result.error.message);
}
```

The cancellation can fail while the call is still *connecting*, because on iOS
the SDK refuses to cancel before a room exists. The call still ends locally.

Unmounting `<VideoCallView>` also ends the call, so a navigation-driven exit
is safe. Call `endVideoCall()` explicitly when the user deliberately hangs up,
so you get the outcome back.

**Navigating with `react-native-screens` (including React Navigation's
native-stack) is not the same as unmounting.** Pushing another screen on top
of the call screen *covers* it without unmounting the React tree — and the
two platforms differ in what that does to the call:

- **Android** keeps the call running; the same session resumes when you pop
  back to the call screen.
- **iOS** ends the call when it is covered, the same as if you had unmounted
  it.

If your flow ever pushes a screen over the call screen rather than popping
it, call `VideoCall.endVideoCall()` explicitly first so both platforms behave
the same way, rather than relying on the navigation action itself to end the
call.

---

## 10. UI configuration

The `config` prop styles the elements the SDK draws itself: the local
picture-in-picture preview, the mute / camera-switch buttons, and the
waiting-screen instruction label.

Every field is optional. An omitted field keeps the platform default, and
since those defaults are not always identical on iOS and Android, setting a
value explicitly is how you pin both platforms to the same look.

### Positioning

Elements are positioned with `{type, offset}` / `{type, x|y}`, measured
**from the edges of `<VideoCallView>` itself, not the device safe area**. If
you render the view as `absoluteFill` behind a notch or status bar, include
enough offset to clear it.

| `type` | Meaning |
|---|---|
| `'left'` / `'right'` | `offset` dp in from that edge (horizontal). |
| `'top'` / `'bottom'` | `offset` dp in from that edge (vertical). |
| `'center'` | Centered, then shifted by a **signed** `offset` (horizontal only; positive moves toward the trailing edge). This is how two buttons share the center as one group. |
| `'custom'` | Absolute `x` from the leading edge, or `y` from the top. |

Colors are hex only: `#RGB`, `#RRGGBB`, or `#RRGGBBAA`. Sizes are dp. A color
in any other format (e.g. a named color like `'transparent'`) is ignored in
favour of the default rather than throwing.

### Hiding an element

Set `visible: false` on any styled element (`pipViewStyle`,
`muteButtonStyle`, `cameraSwitchButtonStyle`) to hide it for the whole call:

```ts
const config: VideoCallConfig = {
  pipViewStyle: {visible: false},            // no self-view at all
  cameraSwitchButtonStyle: {visible: false},  // front camera only
};
```

### Example

```ts
const CONTROL_SIZE = 50;
const CONTROL_GAP = 24;
const SHIFT = (CONTROL_SIZE + CONTROL_GAP) / 2; // half a button + half the gap

const videoCallConfig: VideoCallConfig = {
  backgroundColor: '#000000',

  // Local self-view, moved to the top left.
  pipViewStyle: {
    visible: true,
    horizontalPosition: {type: 'left', offset: 20},
    verticalPosition: {type: 'top', offset: 64},
    width: 120,
    height: 160,
    backgroundColor: '#00000000', // fully transparent until the camera attaches
    borderColor: '#FFFFFF',
    borderWidth: 2,
    cornerRadius: 10,
  },

  // Mute + camera switch as one centered pair at the bottom.
  muteButtonStyle: {
    visible: true,
    size: CONTROL_SIZE,
    mutedColor: '#FF0000',
    unmutedColor: '#FFFFFF',
    horizontalPosition: {type: 'center', offset: SHIFT},
    verticalPosition: {type: 'bottom', offset: 20},
  },
  cameraSwitchButtonStyle: {
    visible: true,
    size: CONTROL_SIZE,
    color: '#FFFFFF',
    horizontalPosition: {type: 'center', offset: -SHIFT},
    verticalPosition: {type: 'bottom', offset: 20},
  },

  // Waiting-screen instruction label.
  instructionLabelStyle: {
    fontSize: 20,
    fontWeight: 'medium', // regular | medium | semibold | bold
    textColor: '#FFFFFF',
    textAlign: 'center',
    numberOfLines: 0,     // 0 = as many as needed
    leading: 35,
    trailing: 35,
    verticalPosition: {type: 'center'},
  },

  requestTimeout: 30, // iOS
};
```

Instead of a fixed `width`/`height`, the PiP preview can stretch between two
insets with `horizontalAnchors: {leading, trailing}` /
`verticalAnchors: {top, bottom}`. When you set either of those, the matching
`width`/`height` no longer applies.

### Localizing the SDK's own text

The waiting-screen label and the SDK's button labels come from its own
localization, in the device's current language. To change that text:

- **iOS:** ship a strings file and point `config.tableName` at it.
- **Android:** override the `udentify_vc_notification_label_*` string
  resources in your app.

`config.tableName` and `config.requestTimeout` apply to iOS. On Android,
strings resolve through Android resources, and the call's timeout is
`credentials.idleTimeout`.

One field group is accepted by the type but has no effect on either
platform: `notificationLabelDefault`, `notificationLabelCountdown`, and
`notificationLabelTokenFetch` are overwritten by each SDK's own localization
lookup. Use the localization options above instead.

### Platform defaults reference

Every field is applied on both iOS and Android. Where the two platforms ship
different *defaults* for a field, both are listed — set the field explicitly
to pin both platforms to the same value.

| Property | iOS default | Android default |
| --- | --- | --- |
| `backgroundColor` | black | black |
| `textColor` (shorthand) | white | white |
| `pipViewBorderColor` (shorthand) | white | white |
| `pipViewStyle.width` / `.height` | 120 / 135 | 120 / 160 |
| `pipViewStyle.horizontalPosition` / `.verticalPosition` | `right: 16` / `bottom: 0` | `right: 25` / `bottom: 25` |
| `pipViewStyle.backgroundColor` | transparent | card theme colour |
| `pipViewStyle.borderColor` / `.borderWidth` | white / 2 | white / 2 |
| `pipViewStyle.cornerRadius` | 10 | Material theme radius |
| `muteButtonStyle.unmutedColor` / `.mutedColor` | white / red | white / red |
| `muteButtonStyle.horizontalPosition` / `.verticalPosition` | center / `bottom: 20` | center / `bottom: 20` |
| `cameraSwitchButtonStyle.size` / `.color` / `.horizontalPosition` / `.verticalPosition` | 50 dp, white, `left: 16` / `bottom: 20` | same |
| `instructionLabelStyle.fontSize` | 20 | 26 |
| `instructionLabelStyle.fontWeight` | medium | normal |
| `instructionLabelStyle.numberOfLines` | 0 (unlimited) | 3 |
| `instructionLabelStyle.leading` / `.trailing` | 35 | 20 |
| `instructionLabelStyle.verticalPosition` | centered | 15% from top |

A few fields apply on one platform only:

- **`tableName` — iOS only.** Localize Android's strings through Android
  resources instead (see above).
- **`requestTimeout` — iOS only.** On Android the call's timeout comes from
  `credentials.idleTimeout` instead.

**Android control-button colour resources.** The SDK's control buttons also
read their default tints from Android colour resources — `config` is still
the recommended way to set these per screen, but to change the *defaults*
app-wide, declare the same names in your app's `res/values/colors.xml`:

| Resource | Default | `config` equivalent |
|---|---|---|
| `udentify_vc_button_mic_on_color` | `#FFFFFF` | `muteButtonStyle.unmutedColor` |
| `udentify_vc_button_mic_off_color` | `#FF0000` | `muteButtonStyle.mutedColor` |
| `udentify_vc_button_camera_color` | `#FFFFFF` | `cameraSwitchButtonStyle.color` |

A `config` value always wins over the resource when both are set.

**Background/overlay images** are not configurable through `config` — render
your own view on top of `<VideoCallView>` for that, the same approach as any
other custom in-call chrome (section 5).

**`config` is the only way to set these values** — there is no imperative or
module-level equivalent, so UI configuration always travels with the
`<VideoCallView>` it applies to.

**Where to define it.** Because `config` is a plain object, define your whole
`VideoCallConfig` once in its own module and import it wherever you render
`<VideoCallView>`, rather than writing it inline at the call site:

```
test-app/
├── src/config/videoCallConfig.ts   ← every UI value, in one place
└── App.tsx                         ← passes it to the call screen
```

```ts
// src/config/videoCallConfig.ts
export const videoCallConfig: VideoCallConfig = {
  backgroundColor: '#000000',
  pipViewStyle: {/* … */},
  muteButtonStyle: {/* … */},
  cameraSwitchButtonStyle: {/* … */},
  instructionLabelStyle: {/* … */},
};
```

```tsx
// App.tsx
import {videoCallConfig} from './src/config/videoCallConfig';

<VideoCallView credentials={credentials} config={videoCallConfig} />
```

This keeps every value you've set explicitly (including ones you could have
left to the platform default) visible and editable in one place, and a
Metro reload picks up a change immediately — no native rebuild needed, since
`config` crosses the bridge as an ordinary prop.

---

## 11. Platform notes

| Behavior | iOS | Android |
|---|---|---|
| `onVideoCallDismissed` | fires | use `onVideoCallEnded` |
| `participantType` | `'agent'` / `'supervisor'` | may be `'unknown'` |
| Camera control | SDK's in-call button | SDK's in-call button |
| `config.tableName` / `config.requestTimeout` | applied | use Android resources / `idleTimeout` |
| `hasPhoneStatePermission` / `hasInternetPermission` | always `true` | real runtime values |
| Screen auto-lock during a call | suspended automatically (see section 7) | — |
| Muted remote camera | shows a black overlay (see section 7) | same, handled by the SDK itself |
| Covered (not unmounted) by `react-native-screens` | ends the call | call keeps running (see section 9) |

Everything else — `onStatusChanged`, `onUserStateChanged`,
`onParticipantStateChanged`, `onVideoCallEnded`, `onPhoneCallStateChanged`,
`onScreenLocked` / `onScreenUnlocked`, `onMicrophoneStateChanged`, and the
rest of the `VideoCall` API —
behaves identically on both platforms.

The practical rule: **handle `onVideoCallEnded` for the exit path and
`onStatusChanged` / `onUserStateChanged` for progress.** Add
`onVideoCallDismissed` alongside them for iOS.

---

## 12. Troubleshooting

**The call screen is black, or nothing happens after mounting.**
Usually layout: the native view has no height. Use
`StyleSheet.absoluteFill` inside a `flex: 1` parent. Otherwise verify
permissions (section 3) and that the credentials are valid — an invalid
transaction is reported through `onError`.

**No events arrive.**
Confirm the package's native setup completed (`pod install` on iOS, a rebuild
after installing on Android) and that the app is not running in Expo Go.

**`onStatusChanged` fires fewer times than expected.**
By design — it fires only when the status changes, and several join steps map
to `'connecting'`. Use `onUserStateChanged` for every transition
(section 7).

**Your exit handler runs twice.**
Both your End Call button and the call's own end event fired. Use the
single-exit guard from section 9.

**`participantType` is `'unknown'` on Android.**
Expected when the remote party's role cannot be determined — handle
`'unknown'` as a valid value (section 7).

**A new call reuses the previous call's state.**
`credentials` is read once per mount. Remount with a new `key` (section 4).

**The waiting-screen text does not change.**
It comes from the SDK's own localization — use the localization options in
section 10.

**The microphone changed without the app asking.**
Expected. The SDK mutes by itself when the app is backgrounded, when it loses
audio focus, and when a real phone call is answered, then unmutes again once
that ends — and the operator can mute the user too. This is why
`onMicrophoneStateChanged` is the source of truth for a custom mute button,
rather than whatever the app last requested.
