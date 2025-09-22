import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
  PermissionsAndroid,
  DeviceEventEmitter,
  NativeEventEmitter,
  NativeModules,
  TextInput,
  Image,
  TouchableOpacity,
} from 'react-native';
import OptionPicker from './OptionPicker';
import LivenessUICustomizeModal from './LivenessUICustomizeModal';
import OCRResultCard from './OCRResultCard';
import { currentConfig } from '../config/apiConfig';
import { udentifyApiService } from '../services/udentifyApiService';
import { 
  OCR_MODULES, 
  DOCUMENT_TYPES, 
  DOCUMENT_SIDES, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES 
} from '../constants/ocrConstants';

// TurboModule initialization (same pattern as OCRTab.tsx)
const isTurboModuleEnabled = (global as any).__turboModuleProxy != null;

let LivenessModule: any;
let OCRModule: any;

if (isTurboModuleEnabled) {
  try {
    const {TurboModuleRegistry} = require('react-native');
    LivenessModule = TurboModuleRegistry.getEnforcing('LivenessModule');
    OCRModule = TurboModuleRegistry.getEnforcing('OCRModule');
  } catch (error) {
    console.error('TurboModule failed, falling back to Legacy:', error);
    LivenessModule = NativeModules.LivenessModule;
    OCRModule = NativeModules.OCRModule;
  }
} else {
  LivenessModule = NativeModules.LivenessModule;
  OCRModule = NativeModules.OCRModule;
}

// Liveness Module functions
const checkPermissions = async () => {
  if (!LivenessModule) throw new Error('LivenessModule not available');
  return await LivenessModule.checkPermissions();
};

const requestPermissions = async () => {
  if (!LivenessModule) throw new Error('LivenessModule not available');
  return await LivenessModule.requestPermissions();
};

const startFaceRecognitionRegistration = async (credentials: any) => {
  if (!LivenessModule) throw new Error('LivenessModule not available');
  return await LivenessModule.startFaceRecognitionRegistration(credentials);
};

const startFaceRecognitionAuthentication = async (credentials: any) => {
  if (!LivenessModule) throw new Error('LivenessModule not available');
  return await LivenessModule.startFaceRecognitionAuthentication(credentials);
};

const startActiveLiveness = async (credentials: any, isAuthentication: boolean = false) => {
  if (!LivenessModule) throw new Error('LivenessModule not available');
  return await LivenessModule.startActiveLiveness(credentials, isAuthentication);
};

const startHybridLiveness = async (credentials: any, isAuthentication: boolean) => {
  if (!LivenessModule) throw new Error('LivenessModule not available');
  return await LivenessModule.startHybridLiveness(credentials, isAuthentication);
};

const registerUserWithPhoto = async (credentials: any, base64Image: string) => {
  if (!LivenessModule) throw new Error('LivenessModule not available');
  return await LivenessModule.registerUserWithPhoto(credentials, base64Image);
};

const authenticateUserWithPhoto = async (credentials: any, base64Image: string) => {
  if (!LivenessModule) throw new Error('LivenessModule not available');
  return await LivenessModule.authenticateUserWithPhoto(credentials, base64Image);
};

// ✨ NEW: Selfie capture methods
const startSelfieCapture = async (credentials: any) => {
  if (!LivenessModule) throw new Error('LivenessModule not available');
  return await LivenessModule.startSelfieCapture(credentials);
};

const performFaceRecognitionWithSelfie = async (credentials: any, base64Image: string, isAuthentication: boolean = false) => {
  if (!LivenessModule) throw new Error('LivenessModule not available');
  return await LivenessModule.performFaceRecognitionWithSelfie(credentials, base64Image, isAuthentication);
};

const cancelFaceRecognition = async () => {
  if (!LivenessModule) throw new Error('LivenessModule not available');
  return await LivenessModule.cancelFaceRecognition();
};

const isFaceRecognitionInProgress = async () => {
  if (!LivenessModule) throw new Error('LivenessModule not available');
  return await LivenessModule.isFaceRecognitionInProgress();
};

// OCR Module functions (needed for OCR dependency)
const startOCRScanning = async (serverURL: string, transactionID: string, documentType: string, documentSide: string) => {
  if (!OCRModule) throw new Error('OCRModule not available');
  return await OCRModule.startOCRScanning(serverURL, transactionID, documentType, documentSide);
};

const performOCR = async (serverURL: string, transactionID: string, frontSideImage: string, backSideImage: string, documentType: string) => {
  if (!OCRModule) throw new Error('OCRModule not available');
  return await OCRModule.performOCR(serverURL, transactionID, frontSideImage, backSideImage, documentType);
};

// Types
type FaceRecognizerCredentials = {
  serverURL: string;
  transactionID: string;
  userID: string;
  autoTake?: boolean;
  errorDelay?: number;
  successDelay?: number;
  runInBackground?: boolean;
  blinkDetectionEnabled?: boolean;
  requestTimeout?: number;
  eyesOpenThreshold?: number;
  maskConfidence?: number;
  invertedAnimation?: boolean;
  activeLivenessAutoNextEnabled?: boolean;
};

type FaceRecognitionPermissionStatus = {
  camera: string;
  readPhoneState: string;
  internet: string;
  recordAudio?: string;
  bluetoothConnect?: string;
};

type FaceRecognitionResult = any;

