import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';


export interface UIConfig {
  // Visual styling
  backgroundColor?: string;
  borderColor?: string;
  cornerRadius?: number;
  borderWidth?: number;
  maskLayerColor?: string;
  buttonBackColor?: string;
  
  // Placeholder settings - TurboModule doesn't support union types
  placeholderTemplate?: string; // 'hidden' | 'defaultStyle' | 'countrySpecificStyle'
  orientation?: string; // 'horizontal' | 'vertical'
  
  // Detection and behavior settings
  detectionAccuracy?: number;
  blurCoefficient?: number;
  requestTimeout?: number;
  
  // UI control flags
  backButtonEnabled?: boolean;
  reviewScreenEnabled?: boolean;
  reviewBackgroundColor?: string;
  reviewBackgroundStyle?: Object;
  footerViewHidden?: boolean;
  manualCapture?: boolean;
  faceDetection?: boolean;
  isDocumentLivenessActive?: boolean;
  
  // IQA Service Configuration
  isIQAServiceEnabled?: boolean;
  
  // IQA Screen Style (simplified for TurboModule - nested objects passed as Object)
  iqaScreenStyle?: Object;
}

export interface Spec extends TurboModule {
  // Android only. Opts this app into in-call re-captures (the video call
  // "repeat" flow) and supplies the credentials one would use; null opts back
  // out. Typed as Object here because codegen specs cannot reference the
  // package's own config interface - see the typed wrapper in the public API.
  setRepeatConfig(config: Object | null): Promise<boolean>;

  configureUISettings(
    uiConfig: UIConfig
  ): Promise<boolean>;
  
  startOCRScanning(
    serverURL: string,
    transactionID: string,
    documentType: string,
    documentSide: string,
    country: string
  ): Promise<boolean>;

  performOCR(
    serverURL: string,
    transactionID: string,
    frontSideImage: string,
    backSideImage: string,
    documentType: string,
    country: string
  ): Promise<object>;

  performDocumentLiveness(
    serverURL: string,
    transactionID: string,
    frontSideImage: string,
    backSideImage: string
  ): Promise<object>;

  performOCRAndDocumentLiveness(
    serverURL: string,
    transactionID: string,
    frontSideImage: string,
    backSideImage: string,
    documentType: string,
    country: string
  ): Promise<object>;
  
  startHologramCamera(
    serverURL: string,
    transactionID: string
  ): Promise<boolean>;
  
  performHologramCheck(
    serverURL: string,
    transactionID: string,
    videoUrls: string[]
  ): Promise<object>;

  performIQA(
    serverURL: string,
    transactionID: string,
    imageBase64: string,
    documentType: string,
    documentSide: string,
    country: string
  ): Promise<object>;

  takePhoto(): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('OCRModule');