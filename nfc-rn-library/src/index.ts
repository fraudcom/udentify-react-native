import {NativeModules} from 'react-native';

const isTurboModuleEnabled = (global as any).__turboModuleProxy != null;

let NFCModule: any;

console.log('🚀 NFCLibrary - Loading started');
console.log('🔧 TurboModule enabled:', isTurboModuleEnabled);

try {
  if (isTurboModuleEnabled) {
    // TurboModule import
    const NativeNFCModule = require('./NativeNFCModule').default;
    NFCModule = NativeNFCModule;
    console.log('✅ NFCLibrary - TurboModule loaded successfully');
  } else {
    // Legacy fallback
    NFCModule = NativeModules.NFCModule;
    console.log('✅ NFCLibrary - Legacy module loaded successfully');
  }
} catch (error) {
  console.error('❌ NFCLibrary - Failed to load module:', error);
  // Fallback to legacy if TurboModule fails
  NFCModule = NativeModules.NFCModule;
  console.log('🔄 NFCLibrary - Falling back to legacy module');
}

console.log('🔧 TurboModule enabled:', isTurboModuleEnabled);
console.log('📦 NFCModule found:', !!NFCModule);

export interface NFCCredentials {
  // MRZ data required for NFC chip reading
  documentNumber: string;
  dateOfBirth: string; // Format: YYMMDD
  expiryDate: string; // Format: YYMMDD

  // Server configuration
  serverURL: string;
  transactionID: string;

  // Optional settings
  requestTimeout?: number; // Default: 10 seconds
  isActiveAuthenticationEnabled?: boolean; // Default: true
  isPassiveAuthenticationEnabled?: boolean; // Default: true
  enableAutoTriggering?: boolean; // Default: true (Android)
  logLevel?: 'warning' | 'info' | 'debug' | 'error'; // Default: 'warning'
}

/**
 * NFC Passport/ID Response interface based on Udentify SDK
 */
export interface NFCPassportResponse {
  success: boolean;
  transactionID: string;
  timestamp: number;

  // Passport/ID data
  firstName?: string;
  lastName?: string;
  documentNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
  expiryDate?: string;
  gender?: string;
  personalNumber?: string;
  placeOfBirth?: string;
  issuingAuthority?: string;

  // Authentication results
  passedPA?: 'disabled' | 'true' | 'false' | 'notSupported'; // Passive Authentication
  passedAA?: 'disabled' | 'true' | 'false' | 'notSupported'; // Active Authentication

  // Images
  faceImage?: string; // Base64 encoded
  signatureImage?: string; // Base64 encoded

  // Error information
  error?: string;
  message?: string;
}

/**
 * NFC Status Response interface
 */
export interface NFCStatusResponse {
  isAvailable: boolean;
  isEnabled: boolean;
  message?: string;
}

/**
 * NFC Location Response interface
 */
export interface NFCLocationResponse {
  success: boolean;
  location: NFCLocation;
  message?: string;
}

/**
 * NFC Location enum based on Udentify SDK
 */
export enum NFCLocation {
  unknown = 0,
  frontTop = 1,
  frontCenter = 2,
  frontBottom = 3,
  rearTop = 4,
  rearCenter = 5,
  rearBottom = 6,
}

// MARK: - NFC Functions

/**
 * Check if NFC is available on the device
 */
export async function isNFCAvailable(): Promise<boolean> {
  console.log('🔥 isNFCAvailable called with NFCModule:', !!NFCModule);

  if (!NFCModule) {
    console.error('NFCModule not available. Please ensure the native module is properly linked.');
    console.error('Available modules:', Object.keys(NativeModules));
    throw new Error('NFCModule not available. Please ensure the native module is properly linked.');
  }

  try {
    return await NFCModule.isNFCAvailable();
  } catch (error) {
    console.error('NFCModule - isNFCAvailable error:', error);
    return false;
  }
}

/**
 * Check if NFC is enabled on the device
 */
export async function isNFCEnabled(): Promise<boolean> {
  console.log('🔥 isNFCEnabled called with NFCModule:', !!NFCModule);

  if (!NFCModule) {
    console.error('NFCModule not available. Please ensure the native module is properly linked.');
    console.error('Available modules:', Object.keys(NativeModules));
    throw new Error('NFCModule not available. Please ensure the native module is properly linked.');
  }

  try {
    return await NFCModule.isNFCEnabled();
  } catch (error) {
    console.error('NFCModule - isNFCEnabled error:', error);
    return false;
  }
}

/**
 * Start NFC passport/ID reading with MRZ credentials
 */
export async function startNFCReading(
  credentials: NFCCredentials
): Promise<boolean> {
  console.log('🔥 startNFCReading called with NFCModule:', !!NFCModule);
  console.log('🔥 NFCModule type:', typeof NFCModule);
  console.log('🔥 NFCModule methods:', NFCModule ? Object.keys(NFCModule) : 'undefined');

  if (!NFCModule) {
    throw new Error('NFCModule not available. Please ensure the native module is properly linked.');
  }

  // Validate required MRZ credentials
  if (!credentials.documentNumber || !credentials.dateOfBirth || !credentials.expiryDate) {
    throw new Error('Document number, date of birth, and expiry date are required for NFC reading');
  }

  // Validate date formats (YYMMDD)
  const dateRegex = /^\d{6}$/;
  if (!dateRegex.test(credentials.dateOfBirth)) {
    throw new Error('Date of birth must be in YYMMDD format');
  }
  if (!dateRegex.test(credentials.expiryDate)) {
    throw new Error('Expiry date must be in YYMMDD format');
  }

  try {
    return await NFCModule.startNFCReading(credentials);
  } catch (error) {
    console.error('NFCModule - startNFCReading error:', error);
    return false;
  }
}

/**
 * Cancel ongoing NFC reading session
 */
export async function cancelNFCReading(): Promise<boolean> {
  try {
    return await NFCModule?.cancelNFCReading();
  } catch (error) {
    console.error('NFCModule - cancelNFCReading error:', error);
    return false;
  }
}

/**
 * Get NFC antenna location for current device
 */
export async function getNFCLocation(serverURL: string): Promise<NFCLocationResponse> {
  try {
    if (!serverURL) {
      throw new Error('Server URL is required for NFC location detection');
    }

    const result = await NFCModule?.getNFCLocation(serverURL);
    return result as NFCLocationResponse;
  } catch (error) {
    console.error('NFCModule - getNFCLocation error:', error);
    throw error;
  }
}

/**
 * Get NFC status (availability and enabled state)
 */
export async function getNFCStatus(): Promise<NFCStatusResponse> {
  try {
    const isAvailable = await isNFCAvailable();
    const isEnabled = await isNFCEnabled();

    return {
      isAvailable,
      isEnabled,
      message: isAvailable
        ? (isEnabled ? 'NFC is available and enabled' : 'NFC is available but disabled')
        : 'NFC is not available on this device',
    };
  } catch (error) {
    console.error('NFCModule - getNFCStatus error:', error);
    return {
      isAvailable: false,
      isEnabled: false,
      message: `Error checking NFC status: ${error}`,
    };
  }
}
