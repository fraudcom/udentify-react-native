// API Configuration - Environment-specific settings
// Similar to configuration files in native development

export interface ApiConfig {
  baseUrl: string;
  baseURL?: string; // Runtime override synced from SettingsContext (see syncToLegacy)
  wssURL?: string; // WebSocket URL for video calls
  clientName?: string; // Client name for video calls
  apiKey: string;
  timeout: number;
  retryAttempts: number;
}

// Development environment
export const devConfig: ApiConfig = {
  baseUrl: 'https://you-api-url',
  apiKey: 'your-api-key',
  wssURL: 'your web-socket url', // WebSocket URL for video calls
  clientName: 'TestClient', // Client name for video calls
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
};

// Production environment (using demo URL for release builds)
export const prodConfig: ApiConfig = {
  baseUrl: 'https://you-api-url',
  apiKey: 'your-api-key',
  wssURL: 'your web-socket url', // WebSocket URL for video calls
  clientName: 'TestClient', // Client name for video calls
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
};

// Get current configuration based on environment
export function getCurrentConfig(): ApiConfig {
  // You can use __DEV__ or process.env.NODE_ENV to determine environment
  if (__DEV__) {
    console.log('🔧 Using development configuration');
    return devConfig;
  }

  // Add more environment checks as needed
  // if (process.env.NODE_ENV === 'test') return testConfig;
  // if (process.env.NODE_ENV === 'production') return prodConfig;

  console.log('🔧 Using production configuration');
  return prodConfig;
}

// Export current config as default
export const currentConfig = getCurrentConfig();
