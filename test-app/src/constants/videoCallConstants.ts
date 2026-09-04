// Video Call Constants - Common values used throughout the app
// Similar to constants files in native development

export const VIDEO_CALL_STATUS = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  FAILED: 'failed',
  COMPLETED: 'completed',
} as const;

export const VIDEO_CALL_ERROR_TYPES = {
  UNKNOWN: 'ERR_UNKNOWN',
  CREDENTIALS_MISSING: 'ERR_CREDENTIALS_MISSING',
  SERVER_TIMEOUT: 'ERR_SERVER_TIMEOUT_EXCEPTION',
  TRANSACTION_NOT_FOUND: 'ERR_TRANSACTION_NOT_FOUND',
  TRANSACTION_FAILED: 'ERR_TRANSACTION_FAILED',
  TRANSACTION_EXPIRED: 'ERR_TRANSACTION_EXPIRED',
  TRANSACTION_ALREADY_COMPLETED: 'ERR_TRANSACTION_ALREADY_COMPLETED',
  SDK_NOT_AVAILABLE: 'ERR_SDK_NOT_AVAILABLE',
} as const;

export const TIMEOUTS = {
  DEFAULT: '30',
  SHORT: '15',
  MEDIUM: '60',
  LONG: '120',
} as const;

export const ERROR_MESSAGES = {
  MODULE_NOT_AVAILABLE: 'Video Call module not available',
  PERMISSION_DENIED: 'Permissions denied by user',
  START_FAILED: 'Failed to start video call',
  END_FAILED: 'Failed to end video call',
  CONFIG_FAILED: 'Failed to set video call configuration',
  CAMERA_TOGGLE_FAILED: 'Failed to toggle camera',
  MICROPHONE_TOGGLE_FAILED: 'Failed to toggle microphone',
  NO_TRANSACTION_ID: 'Failed to get transaction ID',
  INVALID_CREDENTIALS: 'Invalid video call credentials',
  SDK_NOT_AVAILABLE: 'Udentify SDK not available',
} as const;

export const SUCCESS_MESSAGES = {
  PERMISSIONS_GRANTED: 'All permissions granted successfully',
  VIDEO_CALL_STARTED: 'Video call started successfully',
  VIDEO_CALL_ENDED: 'Video call ended successfully',
  CONFIG_SET: 'Video call configuration set successfully',
  CAMERA_TOGGLED: 'Camera toggled successfully',
  MICROPHONE_TOGGLED: 'Microphone toggled successfully',
} as const;

export const UI_COLORS = {
  BACKGROUND_COLORS: {
    BLACK: '#FF000000',
    DARK_GRAY: '#FF333333',
    BLUE: '#FF0066CC',
    GREEN: '#FF00AA00',
  },
  TEXT_COLORS: {
    WHITE: '#FFFFFFFF',
    BLACK: '#FF000000',
    LIGHT_GRAY: '#FFCCCCCC',
    DARK_GRAY: '#FF333333',
  },
  BORDER_COLORS: {
    WHITE: '#FFFFFFFF',
    BLUE: '#FF0066CC',
    GREEN: '#FF00AA00',
    RED: '#FFCC0000',
  },
} as const;

export const NOTIFICATION_LABELS = {
  DEFAULT: 'Video Call will be starting, please wait...',
  COUNTDOWN: 'Video Call will be started in %d sec/s.',
  TOKEN_FETCH: 'Authorizing the user...',
  CONNECTING: 'Connecting to video call...',
  WAITING_AGENT: 'Waiting for agent to join...',
} as const;

export type VideoCallStatusType = typeof VIDEO_CALL_STATUS[keyof typeof VIDEO_CALL_STATUS];
export type VideoCallErrorType = typeof VIDEO_CALL_ERROR_TYPES[keyof typeof VIDEO_CALL_ERROR_TYPES];
