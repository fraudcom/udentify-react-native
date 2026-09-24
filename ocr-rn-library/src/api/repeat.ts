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
   * Which side a repeat re-scans: `'FRONT'` or `'BACK'`. Omitted, the native SDK
   * always re-scans the front — so set it if the operator can ask for a
   * back-side redo.
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
