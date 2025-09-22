/**
 * Native Liveness Module TurboModule Specification
 * This defines the interface for the native liveness module
 */

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Permission management
  checkPermissions(): Promise<Object>;
  requestPermissions(): Promise<Object>;

  // Camera-based face recognition
  startFaceRecognitionRegistration(credentials: Object): Promise<Object>;
  startFaceRecognitionAuthentication(credentials: Object): Promise<Object>;

  // Liveness detection
  startActiveLiveness(credentials: Object, isAuthentication?: boolean): Promise<Object>;
  startHybridLiveness(credentials: Object, isAuthentication?: boolean): Promise<Object>;

  // Selfie capture for manual processing
  startSelfieCapture(credentials: Object): Promise<Object>;
  performFaceRecognitionWithSelfie(credentials: Object, base64Image: string, isAuthentication?: boolean): Promise<Object>;

  // Photo-based recognition
  registerUserWithPhoto(credentials: Object, base64Image: string): Promise<Object>;
  authenticateUserWithPhoto(credentials: Object, base64Image: string): Promise<Object>;

  // Face recognition control
  cancelFaceRecognition(): Promise<void>;
  isFaceRecognitionInProgress(): Promise<boolean>;

  // List operations
  addUserToList(
    serverURL: string,
    transactionId: string,
    status: string,
    metadata?: Object
  ): Promise<Object>;

  startFaceRecognitionIdentification(
    serverURL: string,
    transactionId: string,
    listName: string,
    logLevel?: string
  ): Promise<Object>;

  deleteUserFromList(
    serverURL: string,
    transactionId: string,
    listName: string,
    photoBase64: string
  ): Promise<Object>;

  // UI configuration
  configureUISettings(settings: Object): Promise<boolean>;
  setLocalization(languageCode: string, customStrings?: Object): Promise<void>;

  // Event listeners (handled via EventEmitter in the wrapper)
  // onFaceRecognitionResult
  // onFaceRecognitionFailure
  // onPhotoTaken
  // onSelfieTaken
  // onActiveLivenessResult
  // onActiveLivenessFailure
}

export default TurboModuleRegistry.getEnforcing<Spec>('LivenessModule');
