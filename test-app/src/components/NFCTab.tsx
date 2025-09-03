import React, { useState, useEffect, useRef } from 'react';
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
  TextInput,
  Animated,
  Image,
} from 'react-native';
import { currentConfig } from '../config/apiConfig';
import { udentifyApiService } from '../services/udentifyApiService';

// TurboModule initialization (same pattern as OCRTab.tsx)
const isTurboModuleEnabled = (global as any).__turboModuleProxy != null;

let NFCModule: any;

if (isTurboModuleEnabled) {
  try {
    const {TurboModuleRegistry} = require('react-native');
    NFCModule = TurboModuleRegistry.getEnforcing('NFCModule');
  } catch (error) {
    console.error('TurboModule failed, falling back to Legacy:', error);
    NFCModule = NativeModules.NFCModule;
  }
} else {
  NFCModule = NativeModules.NFCModule;
}

// NFC Module functions (same pattern as OCRTab.tsx)
const isNFCAvailable = async () => {
  if (!NFCModule) throw new Error('NFCModule not available');
  return await NFCModule.isNFCAvailable();
};

const isNFCEnabled = async () => {
  if (!NFCModule) throw new Error('NFCModule not available');
  return await NFCModule.isNFCEnabled();
};

const startNFCReading = async (credentials: any) => {
  if (!NFCModule) throw new Error('NFCModule not available');
  return await NFCModule.startNFCReading(credentials);
};

const cancelNFCReading = async () => {
  if (!NFCModule) throw new Error('NFCModule not available');
  return await NFCModule.cancelNFCReading();
};

const getNFCLocation = async (serverURL: string) => {
  if (!NFCModule) throw new Error('NFCModule not available');
  return await NFCModule.getNFCLocation(serverURL);
};

const getNFCStatus = async () => {
  try {
    const isAvailable = await isNFCAvailable();
    const isEnabled = await isNFCEnabled();

    return {
      isAvailable,
      isEnabled,
      message: isAvailable
        ? (isEnabled ? 'NFC is available and enabled' : 'NFC is available but disabled')
        : 'NFC is not available on this device',
    };
  } catch (error) {
    console.error('NFCModule - getNFCStatus error:', error);
    return {
      isAvailable: false,
      isEnabled: false,
      message: `Error checking NFC status: ${error}`,
    };
  }
};

// Types
type NFCCredentials = {
  documentNumber: string;
  dateOfBirth: string;
  expiryDate: string;
  serverURL: string;
  transactionID: string;
  requestTimeout?: number;
  isActiveAuthenticationEnabled?: boolean;
  isPassiveAuthenticationEnabled?: boolean;
  enableAutoTriggering?: boolean;
  logLevel?: string;
};

type NFCStatusResponse = {
  isAvailable: boolean;
  isEnabled: boolean;
  message?: string;
};

type NFCLocationResponse = {
  success: boolean;
  location: number;
  message?: string;
};

// Types
type NFCTagResponse = any;

type MRZData = {
  documentNumber?: string;
  dateOfBirth?: string;
  dateOfExpiration?: string;
};

interface NFCTabProps {
  mrzData?: MRZData | null;
}

