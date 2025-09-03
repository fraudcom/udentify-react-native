// API Configuration - Environment-specific settings
// Similar to configuration files in native development

export interface ApiConfig {
  baseUrl: string;
  baseURL?: string; // For compatibility with VideoCallTab
  wssURL?: string; // WebSocket URL for video calls
  clientName?: string; // Client name for video calls
  apiKey: string;
  timeout: number;
  retryAttempts: number;
}

// Development environment
export const devConfig: ApiConfig = {
  baseUrl: 'https://demo.udentify.io:8082',
  baseURL: 'https://demo.udentify.io:8082', // For VideoCallTab compatibility
  wssURL: 'wss://livekit.np.fraud.com', // WebSocket URL for video calls - matching Flutter
  clientName: 'TestClient_RN', // Client name for video calls
  apiKey: 'EcNzFN26S24/uf1tv7d+FXHgAPMzEye8',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
};

// Production environment (using demo URL for release builds)
export const prodConfig: ApiConfig = {
  baseUrl: 'https://demo.udentify.io:8082',
  baseURL: 'https://demo.udentify.io:8082', // For VideoCallTab compatibility
  wssURL: 'wss://livekit.np.fraud.com', // WebSocket URL for video calls - matching Flutter
  clientName: 'TestClient_RN_Prod', // Client name for video calls
  apiKey: 'EcNzFN26S24/uf1tv7d+FXHgAPMzEye8',
  timeout: 30000,
  retryAttempts: 3,
};

// Test environment
export const testConfig: ApiConfig = {
  baseUrl: 'https://test.udentify.io:8082', // Update this if you have a test environment
  wssURL: 'wss://livekit.np.fraud.com', // WebSocket URL for video calls - matching Flutter
  clientName: 'TestClient_RN_Test', // Client name for video calls
  apiKey: 'your-test-api-key', // Update this
  timeout: 15000, // Shorter timeout for tests
  retryAttempts: 1,
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
