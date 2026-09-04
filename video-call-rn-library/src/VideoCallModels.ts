// Video Call Models for React Native
// Based on Flutter video_call_models.dart

/**
 * Video Call Credentials for authentication and connection
 */
export interface VideoCallCredentials {
  serverURL: string;
  wssURL: string;
  userID: string;
  transactionID: string;
  clientName: string;
  idleTimeout?: string; // Default: "30"
}

/**
 * Video Call Status enumeration
 */
export enum VideoCallStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  FAILED = 'failed',
  COMPLETED = 'completed',
}

/**
 * Video Call Error Types
 */
export enum VideoCallErrorType {
  UNKNOWN = 'ERR_UNKNOWN',
  CREDENTIALS_MISSING = 'ERR_CREDENTIALS_MISSING',
  SERVER_TIMEOUT = 'ERR_SERVER_TIMEOUT_EXCEPTION',
  TRANSACTION_NOT_FOUND = 'ERR_TRANSACTION_NOT_FOUND',
  TRANSACTION_FAILED = 'ERR_TRANSACTION_FAILED',
  TRANSACTION_EXPIRED = 'ERR_TRANSACTION_EXPIRED',
  TRANSACTION_ALREADY_COMPLETED = 'ERR_TRANSACTION_ALREADY_COMPLETED',
  SDK_NOT_AVAILABLE = 'ERR_SDK_NOT_AVAILABLE',
}

/**
 * Video Call Error
 */
export interface VideoCallError {
  type: VideoCallErrorType;
  message: string;
  details?: string;
}

/**
 * Video Call Result from operations
 */
export interface VideoCallResult {
  success: boolean;
  status?: VideoCallStatus;
  transactionID?: string;
  error?: VideoCallError;
  metadata?: Record<string, any>;
}

/**
 * Video Call UI Configuration
 */
export interface VideoCallConfig {
  backgroundColor?: string;
  textColor?: string;
  pipViewBorderColor?: string;
  notificationLabelDefault?: string;
  notificationLabelCountdown?: string;
  notificationLabelTokenFetch?: string;
  
  // Localization
  tableName?: string;
  requestTimeout?: number;
}

/**
 * Permission Status for Video Call
 */
export interface VideoCallPermissionStatus {
  hasCameraPermission: boolean;
  hasPhoneStatePermission: boolean;
  hasInternetPermission: boolean;
  hasRecordAudioPermission: boolean;
}

/**
 * Video Call Event Callbacks
 */
export interface VideoCallCallbacks {
  onStatusChanged?: (status: VideoCallStatus) => void;
  onError?: (error: VideoCallError) => void;
  onUserStateChanged?: (state: string) => void;
  onParticipantStateChanged?: (participantType: string, state: string) => void;
  onVideoCallEnded?: (success: boolean) => void;
  onVideoCallDismissed?: () => void;
}

/**
 * Helper functions for type conversion
 */
export class VideoCallUtils {
  /**
   * Convert string to VideoCallStatus enum
   */
  static stringToStatus(value: string): VideoCallStatus {
    switch (value.toLowerCase()) {
      case 'idle':
        return VideoCallStatus.IDLE;
      case 'connecting':
        return VideoCallStatus.CONNECTING;
      case 'connected':
        return VideoCallStatus.CONNECTED;
      case 'disconnected':
        return VideoCallStatus.DISCONNECTED;
      case 'failed':
        return VideoCallStatus.FAILED;
      case 'completed':
        return VideoCallStatus.COMPLETED;
      default:
        return VideoCallStatus.IDLE;
    }
  }

  /**
   * Convert string to VideoCallErrorType enum
   */
  static stringToErrorType(value: string): VideoCallErrorType {
    switch (value) {
      case 'ERR_UNKNOWN':
        return VideoCallErrorType.UNKNOWN;
      case 'ERR_CREDENTIALS_MISSING':
        return VideoCallErrorType.CREDENTIALS_MISSING;
      case 'ERR_SERVER_TIMEOUT_EXCEPTION':
        return VideoCallErrorType.SERVER_TIMEOUT;
      case 'ERR_TRANSACTION_NOT_FOUND':
        return VideoCallErrorType.TRANSACTION_NOT_FOUND;
      case 'ERR_TRANSACTION_FAILED':
        return VideoCallErrorType.TRANSACTION_FAILED;
      case 'ERR_TRANSACTION_EXPIRED':
        return VideoCallErrorType.TRANSACTION_EXPIRED;
      case 'ERR_TRANSACTION_ALREADY_COMPLETED':
        return VideoCallErrorType.TRANSACTION_ALREADY_COMPLETED;
      case 'ERR_SDK_NOT_AVAILABLE':
        return VideoCallErrorType.SDK_NOT_AVAILABLE;
      default:
        return VideoCallErrorType.UNKNOWN;
    }
  }

  /**
   * Check if all permissions are granted
   */
  static areAllPermissionsGranted(permissions: VideoCallPermissionStatus): boolean {
    return (
      permissions.hasCameraPermission &&
      permissions.hasPhoneStatePermission &&
      permissions.hasInternetPermission &&
      permissions.hasRecordAudioPermission
    );
  }

  /**
   * Create a VideoCallError from native response
   */
  static createErrorFromMap(errorMap: any): VideoCallError {
    return {
      type: VideoCallUtils.stringToErrorType(errorMap.type || 'ERR_UNKNOWN'),
      message: errorMap.message || 'Unknown error',
      details: errorMap.details,
    };
  }

  /**
   * Create a VideoCallResult from native response
   */
  static createResultFromMap(resultMap: any): VideoCallResult {
    return {
      success: resultMap.success || false,
      status: resultMap.status ? VideoCallUtils.stringToStatus(resultMap.status) : undefined,
      transactionID: resultMap.transactionID,
      error: resultMap.error ? VideoCallUtils.createErrorFromMap(resultMap.error) : undefined,
      metadata: resultMap.metadata,
    };
  }

  /**
   * Convert VideoCallCredentials to map for native bridge
   */
  static credentialsToMap(credentials: VideoCallCredentials): Record<string, any> {
    return {
      serverURL: credentials.serverURL,
      wssURL: credentials.wssURL,
      userID: credentials.userID,
      transactionID: credentials.transactionID,
      clientName: credentials.clientName,
      idleTimeout: credentials.idleTimeout || '30',
    };
  }

  /**
   * Convert VideoCallConfig to map for native bridge
   */
  static configToMap(config: VideoCallConfig): Record<string, any> {
    return {
      backgroundColor: config.backgroundColor,
      textColor: config.textColor,
      pipViewBorderColor: config.pipViewBorderColor,
      notificationLabelDefault: config.notificationLabelDefault,
      notificationLabelCountdown: config.notificationLabelCountdown,
      notificationLabelTokenFetch: config.notificationLabelTokenFetch,
      tableName: config.tableName,
      requestTimeout: config.requestTimeout,
    };
  }

  /**
   * Create VideoCallPermissionStatus from native response
   */
  static createPermissionsFromMap(permissionsMap: any): VideoCallPermissionStatus {
    return {
      hasCameraPermission: permissionsMap.hasCameraPermission || false,
      hasPhoneStatePermission: permissionsMap.hasPhoneStatePermission || false,
      hasInternetPermission: permissionsMap.hasInternetPermission || false,
      hasRecordAudioPermission: permissionsMap.hasRecordAudioPermission || false,
    };
  }
}
