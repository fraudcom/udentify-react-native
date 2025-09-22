import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface MrzData {
  documentType: string;
  issuingCountry: string;
  documentNumber: string;
  optionalData1?: string;
  dateOfBirth: string;
  gender: string;
  dateOfExpiration: string;
  nationality: string;
  optionalData2?: string;
  surname: string;
  givenNames: string;
}

export interface BACCredentials {
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiration: string;
}

export interface MrzUICustomization {
  focusViewBorderColor?: string; // Hex color code (e.g., "#007AFF")
  focusViewStrokeWidth?: number; // Border thickness (1-10)
  instructionText?: string; // Custom instruction text
  instructionTextColor?: string; // Hex color for instruction text
  showCancelButton?: boolean; // Show/hide cancel button
  cancelButtonText?: string; // Custom cancel button text
  cancelButtonColor?: string; // Hex color for cancel button
}

export interface MrzResult {
  success: boolean;
  mrzData?: MrzData;
  errorMessage?: string;
  // Legacy properties for backward compatibility
  documentNumber?: string;
  dateOfBirth?: string;
  dateOfExpiration?: string;
}

export interface Spec extends TurboModule {
  checkPermissions(): Promise<boolean>;
  
  requestPermissions(): Promise<string>;
  
  startMrzCamera(customization?: MrzUICustomization): Promise<MrzResult>;
  
  processMrzImage(imageBase64: string): Promise<MrzResult>;
  
  cancelMrzScanning(): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('MRZModule');
