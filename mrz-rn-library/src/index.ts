import {NativeModules, NativeEventEmitter} from 'react-native';

const isTurboModuleEnabled = (global as any).__turboModuleProxy != null;

let MRZModule: any;
let eventEmitter: NativeEventEmitter | null = null;

console.log('🚀 MRZLibrary - Loading started');
console.log('🔧 TurboModule enabled:', isTurboModuleEnabled);

try {
  if (isTurboModuleEnabled) {
    // TurboModule import
    const NativeMRZModule = require('./NativeMRZModule').default;
    MRZModule = NativeMRZModule;
    console.log('✅ MRZLibrary - TurboModule loaded successfully');
  } else {
    // Legacy fallback
    MRZModule = NativeModules.MRZModule;
    console.log('✅ MRZLibrary - Legacy module loaded successfully');
  }
  
  // Set up event emitter for progress updates
  if (MRZModule) {
    eventEmitter = new NativeEventEmitter(MRZModule);
  }
} catch (error) {
  console.error('❌ MRZLibrary - Failed to load module:', error);
  // Fallback to legacy if TurboModule fails
  MRZModule = NativeModules.MRZModule;
  if (MRZModule) {
    eventEmitter = new NativeEventEmitter(MRZModule);
  }
  console.log('🔄 MRZLibrary - Falling back to legacy module');
}

console.log('🔧 TurboModule enabled:', isTurboModuleEnabled);
console.log('📦 MRZModule found:', !!MRZModule);

// MARK: - MRZ Types and Interfaces

// Removed fake MrzReaderMode enum - modes don't actually exist in the SDK

/**
 * Complete MRZ data extracted from document
 */
export interface MrzData {
  /** Document type (P for passport, I for ID card, etc.) */
  documentType: string;
  /** Country code that issued the document (3 letters) */
  issuingCountry: string;
  /** Document/passport number */
  documentNumber: string;
  /** Optional data field 1 */
  optionalData1?: string;
  /** Date of birth in YYMMDD format */
  dateOfBirth: string;
  /** Gender (M/F/X) */
  gender: string;
  /** Expiration date in YYMMDD format */
  dateOfExpiration: string;
  /** Nationality code (3 letters) */
  nationality: string;
  /** Optional data field 2 */
  optionalData2?: string;
  /** Family name/surname */
  surname: string;
  /** Given names/first names */
  givenNames: string;
}

/**
 * BAC (Basic Access Control) credentials needed for NFC chip reading
 */
export interface BACCredentials {
  /** Document number */
  documentNumber: string;
  /** Date of birth (YYMMDD) */
  dateOfBirth: string;
  /** Expiration date (YYMMDD) */
  dateOfExpiration: string;
}

/**
 * MRZ scanning result
 */
export interface MrzResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Complete MRZ data extracted from document */
  mrzData?: MrzData;
  /** Error message if failed */
  errorMessage?: string;
  /** BAC credentials for NFC reading (derived from MRZ data) */
  bacCredentials?: BACCredentials;
  
  // Legacy properties for backward compatibility
  /** @deprecated Use mrzData.documentNumber instead */
  documentNumber?: string;
  /** @deprecated Use mrzData.dateOfBirth instead */
  dateOfBirth?: string;
  /** @deprecated Use mrzData.dateOfExpiration instead */
  dateOfExpiration?: string;
}

/**
 * MRZ Error types
 */
