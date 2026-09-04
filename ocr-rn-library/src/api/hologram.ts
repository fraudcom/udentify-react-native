import {OCRModule} from '../utils/moduleLoader';
import type {HologramResponse} from '../types/hologram.types';

export async function startHologramCamera(
  serverURL: string,
  transactionID: string
): Promise<boolean> {
  try {
    return await OCRModule?.startHologramCamera(
      serverURL,
      transactionID
    );
  } catch (error) {
    console.warn('OCRModule - startHologramCamera error:', error);
    return false;
  }
}

export async function performHologramCheck(
  serverURL: string,
  transactionID: string,
  videoUrls: string[]
): Promise<HologramResponse> {
  try {
    return await OCRModule?.performHologramCheck(
      serverURL,
      transactionID,
      videoUrls
    );
  } catch (error) {
    console.warn('OCRModule - performHologramCheck error:', error);
    throw error;
  }
}

