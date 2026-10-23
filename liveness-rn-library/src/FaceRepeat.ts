import {Platform} from 'react-native';
import NativeLivenessModule from './NativeLivenessModule';

export interface FaceRepeatConfig {
  serverURL: string;
  userID: string;
  transactionID: string;
  /**
   * Which face flow a repeat runs: `'ActiveLiveness'`, `'HybridLiveness'`,
   * `'Register'`, `'Authentication'`, `'Selfie'`, `'PhotoUpload'` or
   * `'Identification'`. Omitted, the native SDK picks its own default.
   */
  method?:
    | 'Register'
    | 'Authentication'
    | 'ActiveLiveness'
    | 'HybridLiveness'
    | 'Selfie'
    | 'PhotoUpload'
    | 'Identification';
  /**
   * `true` to authenticate an existing user, `false` to register a new one.
   * Only consulted for the two liveness methods; ignored for the photo-based
   * ones.
   * Getting this wrong does not fail loudly — it silently runs the capture
   */
  isAuthenticate?: boolean;
  /**
   * Opacity of the backdrop drawn over the camera preview during an
   * active-liveness capture, `0`–`1`. Defaults to `1` (opaque, hiding the
   * preview); pass `0` to show the camera. Android only.
   */
  activeLivenessOpacity?: number;
  /**
   * Whether the face SDK runs without owning the Activity. Defaults to `true`
   * for a repeat — the opposite of the standard face flow. Omit unless you have
   * a specific reason. Android only.
   */
  runInBackground?: boolean;
}

/**
 * Opts this app into in-call face re-captures — the "repeat" flow, where the
 * video call operator asks the customer to redo a capture without leaving the
 * call — and supplies the credentials one would use.
 * **Android only, and off by default.** Until this is called, the video call SDK
 */
export async function setRepeatConfig(
  config: FaceRepeatConfig | null
): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  try {
    return await NativeLivenessModule.setRepeatConfig(config);
  } catch (error) {
    console.warn('LivenessModule - setRepeatConfig error:', error);
    throw error;
  }
}
