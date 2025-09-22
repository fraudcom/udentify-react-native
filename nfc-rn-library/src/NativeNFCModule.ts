import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

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
  logLevel?: string; // 'warning', 'info', 'debug', etc.
}

export interface Spec extends TurboModule {
  // Check if NFC is available and supported on device
  isNFCAvailable(): Promise<boolean>;

  // Check if NFC is enabled by user
  isNFCEnabled(): Promise<boolean>;

  // Start NFC passport/ID reading with MRZ credentials
  startNFCReading(
    credentials: NFCCredentials
  ): Promise<boolean>;

  // Cancel ongoing NFC reading session
  cancelNFCReading(): Promise<boolean>;

  // Get NFC antenna location for current device
  getNFCLocation(
    serverURL: string
  ): Promise<object>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NFCModule');
