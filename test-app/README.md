# OCR React Native Test App

This app demonstrates the integration of the Udentify OCR SDK with React Native, using a service layer architecture that mirrors repository patterns from native development.

## 🏗️ Architecture Overview

### Service Layer (Equivalent to Repository in Native Development)

In React Native, we use a **service layer** pattern which is equivalent to the repository pattern in Swift/Kotlin:

- **Swift/Kotlin**: Repository pattern with protocols/interfaces
- **React Native**: Service layer with classes and dependency injection

### File Structure

```
src/
├── services/           # Service layer (equivalent to repository)
│   └── udentifyApiService.ts
├── config/            # Configuration management
│   └── apiConfig.ts
└── constants/         # Constants and enums
    └── ocrConstants.ts
```

## 🔧 Service Layer Implementation

### `udentifyApiService.ts`

This is your **repository equivalent** that handles all server communication:

```typescript
class UdentifyApiService {
  // Configuration management
  configure(baseUrl: string, apiKey: string)
  
  // API methods
  async startTransaction(moduleList: string[]): Promise<string>
  async getTransactionStatus(transactionId: string): Promise<any>
  async addDeviceInfo(transactionId: string, deviceInfo: any): Promise<any>
  async healthCheck(): Promise<any>
}
```

**Key Features:**
- ✅ Singleton pattern (like shared instances in native)
- ✅ Error handling with custom `ApiError` class
- ✅ Comprehensive logging for debugging
- ✅ Type-safe interfaces
- ✅ Configurable base URL and API key

### `apiConfig.ts`

Environment-specific configuration management:

```typescript
export const devConfig: ApiConfig = {
  baseUrl: 'https://demo.udentify.io:8082',
  apiKey: 'your-dev-api-key',
  timeout: 30000,
  retryAttempts: 3,
};
```

**Environments:**
- 🟢 Development
- 🟡 Test  
- 🔴 Production

### `ocrConstants.ts`

Centralized constants and enums:

```typescript
export const OCR_MODULES = {
  OCR: 'OCR',
  LIVENESS: 'LIVENESS',
  HOLOGRAM: 'HOLOGRAM',
} as const;
```

## 🚀 Usage Examples

### Basic Transaction ID Retrieval

```typescript
import { udentifyApiService } from './src/services/udentifyApiService';

// Get transaction ID
const transactionID = await udentifyApiService.startTransaction(['OCR']);
```

### Configuration Management

```typescript
import { currentConfig } from './src/config/apiConfig';

// Use current configuration
const serverURL = `${currentConfig.baseUrl}?apikey=${currentConfig.apiKey}`;
```

### Constants Usage

```typescript
import { DOCUMENT_TYPES, DOCUMENT_SIDES } from './src/constants/ocrConstants';

// Use typed constants
const documentType = DOCUMENT_TYPES.ID_CARD;
const documentSide = DOCUMENT_SIDES.BOTH;
```

## 🔄 Migration from Old Implementation

### Before (Inline API calls)
```typescript
// ❌ Old way - inline fetch calls
const response = await fetch('https://demo.udentify.io:8082/transaction/start?apikey=...', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ moduleList: ["OCR"] })
});
```

### After (Service layer)
```typescript
// ✅ New way - service layer
const transactionID = await udentifyApiService.startTransaction(['OCR']);
```

## 🧪 Testing

The app includes several test buttons:

1. **Test Get Transaction ID** - Tests server communication
2. **Test Service Configuration** - Tests service setup
3. **Test OCR Scanning** - Tests OCR with transaction ID
4. **Test Document Liveness** - Tests liveness with transaction ID
5. **Test Hologram Camera** - Tests hologram with transaction ID

## 🔍 Debugging

### Console Logging

All API calls include comprehensive logging:

```
🔍 DEBUG: Making request to: https://demo.udentify.io:8082/transaction/start
🔍 DEBUG: Request options: {method: "POST", body: "..."}
🔍 DEBUG: Response status: 200
✅ Response data: {status: "OK", response: {...}}
```

### Error Handling

Custom `ApiError` class provides detailed error information:

```typescript
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
```

## 🚀 Benefits of This Architecture

### ✅ **Maintainability**
- Centralized API logic
- Easy to update endpoints
- Consistent error handling

### ✅ **Testability**
- Service layer can be easily mocked
- Isolated business logic
- Unit test friendly

### ✅ **Scalability**
- Easy to add new API endpoints
- Environment-specific configurations
- Reusable across components

### ✅ **Type Safety**
- TypeScript interfaces
- Compile-time error checking
- Better IDE support

## 🔧 Customization

### Adding New Endpoints

```typescript
// In udentifyApiService.ts
async performCustomOperation(data: any): Promise<any> {
  return await this.makeRequest('/custom/endpoint', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

### Environment Configuration

```typescript
// In apiConfig.ts
export const customConfig: ApiConfig = {
  baseUrl: 'https://your-custom-domain.com:8082',
  apiKey: 'your-custom-api-key',
  timeout: 45000,
  retryAttempts: 5,
};
```

## 📱 Native Development Comparison

| Native (Swift/Kotlin) | React Native |
|----------------------|--------------|
| Repository Protocol | Service Class |
| Dependency Injection | Singleton Pattern |
| Configuration Files | Config Objects |
| Constants File | Constants Module |
| Error Handling | Custom Error Classes |
| Logging | Console Methods |

This architecture provides the same benefits as native repository patterns while following React Native best practices.
