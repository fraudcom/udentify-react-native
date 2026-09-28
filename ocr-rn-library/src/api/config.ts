import {OCRModule} from '../utils/moduleLoader';
import type {OCRUIConfiguration} from '../types/ui.types';

export async function configureUISettings(
  uiConfig: OCRUIConfiguration
): Promise<boolean> {
  try {
    console.log('📱 Configuring OCR UI settings:', uiConfig);
    
    if (!OCRModule) {
      throw new Error('OCRModule not available. Please ensure the native module is properly linked.');
    }
    
    return await OCRModule.configureUISettings(uiConfig);
  } catch (error) {
    console.warn('OCRModule - configureUISettings error:', error);
    throw error;
  }
}

