import {Platform} from 'react-native';
import {OCRModule} from '../utils/moduleLoader';

export interface OCRRepeatConfig {
  serverURL: string;
  userID: string;
  transactionID: string;
  /** ISO country or Udentify country code. Defaults to `'TUR'`. */
  country?: string;
  /** `'ID_CARD'` (default), `'PASSPORT'` or `'DRIVER_LICENSE'`. */
  documentType?: string;
  /**
   * The side a repeat starts with: `'FRONT'` or `'BACK'`. Omitted, it starts with the
   * front. A non-passport redo captures both sides either way.
   */
  documentSide?: 'FRONT' | 'BACK';
  /** Passed through to the native SDK's card-orientation handling. */
  cardOrientation?: boolean;
}

/**
 * Opts this app into in-call OCR re-captures — the "repeat" flow, where the
 * video call operator asks the customer to redo a capture without leaving the
 * call — and supplies the credentials one would use.
 * **Android only, and off by default.** Until this is called, the video call SDK
 */
export async function setRepeatConfig(
  config: OCRRepeatConfig | null
): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  try {
    if (!OCRModule) {
      throw new Error('OCRModule not available. Please ensure the native module is properly linked.');
    }
    return await OCRModule.setRepeatConfig(config);
  } catch (error) {
    console.warn('OCRModule - setRepeatConfig error:', error);
    throw error;
  }
}

export interface HologramRepeatConfig {
  serverURL: string;
  userID: string;
  transactionID: string;
  /** ISO country or Udentify country code. Defaults to `'TUR'`. */
  country?: string;
  /** Passed through to the native SDK's card-orientation handling. */
  cardOrientation?: boolean;
  /** Seconds recorded without the flash. SDK default `2`. Whole seconds on Android. */
  hologramNoFlashDuration?: number;
  /** Seconds recorded with the flash on. SDK default `3`. Whole seconds on Android. */
  hologramFlashDuration?: number;
  /** Total recording length in seconds. SDK default `5`. Whole seconds on Android. */
  hologramTotalDuration?: number;
  /** Video bitrate, in the native SDK's own unit; the SDK chooses one when omitted. */
  hologramBitrate?: number;
  /** Seconds before the upload times out. SDK default `30`. Whole seconds on Android. */
  hologramRequestTimeout?: number;
}

/**
 * Android only, off by default: opts into in-call hologram re-captures, separately from the
 * OCR redo; the `hologram*` fields are named as in iOS's `liveKYCOptions`. Pass `null` to opt
 * out. A rejected call leaves the redo opted out. Resolves `false` on iOS (use `liveKYCOptions`).
 */
export async function setHologramRepeatConfig(
  config: HologramRepeatConfig | null
): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  try {
    if (!OCRModule) {
      throw new Error('OCRModule not available. Please ensure the native module is properly linked.');
    }
    return await OCRModule.setHologramRepeatConfig(config);
  } catch (error) {
    console.warn('OCRModule - setHologramRepeatConfig error:', error);
    throw error;
  }
}