export enum MrzErrorType {
  MRZ_NOT_FOUND = 'ERR_MRZ_NOT_FOUND',
  INVALID_DATE_OF_BIRTH = 'ERR_INVALID_DATE_OF_BIRTH',
  INVALID_DATE_OF_BIRTH_SIZE = 'ERR_INVALID_DATE_OF_BIRTH_SIZE',
  INVALID_DATE_OF_EXPIRE = 'ERR_INVALID_DATE_OF_EXPIRE',
  INVALID_DATE_OF_EXPIRE_SIZE = 'ERR_INVALID_DATE_OF_EXPIRE_SIZE',
  INVALID_DOC_NO = 'ERR_INVALID_DOC_NO',
  CAMERA_ERROR = 'CAMERA_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SDK_NOT_AVAILABLE = 'SDK_NOT_AVAILABLE',
  USER_CANCELLED = 'USER_CANCELLED',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Progress callback function type
 */
export type MrzProgressCallback = (progress: number) => void;

/**
 * UI customization options for MRZ scanning
 */
export interface MrzUICustomization {
  /** Focus view border color (hex code, e.g., "#007AFF") */
  focusViewBorderColor?: string;
  /** Focus view stroke width (1-10) */
  focusViewStrokeWidth?: number;
  /** Custom instruction text */
  instructionText?: string;
  /** Instruction text color (hex code) */
  instructionTextColor?: string;
  /** Show/hide cancel button */
  showCancelButton?: boolean;
  /** Custom cancel button text */
  cancelButtonText?: string;
  /** Cancel button color (hex code) */
  cancelButtonColor?: string;
}

// MARK: - MRZ Functions

/**
 * Check if camera permissions are granted
 * @returns Promise<boolean> - true if permissions are granted
 */
export async function checkPermissions(): Promise<boolean> {
  console.log('🔒 Checking camera permissions');
  
  if (!MRZModule) {
    throw new Error('MRZModule not available. Please ensure the native module is properly linked.');
  }
  
  try {
    const result = await MRZModule.checkPermissions();
    console.log('🔒 Camera permissions:', result ? 'granted' : 'denied');
    return result;
  } catch (error) {
    console.error('MRZModule - checkPermissions error:', error);
    return false;
  }
}

/**
 * Request camera permissions
 * @returns Promise<string> - permission status ('granted', 'denied', 'requested')
 */
export async function requestPermissions(): Promise<string> {
  console.log('🔒 Requesting camera permissions');
  
  if (!MRZModule) {
    throw new Error('MRZModule not available. Please ensure the native module is properly linked.');
  }
  
  try {
    const result = await MRZModule.requestPermissions();
    console.log('🔒 Permission request result:', result);
    return result;
  } catch (error) {
    console.error('MRZModule - requestPermissions error:', error);
    return 'denied';
  }
}

/**
 * Start MRZ camera scanning
 * @param onProgress - Optional callback for progress updates (0-100)
 * @param customization - Optional UI customization options
 * @returns Promise<MrzResult> - MRZ scanning result
 */
export async function startMrzCamera(
  onProgress?: MrzProgressCallback,
  customization?: MrzUICustomization
): Promise<MrzResult> {
  console.log('📷 Starting MRZ camera scanning');
  
  if (!MRZModule) {
    throw new Error('MRZModule not available. Please ensure the native module is properly linked.');
  }
  
  // Set up progress listener if callback provided
  let progressSubscription: any = null;
  if (onProgress && eventEmitter) {
    progressSubscription = eventEmitter.addListener('onMrzProgress', (progress: number) => {
      onProgress(progress);
    });
  }
  
  try {
    const result = await MRZModule.startMrzCamera(customization);
    
    // Process the result to include BAC credentials
    if (result.success && result.mrzData) {
      result.bacCredentials = {
        documentNumber: result.mrzData.documentNumber,
        dateOfBirth: result.mrzData.dateOfBirth,
        dateOfExpiration: result.mrzData.dateOfExpiration
      };
      
      // Add legacy fields for backward compatibility
      result.documentNumber = result.mrzData.documentNumber;
      result.dateOfBirth = result.mrzData.dateOfBirth;
      result.dateOfExpiration = result.mrzData.dateOfExpiration;
    }
    
    console.log('📷 MRZ camera result:', result.success ? 'success' : `failed: ${result.errorMessage}`);
    return result;
  } catch (error) {
    console.error('MRZModule - startMrzCamera error:', error);
    return {
      success: false,
      errorMessage: `Failed to start MRZ camera: ${error}`
    };
  } finally {
    // Clean up progress listener
    if (progressSubscription) {
      progressSubscription.remove();
    }
  }
}

/**
 * Process MRZ from a provided image (Base64 encoded)
 * @param imageBase64 - Base64 encoded image data
 * @returns Promise<MrzResult> - MRZ processing result
 */
export async function processMrzImage(
  imageBase64: string
): Promise<MrzResult> {
  console.log('🖼️ Processing MRZ from image');
  
  if (!MRZModule) {
    throw new Error('MRZModule not available. Please ensure the native module is properly linked.');
  }
  
  if (!imageBase64) {
    return {
      success: false,
      errorMessage: 'Image data is required'
    };
  }
  
  try {
    const result = await MRZModule.processMrzImage(imageBase64);
    
    // Process the result to include BAC credentials
    if (result.success && result.mrzData) {
      result.bacCredentials = {
        documentNumber: result.mrzData.documentNumber,
        dateOfBirth: result.mrzData.dateOfBirth,
        dateOfExpiration: result.mrzData.dateOfExpiration
      };
      
      // Add legacy fields for backward compatibility
      result.documentNumber = result.mrzData.documentNumber;
      result.dateOfBirth = result.mrzData.dateOfBirth;
      result.dateOfExpiration = result.mrzData.dateOfExpiration;
    }
    
    console.log('🖼️ MRZ image processing result:', result.success ? 'success' : `failed: ${result.errorMessage}`);
    return result;
  } catch (error) {
    console.error('MRZModule - processMrzImage error:', error);
    return {
      success: false,
      errorMessage: `Failed to process MRZ image: ${error}`
    };
  }
}

/**
 * Cancel ongoing MRZ scanning
 * @returns Promise<void>
 */
export async function cancelMrzScanning(): Promise<void> {
  console.log('🛑 Cancelling MRZ scanning');
  
  if (!MRZModule) {
    throw new Error('MRZModule not available. Please ensure the native module is properly linked.');
  }
  
  try {
    await MRZModule.cancelMrzScanning();
    console.log('🛑 MRZ scanning cancelled successfully');
  } catch (error) {
    console.error('MRZModule - cancelMrzScanning error:', error);
    throw error;
  }
}

/**
 * Utility function to get full name from MRZ data
 * @param mrzData - MRZ data object
 * @returns Full name (given names + surname)
 */
export function getFullName(mrzData: MrzData): string {
  return `${mrzData.givenNames} ${mrzData.surname}`.trim();
}

/**
 * Utility function to format date from YYMMDD to readable format
 * @param dateString - Date in YYMMDD format
 * @param format - Output format ('DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD')
 * @returns Formatted date string
 */
export function formatMrzDate(
  dateString: string,
  format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY'
): string {
  if (!dateString || dateString.length !== 6) {
    return dateString;
  }
  
  const year = parseInt(dateString.substring(0, 2));
  const month = dateString.substring(2, 4);
  const day = dateString.substring(4, 6);
  
  // Convert 2-digit year to 4-digit year
  // Assume years 00-30 are 2000-2030, 31-99 are 1931-1999
  const fullYear = year <= 30 ? 2000 + year : 1900 + year;
  
  switch (format) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${fullYear}`;
    case 'YYYY-MM-DD':
      return `${fullYear}-${month}-${day}`;
    case 'DD/MM/YYYY':
    default:
      return `${day}/${month}/${fullYear}`;
  }
}

/**
 * Utility function to validate MRZ data completeness
 * @param mrzData - MRZ data object
 * @returns Array of missing required fields
 */
export function validateMrzData(mrzData: MrzData): string[] {
  const missingFields: string[] = [];
  
  if (!mrzData.documentNumber) missingFields.push('documentNumber');
  if (!mrzData.dateOfBirth) missingFields.push('dateOfBirth');
  if (!mrzData.dateOfExpiration) missingFields.push('dateOfExpiration');
  if (!mrzData.surname) missingFields.push('surname');
  if (!mrzData.givenNames) missingFields.push('givenNames');
  if (!mrzData.nationality) missingFields.push('nationality');
  
  return missingFields;
}

// Export types and enums
export {MrzErrorType};
export type {MrzData, BACCredentials, MrzResult, MrzProgressCallback, MrzUICustomization};
