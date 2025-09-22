import {NativeModules} from 'react-native';

const isTurboModuleEnabled = (global as any).__turboModuleProxy != null;

let OCRModule: any;

console.log('🚀 OCRLibrary - Loading started');
console.log('🔧 TurboModule enabled:', isTurboModuleEnabled);

try {
  if (isTurboModuleEnabled) {
    // TurboModule import
    const NativeOCRModule = require('./NativeOCRModule').default;
    OCRModule = NativeOCRModule;
    console.log('✅ OCRLibrary - TurboModule loaded successfully');
  } else {
    // Legacy fallback
    OCRModule = NativeModules.OCRModule;
    console.log('✅ OCRLibrary - Legacy module loaded successfully');
  }
} catch (error) {
  console.error('❌ OCRLibrary - Failed to load module:', error);
  // Fallback to legacy if TurboModule fails
  OCRModule = NativeModules.OCRModule;
  console.log('🔄 OCRLibrary - Falling back to legacy module');
}

console.log('🔧 TurboModule enabled:', isTurboModuleEnabled);
console.log('📦 OCRModule found:', !!OCRModule);

// MARK: - OCR Functions

/**
 * Document types supported by OCR
 */
export const DocumentType = {
  ID_CARD: 'ID_CARD',
  PASSPORT: 'PASSPORT',
  DRIVER_LICENSE: 'DRIVER_LICENSE',
} as const;

/**
 * Document sides for scanning
 */
export const DocumentSide = {
  FRONT: 'FRONT',
  BACK: 'BACK',
  BOTH: 'BOTH',
} as const;

export type DocumentTypeValue = typeof DocumentType[keyof typeof DocumentType];
export type DocumentSideValue = typeof DocumentSide[keyof typeof DocumentSide];

/**
 * OCR UI Configuration options
 * Based on iOS OCRConfigs parameters from Udentify OCR SDK
 */
export interface OCRUIConfiguration {
  // Placeholder settings
  placeholderTemplate?: 'hidden' | 'defaultStyle' | 'countrySpecificStyle';
  orientation?: 'horizontal' | 'vertical';
  
  // Visual styling
  backgroundColor?: string;
  borderColor?: string;
  cornerRadius?: number;
  borderWidth?: number;
  maskLayerColor?: string;
  buttonBackColor?: string;
  
  // Behavior settings
  detectionAccuracy?: number; // 0-200
  blurCoefficient?: number; // -1 to 1
  requestTimeout?: number; // seconds
  backButtonEnabled?: boolean;
  reviewScreenEnabled?: boolean;
  footerViewHidden?: boolean;
  
  // Button styles (simplified)
  footerBackgroundColor?: string;
  footerTextColor?: string;
  footerFontSize?: number;
  footerHeight?: number;
  
  useButtonBackgroundColor?: string;
  useButtonTextColor?: string;
  useButtonFontSize?: number;
  useButtonHeight?: number;
  
  retakeButtonBackgroundColor?: string;
  retakeButtonTextColor?: string;
  retakeButtonFontSize?: number;
  retakeButtonHeight?: number;
  
  // Text styles
  titleTextColor?: string;
  titleFontSize?: number;
  instructionTextColor?: string;
  instructionFontSize?: number;
  reviewTitleTextColor?: string;
  reviewTitleFontSize?: number;
  reviewInstructionTextColor?: string;
  reviewInstructionFontSize?: number;
  
  // Progress bar (for hologram)
  progressBackgroundColor?: string;
  progressColor?: string;
  progressCompletionColor?: string;
  progressCornerRadius?: number;
  progressTextColor?: string;
  progressFontSize?: number;
  
  // Localization
  tableName?: string;
}

/**
 * OCR Response interface
 */
export interface OCRResponse {
  success: boolean;
  transactionID: string;
  documentType: string;
  extractedData: {
    firstName?: string;
    lastName?: string;
    documentNumber?: string;
    expiryDate?: string;
    birthDate?: string;
    nationality?: string;
    licenseType?: string;
  };
  message: string;
  timestamp: number;
}

/**
 * Document Liveness Response interface
 */
