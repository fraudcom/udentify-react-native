// Liveness in the Yüz Kayıt flow, per mode:
// - passive: ONE session. The registration selfie itself is the liveness
//   check (analyzed server-side).
// - active: TWO sessions. Register the face first, then prove liveness with
//   randomized commands (authentication).
// - hybrid (finding 3.c): ONE session. The SDK runs the active commands and
//   the photo captured for /act-liveness-face feeds registration AND the
//   passive analysis simultaneously. No intermediate screen.
export type LivenessMode = 'passive' | 'active' | 'hybrid';
export type LivenessPhase = 'faceCapture' | 'liveness';

export interface FaceRecognizerCredentials {
  serverURL: string;
  transactionID: string;
  userID: string;
  autoTake?: boolean;
  errorDelay?: number;
  successDelay?: number;
  runInBackground?: boolean;
  blinkDetectionEnabled?: boolean;
  requestTimeout?: number;
  eyesOpenThreshold?: number;
  maskConfidence?: number;
  invertedAnimation?: boolean;
  activeLivenessAutoNextEnabled?: boolean;
}

export interface BuildCredentialsParams {
  serverURL: string;
  transactionID: string;
  userID: string;
  autoTake: boolean;
  invertedAnimation: boolean;
}

export function buildLivenessCredentials(
  params: BuildCredentialsParams,
): FaceRecognizerCredentials {
  return {
    serverURL: params.serverURL,
    transactionID: params.transactionID,
    userID: params.userID,
    autoTake: params.autoTake,
    errorDelay: 0.1,
    successDelay: 0.75,
    runInBackground: false,
    blinkDetectionEnabled: false,
    requestTimeout: 10,
    eyesOpenThreshold: 0.75,
    maskConfidence: 0.95,
    invertedAnimation: params.invertedAnimation,
    activeLivenessAutoNextEnabled: true,
  };
}

export type LivenessLaunchPlan =
  | {method: 'startFaceRecognitionRegistration'; args: [FaceRecognizerCredentials]}
  | {method: 'startActiveLiveness'; args: [FaceRecognizerCredentials, boolean]}
  | {method: 'startHybridLiveness'; args: [FaceRecognizerCredentials, boolean]};

// Resolves which native method a (phase, mode) pair maps to.
// Passive and hybrid are single-session: whatever the phase, they map to
// their one native call (registration mode, so the captured photo lands in
// the Face Registration module - findings 3.b/3.c).
// Active is two-session: register first (photo), then prove liveness for the
// SAME user as authentication (isAuthentication=true) so the photo-bearing
// registration is never overwritten (finding 3.b).
export function planLivenessLaunch(
  phase: LivenessPhase,
  mode: LivenessMode,
  creds: FaceRecognizerCredentials,
): LivenessLaunchPlan {
  if (mode === 'passive') {
    return {method: 'startFaceRecognitionRegistration', args: [creds]};
  }
  if (mode === 'hybrid') {
    return {method: 'startHybridLiveness', args: [creds, false]};
  }
  if (phase === 'faceCapture') {
    return {method: 'startFaceRecognitionRegistration', args: [creds]};
  }
  return {method: 'startActiveLiveness', args: [creds, true]};
}

export interface LivenessModuleLike {
  startFaceRecognitionRegistration(creds: FaceRecognizerCredentials): Promise<any>;
  startActiveLiveness(
    creds: FaceRecognizerCredentials,
    isAuthentication: boolean,
  ): Promise<any>;
  startHybridLiveness(
    creds: FaceRecognizerCredentials,
    isAuthentication: boolean,
  ): Promise<any>;
}

// Builds the credentials, resolves which native method the (phase, mode) maps
// to, and invokes it. Kept separate from the hook so the dispatch is
// unit-testable without a React renderer or a real native module.
export function dispatchLivenessLaunch(
  mod: LivenessModuleLike,
  params: BuildCredentialsParams & {phase: LivenessPhase; mode: LivenessMode},
): Promise<any> {
  const creds = buildLivenessCredentials(params);
  const plan = planLivenessLaunch(params.phase, params.mode, creds);
  console.log(
    'useLiveness - dispatch',
    params.phase,
    params.mode,
    '->',
    plan.method,
  );
  const fn = (mod as unknown as Record<string, (...a: any[]) => Promise<any>>)[
    plan.method
  ];
  return fn.apply(mod, plan.args);
}
