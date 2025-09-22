/**
 * Liveness Module
 * Main interface for Face Recognition & Liveness Detection functionality
 */

import { NativeModules, DeviceEventEmitter, NativeEventEmitter, Platform } from 'react-native';
import type {
  FaceRecognizerCredentials,
  FaceRecognitionResult,
  FaceRecognitionPermissionStatus,
  AddUserToListResult,
  DeleteUserFromListResult,
  UISettings,
  LocalizationStrings,
  OnResultCallback,
  OnFailureCallback,
  OnPhotoTakenCallback,
  OnSelfieTakenCallback,
  OnVideoTakenCallback,
  OnActiveLivenessResultCallback,
  OnActiveLivenessFailureCallback,
} from './LivenessModels';

// TurboModule initialization (similar pattern to OCRTab.tsx)
const isTurboModuleEnabled = (global as any).__turboModuleProxy != null;

let LivenessModuleNative: any;

if (isTurboModuleEnabled) {
  try {
    const { TurboModuleRegistry } = require('react-native');
    LivenessModuleNative = TurboModuleRegistry.getEnforcing('LivenessModule');
  } catch (error) {
    console.error('LivenessModule - TurboModule failed, falling back to Legacy:', error);
    LivenessModuleNative = NativeModules.LivenessModule;
  }
} else {
  LivenessModuleNative = NativeModules.LivenessModule;
}

class LivenessModule {
  private eventEmitter: any;
  private callbacks: Map<string, Function> = new Map();

  constructor() {
    // Setup event emitter based on platform
    this.eventEmitter = Platform.OS === 'ios' 
      ? new NativeEventEmitter(LivenessModuleNative)
      : DeviceEventEmitter;

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Face recognition result events
    this.eventEmitter.addListener('onFaceRecognitionResult', (result: FaceRecognitionResult) => {
      const callback = this.callbacks.get('onResult');
      if (callback) {
        callback(result);
      }
    });

    this.eventEmitter.addListener('onFaceRecognitionFailure', (error: any) => {
      const callback = this.callbacks.get('onFailure');
      if (callback) {
        callback(error);
      }
    });

    // Photo events
    this.eventEmitter.addListener('onPhotoTaken', () => {
      const callback = this.callbacks.get('onPhotoTaken');
      if (callback) {
        callback();
      }
    });

    this.eventEmitter.addListener('onSelfieTaken', (data: any) => {
      const callback = this.callbacks.get('onSelfieTaken');
      if (callback) {
        // Handle both string format and object format from Android
        const base64Image = typeof data === 'string' ? data : data?.base64Image || '';
        callback(base64Image);
      }
    });

    // Active liveness events
    this.eventEmitter.addListener('onActiveLivenessResult', (result: FaceRecognitionResult) => {
      const callback = this.callbacks.get('onActiveLivenessResult');
      if (callback) {
        callback(result);
      }
    });

    this.eventEmitter.addListener('onActiveLivenessFailure', (error: any) => {
      const callback = this.callbacks.get('onActiveLivenessFailure');
      if (callback) {
        callback(error);
      }
    });

    // Additional error handling events
    this.eventEmitter.addListener('onFaceRecognitionError', (error: any) => {
      const callback = this.callbacks.get('onFailure');
      if (callback) {
        callback(error);
      }
    });

    // Additional utility events
    this.eventEmitter.addListener('onBackButtonPressed', () => {
      // Handle back button press if needed
    });

    this.eventEmitter.addListener('onWillDismiss', () => {
      // Handle will dismiss if needed
    });

    this.eventEmitter.addListener('onDidDismiss', () => {
      // Handle did dismiss if needed
    });

    this.eventEmitter.addListener('onVideoTaken', () => {
      const callback = this.callbacks.get('onVideoTaken');
      if (callback) {
        callback();
      }
    });
  }

