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
  NativeModules,
  DeviceEventEmitter,
  NativeEventEmitter,
} from 'react-native';
import OptionPicker from './OptionPicker';
import OCRResultCard from './OCRResultCard';
import UICustomizeModal from './UICustomizeModal';
import { udentifyApiService } from '../services/udentifyApiService';
import { currentConfig } from '../config/apiConfig';
import { 
  OCR_MODULES, 
  DOCUMENT_TYPES, 
  DOCUMENT_SIDES, 
  COUNTRIES,
  TIMEOUTS, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES 
} from '../constants/ocrConstants';
// import { configureUISettings } from 'ocr-rn-library'; // Temporarily commented out

// TurboModule initialization
const isTurboModuleEnabled = (global as any).__turboModuleProxy != null;

let OCRModule: any;

if (isTurboModuleEnabled) {
  try {
    const {TurboModuleRegistry} = require('react-native');
    OCRModule = TurboModuleRegistry.getEnforcing('OCRModule');
  } catch (error) {
    console.error('TurboModule failed, falling back to Legacy:', error);
    OCRModule = NativeModules.OCRModule;
  }
} else {
  OCRModule = NativeModules.OCRModule;
}

// OCR Module functions
const startOCRScanning = async (serverURL: string, transactionID: string, documentType: string, documentSide: string) => {
  if (!OCRModule) throw new Error('OCRModule not available');
  return await OCRModule.startOCRScanning(serverURL, transactionID, documentType, documentSide);
};

const configureUISettings = async (uiConfig: any) => {
  if (!OCRModule) throw new Error('OCRModule not available');
  if (!OCRModule.configureUISettings) {
    console.warn('configureUISettings method not available in OCRModule yet');
    return false;
  }
  return await OCRModule.configureUISettings(uiConfig);
};

const performOCR = async (serverURL: string, transactionID: string, frontSideImage: string, backSideImage: string, documentType: string) => {
  if (!OCRModule) throw new Error('OCRModule not available');
  return await OCRModule.performOCR(serverURL, transactionID, frontSideImage, backSideImage, documentType);
};

const performDocumentLiveness = async (serverURL: string, transactionID: string, frontSideImage: string, backSideImage: string) => {
  if (!OCRModule) throw new Error('OCRModule not available');
  return await OCRModule.performDocumentLiveness(serverURL, transactionID, frontSideImage, backSideImage);
};

const performOCRAndDocumentLiveness = async (serverURL: string, transactionID: string, frontSideImage: string, backSideImage: string, documentType: string) => {
  if (!OCRModule) throw new Error('OCRModule not available');
  return await OCRModule.performOCRAndDocumentLiveness(serverURL, transactionID, frontSideImage, backSideImage, documentType);
};

const startHologramCamera = async (serverURL: string, transactionID: string) => {
  if (!OCRModule) throw new Error('OCRModule not available');
  return await OCRModule.startHologramCamera(serverURL, transactionID);
};



// Types
type OCRResponse = any;
type DocumentLivenessResponse = any;
type OCRAndDocumentLivenessResponse = any;
type HologramResponse = any;

// Transaction ID function
async function getTransactionID(): Promise<string> {
  console.log('OCRTab - 🔍 DEBUG: getTransactionID function called');
  try {
    console.log('OCRTab - 🔄 Requesting transaction ID from server...');
    
    const transactionID = await udentifyApiService.startTransaction([OCR_MODULES.OCR, OCR_MODULES.OCR_HOLOGRAM]);
    
    console.log('OCRTab - ✅ Transaction ID retrieved successfully:', transactionID);
    return transactionID;
  } catch (error) {
    console.error('OCRTab - ❌ Failed to get transaction ID from server:', error);
    console.log('OCRTab - 🔍 DEBUG: Creating fallback ID');
    const fallbackID = `ocr_scan_${Date.now()}`;
    console.log('OCRTab - 🔄 Using fallback transaction ID:', fallbackID);
    return fallbackID;
  }
}

// Hologram operations use the same transaction ID as OCR since hologram depends on OCR