const NFCTab: React.FC<NFCTabProps> = ({ mrzData }) => {
  // State for NFC status
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isReading, setIsReading] = useState<boolean>(false);
  
  // State for results
  const [passportResult, setPassportResult] = useState<any | null>(null);
  const [statusResult, setStatusResult] = useState<NFCStatusResponse | null>(null);
  const [locationResult, setLocationResult] = useState<any | null>(null);
  
  // State for NFC reading status
  const [nfcStatus, setNfcStatus] = useState<string>('');
  
  // Animation for pulsing effect
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  
  // State for NFC credentials input
  const [documentNumber, setDocumentNumber] = useState<string>('12345678');
  const [dateOfBirth, setDateOfBirth] = useState<string>('900101'); // YYMMDD
  const [expiryDate, setExpiryDate] = useState<string>('301231'); // YYMMDD
  const [serverURL, setServerURL] = useState<string>(currentConfig.baseUrl);
  const [currentTransactionID, setCurrentTransactionID] = useState<string>('');


  // No event listeners needed - using direct promise results like OCR

  // Check NFC status on component mount
  useEffect(() => {
    checkNFCStatus();
  }, []);

  // Update form fields when MRZ data is received
  useEffect(() => {
    if (mrzData) {
      console.log('NFCTab - Received MRZ data:', mrzData);
      
      if (mrzData.documentNumber) {
        setDocumentNumber(mrzData.documentNumber);
      }
      if (mrzData.dateOfBirth) {
        setDateOfBirth(mrzData.dateOfBirth);
      }
      if (mrzData.dateOfExpiration) {
        setExpiryDate(mrzData.dateOfExpiration);
      }
    }
  }, [mrzData]);
  
  // Pulsing animation for NFC reading
  useEffect(() => {
    if (isReading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [isReading, pulseAnimation]);

  // Permission request function
  async function requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        console.log('NFCTab - Requesting Android permissions...');
        
        // NFC permission is not available as a runtime permission in React Native
        // It's a normal permission that's granted at install time through manifest
        // Only request READ_PHONE_STATE which is a dangerous permission
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          {
            title: 'Phone State Permission',
            message: 'This app needs access to phone state for NFC functionality to work properly.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission Required', 
            'Phone state permission is required for NFC functionality to work properly.'
          );
          return false;
        }

        console.log('NFCTab - READ_PHONE_STATE permission granted');
        return true;
      } catch (error) {
        console.error('NFCTab - Permission request error:', error);
        return false;
      }
    }
    return true;
  }

  // Transaction ID function (similar to OCRTab.tsx)
  async function getTransactionID(): Promise<string> {
    console.log('NFCTab - 🔍 DEBUG: getTransactionID function called');
    try {
      console.log('NFCTab - 🔄 Requesting transaction ID from server...');
      
      const transactionID = await udentifyApiService.startTransaction(['NFC']);
      
      console.log('NFCTab - ✅ Transaction ID retrieved successfully:', transactionID);
      setCurrentTransactionID(transactionID);
      return transactionID;
    } catch (error) {
      console.error('NFCTab - ❌ Failed to get transaction ID:', error);
      throw new Error(`Failed to get transaction ID: ${error}`);
    }
  }

  async function checkNFCStatus() {
    try {
      console.log('NFCTab - 🔄 Checking NFC status...');
      
      const available = await isNFCAvailable();
      const enabled = await isNFCEnabled();
      
      setIsAvailable(available);
      setIsEnabled(enabled);
      
      const status = {
        isAvailable: available,
        isEnabled: enabled,
        message: available 
          ? (enabled ? 'NFC is available and enabled' : 'NFC is available but disabled') 
          : 'NFC is not available on this device'
      };
      
      setStatusResult(status);
      
      console.log('NFCTab - ✅ NFC Status:', status);
    } catch (error) {
      console.error('NFCTab - NFC Status Error:', error);
      Alert.alert('NFC Status Error', `${error}`);
    }
  }

  async function testPassportReading() {
    try {
      setIsReading(true);
      
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        Alert.alert('Error', 'NFC permissions are required');
        return;
      }
      
      // Validate required fields
      if (!documentNumber.trim()) {
        Alert.alert('Error', 'Document Number is required');
        setIsReading(false);
        return;
      }
      if (!dateOfBirth.trim() || dateOfBirth.length !== 6) {
        Alert.alert('Error', 'Date of Birth must be in YYMMDD format (6 digits)');
        setIsReading(false);
        return;
      }
      if (!expiryDate.trim() || expiryDate.length !== 6) {
        Alert.alert('Error', 'Expiry Date must be in YYMMDD format (6 digits)');
        setIsReading(false);
        return;
      }
      if (!serverURL.trim()) {
        Alert.alert('Error', 'Server URL is required');
        setIsReading(false);
        return;
      }
      
      console.log('NFCTab - 🔄 Starting NFC passport reading...');
      
      // Reset status
      setNfcStatus('🔄 Initializing NFC reading...');
      
      // Step 1: Get transaction ID from server (as per iOS documentation)
      console.log('NFCTab - 📞 Getting transaction ID from server...');
      setNfcStatus('📞 Getting transaction ID from server...');
      
      const transactionID = await getTransactionID();
      
      console.log('NFCTab - ✅ Transaction ID obtained:', transactionID);
      setNfcStatus('✅ Transaction ID obtained, starting NFC...');
      
      // Step 2: Use proper credentials with server-provided transaction ID
      const credentials = {
        documentNumber: documentNumber.trim(),
        dateOfBirth: dateOfBirth.trim(), // YYMMDD format
        expiryDate: expiryDate.trim(), // YYMMDD format
        serverURL: serverURL.trim(),
        transactionID: transactionID, // Server-provided transaction ID
        requestTimeout: 30,
        isActiveAuthenticationEnabled: true,
        isPassiveAuthenticationEnabled: true,
        enableAutoTriggering: true,
        logLevel: 'warning' as const
      };
      
      console.log('NFCTab - Using credentials:', credentials);
      
      // Step 3: Start NFC reading and wait for result (like OCR does)
      setNfcStatus('📱 Hold your device near the passport NFC chip');
      
      const result = await startNFCReading(credentials);
      
      if (result && result.success) {
        console.log('NFCTab - ✅ NFC passport reading successful:', result);
        setPassportResult(result);
        setIsReading(false);
        setNfcStatus('✅ Passport read successfully!');
        Alert.alert('Passport Read', 'Passport data was read successfully!');
      } else {
        console.log('NFCTab - ❌ NFC passport reading failed');
        setIsReading(false);
        setNfcStatus('❌ Failed to read passport');
        Alert.alert('Error', 'Failed to read passport data');
      }
    } catch (error) {
      console.error('NFCTab - NFC Passport Reading Error:', error);
      setIsReading(false);
      setNfcStatus(`❌ Error: ${error}`);
      Alert.alert('Passport Reading Error', `${error}`);
    }
  }

  async function testCancelReading() {
    try {
      console.log('NFCTab - 🔄 Cancelling NFC reading...');
      
      const success = await cancelNFCReading();
      setIsReading(false);
      
      if (success) {
        console.log('NFCTab - ✅ NFC reading cancelled successfully');
        setNfcStatus('🛑 NFC reading cancelled');
        // Don't show alert - use visual feedback instead
      } else {
        Alert.alert('Error', 'Failed to cancel NFC reading');
      }
    } catch (error) {
      console.error('NFCTab - Cancel NFC Reading Error:', error);
      Alert.alert('Cancel Reading Error', `${error}`);
    }
  }

  async function testGetNFCLocation() {
    try {
      console.log('NFCTab - 🔄 Getting NFC antenna location...');
      
      const result = await getNFCLocation(currentConfig.baseUrl);
      
      console.log('NFCTab - ✅ NFC Location Result:', result);
      setLocationResult(result);
      Alert.alert('NFC Location', 'NFC antenna location detected!');
    } catch (error) {
      console.error('NFCTab - NFC Location Error:', error);
      Alert.alert('NFC Location Error', `${error}`);
    }
  }

  // Removed picker options for simplified UI

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* NFC Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NFC Status</Text>
          
          <View style={styles.statusContainer}>
            <Text style={[styles.nfcStatusText, isAvailable ? styles.statusEnabled : styles.statusDisabled]}>
              Available: {isAvailable ? '✅' : '❌'}
            </Text>
            <Text style={[styles.nfcStatusText, isEnabled ? styles.statusEnabled : styles.statusDisabled]}>
              Enabled: {isEnabled ? '✅' : '❌'}
            </Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              color={'blue'} 
              title="Refresh Status" 
              onPress={checkNFCStatus}
              disabled={isReading}
            />
          </View>
        </View>

        {/* NFC Credentials Input Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NFC Passport Credentials</Text>
          
          {/* MRZ Data Indicator */}
          {mrzData && (
            <View style={styles.mrzDataIndicator}>
              <Text style={styles.mrzDataText}>
                📄 Data populated from MRZ scan
              </Text>
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Document Number *</Text>
            <TextInput
              style={styles.textInput}
              value={documentNumber}
              onChangeText={setDocumentNumber}
              placeholder="e.g. 12345678"
              autoCapitalize="characters"
              maxLength={20}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Date of Birth (YYMMDD) *</Text>
            <TextInput
              style={styles.textInput}
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="e.g. 900101"
              keyboardType="numeric"
              maxLength={6}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Expiry Date (YYMMDD) *</Text>
            <TextInput
              style={styles.textInput}
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder="e.g. 301231"
              keyboardType="numeric"
              maxLength={6}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Server URL *</Text>
            <TextInput
              style={styles.textInput}
              value={serverURL}
              onChangeText={setServerURL}
              placeholder={currentConfig.baseUrl}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
          
          {/* Transaction ID Display (Read-only) */}
          {currentTransactionID && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Current Transaction ID</Text>
              <View style={[styles.textInput, styles.readOnlyInput]}>
                <Text style={styles.readOnlyText}>{currentTransactionID}</Text>
              </View>
              <Text style={styles.helperText}>
                ✅ Obtained from server automatically
              </Text>
            </View>
          )}
          

        </View>

        {/* Testing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NFC Testing Functions</Text>
          
          <View style={styles.buttonContainer}>
            <Button 
              color={'green'} 
              title={isReading ? "Reading..." : "Start Passport Reading"} 
              onPress={testPassportReading}
              disabled={isReading || !isAvailable || !isEnabled}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              color={'red'} 
              title="Cancel Reading" 
              onPress={testCancelReading}
              disabled={!isReading}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              color={'blue'} 
              title="Get NFC Location" 
              onPress={testGetNFCLocation}
              disabled={isReading || !isAvailable || !isEnabled}
            />
          </View>

          {/* NFC Reading Status */}
          {(isReading || nfcStatus) && (
            <Animated.View style={[styles.nfcStatusContainer, { opacity: pulseAnimation }]}>
              <Text style={styles.statusText}>{nfcStatus}</Text>
              {isReading && (
                <View style={styles.nfcIconContainer}>
                  <Animated.Text style={[styles.nfcIcon, { transform: [{ scale: pulseAnimation }] }]}>
                    📡
                  </Animated.Text>
                  <Text style={styles.instructionText}>
                    Keep your device steady near the passport's NFC chip
                  </Text>
                </View>
              )}
            </Animated.View>
          )}
        </View>

        {/* Status Results Section */}
        {statusResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NFC Status Result</Text>
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>
                {JSON.stringify(statusResult, null, 2)}
              </Text>
            </View>
          </View>
        )}

        {/* Passport Results Section */}
        {passportResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Passport Reading Result</Text>
            
            {/* Success Status */}
            <View style={[styles.statusCard, passportResult.success ? styles.successCard : styles.errorCard]}>
              <Text style={[styles.statusCardText, passportResult.success ? styles.successText : styles.errorText]}>
                {passportResult.success ? '✅ Passport Read Successfully' : '❌ Passport Reading Failed'}
              </Text>
              {passportResult.transactionID && (
                <Text style={styles.transactionText}>
                  Transaction ID: {passportResult.transactionID}
                </Text>
              )}
            </View>

            {/* Personal Information */}
            {passportResult.success && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultSectionTitle}>Personal Information</Text>
                
                {passportResult.firstName && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>First Name:</Text>
                    <Text style={styles.resultValue}>{passportResult.firstName}</Text>
                  </View>
                )}
                
                {passportResult.lastName && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Last Name:</Text>
                    <Text style={styles.resultValue}>{passportResult.lastName}</Text>
                  </View>
                )}
                
                {passportResult.documentNumber && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Document Number:</Text>
                    <Text style={styles.resultValue}>{passportResult.documentNumber}</Text>
                  </View>
                )}
                
                {passportResult.nationality && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Nationality:</Text>
                    <Text style={styles.resultValue}>{passportResult.nationality}</Text>
                  </View>
                )}
                
                {passportResult.dateOfBirth && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Date of Birth:</Text>
                    <Text style={styles.resultValue}>{passportResult.dateOfBirth}</Text>
                  </View>
                )}
                
                {passportResult.expiryDate && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Expiry Date:</Text>
                    <Text style={styles.resultValue}>{passportResult.expiryDate}</Text>
                  </View>
                )}
                
                {passportResult.gender && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Gender:</Text>
                    <Text style={styles.resultValue}>{passportResult.gender}</Text>
                  </View>
                )}
                
                {passportResult.personalNumber && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Personal Number:</Text>
                    <Text style={styles.resultValue}>{passportResult.personalNumber}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Authentication Results */}
            {passportResult.success && (passportResult.passedPA || passportResult.passedAA) && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultSectionTitle}>Authentication Results</Text>
                
                {passportResult.passedPA && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Passive Authentication:</Text>
                    <Text style={[styles.resultValue, 
                      passportResult.passedPA === 'true' ? styles.authSuccess : 
                      passportResult.passedPA === 'false' ? styles.authFailed : 
                      styles.authDisabled
                    ]}>
                      {passportResult.passedPA === 'true' ? '✅ Passed' :
                       passportResult.passedPA === 'false' ? '❌ Failed' :
                       passportResult.passedPA === 'disabled' ? '⚪ Disabled' :
                       '❓ Not Supported'}
                    </Text>
                  </View>
                )}
                
                {passportResult.passedAA && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Active Authentication:</Text>
                    <Text style={[styles.resultValue,
                      passportResult.passedAA === 'true' ? styles.authSuccess : 
                      passportResult.passedAA === 'false' ? styles.authFailed : 
                      styles.authDisabled
                    ]}>
                      {passportResult.passedAA === 'true' ? '✅ Passed' :
                       passportResult.passedAA === 'false' ? '❌ Failed' :
                       passportResult.passedAA === 'disabled' ? '⚪ Disabled' :
                       '❓ Not Supported'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Face Image */}
            {passportResult.success && passportResult.faceImage && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultSectionTitle}>Passport Photo</Text>
                <View style={styles.imageContainer}>
                  <Text style={styles.imageNote}>
                    Face image extracted (Base64 encoded - {Math.round(passportResult.faceImage.length / 1024)}KB)
                  </Text>
                  
                  <Image 
                    source={{ uri: `data:image/jpeg;base64,${passportResult.faceImage}` }}
                    style={styles.passportImage}
                    resizeMode="contain"
                  />
                  
                  <Text style={styles.resultValue}>📷 Passport photo successfully extracted</Text>
                </View>
              </View>
            )}

            {/* Error Information */}
            {!passportResult.success && (passportResult.error || passportResult.message) && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultSectionTitle}>Error Details</Text>
                {passportResult.error && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Error:</Text>
                    <Text style={[styles.resultValue, styles.errorText]}>{passportResult.error}</Text>
                  </View>
                )}
                {passportResult.message && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Message:</Text>
                    <Text style={[styles.resultValue, styles.errorText]}>{passportResult.message}</Text>
                  </View>
                )}
              </View>
            )}


          </View>
        )}

        {/* Location Results Section */}
        {locationResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NFC Location Result</Text>
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>
                {JSON.stringify(locationResult, null, 2)}
              </Text>
            </View>
          </View>
        )}
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
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  nfcStatusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusEnabled: {
    color: '#28a745',
  },
  statusDisabled: {
    color: '#dc3545',
  },
  buttonContainer: {
    marginVertical: 6,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#212529',
  },
  readOnlyInput: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#495057',
    fontFamily: 'monospace',
  },
  helperText: {
    fontSize: 12,
    color: '#28a745',
    marginTop: 4,
    fontStyle: 'italic',
  },
  mrzDataIndicator: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  mrzDataText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
    textAlign: 'center',
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
  nfcStatusContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007bff',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 12,
  },

  instructionText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  nfcIconContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  nfcIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  
  // Result display styles
  statusCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
  },
  successCard: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  errorCard: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  statusCardText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  successText: {
    color: '#155724',
  },
  errorText: {
    color: '#721c24',
  },
  transactionText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  resultSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingBottom: 8,
  },
  resultRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingVertical: 4,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
    width: 120,
    marginRight: 12,
  },
  resultValue: {
    fontSize: 14,
    color: '#212529',
    flex: 1,
    fontWeight: '400',
  },
  authSuccess: {
    color: '#28a745',
    fontWeight: '600',
  },
  authFailed: {
    color: '#dc3545',
    fontWeight: '600',
  },
  authDisabled: {
    color: '#6c757d',
    fontWeight: '400',
  },
  imageContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  imageNote: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'center',
  },
  passportImage: {
    width: 120,
    height: 160,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007bff',
    marginVertical: 12,
    backgroundColor: '#f8f9fa',
  },
});

export default NFCTab;