  // Permission management
  async checkPermissions(): Promise<FaceRecognitionPermissionStatus> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    return await LivenessModuleNative.checkPermissions();
  }

  async requestPermissions(): Promise<FaceRecognitionPermissionStatus> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    return await LivenessModuleNative.requestPermissions();
  }

  // Camera-based face recognition
  async startFaceRecognitionRegistration(credentials: FaceRecognizerCredentials): Promise<FaceRecognitionResult> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    return await LivenessModuleNative.startFaceRecognitionRegistration(credentials);
  }

  async startFaceRecognitionAuthentication(credentials: FaceRecognizerCredentials): Promise<FaceRecognitionResult> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    return await LivenessModuleNative.startFaceRecognitionAuthentication(credentials);
  }

  // Liveness detection
  async startActiveLiveness(credentials: FaceRecognizerCredentials, isAuthentication: boolean = false): Promise<FaceRecognitionResult> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    return await LivenessModuleNative.startActiveLiveness(credentials, isAuthentication);
  }

  async startHybridLiveness(
    credentials: FaceRecognizerCredentials, 
    isAuthentication: boolean = false
  ): Promise<FaceRecognitionResult> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    return await LivenessModuleNative.startHybridLiveness(credentials, isAuthentication);
  }

  // Selfie capture for manual processing
  async startSelfieCapture(credentials: FaceRecognizerCredentials): Promise<FaceRecognitionResult> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    return await LivenessModuleNative.startSelfieCapture(credentials);
  }

  // Manual face recognition with captured selfie
  async performFaceRecognitionWithSelfie(
    credentials: FaceRecognizerCredentials,
    base64Image: string,
    isAuthentication: boolean = false
  ): Promise<FaceRecognitionResult> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    return await LivenessModuleNative.performFaceRecognitionWithSelfie(credentials, base64Image, isAuthentication);
  }

  // Photo-based recognition
  async registerUserWithPhoto(
    credentials: FaceRecognizerCredentials, 
    base64Image: string
  ): Promise<FaceRecognitionResult> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    return await LivenessModuleNative.registerUserWithPhoto(credentials, base64Image);
  }

  async authenticateUserWithPhoto(
    credentials: FaceRecognizerCredentials, 
    base64Image: string
  ): Promise<FaceRecognitionResult> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    return await LivenessModuleNative.authenticateUserWithPhoto(credentials, base64Image);
  }

  // Face recognition control
  async cancelFaceRecognition(): Promise<void> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    return await LivenessModuleNative.cancelFaceRecognition();
  }

  async isFaceRecognitionInProgress(): Promise<boolean> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    return await LivenessModuleNative.isFaceRecognitionInProgress();
  }

  // List operations
  async addUserToList(
    serverURL: string,
    transactionId: string,
    status: string,
    metadata?: Record<string, any>
  ): Promise<AddUserToListResult> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    return await LivenessModuleNative.addUserToList(serverURL, transactionId, status, metadata);
  }

  async startFaceRecognitionIdentification(
    serverURL: string,
    transactionId: string,
    listName: string,
    logLevel?: string
  ): Promise<FaceRecognitionResult> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    return await LivenessModuleNative.startFaceRecognitionIdentification(serverURL, transactionId, listName, logLevel);
  }

  async deleteUserFromList(
    serverURL: string,
    transactionId: string,
    listName: string,
    photoBase64: string
  ): Promise<DeleteUserFromListResult> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    return await LivenessModuleNative.deleteUserFromList(serverURL, transactionId, listName, photoBase64);
  }

  // UI configuration
  async configureUISettings(settings: UISettings): Promise<boolean> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    if (!LivenessModuleNative.configureUISettings) {
      console.warn('LivenessModule - configureUISettings method not available yet');
      return false;
    }
    
    try {
      console.log('LivenessModule - Configuring UI settings:', JSON.stringify(settings, null, 2));
      const result = await LivenessModuleNative.configureUISettings(settings);
      console.log('LivenessModule - UI configuration result:', result);
      return result;
    } catch (error) {
      console.error('LivenessModule - Failed to configure UI settings:', error);
      throw error;
    }
  }

  async setLocalization(languageCode: string, customStrings?: LocalizationStrings): Promise<void> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    if (!LivenessModuleNative.setLocalization) {
      console.warn('LivenessModule - setLocalization method not available yet');
      return;
    }
    
    try {
      console.log(`LivenessModule - Setting localization to ${languageCode}:`, customStrings);
      await LivenessModuleNative.setLocalization(languageCode, customStrings);
      console.log('LivenessModule - Localization set successfully');
    } catch (error) {
      console.error('LivenessModule - Failed to set localization:', error);
      throw error;
    }
  }

  // Convenience method to apply comprehensive UI configuration
  async applyUIConfiguration(settings: UISettings): Promise<boolean> {
    if (!LivenessModuleNative) throw new Error('LivenessModule not available');
    
    try {
      // Apply UI settings first
      const uiResult = await this.configureUISettings(settings);
      
      // Apply localization if provided
      if (settings.localization) {
        await this.setLocalization(
          settings.localization.languageCode || 'en',
          settings.localization.customStrings
        );
      }
      
      return uiResult;
    } catch (error) {
      console.error('LivenessModule - Failed to apply UI configuration:', error);
      throw error;
    }
  }

  // Callback setters
  setOnResultCallback(callback: OnResultCallback): void {
    this.callbacks.set('onResult', callback);
  }

  setOnFailureCallback(callback: OnFailureCallback): void {
    this.callbacks.set('onFailure', callback);
  }

  setOnPhotoTakenCallback(callback: OnPhotoTakenCallback): void {
    this.callbacks.set('onPhotoTaken', callback);
  }

  setOnSelfieTakenCallback(callback: OnSelfieTakenCallback): void {
    this.callbacks.set('onSelfieTaken', callback);
  }

  setOnActiveLivenessResultCallback(callback: OnActiveLivenessResultCallback): void {
    this.callbacks.set('onActiveLivenessResult', callback);
  }

  setOnActiveLivenessFailureCallback(callback: OnActiveLivenessFailureCallback): void {
    this.callbacks.set('onActiveLivenessFailure', callback);
  }

  setOnVideoTakenCallback(callback: () => void): void {
    this.callbacks.set('onVideoTaken', callback);
  }

  // Cleanup
  removeAllListeners(): void {
    this.callbacks.clear();
  }
}

export default new LivenessModule();
