import {NativeModules} from 'react-native';

const isTurboModuleEnabled = (global as any).__turboModuleProxy != null;

let SSLPinningModule: any;
let LocalizationModule: any;

console.log('UdentifyCore - Loading modules');
console.log('UdentifyCore - TurboModule enabled:', isTurboModuleEnabled);

try {
  if (isTurboModuleEnabled) {
    // TurboModule imports
    const NativeSSLPinningModule = require('./NativeSSLPinningModule').default;
    const NativeLocalizationModule = require('./NativeLocalizationModule').default;
    SSLPinningModule = NativeSSLPinningModule;
    LocalizationModule = NativeLocalizationModule;
    console.log('UdentifyCore - TurboModules loaded successfully');
  } else {
    // Legacy fallback
    SSLPinningModule = NativeModules.SSLPinningModule;
    LocalizationModule = NativeModules.LocalizationModule;
    console.log('UdentifyCore - Legacy modules loaded successfully');
  }
} catch (error) {
  console.warn('UdentifyCore - Failed to load modules:', error);
  // Fallback to legacy if TurboModule fails
  SSLPinningModule = NativeModules.SSLPinningModule;
  LocalizationModule = NativeModules.LocalizationModule;
  console.log('UdentifyCore - Falling back to legacy modules');
}

if (!SSLPinningModule) {
  console.warn('UdentifyCore - SSL Pinning module not available');
}

if (!LocalizationModule) {
  console.warn('UdentifyCore - Localization module not available');
}

// MARK: - SSL Pinning Functions

/**
 * Load a certificate from the app bundle (iOS) or assets folder (Android)
 * and automatically set it for SSL pinning.
 * 
 * The certificate must be in DER format with .cer or .der extension.
 * 
 * @param certificateName - Name of the certificate file without extension (e.g., 'MyServerCertificate')
 * @param extension - File extension, typically 'cer' or 'der'
 * @returns Promise resolving to true if certificate was loaded and set successfully
 * 
 * @example
 * ```typescript
 * await loadCertificateFromAssets('MyServerCertificate', 'cer');
 * ```
 */
export async function loadCertificateFromAssets(
  certificateName: string,
  extension: string
): Promise<boolean> {
  console.log('UdentifyCore - loadCertificateFromAssets called');
  
  if (!SSLPinningModule) {
    throw new Error('SSL Pinning module not available. Please ensure the native module is properly linked.');
  }
  
  try {
    const result = await SSLPinningModule.loadCertificateFromAssets(
      certificateName,
      extension
    );
    console.log('UdentifyCore - Certificate loaded successfully');
    return result;
  } catch (error) {
    console.warn('UdentifyCore - Failed to load certificate:', error);
    throw error;
  }
}

/**
 * Set SSL certificate using base64 encoded certificate data.
 * The certificate must be in DER format.
 * 
 * @param certificateBase64 - Base64 encoded certificate data
 * @returns Promise resolving to true if certificate was set successfully
 * 
 * @example
 * ```typescript
 * await setSSLCertificateBase64(base64EncodedCertificate);
 * ```
 */
export async function setSSLCertificateBase64(
  certificateBase64: string
): Promise<boolean> {
  console.log('UdentifyCore - setSSLCertificateBase64 called');
  
  if (!SSLPinningModule) {
    throw new Error('SSL Pinning module not available. Please ensure the native module is properly linked.');
  }
  
  try {
    const result = await SSLPinningModule.setSSLCertificateBase64(certificateBase64);
    console.log('UdentifyCore - SSL certificate set successfully');
    return result;
  } catch (error) {
    console.warn('UdentifyCore - Failed to set SSL certificate:', error);
    throw error;
  }
}

/**
 * Remove the currently set SSL certificate, disabling SSL pinning.
 * 
 * @returns Promise resolving to true if certificate was removed successfully
 * 
 * @example
 * ```typescript
 * await removeSSLCertificate();
 * ```
 */
export async function removeSSLCertificate(): Promise<boolean> {
  console.log('UdentifyCore - removeSSLCertificate called');
  
  if (!SSLPinningModule) {
    throw new Error('SSL Pinning module not available. Please ensure the native module is properly linked.');
  }
  
  try {
    const result = await SSLPinningModule.removeSSLCertificate();
    console.log('UdentifyCore - SSL certificate removed successfully');
    return result;
  } catch (error) {
    console.warn('UdentifyCore - Failed to remove SSL certificate:', error);
    throw error;
  }
}

/**
 * Get the currently set SSL certificate as a base64 encoded string.
 * 
 * @returns Promise resolving to base64 string or null if no certificate is set
 * 
 * @example
 * ```typescript
 * const cert = await getSSLCertificateBase64();
 * if (cert) {
 *   console.log('Certificate is set');
 * }
 * ```
 */