const LivenessTab: React.FC = () => {
  // State for permissions
  const [permissionStatus, setPermissionStatus] = useState<FaceRecognitionPermissionStatus | null>(null);
  
  // State for user selections
  const [selectedUserID, setSelectedUserID] = useState<string>(Date.now().toString());
  const [selectedOperation, setSelectedOperation] = useState<string>('registration');
  
  // OCR selection state
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('ID_CARD');
  const [selectedDocumentSide, setSelectedDocumentSide] = useState<string>('BOTH');
  
  // User registration state tracking
  const [userRegistrationStatus, setUserRegistrationStatus] = useState<{
    [userID: string]: {
      isRegistered: boolean;
      registrationTransactionID?: string;
      registrationDate?: string;
      registrationMethod?: string;
    }
  }>({});
  
  // State for results and loading
  const [faceRecognitionResult, setFaceRecognitionResult] = useState<FaceRecognitionResult | null>(null);
  const [livenessResult, setLivenessResult] = useState<FaceRecognitionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTransactionID, setCurrentTransactionID] = useState<string>('');
  
  // OCR dependency state
  const [ocrCompleted, setOcrCompleted] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  
  // UI Customization modal state
  const [uiModalVisible, setUiModalVisible] = useState<boolean>(false);
  const [currentUIConfig, setCurrentUIConfig] = useState<any>(null);
  
  // ✨ NEW: Selfie functionality state
  const [capturedSelfieImage, setCapturedSelfieImage] = useState<string | null>(null);
  const [selfieOperation, setSelfieOperation] = useState<'registration' | 'authentication'>('registration');
  const [selfieResult, setSelfieResult] = useState<any>(null);
  const [isSelfieCapturing, setIsSelfieCapturing] = useState<boolean>(false);
  const [displaySelfie, setDisplaySelfie] = useState<string | null>(null);

  // Setup event listeners for Face Recognition events
  useEffect(() => {
    const livenessEventEmitter = Platform.OS === 'ios' 
      ? new NativeEventEmitter(LivenessModule)
      : DeviceEventEmitter;
    
    const ocrEventEmitter = Platform.OS === 'ios' 
      ? new NativeEventEmitter(OCRModule)
      : DeviceEventEmitter;

    const faceRecognitionResultListener = livenessEventEmitter.addListener('onFaceRecognitionResult', (result) => {
      // 📡 COMPREHENSIVE LOGGING FOR LIVENESS RESULT (adapted from Flutter)
      // Note: This event is triggered by camera-based operations (startFaceRecognitionRegistration, startFaceRecognitionAuthentication, etc.)
      // API-based operations like performFaceRecognitionWithSelfie return results via promises instead
      console.log('\n🎉 ========== LIVENESS RESULT RECEIVED (Camera-based) ==========');
      console.log('📊 Complete Result Object:', result);
      console.log('📋 Result Status:', result.status);
      
      setIsLoading(false);
      setFaceRecognitionResult(result);

      if (result.faceIDMessage != null) {
        console.log('\n✅ ========== FACE ID MESSAGE DETAILS ==========');
        console.log('🔍 Face ID Success:', result.faceIDMessage?.success);
        console.log('💬 Face ID Message Text:', result.faceIDMessage?.message);
        console.log('❌ Error Code:', result.faceIDMessage?.errorCode);

        // ✅ NEW: Track successful registrations - Enhanced for Android compatibility
        if (result.faceIDMessage?.success && result.faceIDMessage?.faceIDResult) {
          const faceIDResult = result.faceIDMessage.faceIDResult;
          
          // Check if this was a registration operation and it was successful
          if (faceIDResult.verified && faceIDResult.userID && faceIDResult.transactionID) {
            // Determine if this was a registration by checking various indicators
            const isRegistration = faceIDResult.description?.toLowerCase().includes('registration') ||
                                 result.faceIDMessage.message?.toLowerCase().includes('registration') ||
                                 !checkUserRegistrationStatus(faceIDResult.userID); // If user wasn't registered before, this must be registration
            
            if (isRegistration) {
              markUserAsRegistered(faceIDResult.userID, faceIDResult.transactionID, 'face_recognition');
              console.log(`🎉 REGISTRATION SUCCESS: User ${faceIDResult.userID} has been registered!`);
              
              // 🔧 ANDROID FIX: Force state update and UI re-render
              setTimeout(() => {
                console.log('🔄 ANDROID: Forcing UI state refresh after registration');
                setUserRegistrationStatus(prev => ({ ...prev })); // Force re-render
              }, 100);
            }
          }
        } else if (result.faceIDMessage?.success) {
          // 🆕 ANDROID FALLBACK: Handle cases where faceIDResult might be missing but operation was successful
          console.log('🔍 ANDROID: Checking for registration success without faceIDResult');
          
          // If message indicates registration success, mark the selected user as registered
          if (result.faceIDMessage.message?.toLowerCase().includes('registration') || 
              result.faceIDMessage.message?.toLowerCase().includes('completed successfully')) {
            
            // Use the selectedUserID as fallback if faceIDResult.userID is not available
            const userIDToRegister = result.faceIDMessage.faceIDResult?.userID || selectedUserID;
            const transactionIDToUse = result.faceIDMessage.faceIDResult?.transactionID || currentTransactionID || `fallback_${Date.now()}`;
            
            console.log(`🔧 ANDROID FALLBACK: Registering user ${userIDToRegister} with transaction ${transactionIDToUse}`);
            markUserAsRegistered(userIDToRegister, transactionIDToUse, 'face_recognition');
            
            // Force UI update for Android
            setTimeout(() => {
              console.log('🔄 ANDROID FALLBACK: Forcing UI state refresh');
              setUserRegistrationStatus(prev => ({ ...prev }));
            }, 100);
          }
        }

        // Log faceIDResult if available
        if (result.faceIDMessage?.faceIDResult) {
          const faceIDResult = result.faceIDMessage.faceIDResult;
          console.log('\n🌐 ========== FACE ID RESULT DETAILS ==========');
          console.log('✅ Verified:', faceIDResult.verified);
          console.log('📊 Match Score:', faceIDResult.matchScore);
          console.log('🆔 Transaction ID:', faceIDResult.transactionID);
          console.log('👤 User ID:', faceIDResult.userID);
          console.log('📝 Description:', faceIDResult.description);

          // Log metadata/rawServerResponse
          if (faceIDResult.metadata) {
            console.log('\n📡 ========== RAW SERVER RESPONSE METADATA ==========');
            Object.entries(faceIDResult.metadata).forEach(([key, value]) => {
              if (typeof value === 'string' && value.length > 200) {
                console.log(`   🔍 [${key}]: ${value.substring(0, 200)}... (${value.length} chars)`);
              } else {
                console.log(`   🔍 [${key}]:`, value);
              }
            });
          }
        }

        // Log liveness result if available
        if (result.faceIDMessage?.livenessResult) {
          const livenessResult = result.faceIDMessage.livenessResult;
          console.log('\n🧬 ========== LIVENESS RESULT ==========');
          console.log('📊 Liveness Score:', livenessResult.livenessScore);
          console.log('📊 Probability:', livenessResult.probability);
          console.log('📊 Quality:', livenessResult.quality);
          console.log('📊 Assessment Value:', livenessResult.assessmentValue);
          console.log('📝 Assessment Description:', livenessResult.assessmentDescription);
        }
      } else {
        console.log('\n❌ No Face ID Message in result');
      }

      console.log('🔄 Setting result in UI...');
      console.log('✅ UI state updated successfully');
      console.log('========================================\n');
      
      // Results are logged for debugging - no user alerts for liveness results
      // Only permission-related alerts are shown to users
    });

    const faceRecognitionFailureListener = livenessEventEmitter.addListener('onFaceRecognitionFailure', (error) => {
      console.log('\n🚨 ========== LIVENESS FAILURE ==========');
      console.log('❌ Error Code:', error.code);
      console.log('💬 Error Message:', error.message);
      console.log('📊 Error Details:', error.details);
      console.log('🚪 Dismissing screen and stopping progress...');
      
      setIsLoading(false);
      
      console.log('✅ UI state updated - screen should be dismissed now');
      console.log('=====================================\n');
      
      // Only show alert if there's actual error data
      // Face recognition errors are logged but not shown as alerts to users
    });

    const photoTakenListener = livenessEventEmitter.addListener('onPhotoTaken', () => {
      console.log('\n📸 ========== PHOTO TAKEN ==========');
      console.log('📷 Photo captured during liveness process');
      console.log('⏰ Time:', new Date().toISOString());
      console.log('==================================\n');
    });

    const selfieTakenListener = livenessEventEmitter.addListener('onSelfieTaken', (eventData) => {
      console.log('\n🤳 ========== SELFIE TAKEN EVENT FIRED ==========');
      console.log('📦 Raw event data:', JSON.stringify(eventData));
      console.log('📦 Event data type:', typeof eventData);
      console.log('📦 Event data keys:', eventData ? Object.keys(eventData) : 'No keys');
      
      // Try different ways to extract the image
      let base64Image = '';
      
      if (typeof eventData === 'string') {
        // If eventData is directly the base64 string
        base64Image = eventData;
        console.log('🔄 Event data is a string, using directly');
      } else if (eventData && typeof eventData === 'object') {
        // If eventData is an object, try to extract base64Image
        base64Image = eventData.base64Image || eventData.image || '';
        console.log('🔄 Event data is an object, extracted base64Image');
      }
      
      console.log('📷 Final base64Image length:', base64Image.length, 'characters');
      console.log('⏰ Time:', new Date().toISOString());
      if (base64Image && base64Image.length > 0) {
        console.log('📷 Selfie preview:', base64Image.substring(0, Math.min(50, base64Image.length)) + '...');
      } else {
        console.log('❌ No selfie image found in event data');
        console.log('❌ EventData details:', eventData);
      }
      
      // ✨ NEW: Store captured selfie image and update UI state
      setIsSelfieCapturing(false);
      setCapturedSelfieImage(base64Image);
      setDisplaySelfie(base64Image); // ✨ Also set for immediate display
      
      console.log('✅ Selfie captured and stored successfully');
      console.log('📋 Selfie operation mode:', selfieOperation);
      console.log('👤 User ID:', selectedUserID);
      console.log('💾 Stored selfie image length:', base64Image.length);
      console.log('===================================\n');
      
      // ✨ Show immediate success with option to view image
      Alert.alert(
        '📸 Selfie Captured!',
        `Successfully captured selfie image (${base64Image.length} characters)`,
        [
          { text: 'View Image', onPress: () => console.log('Viewing selfie image') },
          { text: 'OK', style: 'default' }
        ]
      );
      
      if (base64Image && base64Image.length > 0) {
        // Show success alert for selfie capture
        Alert.alert(
          'Selfie Captured Successfully! 📸',
          `Your selfie has been captured and is ready for processing.\n\nOperation: ${selfieOperation}\nUser: ${selectedUserID}\n\nYou can process the selfie manually using the "Process Captured Selfie" button below.`,
          [
            { text: 'OK', style: 'default' }
          ]
        );
      } else {
        Alert.alert(
          'Selfie Capture Error ❌',
          'No image data received from camera. Please try again.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    });

    const activeLivenessResultListener = livenessEventEmitter.addListener('onActiveLivenessResult', (result) => {
      console.log('\n🎭 ========== ACTIVE LIVENESS RESULT ==========');
      console.log('📊 Active Liveness Result:', result);
      console.log('📋 Result Status:', result.status);
      console.log('⏰ Time:', new Date().toISOString());

      setIsLoading(false);
      setLivenessResult(result);

      if (result.faceIDMessage != null) {
        const msg = result.faceIDMessage;
        console.log('\n✅ ========== FACE ID MESSAGE DETAILS ==========');
        console.log('💬 Message:', msg.message);
        console.log('🔍 Success:', msg.success);
        console.log('❌ Error Code:', msg.errorCode);
        console.log('🔄 Is Failed:', msg.isFailed);

        // ✅ NEW: Track successful registrations from Active Liveness - Enhanced for Android
        if (msg.success && msg.faceIDResult?.verified && msg.faceIDResult?.userID && msg.faceIDResult?.transactionID) {
          const faceIDResult = msg.faceIDResult;
          
          // Check if this was a registration operation
          const isRegistration = selectedOperation === 'registration' ||
                               faceIDResult.description?.toLowerCase().includes('registration') ||
                               msg.message?.toLowerCase().includes('registration') ||
                               !checkUserRegistrationStatus(faceIDResult.userID);
          
          if (isRegistration) {
            // ✅ UPDATED: Support both Active and Hybrid Liveness registration
            const method = msg.message?.toLowerCase().includes('hybrid') ? 'hybrid_liveness' : 'active_liveness';
            markUserAsRegistered(faceIDResult.userID, faceIDResult.transactionID, method);
            console.log(`🎉 LIVENESS REGISTRATION SUCCESS (${method.toUpperCase()}): User ${faceIDResult.userID} has been registered!`);
            
            // 🔧 ANDROID FIX: Force UI update for Active/Hybrid Liveness
            setTimeout(() => {
              console.log(`🔄 ANDROID: Forcing UI refresh after ${method} registration`);
              setUserRegistrationStatus(prev => ({ ...prev }));
            }, 100);
          }
        } else if (msg.success && selectedOperation === 'registration') {
          // 🆕 ANDROID FALLBACK: Handle Active/Hybrid Liveness registration without complete faceIDResult
          console.log('🔍 ANDROID: Active/Hybrid Liveness registration fallback detection');
          
          if (msg.message?.toLowerCase().includes('liveness') && 
              (msg.message?.toLowerCase().includes('completed') || msg.message?.toLowerCase().includes('success'))) {
            
            const userIDToRegister = msg.faceIDResult?.userID || selectedUserID;
            const transactionIDToUse = msg.faceIDResult?.transactionID || currentTransactionID || `liveness_fallback_${Date.now()}`;
            const method = msg.message?.toLowerCase().includes('hybrid') ? 'hybrid_liveness' : 'active_liveness';
            
            console.log(`🔧 ANDROID FALLBACK: Registering user ${userIDToRegister} via ${method}`);
            markUserAsRegistered(userIDToRegister, transactionIDToUse, method);
            
            // Force UI update
            setTimeout(() => {
              console.log(`🔄 ANDROID FALLBACK: Forcing UI refresh for ${method}`);
              setUserRegistrationStatus(prev => ({ ...prev }));
            }, 100);
          }
        }

        // Display FaceIDResult (contains server response data)
        if (msg.faceIDResult != null) {
          const faceIDResult = msg.faceIDResult;
          console.log('\n🌐 ========== FACE ID RESULT (SERVER DATA) ==========');
          console.log('✅ Verified:', faceIDResult.verified);
          console.log('📊 Match Score:', faceIDResult.matchScore);
          console.log('🆔 Transaction ID:', faceIDResult.transactionID);
          console.log('👤 User ID:', faceIDResult.userID);
          console.log('📝 Description:', faceIDResult.description);

          // RAW SERVER RESPONSE - This is what you wanted!
          if (faceIDResult.metadata != null) {
            console.log('\n🚀 ========== RAW SERVER RESPONSE ==========');
            Object.entries(faceIDResult.metadata).forEach(([key, value]) => {
              if (typeof value === 'string' && value.length > 200) {
                console.log(`   🔍 [${key}]: ${value.substring(0, 200)}... (${value.length} chars)`);
              } else {
                console.log(`   🔍 [${key}]:`, value);
              }
            });
          }
        }

        // Display LivenessResult (passive liveness data)
        if (msg.livenessResult != null) {
          const livenessResult = msg.livenessResult;
          console.log('\n🧬 ========== LIVENESS RESULT ==========');
          console.log('📊 Liveness Score:', livenessResult.livenessScore);
          console.log('📊 Probability:', livenessResult.probability);
          console.log('📊 Quality:', livenessResult.quality);
          console.log('📊 Assessment Value:', livenessResult.assessmentValue);
          console.log('📝 Assessment Description:', livenessResult.assessmentDescription);
        }

        // Display ActiveLivenessResult (gesture data)
        if (msg.activeLivenessResult != null) {
          const activeLivenessResult = msg.activeLivenessResult;
          console.log('\n🎭 ========== ACTIVE LIVENESS GESTURE RESULTS ==========');
          console.log('🆔 Transaction ID:', activeLivenessResult.transactionID);
          console.log('🎯 Gesture Results:');
          if (activeLivenessResult.gestureResult) {
            Object.entries(activeLivenessResult.gestureResult).forEach(([gesture, success]) => {
              console.log(`   ${success ? "✅" : "❌"} ${gesture}: ${success}`);
            });
          }
        }
      }

      // Summary
      console.log('\n📋 ========== SUMMARY ==========');
      console.log('🎯 Has FaceIDResult:', result.faceIDMessage?.faceIDResult != null);
      console.log('🎯 Has LivenessResult:', result.faceIDMessage?.livenessResult != null);
      console.log('🎯 Has ActiveLivenessResult:', result.faceIDMessage?.activeLivenessResult != null);
      console.log('🎯 Has Raw Server Response:', result.faceIDMessage?.faceIDResult?.metadata != null);
      console.log('============================================\n');
      
            // Interpret Active Liveness results properly
      if (result && result.faceIDMessage) {
        // Active liveness results are logged for debugging - no user alerts
      }
    });

    const activeLivenessFailureListener = livenessEventEmitter.addListener('onActiveLivenessFailure', (error) => {
      console.log('\n🎭 ========== ACTIVE LIVENESS FAILURE ==========');
      console.log('❌ Active Liveness Error Code:', error.code);
      console.log('💬 Active Liveness Error Message:', error.message);
      console.log('📊 Active Liveness Error Details:', error.details);
      console.log('⏰ Time:', new Date().toISOString());
      console.log('==============================================\n');
      
      setIsLoading(false);
      
      // Only show alert if there's actual error data
      // Active liveness errors are logged but not shown as alerts to users
    });

    // Add missing event listeners to prevent errors
    const willDismissListener = livenessEventEmitter.addListener('onWillDismiss', () => {
      console.log('\n🚪 ========== WILL DISMISS ==========');
      console.log('📱 Camera UI will dismiss');
      console.log('⏰ Time:', new Date().toISOString());
      console.log('==================================\n');
    });

    const didDismissListener = livenessEventEmitter.addListener('onDidDismiss', () => {
      console.log('\n🚪 ========== DID DISMISS ==========');
      console.log('📱 Camera UI dismissed');
      console.log('⏰ Time:', new Date().toISOString());
      setIsLoading(false); // Ensure loading state is cleared
      console.log('=================================\n');
    });

    const backButtonListener = livenessEventEmitter.addListener('onBackButtonPressed', () => {
      console.log('\n⬅️ ========== BACK BUTTON PRESSED ==========');
      console.log('🔙 User pressed back button');
      console.log('⏰ Time:', new Date().toISOString());
      setIsLoading(false); // Ensure loading state is cleared
      console.log('=========================================\n');
    });

    // OCR Event Listeners (for OCR dependency)
    const ocrCompleteListener = ocrEventEmitter.addListener('onOCRComplete', (result) => {
      console.log('\n✅ ========== OCR COMPLETED ==========');
      console.log('📊 OCR Result:', result);
      console.log('⏰ Time:', new Date().toISOString());
      
      setIsLoading(false);
      setOcrCompleted(true);
      setOcrResult(result);
      
      Alert.alert('OCR Success', 'OCR processing completed successfully! You can now proceed with liveness operations.');
      console.log('=====================================\n');
    });

    const ocrErrorListener = ocrEventEmitter.addListener('onOCRError', (error) => {
      console.log('\n❌ ========== OCR ERROR ==========');
      console.log('💬 Error Message:', error.message || error);
      console.log('⏰ Time:', new Date().toISOString());
      
      setIsLoading(false);
      Alert.alert('OCR Error', error.message || 'OCR processing failed');
      console.log('=================================\n');
    });

    return () => {
      faceRecognitionResultListener.remove();
      faceRecognitionFailureListener.remove();
      photoTakenListener.remove();
      selfieTakenListener.remove();
      activeLivenessResultListener.remove();
      activeLivenessFailureListener.remove();
      willDismissListener.remove();
      didDismissListener.remove();
      backButtonListener.remove();
      ocrCompleteListener.remove();
      ocrErrorListener.remove();
    };
  }, []);

  // Check permissions on component mount and configure UI
  useEffect(() => {
    checkLivenessPermissions();
    configureUIAndLocalization();
  }, []);

  // Configure UI settings and localization (adapted from Flutter)
  async function configureUIAndLocalization() {
    console.log('\n🎨 ========== CONFIGURING UI SETTINGS ==========');
    
    try {
      // Configure UI settings if available
      if (LivenessModule.configureUISettings) {
        console.log('🚀 Applying UI settings...');
        
        // Use current UI config if available, otherwise use defaults
        const uiSettings = currentUIConfig || {
          colors: {
            titleColor: "#FFFFFF", // Title's font color
            titleBG: "#844EE3", // Title's background color
            buttonErrorColor: "#FF3B30", // The color of the process when the operation fails
            buttonSuccessColor: "#4CD964", // The color of the process when the operation success
            buttonColor: "#844EE3", // Background color of the button
            buttonTextColor: "#FFFFFF", // Font color of the button text
            buttonErrorTextColor: "#FFFFFF", // Font color of the button text when the operation fails
            buttonSuccessTextColor: "#FFFFFF", // Font color of the button text when the operation success
            buttonBackColor: "#000000", // The color of back button
            footerTextColor: "#FFFFFF", // Footer label's font color
            checkmarkTintColor: "#FFFFFF", // The color of the checkmark
            backgroundColor: "#844EE3", // Background color of the view, currently used for the background of Active Liveness
          },
          dimensions: {
            buttonHeight: 48,
            buttonCornerRadius: 8,
            gestureFontSize: 20,
          },
          configs: {
            autoTake: true,
            backButtonEnabled: true,
            maskDetection: false,
            invertedAnimation: false,
          },
        };
        
        console.log('🎨 UI Settings to apply:', JSON.stringify(uiSettings, null, 2));
        
        await LivenessModule.configureUISettings(uiSettings);
        console.log('✅ UI settings configured successfully for liveness');
      }
    } catch (e) {
      console.log('❌ Failed to configure UI settings:', e);
    }

    // Configure localization
    console.log('\n🌍 ========== CONFIGURING LOCALIZATION ==========');
    try {
      if (LivenessModule.setLocalization) {
        console.log('🚀 Setting up English localization...');
        const customStrings = {
          // Active Liveness specific strings
          'udentifyface_active_liveness_footer_button_text_recording': 'Recording...',
          'udentifyface_active_liveness_footer_button_text_processing': 'Processing...',
          'udentifyface_active_liveness_footer_button_text_default': 'Center your face',
          'udentifyface_active_liveness_footer_button_text_result': 'Next Step',
          'udentifyface_active_liveness_footer_label_text_processing': 'Performing active liveness.\nPlease wait...',

          // Gesture instructions
          'udentifyface_gesture_text_move_head_to_left': 'Turn Left',
          'udentifyface_gesture_text_move_head_to_right': 'Turn Right',
          'udentifyface_gesture_text_move_head_to_up': 'Tilt Up',
          'udentifyface_gesture_text_move_head_to_down': 'Tilt Down',
          'udentifyface_gesture_text_blink_once': 'Blink once',
          'udentifyface_gesture_text_blink_twice': 'Blink twice',
          'udentifyface_gesture_text_blink_thrice': 'Blink 3 times',
          'udentifyface_gesture_text_smile': 'Smile',

          // General strings
          'udentifyface_header_text': 'Take Selfie',
          'udentifyface_footer_button_text_default': 'Take Selfie',
          'udentifyface_footer_button_text_progressing': 'Liveness Check',
          'udentifyface_footer_button_text_result': 'Liveness',

          // Face detection messages
          'udentifyface_message_face_too_big': 'Move Back',
          'udentifyface_message_face_too_small': 'Move Closer',
          'udentifyface_message_face_not_found': 'Face not found',
          'udentifyface_message_too_many_faces': 'Too many faces',
          'udentifyface_message_face_angled': 'Face to Camera',
          'udentifyface_message_head_angled': 'Face to Camera',
          'udentifyface_message_face_off_center': 'Center your face',
          'udentifyface_message_mask_detected': 'Remove Mask',
        };
        
        await LivenessModule.setLocalization('en', customStrings);
        console.log('✅ Localization configured successfully');
      }
    } catch (e) {
      console.log('❌ Failed to configure localization:', e);
    }
    console.log('=============================================\n');
  }

  // Permission request function
  async function requestLivenessPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        console.log('LivenessTab - Requesting Android permissions...');
        
        const permissions = [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ];

        // Add Bluetooth permission only on Android 12+
        if (Platform.Version >= 31) {
          permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
        }

        const grants = await PermissionsAndroid.requestMultiple(permissions);

        const cameraGranted = grants[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
        const phoneStateGranted = grants[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED;
        const audioGranted = grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;

        if (!cameraGranted) {
          Alert.alert('Permission Required', 'Camera permission is required for face recognition.');
          return false;
        }

        if (!phoneStateGranted) {
          Alert.alert('Permission Required', 'Phone state permission is required for the Udentify SDK.');
          return false;
        }

        if (!audioGranted) {
          Alert.alert('Permission Required', 'Audio permission is required for some liveness detection features.');
          return false;
        }

        return true;
      } catch (error) {
        console.error('LivenessTab - Permission request error:', error);
        return false;
      }
    }
    return true;
  }

  async function checkLivenessPermissions() {
    try {
      console.log('LivenessTab - 🔄 Checking liveness permissions...');
      
      const permissions = await checkPermissions();
      setPermissionStatus(permissions);
      
      console.log('LivenessTab - ✅ Permissions Status:', permissions);
    } catch (error) {
      console.error('LivenessTab - Permission Check Error:', error);
      Alert.alert('Permission Check Error', `${error}`);
    }
  }

  async function handleRequestPermissions() {
    try {
      console.log('LivenessTab - 🔄 Requesting permissions...');
      
      const permissions = await requestPermissions();
      setPermissionStatus(permissions);
      
      console.log('LivenessTab - ✅ Permissions Requested:', permissions);
      Alert.alert('Permissions Updated', 'Permission request completed. Check the status above.');
    } catch (error) {
      console.error('LivenessTab - Permission Request Error:', error);
      Alert.alert('Permission Request Error', `${error}`);
    }
  }

  // OCR Functions - Must be completed before liveness operations
  async function performOCRFirst(): Promise<boolean> {
    try {
      console.log('LivenessTab - 🔄 Starting real OCR scanning as prerequisite for liveness...');
      
      setIsLoading(true);
      
      // Check permissions first
      const hasPermissions = await requestLivenessPermissions();
      if (!hasPermissions) {
        Alert.alert('Error', 'Camera permissions are required for OCR scanning');
        return false;
      }
      
      // Get transaction ID that includes both OCR and Liveness modules
      const transactionID = await udentifyApiService.startTransaction([
        OCR_MODULES.OCR,
        OCR_MODULES.OCR_HOLOGRAM,
        'FACE_REGISTRATION',
        'FACE_AUTHENTICATION',
        'FACE_LIVENESS',
        'ACTIVE_LIVENESS'
      ]);
      
      if (!transactionID) {
        Alert.alert('Error', 'Failed to get transaction ID for OCR');
        setIsLoading(false);
        return false;
      }
      
      setCurrentTransactionID(transactionID);
      console.log('LivenessTab - ✅ Transaction ID for OCR+Liveness:', transactionID);
      
      // Start real OCR scanning with camera (like OCRTab.tsx)
      console.log('LivenessTab - 📸 Starting OCR camera scanning...');
      
      const success = await startOCRScanning(
        `${currentConfig.baseUrl}?apikey=${currentConfig.apiKey}`,
        transactionID,
        selectedDocumentType,
        selectedDocumentSide
      );
      
      if (success) {
        console.log('LivenessTab - 📸 Document scanned successfully, now calling performOCR...');
        
        const ocrResult = await performOCR(
          currentConfig.baseUrl,
          transactionID,
          '', // Empty front image (use stored from camera)
          '', // Empty back image (use stored from camera)  
          selectedDocumentType
        );
        
        console.log('LivenessTab - ✅ OCR Result:', ocrResult);
        setOcrResult(ocrResult);
        setOcrCompleted(true);
        setIsLoading(false);
        
        Alert.alert('OCR Success', 'OCR scanning completed successfully! You can now proceed with liveness operations.');
        return true;
      } else {
        Alert.alert('Error', 'Failed to start OCR scanning');
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('LivenessTab - OCR scanning failed:', error);
      Alert.alert('OCR Error', `OCR scanning failed: ${error}`);
      setIsLoading(false);
      return false;
    }
  }

  // Check if OCR has been completed before allowing liveness operations
  function checkOCRDependency(): boolean {
    if (!ocrCompleted) {
      Alert.alert(
        'OCR Required', 
        'Please complete OCR scanning first. OCR is required before liveness operations can proceed.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start OCR', onPress: performOCRFirst }
        ]
      );
      return false;
    }
    return true;
  }

  // Get transaction ID from server using correct API endpoint
  async function getTransactionIdFromServer(): Promise<string | null> {
    try {
      console.log('🎯 Getting transaction ID from server...');
      console.log('📡 API Endpoint:', `${currentConfig.baseUrl}/transaction/start`);
      console.log('🔑 Using API Key:', currentConfig.apiKey);
      
      const response = await fetch(`${currentConfig.baseUrl}/transaction/start`, {
        method: 'POST',
        headers: {
          'X-Api-Key': currentConfig.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request: "",
          qrGenerate: true,
          qrSize: 200,
          moduleList: [
            "OCR", 
            "OCR_HOLOGRAM", 
            "FACE_REGISTRATION",
            "FACE_AUTHENTICATION",
            "FACE_LIVENESS",
            "ACTIVE_LIVENESS"
          ]
        }),
      });

      console.log('📡 Response Status:', response.status);
      console.log('📡 Response Headers:', response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Full Response Data:', data);
        
        // Try different possible field names for transaction ID
        const transactionId = data.transactionId || data.transaction_id || data.id || data.txId || 
                              (data.response && data.response.id);
        
        if (transactionId) {
          console.log('✅ Transaction ID received from server:', transactionId);
          return transactionId;
        } else {
          console.log('❌ No transaction ID found in response:', data);
          return null;
        }
      } else {
        const errorText = await response.text();
        console.log('❌ Failed to get transaction ID from server:', response.status);
        console.log('❌ Error Response:', errorText);
        return null;
      }
    } catch (error) {
      console.log('❌ Error getting transaction ID from server:', error);
      return null;
    }
  }

  // Generate fallback transaction ID
  function generateTransactionID(): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `liveness_${timestamp}_${randomSuffix}`;
  }

  // Create face recognizer credentials
  async function createCredentials(): Promise<FaceRecognizerCredentials | null> {
    let transactionID;
    
    // If OCR is completed, use the existing transaction ID
    if (ocrCompleted && currentTransactionID) {
      console.log('✅ Using existing OCR transaction ID for liveness:', currentTransactionID);
      transactionID = currentTransactionID;
    } else {
      // Try to get transaction ID from server first (like Flutter)
      transactionID = await getTransactionIdFromServer();
      
      // If server call fails, generate locally as fallback
      if (!transactionID) {
        console.log('⚠️ Server transaction ID failed, using local generation');
        transactionID = generateTransactionID();
      }
      
      setCurrentTransactionID(transactionID);
    }
    
    return {
      serverURL: currentConfig.baseUrl,  // Use config server URL
      transactionID: transactionID,
      userID: selectedUserID,
      // Use optimal defaults for testing (matching Flutter)
      autoTake: true,
      errorDelay: 0.10,
      successDelay: 0.75,
      runInBackground: false,
      blinkDetectionEnabled: false,  // Match Flutter setting
      requestTimeout: 10,  // Match Flutter setting
      eyesOpenThreshold: 0.75,
      maskConfidence: 0.95,
      invertedAnimation: false,
      activeLivenessAutoNextEnabled: true,
    };
  }

  // UI Configuration handlers
  const handleUIConfigApply = async (config: any) => {
    try {
      console.log('🎨 Applying new UI configuration:', JSON.stringify(config, null, 2));
      
      // Store the configuration for future use
      setCurrentUIConfig(config);
      
      // Apply the configuration immediately
      if (LivenessModule.configureUISettings) {
        const result = await LivenessModule.configureUISettings(config);
        console.log('✅ UI configuration result:', result);
        
        if (Platform.OS === 'android') {
          // Handle Android limitation
          Alert.alert(
            'Android UI Customization', 
            'Android UdentifyFACE SDK only supports static XML resource customization.\n\n' +
            'Dynamic UI changes are not supported on Android. Check the console logs for XML update instructions.\n\n' +
            'For dynamic UI customization, please use iOS platform.',
            [
              { text: 'View Instructions', onPress: () => showAndroidInstructions(config) },
              { text: 'OK' }
            ]
          );
        } else {
          // iOS supports dynamic UI changes
          Alert.alert(
            'UI Updated', 
            'Your UI customization has been applied. The changes will be visible in the next face recognition session.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('Error', 'UI configuration is not available in this module version.');
      }
    } catch (error) {
      console.error('❌ Failed to apply UI configuration:', error);
      Alert.alert('Error', `Failed to apply UI configuration: ${error}`);
    }
  };

  const showAndroidInstructions = (config: any) => {
    let instructions = 'To customize UI on Android, update these XML files:\n\n';
    
    if (config.colors) {
      instructions += '📁 android/app/src/main/res/values/colors.xml:\n';
      if (config.colors.buttonColor) {
        instructions += `<color name="udentifyface_btn_color">${config.colors.buttonColor}</color>\n`;
      }
      if (config.colors.backgroundColor) {
        instructions += `<color name="udentifyface_bg_color">${config.colors.backgroundColor}</color>\n`;
      }
      instructions += '\n';
    }
    
    if (config.dimensions) {
      instructions += '📁 android/app/src/main/res/values/dimens.xml:\n';
      if (config.dimensions.buttonHeight) {
        instructions += `<dimen name="udentify_selfie_button_height">${config.dimensions.buttonHeight}dp</dimen>\n`;
      }
      instructions += '\n';
    }
    
    instructions += 'Then rebuild: npm run android';
    
    Alert.alert('Android XML Instructions', instructions, [{ text: 'Copy to Clipboard' }, { text: 'OK' }]);
  };

  // Re-apply configuration whenever currentUIConfig changes
  useEffect(() => {
    if (currentUIConfig) {
      configureUIAndLocalization();
    }
  }, [currentUIConfig]);

  // User Registration State Management Functions
  const markUserAsRegistered = (userID: string, transactionID: string, method: string = 'registration') => {
    console.log(`\n🎯 ========== MARKING USER AS REGISTERED ==========`);
    console.log(`👤 User ID: ${userID}`);
    console.log(`🆔 Transaction ID: ${transactionID}`);
    console.log(`🔧 Method: ${method}`);
    console.log(`📱 Platform: ${Platform.OS}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    
    const newRegistrationData = {
      isRegistered: true,
      registrationTransactionID: transactionID,
      registrationDate: new Date().toISOString(),
      registrationMethod: method
    };
    
    console.log(`📝 Registration data to save:`, newRegistrationData);
    
    setUserRegistrationStatus(prev => {
      const newState = {
        ...prev,
        [userID]: newRegistrationData
      };
      
      console.log(`🔄 Previous registration state:`, prev);
      console.log(`✅ New registration state:`, newState);
      console.log(`🎯 User ${userID} will be marked as: ${newState[userID].isRegistered ? 'REGISTERED' : 'NOT REGISTERED'}`);
      console.log(`===============================================\n`);
      
      return newState;
    });
  };

  const checkUserRegistrationStatus = (userID: string): boolean => {
    const userStatus = userRegistrationStatus[userID];
    const isRegistered = userStatus?.isRegistered ?? false;
    console.log(`\n🔍 ========== CHECKING USER REGISTRATION STATUS ==========`);
    console.log(`👤 User ID: ${userID}`);
    console.log(`📊 Current registration state:`, userRegistrationStatus);
    console.log(`🎯 User status object:`, userStatus);
    console.log(`✅ Is registered: ${isRegistered ? 'REGISTERED' : 'NOT REGISTERED'}`);
    console.log(`📱 Platform: ${Platform.OS}`);
    console.log(`===========================================================\n`);
    return isRegistered;
  };

  const getUserRegistrationInfo = (userID: string) => {
    return userRegistrationStatus[userID] || null;
  };

  const clearAllRegistrationData = () => {
    console.log('LivenessTab - 🗑️ Clearing all registration data');
    setUserRegistrationStatus({});
  };

  // Face Recognition Functions
  async function testFaceRecognitionRegistration() {
    try {
      // Check OCR dependency first
      if (!checkOCRDependency()) {
        return;
      }
      
      setIsLoading(true);
      
      const hasPermissions = await requestLivenessPermissions();
      if (!hasPermissions) {
        Alert.alert('Error', 'Required permissions are not granted');
        return;
      }
      
      console.log('LivenessTab - 🔄 Starting face recognition registration...');
      
      const credentials = await createCredentials();
      if (!credentials) {
        Alert.alert('Error', 'Failed to get transaction ID');
        return;
      }
      const result = await startFaceRecognitionRegistration(credentials);
      
      console.log('LivenessTab - ✅ Face Recognition Registration Result:', result);
      setFaceRecognitionResult(result);
      
      // Don't show success alert here - wait for actual SDK results via event listeners
      // Registration failures are logged but not shown as alerts to users
    } catch (error) {
      console.error('LivenessTab - Face Recognition Registration Error:', error);
      // Registration errors are logged but not shown as alerts to users
    } finally {
      setIsLoading(false);
    }
  }

  async function testFaceRecognitionAuthentication() {
    try {
      // Check OCR dependency first
      if (!checkOCRDependency()) {
        return;
      }

      // ✅ NEW: Check if user is registered before authentication
      const isUserRegistered = checkUserRegistrationStatus(selectedUserID);
      if (!isUserRegistered) {
        Alert.alert(
          'Registration Required', 
          `User "${selectedUserID}" must be registered before authentication.\n\nPlease complete face recognition registration first.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register Now', onPress: testFaceRecognitionRegistration }
          ]
        );
        return;
      }
      
      setIsLoading(true);
      
      const hasPermissions = await requestLivenessPermissions();
      if (!hasPermissions) {
        Alert.alert('Error', 'Required permissions are not granted');
        return;
      }
      
      console.log('LivenessTab - 🔄 Starting face recognition authentication...');
      
      const credentials = await createCredentials();
      if (!credentials) {
        Alert.alert('Error', 'Failed to get transaction ID');
        return;
      }
      const result = await startFaceRecognitionAuthentication(credentials);
      
      console.log('LivenessTab - ✅ Face Recognition Authentication Result:', result);
      setFaceRecognitionResult(result);
      
      // Don't show success alert here - wait for actual SDK results via event listeners
      // Authentication failures are logged but not shown as alerts to users
    } catch (error) {
      console.error('LivenessTab - Face Recognition Authentication Error:', error);
      // Authentication errors are logged but not shown as alerts to users
    } finally {
      setIsLoading(false);
    }
  }

  async function testActiveLiveness() {
    console.log('\n🎭 ========== STARTING ACTIVE LIVENESS ==========');
    console.log('⏰ Start Time:', new Date().toISOString());

    try {
      // Check OCR dependency first
      if (!checkOCRDependency()) {
        return;
      }

      // ✅ NEW: Check registration status for authentication mode
      if (selectedOperation === 'authentication') {
        const isUserRegistered = checkUserRegistrationStatus(selectedUserID);
        if (!isUserRegistered) {
          Alert.alert(
            'Registration Required for Authentication', 
            `User "${selectedUserID}" must be registered before active liveness authentication.\n\nPlease complete face recognition registration first.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Register First', onPress: testFaceRecognitionRegistration },
              { text: 'Switch to Registration', onPress: () => setSelectedOperation('registration') }
            ]
          );
          return;
        }
        console.log(`✅ User ${selectedUserID} is registered, proceeding with authentication mode`);
      } else {
        console.log(`🆕 Registration mode selected for user ${selectedUserID}`);
      }
      
      if (!permissionStatus || permissionStatus.camera !== 'granted') {
        console.log('❌ Permissions not granted, requesting...');
        const hasPermissions = await requestLivenessPermissions();
        if (!hasPermissions) {
          Alert.alert('Error', 'Required permissions are not granted');
          return;
        }
      }

      console.log('✅ Permissions granted, proceeding...');
      setIsLoading(true);
      
      console.log('🔧 Building credentials...');
      const credentials = await createCredentials();
      if (!credentials) {
        Alert.alert('Error', 'Failed to get transaction ID');
        return;
      }
      
      console.log('✅ Credentials built successfully');
      console.log('🚀 Launching Active Liveness with credentials:');
      console.log('   🌐 Server URL:', credentials.serverURL);
      console.log('   🆔 Transaction ID:', credentials.transactionID);
      console.log('   👤 User ID:', credentials.userID);
      console.log('   ⚡ Auto Take:', credentials.autoTake);
      console.log('   🔄 Auto Next:', credentials.activeLivenessAutoNextEnabled);
      
      const isAuthentication = selectedOperation === 'authentication';
      const result = await startActiveLiveness(credentials, isAuthentication);
      
      console.log('✅ Active Liveness call completed, result received');
      setLivenessResult(result);
      
      // Don't show success alert here - wait for actual SDK results via event listeners
      // Active liveness failures are logged but not shown as alerts to users
    } catch (error) {
      console.log('❌ Active Liveness failed with exception:', error);
      console.log('📋 Exception type:', typeof error);
      // Active liveness errors are logged but not shown as alerts to users
    } finally {
      setIsLoading(false);
    }
    console.log('============================================\n');
  }

  async function testHybridLiveness() {
    try {
      // Check OCR dependency first
      if (!checkOCRDependency()) {
        return;
      }

      // ✅ NEW: Check registration status for authentication mode
      if (selectedOperation === 'authentication') {
        const isUserRegistered = checkUserRegistrationStatus(selectedUserID);
        if (!isUserRegistered) {
          Alert.alert(
            'Registration Required for Authentication', 
            `User "${selectedUserID}" must be registered before hybrid liveness authentication.\n\nPlease complete face recognition registration first.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Register First', onPress: testFaceRecognitionRegistration },
              { text: 'Switch to Registration', onPress: () => setSelectedOperation('registration') }
            ]
          );
          return;
        }
        console.log(`✅ User ${selectedUserID} is registered, proceeding with hybrid liveness authentication`);
      } else {
        console.log(`🆕 Hybrid liveness registration mode for user ${selectedUserID}`);
      }
      
      setIsLoading(true);
      
      const hasPermissions = await requestLivenessPermissions();
      if (!hasPermissions) {
        Alert.alert('Error', 'Required permissions are not granted');
        return;
      }
      
      console.log('LivenessTab - 🔄 Starting hybrid liveness detection...');
      
      const credentials = await createCredentials();
      if (!credentials) {
        Alert.alert('Error', 'Failed to get transaction ID');
        return;
      }
      const isAuthentication = selectedOperation === 'authentication';
      const result = await startHybridLiveness(credentials, isAuthentication);
      
      console.log('LivenessTab - ✅ Hybrid Liveness Result:', result);
      setLivenessResult(result);
      
      // Don't show success alert here - wait for actual SDK results via event listeners
      // Hybrid liveness failures are logged but not shown as alerts to users
    } catch (error) {
      console.error('LivenessTab - Hybrid Liveness Error:', error);
      // Hybrid liveness errors are logged but not shown as alerts to users
    } finally {
      setIsLoading(false);
    }
  }

  async function testCancelFaceRecognition() {
    try {
      console.log('LivenessTab - 🔄 Cancelling face recognition...');
      
      await cancelFaceRecognition();
      setIsLoading(false);
      setIsSelfieCapturing(false);
      
      console.log('LivenessTab - ✅ Face recognition cancelled successfully');
      // Cancellation is logged but not shown as alert to users
    } catch (error) {
      console.error('LivenessTab - Cancel Face Recognition Error:', error);
      // Cancel errors are logged but not shown as alerts to users
    }
  }

  // ✨ NEW: Selfie Testing Functions
  async function testSelfieCapture() {
    try {
      console.log('\n🤳 ========== STARTING SELFIE CAPTURE ==========');
      console.log('⏰ Start Time:', new Date().toISOString());
      console.log('👤 User ID:', selectedUserID);
      console.log('📋 Operation Type:', selfieOperation);

      // Check OCR dependency first
      if (!checkOCRDependency()) {
        return;
      }

      // Check registration status for authentication mode
      if (selfieOperation === 'authentication') {
        const isUserRegistered = checkUserRegistrationStatus(selectedUserID);
        if (!isUserRegistered) {
          Alert.alert(
            'Registration Required for Selfie Authentication', 
            `User "${selectedUserID}" must be registered before selfie authentication.\n\nPlease complete face recognition registration first.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Register First', onPress: testFaceRecognitionRegistration },
              { text: 'Switch to Registration', onPress: () => setSelfieOperation('registration') }
            ]
          );
          return;
        }
        console.log(`✅ User ${selectedUserID} is registered, proceeding with selfie authentication`);
      } else {
        console.log(`🆕 Selfie registration mode for user ${selectedUserID}`);
      }

      setIsSelfieCapturing(true);
      
      const hasPermissions = await requestLivenessPermissions();
      if (!hasPermissions) {
        Alert.alert('Error', 'Required permissions are not granted');
        setIsSelfieCapturing(false);
        return;
      }

      console.log('🔧 Building credentials for selfie capture...');
      const credentials = await createCredentials();
      if (!credentials) {
        Alert.alert('Error', 'Failed to get transaction ID');
        setIsSelfieCapturing(false);
        return;
      }
      
      console.log('✅ Credentials built successfully');
      console.log('🚀 Launching Selfie Capture with credentials:');
      console.log('   🌐 Server URL:', credentials.serverURL);
      console.log('   🆔 Transaction ID:', credentials.transactionID);
      console.log('   👤 User ID:', credentials.userID);
      
      const result = await startSelfieCapture(credentials);
      
      console.log('✅ Selfie capture started successfully');
      console.log('📊 Result:', result);
      console.log('⏳ Waiting for selfie to be captured...');
      
      // Don't show success alert here - wait for selfie capture via event listener
    } catch (error) {
      console.log('❌ Selfie capture failed with exception:', error);
      setIsSelfieCapturing(false);
      Alert.alert('Selfie Capture Error', `Failed to start selfie capture: ${error}`);
    }
    console.log('==============================================\n');
  }

  async function handleProcessCapturedSelfie() {
    try {
      console.log('\n🔄 ========== PROCESSING CAPTURED SELFIE ==========');
      console.log('⏰ Start Time:', new Date().toISOString());
      console.log('👤 User ID:', selectedUserID);
      console.log('📋 Operation Type:', selfieOperation);
      console.log('📷 Selfie Image State:', capturedSelfieImage ? 'EXISTS' : 'NULL/UNDEFINED');
      console.log('📷 Selfie Image Type:', typeof capturedSelfieImage);
      console.log('📷 Selfie Image Size:', capturedSelfieImage?.length || 0, 'characters');
      
      if (capturedSelfieImage && capturedSelfieImage.length > 0) {
        console.log('📷 Selfie preview (first 50 chars):', capturedSelfieImage.substring(0, 50) + '...');
      } else {
        console.log('❌ No valid selfie image in state');
        console.log('❌ State value:', capturedSelfieImage);
      }

      if (!capturedSelfieImage) {
        console.log('❌ ABORTING: No selfie image available');
        Alert.alert('Error', 'No selfie image available. Please capture a selfie first.');
        return;
      }

      setIsLoading(true);

      console.log('🔧 Building credentials for selfie processing...');
      const credentials = await createCredentials();
      if (!credentials) {
        Alert.alert('Error', 'Failed to get transaction ID');
        setIsLoading(false);
        return;
      }

      console.log('✅ Credentials built successfully');
      console.log('🚀 Processing selfie with Face Recognition API...');
      console.log('   🌐 Server URL:', credentials.serverURL);
      console.log('   🆔 Transaction ID:', credentials.transactionID);
      console.log('   👤 User ID:', credentials.userID);
      console.log('   🔐 Is Authentication:', selfieOperation === 'authentication');

      const isAuthentication = selfieOperation === 'authentication';
      const result = await performFaceRecognitionWithSelfie(credentials, capturedSelfieImage, isAuthentication);
      
      console.log('✅ Selfie processing completed');
      console.log('📊 Result:', result);
      
      setSelfieResult(result);
      
      // Note: Event listeners are only triggered for camera-based operations, not API-based selfie processing
      Alert.alert(
        'Selfie Processing Completed',
        `The selfie has been processed successfully.\n\nOperation: ${selfieOperation}\nStatus: ${result.status || 'Unknown'}\n\nCheck the console logs and result section for detailed information.`
      );

    } catch (error) {
      console.log('❌ Selfie processing failed with exception:', error);
      Alert.alert('Selfie Processing Error', `Failed to process selfie: ${error}`);
    } finally {
      setIsLoading(false);
    }
    console.log('================================================\n');
  }

  function clearCapturedSelfie() {
    console.log('🗑️ Clearing captured selfie image');
    setCapturedSelfieImage(null);
    setSelfieResult(null);
    Alert.alert('Selfie Cleared', 'Captured selfie image has been cleared. You can capture a new one.');
  }

  // Prepare options for pickers
  const operationOptions = [
    { value: 'registration', label: 'Registration' },
    { value: 'authentication', label: 'Authentication' },
  ];

  // ✨ NEW: Selfie operation options
  const selfieOperationOptions = [
    { value: 'registration', label: 'Registration' },
    { value: 'authentication', label: 'Authentication' },
  ];

  // OCR options (same as OCRTab.tsx)
  const documentTypeOptions = Object.entries(DOCUMENT_TYPES).map(([key, value]) => ({
    value: value,
    label: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
  }));

  const documentSideOptions = Object.entries(DOCUMENT_SIDES).map(([key, value]) => ({
    value: value,
    label: key.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
  }));

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Permission Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permission Status</Text>
          
          {permissionStatus && (
            <View style={styles.permissionContainer}>
              <Text style={[styles.permissionText, permissionStatus.camera === 'granted' ? styles.permissionGranted : styles.permissionDenied]}>
                Camera: {permissionStatus.camera}
              </Text>
              <Text style={[styles.permissionText, permissionStatus.readPhoneState === 'granted' ? styles.permissionGranted : styles.permissionDenied]}>
                Phone State: {permissionStatus.readPhoneState}
              </Text>
              <Text style={[styles.permissionText, permissionStatus.internet === 'granted' ? styles.permissionGranted : styles.permissionDenied]}>
                Internet: {permissionStatus.internet}
              </Text>
              {permissionStatus.recordAudio && (
                <Text style={[styles.permissionText, permissionStatus.recordAudio === 'granted' ? styles.permissionGranted : styles.permissionDenied]}>
                  Audio: {permissionStatus.recordAudio}
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            <Button 
              color={'blue'} 
              title="Check Permissions" 
              onPress={checkLivenessPermissions}
              disabled={isLoading}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              color={'orange'} 
              title="Request Permissions" 
              onPress={handleRequestPermissions}
              disabled={isLoading}
            />
          </View>
        </View>

        {/* OCR Prerequisite Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OCR Prerequisite</Text>
          
          <View style={[styles.statusContainer, ocrCompleted ? styles.statusCompleted : styles.statusPending]}>
            <Text style={[styles.statusText, ocrCompleted ? styles.statusTextCompleted : styles.statusTextPending]}>
              {ocrCompleted ? '✅ OCR Completed' : '⏳ OCR Required'}
            </Text>
            <Text style={styles.statusDescription}>
              {ocrCompleted 
                ? 'OCR scanning has been completed. Liveness operations are now available.'
                : 'OCR scanning must be completed before liveness operations can proceed.'
              }
            </Text>
          </View>
          
          {!ocrCompleted && (
            <View style={styles.buttonContainer}>
              <Button 
                color={'green'} 
                title={isLoading ? "Scanning..." : "Perform OCR First"} 
                onPress={performOCRFirst}
                disabled={isLoading}
              />
            </View>
          )}
          
          {ocrResult && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                🆔 Transaction ID: {ocrResult.transactionID || currentTransactionID}
              </Text>
            </View>
          )}
        </View>

        {/* OCR Configuration Section (only show when OCR not completed) */}
        {!ocrCompleted && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OCR Document Configuration</Text>
            
            <OptionPicker
              label="Document Type"
              options={documentTypeOptions}
              selectedValue={selectedDocumentType}
              onValueChange={setSelectedDocumentType}
              placeholder="Select Document Type"
            />
            
            <OptionPicker
              label="Document Side"
              options={documentSideOptions}
              selectedValue={selectedDocumentSide}
              onValueChange={setSelectedDocumentSide}
              placeholder="Select Document Side"
            />
          </View>
        )}

        {/* User Registration Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Registration Status</Text>
          
          {Object.keys(userRegistrationStatus).length > 0 ? (
            Object.entries(userRegistrationStatus).map(([userID, status]) => (
              <View key={userID} style={[styles.statusContainer, status.isRegistered ? styles.statusCompleted : styles.statusPending]}>
                <Text style={[styles.statusText, status.isRegistered ? styles.statusTextCompleted : styles.statusTextPending]}>
                  {status.isRegistered ? '✅' : '⏳'} User {userID}
                </Text>
                <Text style={styles.statusDescription}>
                  {status.isRegistered 
                    ? `Registered on ${new Date(status.registrationDate!).toLocaleDateString()} via ${status.registrationMethod}`
                    : 'Not registered - Authentication will fail'
                  }
                </Text>
                {status.isRegistered && status.registrationTransactionID && (
                  <Text style={styles.transactionText}>
                    Transaction: {status.registrationTransactionID}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <View style={[styles.statusContainer, styles.statusPending]}>
              <Text style={[styles.statusText, styles.statusTextPending]}>
                ⚠️ No users registered yet
              </Text>
              <Text style={styles.statusDescription}>
                Please complete face recognition registration before attempting authentication or active liveness with authentication mode.
              </Text>
            </View>
          )}

          {/* Current User Status Indicator */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              🎯 Selected User: {selectedUserID} - {checkUserRegistrationStatus(selectedUserID) ? '✅ REGISTERED' : '❌ NOT REGISTERED'}
            </Text>
            {!checkUserRegistrationStatus(selectedUserID) && selectedOperation === 'authentication' && (
              <Text style={[styles.infoText, { color: '#f57c00' }]}>
                ⚠️ Authentication will fail for unregistered user
              </Text>
            )}
          </View>

          {/* Clear Registration Data Button (for testing) */}
          {Object.keys(userRegistrationStatus).length > 0 && (
            <View style={styles.buttonContainer}>
              <Button 
                color={'#dc3545'} 
                title="🗑️ Clear Registration Data (Testing)" 
                onPress={() => {
                  Alert.alert(
                    'Clear Registration Data',
                    'This will clear all user registration data. Use this for testing purposes only.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear All', style: 'destructive', onPress: clearAllRegistrationData }
                    ]
                  );
                }}
                disabled={isLoading}
              />
            </View>
          )}
        </View>

        {/* Configuration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liveness Configuration</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>User ID</Text>
            <TextInput
              style={styles.textInput}
              value={selectedUserID}
              onChangeText={setSelectedUserID}
              placeholder="Enter User ID"
              placeholderTextColor="#999"
            />
          </View>
          
          <OptionPicker
            label="Operation Type (for Active & Hybrid Liveness)"
            options={operationOptions}
            selectedValue={selectedOperation}
            onValueChange={setSelectedOperation}
            placeholder="Select Operation"
          />

          <View style={styles.buttonContainer}>
            <Button 
              color={'#844EE3'} 
              title="🎨 Customize UI" 
              onPress={() => setUiModalVisible(true)}
              disabled={isLoading}
            />
          </View>
          
          {currentUIConfig && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                ✨ Custom UI configuration is active
              </Text>
            </View>
          )}
        </View>

        {/* Testing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Face Recognition & Liveness Testing</Text>
          
          <View style={styles.buttonContainer}>
            <Button 
              color={ocrCompleted ? 'green' : '#cccccc'} 
              title={isLoading ? "Processing..." : ocrCompleted ? "Test Face Registration" : "OCR Required - Face Registration"} 
              onPress={testFaceRecognitionRegistration}
              disabled={isLoading || !ocrCompleted}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              color={ocrCompleted && checkUserRegistrationStatus(selectedUserID) ? 'blue' : '#cccccc'} 
              title={isLoading ? "Processing..." : !ocrCompleted ? "OCR Required - Face Authentication" : !checkUserRegistrationStatus(selectedUserID) ? "Registration Required - Face Authentication" : "Test Face Authentication"} 
              onPress={testFaceRecognitionAuthentication}
              disabled={isLoading || !ocrCompleted || !checkUserRegistrationStatus(selectedUserID)}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              color={ocrCompleted && (selectedOperation === 'registration' || checkUserRegistrationStatus(selectedUserID)) ? 'purple' : '#cccccc'} 
              title={isLoading ? "Processing..." : !ocrCompleted ? "OCR Required - Active Liveness" : selectedOperation === 'authentication' && !checkUserRegistrationStatus(selectedUserID) ? "Registration Required - Active Liveness" : "Test Active Liveness"} 
              onPress={testActiveLiveness}
              disabled={isLoading || !ocrCompleted || (selectedOperation === 'authentication' && !checkUserRegistrationStatus(selectedUserID))}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              color={ocrCompleted && (selectedOperation === 'registration' || checkUserRegistrationStatus(selectedUserID)) ? 'orange' : '#cccccc'} 
              title={isLoading ? "Processing..." : !ocrCompleted ? "OCR Required - Hybrid Liveness" : selectedOperation === 'authentication' && !checkUserRegistrationStatus(selectedUserID) ? "Registration Required - Hybrid Liveness" : "Test Hybrid Liveness"} 
              onPress={testHybridLiveness}
              disabled={isLoading || !ocrCompleted || (selectedOperation === 'authentication' && !checkUserRegistrationStatus(selectedUserID))}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              color={'red'} 
              title="Cancel Recognition" 
              onPress={testCancelFaceRecognition}
              disabled={!isLoading}
            />
          </View>

          {isLoading && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                🎯 Face recognition/liveness operation is in progress...
              </Text>
            </View>
          )}
          
          {!ocrCompleted && (
            <View style={[styles.infoContainer, { backgroundColor: '#fff3e0', borderLeftColor: '#ff9800' }]}>
              <Text style={[styles.infoText, { color: '#f57c00' }]}>
                ⚠️ OCR scanning must be completed first before accessing liveness features
              </Text>
            </View>
          )}

          {ocrCompleted && selectedOperation === 'authentication' && !checkUserRegistrationStatus(selectedUserID) && (
            <View style={[styles.infoContainer, { backgroundColor: '#ffeaa7', borderLeftColor: '#fdcb6e' }]}>
              <Text style={[styles.infoText, { color: '#e17055' }]}>
                🔐 Authentication Mode requires prior Registration
              </Text>
              <Text style={[styles.infoText, { color: '#636e72', fontSize: 12, marginTop: 4 }]}>
                Complete "Test Face Registration" first, then authentication will be enabled for this user.
              </Text>
            </View>
          )}

          {ocrCompleted && Object.keys(userRegistrationStatus).length === 0 && (
            <View style={[styles.infoContainer, { backgroundColor: '#e8f5e8', borderLeftColor: '#4caf50' }]}>
              <Text style={[styles.infoText, { color: '#2e7d32' }]}>
                📝 Getting Started: Complete Face Registration first
              </Text>
              <Text style={[styles.infoText, { color: '#636e72', fontSize: 12, marginTop: 4 }]}>
                1. Start with "Test Face Registration" ✅{'\n'}
                2. Then use "Test Face Authentication" or Active/Hybrid Liveness
              </Text>
            </View>
          )}
        </View>

        {/* ✨ NEW: Selfie Testing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤳 Selfie Capture & Manual Processing</Text>
          
          <View style={styles.infoContainer}>
            <Text style={[styles.infoText, { fontSize: 13, marginBottom: 8 }]}>
              📝 <Text style={{ fontWeight: '600' }}>How Selfie Works:</Text>
            </Text>
            <Text style={[styles.infoText, { fontSize: 12, color: '#666', lineHeight: 18 }]}>
              1. 📸 <Text style={{ fontWeight: '500' }}>Capture:</Text> Opens camera, takes photo, closes camera{'\n'}
              2. 📋 <Text style={{ fontWeight: '500' }}>Review:</Text> You can review the captured selfie{'\n'}
              3. 🔄 <Text style={{ fontWeight: '500' }}>Process:</Text> Manually trigger face recognition API when ready{'\n'}
              4. ⚡ <Text style={{ fontWeight: '500' }}>Control:</Text> Full control over timing and operation type
            </Text>
          </View>

          {/* Selfie Operation Configuration */}
          <OptionPicker
            label="Selfie Operation Type"
            options={selfieOperationOptions}
            selectedValue={selfieOperation}
            onValueChange={(value) => setSelfieOperation(value as 'registration' | 'authentication')}
            placeholder="Select Selfie Operation"
          />

          {/* Selfie Status Display */}
          <View style={[styles.statusContainer, capturedSelfieImage ? styles.statusCompleted : styles.statusPending]}>
            <Text style={[styles.statusText, capturedSelfieImage ? styles.statusTextCompleted : styles.statusTextPending]}>
              {capturedSelfieImage ? '✅ Selfie Captured' : '📸 No Selfie Captured'}
            </Text>
            <Text style={styles.statusDescription}>
              {capturedSelfieImage 
                ? `Selfie is ready for ${selfieOperation} processing. Image size: ${capturedSelfieImage.length} characters.`
                : 'Capture a selfie first, then you can process it manually for face recognition.'
              }
            </Text>
          </View>

          {/* Selfie Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button 
              color={ocrCompleted && (selfieOperation === 'registration' || checkUserRegistrationStatus(selectedUserID)) ? '#FF6B35' : '#cccccc'} 
              title={isSelfieCapturing ? "Capturing Selfie..." : !ocrCompleted ? "OCR Required - Capture Selfie" : selfieOperation === 'authentication' && !checkUserRegistrationStatus(selectedUserID) ? "Registration Required - Capture Selfie" : "📸 Capture Selfie"} 
              onPress={testSelfieCapture}
              disabled={isSelfieCapturing || isLoading || !ocrCompleted || (selfieOperation === 'authentication' && !checkUserRegistrationStatus(selectedUserID))}
            />
          </View>

          {capturedSelfieImage && (
            <>
              <View style={styles.buttonContainer}>
                <Button 
                  color={'#4CAF50'} 
                  title={isLoading ? "Processing Selfie..." : `🔄 Process Selfie (${selfieOperation})`} 
                  onPress={handleProcessCapturedSelfie}
                  disabled={isLoading || isSelfieCapturing}
                />
              </View>

              <View style={styles.buttonContainer}>
                <Button 
                  color={'#FFC107'} 
                  title="📷 Preview Selfie" 
                  onPress={() => {
                    Alert.alert(
                      'Captured Selfie Preview',
                      `Image captured for: ${selectedUserID}\nOperation: ${selfieOperation}\nSize: ${capturedSelfieImage.length} characters\n\nImage data: ${capturedSelfieImage.substring(0, 100)}...`,
                      [{ text: 'OK' }]
                    );
                  }}
                  disabled={isLoading || isSelfieCapturing}
                />
              </View>

              <View style={styles.buttonContainer}>
                <Button 
                  color={'#f44336'} 
                  title="🗑️ Clear Selfie" 
                  onPress={clearCapturedSelfie}
                  disabled={isLoading || isSelfieCapturing}
                />
              </View>
            </>
          )}

          {/* Selfie Operation Warnings */}
          {!ocrCompleted && (
            <View style={[styles.infoContainer, { backgroundColor: '#fff3e0', borderLeftColor: '#ff9800' }]}>
              <Text style={[styles.infoText, { color: '#f57c00' }]}>
                ⚠️ OCR scanning must be completed first before selfie capture
              </Text>
            </View>
          )}

          {ocrCompleted && selfieOperation === 'authentication' && !checkUserRegistrationStatus(selectedUserID) && (
            <View style={[styles.infoContainer, { backgroundColor: '#ffeaa7', borderLeftColor: '#fdcb6e' }]}>
              <Text style={[styles.infoText, { color: '#e17055' }]}>
                🔐 Selfie Authentication requires prior Registration
              </Text>
              <Text style={[styles.infoText, { color: '#636e72', fontSize: 12, marginTop: 4 }]}>
                Complete "Test Face Registration" first, or switch to Registration mode for selfie.
              </Text>
            </View>
          )}

          {isSelfieCapturing && (
            <View style={[styles.infoContainer, { backgroundColor: '#e3f2fd', borderLeftColor: '#2196f3' }]}>
              <Text style={[styles.infoText, { color: '#1976d2' }]}>
                📸 Selfie capture in progress... The camera will open and close automatically after taking the photo.
              </Text>
            </View>
          )}
        </View>

        {/* Transaction ID Section */}
        {currentTransactionID && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Transaction</Text>
            <Text style={styles.transactionText}>
              ID: {currentTransactionID}
            </Text>
          </View>
        )}

        {/* Face Recognition Results Section */}
        {faceRecognitionResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Face Recognition Result</Text>
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>
                {JSON.stringify(faceRecognitionResult, null, 2)}
              </Text>
            </View>
          </View>
        )}

        {/* OCR Results Section */}
        {ocrResult && ocrCompleted && (
          <View style={styles.section}>
            <OCRResultCard result={ocrResult} />
          </View>
        )}

        {/* Liveness Results Section */}
        {livenessResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Liveness Detection Result</Text>
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>
                {JSON.stringify(livenessResult, null, 2)}
              </Text>
            </View>
          </View>
        )}

        {/* ✨ NEW: Captured Selfie Display */}
        {displaySelfie && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📸 Captured Selfie Image</Text>
            <View style={[styles.resultContainer, { alignItems: 'center' }]}>
              <Image 
                source={{ uri: `data:image/jpeg;base64,${displaySelfie}` }}
                style={{
                  width: 200,
                  height: 300,
                  borderRadius: 10,
                  marginBottom: 10
                }}
                resizeMode="cover"
              />
              <Text style={[styles.infoText, { fontSize: 12, color: '#666' }]}>
                Image size: {displaySelfie.length} characters
              </Text>
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: '#dc3545', marginTop: 10 }]}
                onPress={() => {
                  setDisplaySelfie(null);
                  setCapturedSelfieImage(null);
                }}
              >
                <Text style={styles.buttonText}>🗑️ Clear Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ✨ NEW: Selfie Results Section */}
        {selfieResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤳 Selfie Processing Result</Text>
            <View style={styles.infoContainer}>
              <Text style={[styles.infoText, { marginBottom: 8 }]}>
                📋 Operation: {selfieOperation} | 👤 User: {selectedUserID}
              </Text>
              <Text style={[styles.infoText, { fontSize: 12, color: '#666' }]}>
                This result shows the outcome of manually processing the captured selfie through the face recognition API.
              </Text>
            </View>
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>
                {JSON.stringify(selfieResult, null, 2)}
              </Text>
            </View>
          </View>
        )}

        {/* UI Customization Modal */}
        <LivenessUICustomizeModal
          visible={uiModalVisible}
          onClose={() => setUiModalVisible(false)}
          onApply={handleUIConfigApply}
          currentConfig={currentUIConfig}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  permissionContainer: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  permissionGranted: {
    color: '#28a745',
  },
  permissionDenied: {
    color: '#dc3545',
  },
  buttonContainer: {
    marginVertical: 6,
  },
  transactionText: {
    fontSize: 14,
    color: '#6c757d',
    fontFamily: 'monospace',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  resultContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  resultText: {
    fontSize: 12,
    color: '#212529',
    fontFamily: 'monospace',
  },
  infoContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
  statusContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 16,
  },
  statusCompleted: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  statusPending: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusTextCompleted: {
    color: '#2e7d32',
  },
  statusTextPending: {
    color: '#f57c00',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#212529',
  },
});

export default LivenessTab;
