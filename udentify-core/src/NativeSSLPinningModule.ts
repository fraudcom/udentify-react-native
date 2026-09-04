import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

/**
 * Native SSL Pinning Module Specification
 * This module provides SSL certificate pinning functionality
 * using the native UdentifySettingsProvider class
 */
export interface Spec extends TurboModule {
  /**
   * Load a certificate from the app bundle/assets
   * @param certificateName - Name of the certificate file without extension
   * @param extension - File extension (cer or der)
   * @returns Promise resolving to true if certificate was loaded and set successfully
   */
  loadCertificateFromAssets(
    certificateName: string,
    extension: string
  ): Promise<boolean>;

  /**
   * Set SSL certificate using base64 encoded certificate data
   * @param certificateBase64 - Base64 encoded certificate data (DER format)
   * @returns Promise resolving to true if certificate was set successfully
   */
  setSSLCertificateBase64(certificateBase64: string): Promise<boolean>;

  /**
   * Remove the currently set SSL certificate
   * @returns Promise resolving to true if certificate was removed successfully
   */
  removeSSLCertificate(): Promise<boolean>;

  /**
   * Get the currently set SSL certificate as base64 string
   * @returns Promise resolving to base64 string or null if no certificate is set
   */
  getSSLCertificateBase64(): Promise<string | null>;

  /**
   * Check if SSL pinning is currently enabled
   * @returns Promise resolving to true if SSL pinning is enabled
   */
  isSSLPinningEnabled(): Promise<boolean>;

  /**
   * 26.1.3: Fetch and cache transaction properties (e.g. U18) for a transaction so that
   * subsequent SDK flows honour them.
   * @param serverURL - Udentify API server URL
   * @param transactionID - Transaction ID to read properties for
   * @returns Promise resolving to the list of property names (or null if none)
   */
  fetchTransactionProperties(
    serverURL: string,
    transactionID: string
  ): Promise<string[] | null>;

  /**
   * 26.1.3: Clear any cached transaction properties.
   */
  resetTransactionProperties(): Promise<void>;

  /**
   * Set a subpath appended to the device-info endpoint the SDK reports to, or clear it by
   * passing null.
   * @param subPath - Subpath string, or null to clear it
   */
  setDeviceInfoSubPath(subPath: string | null): Promise<void>;

  /**
   * Read back the device-info subpath currently set on the SDK.
   * @returns Promise resolving to the current subpath, or null if unset
   */
  getDeviceInfoSubPath(): Promise<string | null>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('SSLPinningModule');