export async function getSSLCertificateBase64(): Promise<string | null> {
  console.log('UdentifyCore - getSSLCertificateBase64 called');
  
  if (!SSLPinningModule) {
    throw new Error('SSL Pinning module not available. Please ensure the native module is properly linked.');
  }
  
  try {
    const result = await SSLPinningModule.getSSLCertificateBase64();
    console.log('UdentifyCore - Retrieved SSL certificate');
    return result;
  } catch (error) {
    console.warn('UdentifyCore - Failed to get SSL certificate:', error);
    throw error;
  }
}

/**
 * Check if SSL pinning is currently enabled.
 * 
 * @returns Promise resolving to true if SSL pinning is enabled
 * 
 * @example
 * ```typescript
 * const isEnabled = await isSSLPinningEnabled();
 * console.log('SSL Pinning enabled:', isEnabled);
 * ```
 */
export async function isSSLPinningEnabled(): Promise<boolean> {
  console.log('UdentifyCore - isSSLPinningEnabled called');
  
  if (!SSLPinningModule) {
    throw new Error('SSL Pinning module not available. Please ensure the native module is properly linked.');
  }
  
  try {
    const result = await SSLPinningModule.isSSLPinningEnabled();
    console.log('UdentifyCore - SSL pinning enabled:', result);
    return result;
  } catch (error) {
    console.warn('UdentifyCore - Failed to check SSL pinning status:', error);
    throw error;
  }
}

// MARK: - Transaction Properties (26.1.3)

/**
 * Fetch and cache the transaction properties (e.g. `U18`) for a transaction so that
 * subsequent Udentify SDK flows (OCR, liveness, etc.) honour them.
 *
 * Call this after obtaining the transaction ID and before starting a flow.
 *
 * @param serverURL - URL of the Udentify API Server
 * @param transactionID - Transaction ID received from the Udentify API Server
 * @returns Promise resolving to the list of property names (e.g. `['U18']`), or null if none
 *
 * @example
 * ```typescript
 * const properties = await fetchTransactionProperties(serverUrl, transactionId);
 * console.log('Transaction properties:', properties); // ['U18']
 * ```
 */
export async function fetchTransactionProperties(
  serverURL: string,
  transactionID: string
): Promise<string[] | null> {
  console.log('UdentifyCore - fetchTransactionProperties called');

  if (!SSLPinningModule) {
    throw new Error('Udentify core module not available. Please ensure the native module is properly linked.');
  }

  try {
    const result = await SSLPinningModule.fetchTransactionProperties(serverURL, transactionID);
    console.log('UdentifyCore - Transaction properties fetched:', result);
    return result;
  } catch (error) {
    console.warn('UdentifyCore - Failed to fetch transaction properties:', error);
    throw error;
  }
}

/**
 * Clear any cached transaction properties.
 *
 * @returns Promise resolving when the cached properties have been cleared
 *
 * @example
 * ```typescript
 * await resetTransactionProperties();
 * ```
 */
export async function resetTransactionProperties(): Promise<void> {
  console.log('UdentifyCore - resetTransactionProperties called');

  if (!SSLPinningModule) {
    throw new Error('Udentify core module not available. Please ensure the native module is properly linked.');
  }

  try {
    await SSLPinningModule.resetTransactionProperties();
    console.log('UdentifyCore - Transaction properties reset');
  } catch (error) {
    console.warn('UdentifyCore - Failed to reset transaction properties:', error);
    throw error;
  }
}

/**
 * Set a subpath appended to the device-info endpoint the SDK reports to.
 *
 * @param subPath - Subpath string, or null to clear it
 * @returns Promise resolving when the subpath has been set
 *
 * @example
 * ```typescript
 * await setDeviceInfoSubPath('/my-subpath');
 * ```
 */
export async function setDeviceInfoSubPath(subPath: string | null): Promise<void> {
  console.log('UdentifyCore - setDeviceInfoSubPath called:', subPath);

  if (!SSLPinningModule) {
    throw new Error('Udentify core module not available. Please ensure the native module is properly linked.');
  }

  try {
    await SSLPinningModule.setDeviceInfoSubPath(subPath);
    console.log('UdentifyCore - Device info subpath set');
  } catch (error) {
    console.warn('UdentifyCore - Failed to set device info subpath:', error);
    throw error;
  }
}

/**
 * Read back the device-info subpath currently set on the SDK.
 *
 * @returns Promise resolving to the current subpath, or null if unset
 *
 * @example
 * ```typescript
 * const subPath = await getDeviceInfoSubPath();
 * ```
 */
export async function getDeviceInfoSubPath(): Promise<string | null> {
  console.log('UdentifyCore - getDeviceInfoSubPath called');

  if (!SSLPinningModule) {
    throw new Error('Udentify core module not available. Please ensure the native module is properly linked.');
  }

  try {
    const subPath = await SSLPinningModule.getDeviceInfoSubPath();
    console.log('UdentifyCore - Device info subpath:', subPath);
    return subPath;
  } catch (error) {
    console.warn('UdentifyCore - Failed to get device info subpath:', error);
    throw error;
  }
}