export interface DocumentLivenessResponse {
  success: boolean;
  livenessScore: number;
  isLive: boolean;
  frontSideProbability: number;
  backSideProbability: number;
  message: string;
  timestamp: number;
}

/**
 * Combined OCR and Document Liveness Response interface
 */
export interface OCRAndDocumentLivenessResponse {
  success: boolean;
  transactionID: string;
  timestamp: number;
  
  // OCR data (when available)
  ocrData?: OCRResponse;
  
  // Document liveness data
  frontSideProbability?: number;
  backSideProbability?: number;
  frontSideResults?: Array<{
    name: string;
    probability: number;
    calibration: string;
  }>;
  backSideResults?: Array<{
    name: string;
    probability: number;
    calibration: string;
  }>;
}

/**
 * Hologram Response interface
 */
export interface HologramResponse {
  success: boolean;
  transactionID: string;
  idNumber: string;
  hologramExists: boolean;
  ocrIdAndHologramIdMatch: boolean;
  ocrFaceAndHologramFaceMatch: boolean;
  hologramFaceImageBase64?: string;
  error?: string;
  timestamp: number;
}

/**
 * Start OCR scanning with camera
 */
export async function startOCRScanning(
  serverURL: string,
  transactionID: string,
  documentType: DocumentTypeValue,
  documentSide: DocumentSideValue
): Promise<boolean> {
  console.log('🔥 startOCRScanning called with OCRModule:', !!OCRModule);
  console.log('🔥 OCRModule type:', typeof OCRModule);
  console.log('🔥 OCRModule methods:', OCRModule ? Object.keys(OCRModule) : 'undefined');
  
  if (!OCRModule) {
    throw new Error('OCRModule not available. Please ensure the native module is properly linked.');
  }
  
  try {
    return await OCRModule.startOCRScanning(
      serverURL,
      transactionID,
      documentType,
      documentSide
    );
  } catch (error) {
    console.error('OCRModule - startOCRScanning error:', error);
    return false;
  }
}

/**
 * Perform OCR on document images
 */
export async function performOCR(
  serverURL: string,
  transactionID: string,
  frontSideImage: string,
  backSideImage: string,
  documentType: DocumentTypeValue
): Promise<OCRResponse> {
  try {
    return await OCRModule?.performOCR(
      serverURL,
      transactionID,
      frontSideImage,
      backSideImage,
      documentType
    );
  } catch (error) {
    console.error('OCRModule - performOCR error:', error);
    throw error;
  }
}

/**
 * Perform document liveness check
 */
export async function performDocumentLiveness(
  serverURL: string,
  transactionID: string,
  frontSideImage: string,
  backSideImage: string
): Promise<DocumentLivenessResponse> {
  try {
    return await OCRModule?.performDocumentLiveness(
      serverURL,
      transactionID,
      frontSideImage,
      backSideImage
    );
  } catch (error) {
    console.error('OCRModule - performDocumentLiveness error:', error);
    throw error;
  }
}

/**
 * Perform OCR and document liveness check in a single operation
 */
export async function performOCRAndDocumentLiveness(
  serverURL: string,
  transactionID: string,
  frontSideImage: string,
  backSideImage: string,
  documentType: DocumentTypeValue
): Promise<OCRAndDocumentLivenessResponse> {
  try {
    return await OCRModule?.performOCRAndDocumentLiveness(
      serverURL,
      transactionID,
      frontSideImage,
      backSideImage,
      documentType
    );
  } catch (error) {
    console.error('OCRModule - performOCRAndDocumentLiveness error:', error);
    throw error;
  }
}

/**
 * Start hologram camera for video recording
 */
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
    console.error('OCRModule - startHologramCamera error:', error);
    return false;
  }
}

/**
 * Perform hologram check on recorded videos
 */
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
    console.error('OCRModule - performHologramCheck error:', error);
    throw error;
  }
}

/**
 * Configure UI settings for OCR camera
 * This method should be called before starting OCR scanning to apply custom UI settings
 */
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
    console.error('OCRModule - configureUISettings error:', error);
    throw error;
  }
}
