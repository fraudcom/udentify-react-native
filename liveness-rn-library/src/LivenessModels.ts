/**
 * Face Recognition & Liveness models for the liveness-rn-library
 * Based on the Flutter implementation models
 */

// Face recognition method types
export enum FaceRecognitionMethod {
  REGISTER = 'register',
  AUTHENTICATION = 'authentication',
  PHOTO_UPLOAD = 'photoUpload',
  SELFIE = 'selfie',
}

// Face recognition credentials for configuring the SDK
export interface FaceRecognizerCredentials {
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
}

// Face recognition result status
export enum FaceRecognitionStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PHOTO_TAKEN = 'photoTaken',
  SELFIE_TAKEN = 'selfieTaken',
  ERROR = 'error',
}

// Face recognition error
export interface FaceRecognitionError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Enhanced FaceIDResult model with all server response data
export interface FaceIDResult {
  verified: boolean;
  matchScore: number;
  description: string;
  transactionID?: string;
  userID?: string;
  method?: string;
  header?: string;
  listNames?: string;
  listIds?: string;
  registrationTransactionID?: string;
  referencePhotoBase64?: string;
  error?: FaceRecognitionError;
  metadata?: Record<string, any>;
  rawServerResponse?: Record<string, any>;
}

// Comprehensive LivenessResult model
export interface LivenessResult {
  assessmentValue: number;
  assessmentDescription: string;
  probability: number;
  quality: number;
  livenessScore: number;
  transactionID?: string;
  assessment?: string;
  error?: FaceRecognitionError;
}

// Comprehensive ActiveLivenessResult model
export interface ActiveLivenessResult {
  transactionID?: string;
  gestureResult: Record<string, boolean>;
  error?: FaceRecognitionError;
}

// Face recognition result message
export interface FaceIDMessage {
  success: boolean;
  message?: string;
  errorCode?: string;
  isFailed?: boolean;
  data?: Record<string, any>;
  faceIDResult?: FaceIDResult;
  livenessResult?: LivenessResult;
  activeLivenessResult?: ActiveLivenessResult;
}

// Face recognition result
export interface FaceRecognitionResult {
  status: FaceRecognitionStatus;
  faceIDMessage?: FaceIDMessage;
  error?: FaceRecognitionError;
  base64Image?: string;
}

// Permission status for camera and other required permissions
export enum LivenessPermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  PERMANENTLY_DENIED = 'permanentlyDenied',
  UNKNOWN = 'unknown',
}

// Face recognition permission result
export interface FaceRecognitionPermissionStatus {
  camera: LivenessPermissionStatus;
  readPhoneState: LivenessPermissionStatus;
  internet: LivenessPermissionStatus;
  recordAudio?: LivenessPermissionStatus;
  bluetoothConnect?: LivenessPermissionStatus;
}

// Customer list for identification feature
export interface CustomerList {
  id?: number;
  name?: string;
  listRole?: string;
  description?: string;
  creationDate?: string;
}

// Response data for identification list operations
export interface ListResponseData {
  id?: number;
  customerList?: CustomerList;
  userId?: number;
}

// Add user to list result
export interface AddUserToListResult {
  success: boolean;
  data?: ListResponseData;
  error?: FaceRecognitionError;
}

// Delete user from list result
export interface DeleteUserFromListResult {
  success: boolean;
  message?: string;
  userID?: string;
  transactionID?: string;
  listName?: string;
  matchScore?: number;
  registrationTransactionID?: string;
  error?: FaceRecognitionError;
}

// Font configuration
export interface FontConfig {
  name: string;
  size: number;
}

// Text style configuration
export interface TextStyle {
  font?: FontConfig;
  textColor?: string;
  textAlignment?: 'left' | 'right' | 'center' | 'justified' | 'natural';
  lineBreakMode?: 'byWordWrapping' | 'byTruncatingTail' | 'byTruncatingHead' | 'byClipping';
  numberOfLines?: number;
  leading?: number;
  trailing?: number;
}

// Progress bar style configuration
export interface ProgressBarStyle {
  backgroundColor?: string;
  progressColor?: string;
  completionColor?: string;
  textStyle?: TextStyle;
  cornerRadius?: number;
}

// UI Colors configuration - comprehensive color customization
export interface UIColors {
  // Main UI colors
  titleColor?: string;
  titleBG?: string;
  backgroundColor?: string;
  
