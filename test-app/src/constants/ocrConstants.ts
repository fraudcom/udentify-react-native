// OCR Constants - Common values used throughout the app
// Similar to constants files in native development

export const OCR_MODULES = {
  OCR: 'OCR',
  OCR_HOLOGRAM: 'OCR_HOLOGRAM',
  LIVENESS: 'LIVENESS',
  HOLOGRAM: 'HOLOGRAM',
} as const;

export const DOCUMENT_TYPES = {
  ID_CARD: 'ID_CARD',
  PASSPORT: 'PASSPORT',
  DRIVER_LICENSE: 'DRIVER_LICENSE',
} as const;

export const DOCUMENT_SIDES = {
  FRONT: 'FRONT',
  BACK: 'BACK',
  BOTH: 'BOTH',
} as const;

export const COUNTRIES = {
  TURKEY: { code: 'TUR', name: 'Turkey' },
  GERMANY: { code: 'DEU', name: 'Germany' },
  FRANCE: { code: 'FRA', name: 'France' },
  UNITED_KINGDOM: { code: 'GBR', name: 'United Kingdom' },
  UNITED_STATES: { code: 'USA', name: 'United States' },
  SPAIN: { code: 'ESP', name: 'Spain' },
  ITALY: { code: 'ITA', name: 'Italy' },
  NETHERLANDS: { code: 'NLD', name: 'Netherlands' },
  BELGIUM: { code: 'BEL', name: 'Belgium' },
  AUSTRIA: { code: 'AUT', name: 'Austria' },
  SWITZERLAND: { code: 'CHE', name: 'Switzerland' },
  POLAND: { code: 'POL', name: 'Poland' },
  GREECE: { code: 'GRC', name: 'Greece' },
  PORTUGAL: { code: 'PRT', name: 'Portugal' },
  CZECH_REPUBLIC: { code: 'CZE', name: 'Czech Republic' },
  HUNGARY: { code: 'HUN', name: 'Hungary' },
  ROMANIA: { code: 'ROU', name: 'Romania' },
  BULGARIA: { code: 'BGR', name: 'Bulgaria' },
  CROATIA: { code: 'HRV', name: 'Croatia' },
  SLOVENIA: { code: 'SVN', name: 'Slovenia' },
  SLOVAKIA: { code: 'SVK', name: 'Slovakia' },
  ESTONIA: { code: 'EST', name: 'Estonia' },
  LATVIA: { code: 'LVA', name: 'Latvia' },
  LITHUANIA: { code: 'LTU', name: 'Lithuania' },
  DENMARK: { code: 'DNK', name: 'Denmark' },
  SWEDEN: { code: 'SWE', name: 'Sweden' },
  NORWAY: { code: 'NOR', name: 'Norway' },
  FINLAND: { code: 'FIN', name: 'Finland' },
  ICELAND: { code: 'ISL', name: 'Iceland' },
  IRELAND: { code: 'IRL', name: 'Ireland' },
  LUXEMBOURG: { code: 'LUX', name: 'Luxembourg' },
  MALTA: { code: 'MLT', name: 'Malta' },
  CYPRUS: { code: 'CYP', name: 'Cyprus' },
} as const;

export const API_ENDPOINTS = {
  TRANSACTION_START: '/transaction/start',
  TRANSACTION_STATUS: '/transaction/{id}/status',
  ADD_DEVICE_INFO: '/addDeviceInfo',
  HEALTH_CHECK: '/health',
} as const;

export const ERROR_MESSAGES = {
  NO_TRANSACTION_ID: 'No transaction ID found in server response',
  REQUEST_FAILED: 'Request failed',
  NETWORK_ERROR: 'Network error occurred',
  PERMISSION_DENIED: 'Camera permissions are required',
  OCR_FAILED: 'OCR processing failed',
  LIVENESS_FAILED: 'Document liveness check failed',
  HOLOGRAM_FAILED: 'Hologram check failed',
} as const;

export const SUCCESS_MESSAGES = {
  TRANSACTION_CREATED: 'Transaction created successfully',
  OCR_COMPLETED: 'OCR processing completed',
  LIVENESS_PASSED: 'Document liveness check passed',
  HOLOGRAM_PASSED: 'Hologram check passed',
} as const;

export const TIMEOUTS = {
  CAMERA_LOADING: 2000, // 2 seconds for camera loading
  API_REQUEST: 30000,   // 30 seconds for API requests
  OCR_PROCESSING: 60000, // 1 minute for OCR processing
} as const;

export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  DELAY_BETWEEN_ATTEMPTS: 1000, // 1 second
} as const;