const OCRTab: React.FC = () => {
  // State for user selections
  const [selectedCountry, setSelectedCountry] = useState<string>('TUR');
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('ID_CARD');
  const [selectedDocumentSide, setSelectedDocumentSide] = useState<string>('BOTH');
  
  // State for results and loading
  const [ocrResult, setOcrResult] = useState<OCRResponse | null>(null);
  const [livenessResult, setLivenessResult] = useState<DocumentLivenessResponse | null>(null);
  const [ocrAndLivenessResult, setOcrAndLivenessResult] = useState<OCRAndDocumentLivenessResponse | null>(null);
  const [hologramResult, setHologramResult] = useState<HologramResponse | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [isHologramLoading, setIsHologramLoading] = useState<boolean>(false);
  const [currentTransactionID, setCurrentTransactionID] = useState<string>('');
  const [hologramVideoUrls, setHologramVideoUrls] = useState<string[]>([]);
  
  // UI Customization modal state
  const [isCustomizeModalVisible, setIsCustomizeModalVisible] = useState<boolean>(false);

  // Setup event listeners for OCR completion
  useEffect(() => {
    const eventEmitter = Platform.OS === 'ios' 
      ? new NativeEventEmitter(OCRModule)
      : DeviceEventEmitter;

    const ocrCompleteListener = eventEmitter.addListener('onOCRComplete', (result) => {
      console.log('OCRTab - ✅ OCR Result:', result);
      setIsOcrLoading(false);
      setOcrResult(result);
      Alert.alert('OCR Success', 'OCR processing completed successfully!');
    });

    const ocrErrorListener = eventEmitter.addListener('onOCRError', (error) => {
      console.error('OCRTab - ❌ OCR Error:', error);
      setIsOcrLoading(false);
      Alert.alert('OCR Error', error.message || 'Unknown error');
    });

    const hologramCompleteListener = eventEmitter.addListener('onHologramComplete', async (result) => {
      console.log('OCRTab - ✅ Hologram Result:', result);
      setHologramResult(result);
      setIsHologramLoading(false);
      Alert.alert('Hologram Success', 'Hologram processing completed successfully!');
    });

    const hologramVideoRecordedListener = eventEmitter.addListener('onHologramVideoRecorded', (event) => {
      console.log('OCRTab - 📹 Hologram videos recorded:', event);
      if (event.videoUrls && event.videoUrls.length > 0) {
        setHologramVideoUrls(event.videoUrls);
        console.log('OCRTab - ✅ Hologram videos ready for manual verification if needed');
      }
    });

    const hologramErrorListener = eventEmitter.addListener('onHologramError', (error) => {
      console.error('OCRTab - ❌ Hologram Error:', error);
      console.error('OCRTab - ❌ Hologram Error Details:', JSON.stringify(error, null, 2));
      setIsHologramLoading(false);
      
      // Provide more specific error messages for common issues
      let errorMessage = error.message || error || 'Unknown error';
      if (typeof errorMessage === 'string' && errorMessage.includes('PARSING SERVER RESPONSE')) {
        errorMessage = 'Server response parsing failed. This might be due to API key issues or server configuration. Please check your API credentials and server URL.';
      }
      
      Alert.alert('Hologram Error', errorMessage);
    });

    return () => {
      ocrCompleteListener.remove();
      ocrErrorListener.remove();
      hologramCompleteListener.remove();
      hologramVideoRecordedListener.remove();
      hologramErrorListener.remove();
    };
  }, []);

  // Permission request function
  async function requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        ]);

        const cameraGranted = grants[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
        const phoneStateGranted = grants[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED;

        if (!cameraGranted) {
          Alert.alert('Permission Required', 'Camera permission is required to use OCR functionality.');
          return false;
        }

        if (!phoneStateGranted) {
          Alert.alert('Permission Required', 'Phone state permission is required for the Udentify SDK.');
          return false;
        }

        return true;
      } catch (error) {
        console.error('OCRTab - Permission request error:', error);
        return false;
      }
    }
    return true;
  }

  // OCR Functions
  async function testOCRScanning() {
    try {
      setIsOcrLoading(true);
      
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        Alert.alert('Error', 'Camera permissions are required');
        return;
      }
      
      console.log('OCRTab - 🔄 Getting transaction ID...');
      const transactionID = await getTransactionID();
      console.log('OCRTab - ✅ Got transaction ID:', transactionID);
      setCurrentTransactionID(transactionID);
      
      const resetLoadingTimeout = setTimeout(() => {
        setIsOcrLoading(false);
      }, TIMEOUTS.CAMERA_LOADING);
      
      const success = await startOCRScanning(
        `${currentConfig.baseUrl}?apikey=${currentConfig.apiKey}`,
        transactionID,
        selectedDocumentType,
        selectedDocumentSide
      );
      
      clearTimeout(resetLoadingTimeout);
      
      if (success) {
        console.log('OCRTab - 📸 Document scanned successfully, now calling performOCR...');
        
        const ocrResult = await performOCR(
          currentConfig.baseUrl,
          transactionID,
          '', // Empty front image (use stored)
          '', // Empty back image (use stored)  
          selectedDocumentType
        );
        
        console.log('OCRTab - ✅ OCR Result:', ocrResult);
        setOcrResult(ocrResult);
      } else {
        Alert.alert('Error', 'Failed to start OCR scanning');
      }
    } catch (error) {
      console.error('OCRTab - OCR Error:', error);
      Alert.alert('OCR Error', `${error}`);
    } finally {
      setIsOcrLoading(false);
    }
  }

  async function testDocumentLiveness() {
    try {
      setIsOcrLoading(true);
      
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        Alert.alert('Error', 'Camera permissions are required');
        return;
      }
      
      console.log('OCRTab - 🔄 Getting transaction ID for document liveness...');
      const transactionID = await getTransactionID();
      console.log('OCRTab - ✅ Got transaction ID for liveness:', transactionID);
      setCurrentTransactionID(transactionID);
      
      const resetLoadingTimeout = setTimeout(() => {
        setIsOcrLoading(false);
      }, TIMEOUTS.CAMERA_LOADING);
      
      const success = await startOCRScanning(
        `${currentConfig.baseUrl}?apikey=${currentConfig.apiKey}`,
        transactionID,
        selectedDocumentType,
        selectedDocumentSide
      );
      
      clearTimeout(resetLoadingTimeout);
      
      if (success) {
        console.log('OCRTab - 📸 Document scanned successfully, now calling performDocumentLiveness...');
        
        const livenessResult = await performDocumentLiveness(
          currentConfig.baseUrl,
          transactionID,
          '', // Empty front image (use stored)
          '' // Empty back image (use stored)  
        );
        
        console.log('OCRTab - ✅ Document Liveness Result:', livenessResult);
        setLivenessResult(livenessResult as DocumentLivenessResponse);
        // Document liveness results are logged but not shown as alerts to users
      } else {
        // Document liveness failures are logged but not shown as alerts to users
      }
    } catch (error) {
      console.error('OCRTab - Document Liveness Error:', error);
      // Document liveness errors are logged but not shown as alerts to users
    } finally {
      setIsOcrLoading(false);
    }
  }

  async function testOCRAndDocumentLiveness() {
    try {
      setIsOcrLoading(true);
      
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        Alert.alert('Error', 'Camera permissions are required');
        return;
      }
      
      console.log('OCRTab - 🔄 Getting transaction ID for OCR and document liveness...');
      const transactionID = await getTransactionID();
      console.log('OCRTab - ✅ Got transaction ID for OCR and liveness:', transactionID);
      setCurrentTransactionID(transactionID);
      
      const resetLoadingTimeout = setTimeout(() => {
        setIsOcrLoading(false);
      }, TIMEOUTS.CAMERA_LOADING);
      
      const success = await startOCRScanning(
        `${currentConfig.baseUrl}?apikey=${currentConfig.apiKey}`,
        transactionID,
        selectedDocumentType,
        selectedDocumentSide
      );
      
      clearTimeout(resetLoadingTimeout);
      
      if (success) {
        console.log('OCRTab - 📸 Document scanned successfully, now calling performOCRAndDocumentLiveness...');
        
        const ocrAndLivenessResult = await performOCRAndDocumentLiveness(
          currentConfig.baseUrl,
          transactionID,
          '', // Empty front image (use stored)
          '', // Empty back image (use stored)
          selectedDocumentType
        );
        
        console.log('OCRTab - ✅ OCR and Document Liveness Result:', ocrAndLivenessResult);
        setOcrAndLivenessResult(ocrAndLivenessResult as OCRAndDocumentLivenessResponse);
        // OCR and document liveness results are logged but not shown as alerts to users
      } else {
        // OCR and document liveness failures are logged but not shown as alerts to users
      }
    } catch (error) {
      console.error('OCRTab - OCR and Document Liveness Error:', error);
      // OCR and document liveness errors are logged but not shown as alerts to users
    } finally {
      setIsOcrLoading(false);
    }
  }

  async function testHologramCamera() {
    try {
      setIsHologramLoading(true);
      setHologramResult(null); // Clear previous results
      setHologramVideoUrls([]); // Clear previous video URLs
      
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        Alert.alert('Error', 'Camera permissions are required');
        return;
      }
      
      // Hologram depends on OCR, so we must use the same transaction ID from OCR
      if (!currentTransactionID) {
        Alert.alert('Error', 'Please perform OCR scanning first. Hologram verification requires an existing OCR transaction.');
        return;
      }
      
      console.log('OCRTab - 🔄 Using existing OCR transaction ID for hologram:', currentTransactionID);
      
      const resetLoadingTimeout = setTimeout(() => {
        setIsHologramLoading(false);
      }, TIMEOUTS.CAMERA_LOADING);
      
      // Use clean base URL - hologram upload will handle API key internally 
      // The issue might be in server response format, not API key
      const success = await startHologramCamera(
        currentConfig.baseUrl,
        currentTransactionID
      );
      
      clearTimeout(resetLoadingTimeout);
      
      if (!success) {
        Alert.alert('Error', 'Failed to start Hologram Camera');
      } else {
        console.log('OCRTab - 📸 Hologram camera started successfully');
        console.log('OCRTab - 📸 Using server URL:', currentConfig.baseUrl);
        console.log('OCRTab - 📸 Using transaction ID:', currentTransactionID);
        Alert.alert('Hologram Camera Started', 'Follow the instructions to record the hologram video. The SDK will automatically verify the hologram after recording completes.');
      }
    } catch (error) {
      console.error('OCRTab - Hologram Camera Error:', error);
      Alert.alert('Hologram Camera Error', `${error}`);
    } finally {
      setIsHologramLoading(false);
    }
  }



  // UI Customization handlers
  const handleApplyUICustomization = async (config: any) => {
    try {
      console.log('OCRTab - Applying UI configuration:', config);
      console.log('OCRTab - OCRModule available:', !!OCRModule);
      console.log('OCRTab - configureUISettings available:', !!(OCRModule && OCRModule.configureUISettings));
      
      if (!OCRModule) {
        Alert.alert('Error', 'OCR Module not available. Please ensure the native module is properly linked.');
        return;
      }
      
      if (!OCRModule.configureUISettings) {
        Alert.alert('Info', 'UI Configuration feature is not yet available in the current OCR module build. The feature has been implemented but requires a rebuild of the native module.');
        return;
      }
      
      const success = await configureUISettings(config);
      
      if (success) {
        Alert.alert('Success', 'UI configuration applied successfully! The new settings will be used in the next OCR scan.');
      } else {
        Alert.alert('Error', 'Failed to apply UI configuration');
      }
    } catch (error) {
      console.error('OCRTab - UI Configuration Error:', error);
      Alert.alert('UI Configuration Error', `${error}`);
    }
  };

  // Prepare options for pickers
  const countryOptions = Object.values(COUNTRIES).map(country => ({
    value: country.code,
    label: country.name,
  }));

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
        {/* Configuration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Document Configuration</Text>
          
          <OptionPicker
            label="Country"
            options={countryOptions}
            selectedValue={selectedCountry}
            onValueChange={setSelectedCountry}
            placeholder="Select Country"
          />
          
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


        {/* OCR Results Section */}
        {ocrResult && (
          <View style={styles.section}>
            <OCRResultCard result={ocrResult} />
          </View>
        )}

        {/* UI Customization Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UI Customization</Text>
          
          <View style={styles.buttonContainer}>
            <Button 
              color={'purple'} 
              title="Customize OCR UI" 
              onPress={() => setIsCustomizeModalVisible(true)}
              disabled={isOcrLoading || isHologramLoading}
            />
          </View>
        </View>

        {/* Testing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Testing Functions</Text>
          
          <View style={styles.buttonContainer}>
            <Button 
              color={'green'} 
              title={isOcrLoading ? "Processing..." : "Test OCR"} 
              onPress={testOCRScanning}
              disabled={isOcrLoading || isHologramLoading}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              color={'orange'} 
              title={isOcrLoading ? "Processing..." : "Test Document Liveness"} 
              onPress={testDocumentLiveness}
              disabled={isOcrLoading || isHologramLoading}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              color={'blue'} 
              title={isOcrLoading ? "Processing..." : "Test OCR and Document Liveness"} 
              onPress={testOCRAndDocumentLiveness}
              disabled={isOcrLoading || isHologramLoading}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              color={'purple'} 
              title={isHologramLoading ? "Processing..." : "Test Hologram"} 
              onPress={testHologramCamera}
              disabled={isOcrLoading || isHologramLoading}
            />
          </View>

          {hologramVideoUrls.length > 0 && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                📹 {hologramVideoUrls.length} hologram video(s) recorded and automatically verified
              </Text>
            </View>
          )}
        </View>

        {livenessResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Document Liveness Result</Text>
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>
                {JSON.stringify(livenessResult, null, 2)}
              </Text>
            </View>
          </View>
        )}

        {ocrAndLivenessResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OCR and Document Liveness Result</Text>
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>
                {JSON.stringify(ocrAndLivenessResult, null, 2)}
              </Text>
            </View>
          </View>
        )}

        {hologramResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hologram Result</Text>
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>
                {JSON.stringify(hologramResult, null, 2)}
              </Text>
            </View>
          </View>
        )}
      </View>
      
      {/* UI Customization Modal */}
      <UICustomizeModal
        visible={isCustomizeModalVisible}
        onClose={() => setIsCustomizeModalVisible(false)}
        onApply={handleApplyUICustomization}
      />
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
});

export default OCRTab;