  // Button colors - normal state
  buttonColor?: string;
  buttonTextColor?: string;
  
  // Button colors - success state
  buttonSuccessColor?: string;
  buttonSuccessTextColor?: string;
  
  // Button colors - error state
  buttonErrorColor?: string;
  buttonErrorTextColor?: string;
  
  // Progress and other UI elements
  buttonBackColor?: string;
  footerTextColor?: string;
  checkmarkTintColor?: string;
  progressBackgroundColor?: string;
  
  // Active Liveness specific colors
  gestureTextBackgroundColor?: string;
}

// UI Fonts configuration
export interface UIFonts {
  titleFont?: FontConfig;
  buttonFont?: FontConfig;
  footerFont?: FontConfig;
  gestureFont?: FontConfig; // For Active Liveness gesture instructions
}

// UI Dimensions configuration
export interface UIDimensions {
  // Button dimensions
  buttonHeight?: number;
  buttonMarginLeft?: number;
  buttonMarginRight?: number;
  buttonMarginBottom?: number;
  buttonCornerRadius?: number;
  
  // Font sizes
  gestureFontSize?: number;
  
  // Other UI dimensions
  marginHorizontal?: number;
}

// UI Configs - behavior and feature toggles
export interface UIConfigs {
  // Camera settings
  cameraPosition?: 'front' | 'back';
  
  // Behavior settings
  autoTake?: boolean;
  errorDelay?: number;
  successDelay?: number;
  requestTimeout?: number;
  
  // Feature toggles
  maskDetection?: boolean;
  maskConfidence?: number;
  invertedAnimation?: boolean;
  backButtonEnabled?: boolean;
  multipleFacesRejected?: boolean;
  
  // Localization
  bundle?: string; // iOS only
  tableName?: string;
  
  // Progress bar configuration
  progressBarStyle?: ProgressBarStyle;
}

// Localization strings interface
export interface LocalizationStrings {
  // Passive Liveness strings
  udentifyface_header_text?: string;
  udentifyface_footer_button_text_default?: string;
  udentifyface_footer_button_text_progressing?: string;
  udentifyface_footer_button_text_result?: string;
  udentifyface_message_face_too_big?: string;
  udentifyface_message_face_too_small?: string;
  udentifyface_message_face_not_found?: string;
  udentifyface_message_too_many_faces?: string;
  udentifyface_message_face_angled?: string;
  udentifyface_message_head_angled?: string;
  udentifyface_message_face_off_center?: string;
  udentifyface_message_eyes_closed?: string;
  udentifyface_message_mask_detected?: string;
  
  // Active/Hybrid Liveness strings
  udentifyface_gesture_text_move_head_to_left?: string;
  udentifyface_gesture_text_move_head_to_right?: string;
  udentifyface_gesture_text_move_head_to_up?: string;
  udentifyface_gesture_text_move_head_to_down?: string;
  udentifyface_gesture_text_blink_once?: string;
  udentifyface_gesture_text_blink_twice?: string;
  udentifyface_gesture_text_blink_thrice?: string;
  udentifyface_gesture_text_smile?: string;
  udentifyface_active_liveness_footer_button_text_recording?: string;
  udentifyface_active_liveness_footer_button_text_processing?: string;
  udentifyface_active_liveness_footer_button_text_default?: string;
  udentifyface_active_liveness_footer_button_text_result?: string;
  udentifyface_active_liveness_footer_label_text_processing?: string;
}

// Complete UI Settings interface
export interface UISettings {
  colors?: UIColors;
  fonts?: UIFonts;
  dimensions?: UIDimensions;
  configs?: UIConfigs;
  localization?: {
    languageCode?: string;
    customStrings?: LocalizationStrings;
  };
}

// Callback types
export type OnResultCallback = (result: FaceRecognitionResult) => void;
export type OnFailureCallback = (error: FaceRecognitionError) => void;
export type OnPhotoTakenCallback = () => void;
export type OnSelfieTakenCallback = (base64Image: string) => void;
export type OnVideoTakenCallback = () => void;
export type OnActiveLivenessResultCallback = (result: FaceRecognitionResult) => void;
export type OnActiveLivenessFailureCallback = (error: FaceRecognitionError) => void;
