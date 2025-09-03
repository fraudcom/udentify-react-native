// Udentify API Service - React Native equivalent of repository pattern
// This file handles all server communication with the Udentify API

import { currentConfig } from '../config/apiConfig';

export interface TransactionResponse {
  status: string;
  message?: string;
  response: {
    id: string;
    creationDate: string;
    expireDate: string;
    data: any;
  };
}

export interface ApiError {
  message: string;
  status?: number;
  details?: any;
}

class UdentifyApiService {
  private baseUrl: string = currentConfig.baseUrl;
  private apiKey: string = currentConfig.apiKey;

  // Configure the service with custom base URL and API key
  configure(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // Get headers for all requests
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Api-Key': this.apiKey,
    };
  }

  // Generic request method
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`🔍 DEBUG: Making request to: ${url}`);
    console.log(`🔍 DEBUG: Request options:`, options);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      console.log(`🔍 DEBUG: Response status: ${response.status}`);
      console.log(`🔍 DEBUG: Response ok: ${response.ok}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`🔍 DEBUG: Error response body: ${errorText}`);
        
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorText
        );
      }

      const data = await response.json();
      console.log(`✅ Response data:`, data);
      
      return data;
    } catch (error) {
      console.error(`❌ Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Start a new transaction
  async startTransaction(moduleList: string[] = ['OCR']): Promise<string> {
    console.log('🔄 Starting transaction with modules:', moduleList);
    
    try {
      const response = await this.makeRequest<TransactionResponse>('/transaction/start', {
        method: 'POST',
        body: JSON.stringify({ moduleList }),
      });

      if (response.response && response.response.id) {
        console.log('📝 Transaction ID from server:', response.response.id);
        return response.response.id;
      } else {
        console.log('🔍 DEBUG: No transaction ID found in response');
        console.log('🔍 DEBUG: Response structure:', JSON.stringify(response, null, 2));
        throw new ApiError('No transaction ID found in server response');
      }
    } catch (error) {
      console.error('❌ Failed to start transaction:', error);
      throw error;
    }
  }

  // Get transaction status (if needed)
  async getTransactionStatus(transactionId: string): Promise<any> {
    console.log('🔄 Getting transaction status for:', transactionId);
    
    try {
      const response = await this.makeRequest<any>(`/transaction/${transactionId}/status`);
      return response;
    } catch (error) {
      console.error('❌ Failed to get transaction status:', error);
      throw error;
    }
  }

  // Add device info (if needed)
  async addDeviceInfo(transactionId: string, deviceInfo: any): Promise<any> {
    console.log('🔄 Adding device info for transaction:', transactionId);
    
    try {
      const response = await this.makeRequest<any>('/addDeviceInfo', {
        method: 'POST',
        body: JSON.stringify({
          transactionId,
          deviceInfo,
        }),
      });
      return response;
    } catch (error) {
      console.error('❌ Failed to add device info:', error);
      throw error;
    }
  }

  // Health check endpoint (if available)
  async healthCheck(): Promise<any> {
    console.log('🔄 Performing health check');
    
    try {
      const response = await this.makeRequest<any>('/health');
      return response;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }

  // Get Video Call transaction ID - matching Flutter implementation
  async getVideoCallTransactionId(channelId: number = 252, severity: string = 'NORMAL'): Promise<string | null> {
    console.log('🔄 Getting Video Call transaction ID');
    
    try {
      const requestBody = {
        moduleList: [
          'OCR',
          'FACE_REGISTRATION', 
          'FACE_LIVENESS',
          'VIDEO_CALL'
        ],
        transactionSource: 1,
        channelId: channelId,
        severity: severity,
      };

      console.log('🔍 VIDEO CALL API REQUEST DEBUG:');
      console.log('   URL: /transaction/start');
      console.log('   Body:', JSON.stringify(requestBody));

      const response = await this.makeRequest<TransactionResponse>('/transaction/start', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      console.log('📡 VIDEO CALL API RESPONSE DEBUG:');
      console.log('   Response:', response);

      if (response.status === 'OK' && response.response?.id) {
        console.log('✅ Video Call Transaction ID obtained:', response.response.id.substring(0, 20) + '...');
        return response.response.id;
      } else {
        console.error('Failed to get Video Call transaction ID:', response.message);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting Video Call transaction ID:', error);
      return null;
    }
  }
}

// Create and export a singleton instance
export const udentifyApiService = new UdentifyApiService();

// Export the class for testing or custom instances
export { UdentifyApiService };

// Custom error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
