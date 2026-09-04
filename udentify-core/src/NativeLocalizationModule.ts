import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

/**
 * Native Localization Module Specification
 * This module provides remote language pack functionality
 * using the native UdentifySettingsProvider class
 */
export interface Spec extends TurboModule {
  /**
   * Instantiate server-based localization by downloading the localization file
   * @param language - Language code (e.g., "EN", "FR", "TR")
   * @param serverUrl - URL of the Udentify API Server
   * @param transactionId - Transaction ID received from Udentify API Server
   * @param requestTimeout - Timeout duration for the network request in seconds (default: 30)
   * @returns Promise resolving when localization is instantiated
   */
  instantiateServerBasedLocalization(
    language: string,
    serverUrl: string,
    transactionId: string,
    requestTimeout: number
  ): Promise<void>;

  /**
   * Get the localization map downloaded from the server
   * @returns Promise resolving to localization map or null if not available
   */
  getLocalizationMap(): Promise<Record<string, string> | null>;

  /**
   * Clear the localization cache for a specific language
   * @param language - Language code to clear cache for
   * @returns Promise resolving when cache is cleared
   */
  clearLocalizationCache(language: string): Promise<void>;

  /**
   * Map the system language to the enum value used by the SDK
   * @returns Promise resolving to language code or null if not mapped
   */
  mapSystemLanguageToEnum(): Promise<string | null>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('LocalizationModule');