// MARK: - Remote Language Pack Functions

/**
 * Instantiate server-based localization by downloading the localization file from the server.
 * This should be called before using any Udentify modules to ensure localization is available.
 * 
 * @param language - Language code (e.g., 'EN', 'FR', 'TR', 'DE', 'ES', 'IT', 'PT', 'RU', 'AR', 'ZH', 'JA', 'KO')
 * @param serverUrl - URL of the Udentify API Server where the localization file is hosted
 * @param transactionId - Transaction ID received from Udentify API Server
 * @param requestTimeout - Timeout duration for the network request in seconds (default: 30)
 * @returns Promise resolving when localization is instantiated
 * 
 * @example
 * ```typescript
 * const language = await mapSystemLanguageToEnum() || 'EN';
 * await instantiateServerBasedLocalization(language, serverUrl, transactionId);
 * ```
 */
export async function instantiateServerBasedLocalization(
  language: string,
  serverUrl: string,
  transactionId: string,
  requestTimeout: number = 30
): Promise<void> {
  console.log('UdentifyCore - instantiateServerBasedLocalization called');
  
  if (!LocalizationModule) {
    throw new Error('Localization module not available. Please ensure the native module is properly linked.');
  }
  
  try {
    await LocalizationModule.instantiateServerBasedLocalization(
      language,
      serverUrl,
      transactionId,
      requestTimeout
    );
    console.log('UdentifyCore - Server-based localization instantiated successfully');
  } catch (error) {
    console.warn('UdentifyCore - Failed to instantiate localization:', error);
    throw error;
  }
}

/**
 * Get the localization map downloaded from the server.
 * This map contains the localization content for the current language.
 * 
 * Note: The localization map is used automatically by the SDK in the background.
 * This method is primarily for debugging purposes.
 * 
 * @returns Promise resolving to localization map or null if not available
 * 
 * @example
 * ```typescript
 * const map = await getLocalizationMap();
 * if (map) {
 *   console.log('Localization entries:', Object.keys(map).length);
 * }
 * ```
 */
export async function getLocalizationMap(): Promise<Record<string, string> | null> {
  console.log('UdentifyCore - getLocalizationMap called');
  
  if (!LocalizationModule) {
    throw new Error('Localization module not available. Please ensure the native module is properly linked.');
  }
  
  try {
    const result = await LocalizationModule.getLocalizationMap();
    console.log('UdentifyCore - Retrieved localization map');
    return result;
  } catch (error) {
    console.warn('UdentifyCore - Failed to get localization map:', error);
    throw error;
  }
}

/**
 * Clear the localization cache for a specific language.
 * This removes the localization content saved locally and updates the localization map to null.
 * 
 * @param language - Language code to clear cache for
 * @returns Promise resolving when cache is cleared
 * 
 * @example
 * ```typescript
 * await clearLocalizationCache('EN');
 * ```
 */
export async function clearLocalizationCache(language: string): Promise<void> {
  console.log('UdentifyCore - clearLocalizationCache called');
  
  if (!LocalizationModule) {
    throw new Error('Localization module not available. Please ensure the native module is properly linked.');
  }
  
  try {
    await LocalizationModule.clearLocalizationCache(language);
    console.log('UdentifyCore - Localization cache cleared successfully');
  } catch (error) {
    console.warn('UdentifyCore - Failed to clear localization cache:', error);
    throw error;
  }
}

/**
 * Map the system language to the enum value used by the SDK.
 * This is useful for automatically detecting the user's preferred language.
 * 
 * @returns Promise resolving to language code or null if system language is not supported
 * 
 * @example
 * ```typescript
 * const systemLanguage = await mapSystemLanguageToEnum();
 * const language = systemLanguage || 'EN'; // Fallback to English
 * await instantiateServerBasedLocalization(language, serverUrl, transactionId);
 * ```
 */
export async function mapSystemLanguageToEnum(): Promise<string | null> {
  console.log('UdentifyCore - mapSystemLanguageToEnum called');
  
  if (!LocalizationModule) {
    throw new Error('Localization module not available. Please ensure the native module is properly linked.');
  }
  
  try {
    const result = await LocalizationModule.mapSystemLanguageToEnum();
    console.log('UdentifyCore - System language mapped:', result);
    return result;
  } catch (error) {
    console.warn('UdentifyCore - Failed to map system language:', error);
    throw error;
  }
}

// Export version and framework info for backward compatibility
export const version = require('../package.json').version;

export const frameworks = {
  ios: ['UdentifyCommons.xcframework'],
  android: ['commons-26.3.0814.aar']
};

export const platforms = {
  ios: true,
  android: true
};
