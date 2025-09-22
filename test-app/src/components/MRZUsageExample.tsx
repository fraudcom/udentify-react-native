import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';

// Import MRZ library
import {
  checkPermissions,
  requestPermissions,
  startMrzCamera,
  processMrzImage,
  MrzReaderMode,
  formatMrzDate,
  getFullName,
  type MrzResult,
  type MrzData,
  type BACCredentials,
} from 'mrz-rn-library';

/**
 * Basic usage example for MRZ library
 * This component demonstrates the essential functionality
 */
const MRZUsageExample: React.FC = () => {
  const [status, setStatus] = useState<string>('Ready');
  const [mrzData, setMrzData] = useState<MrzData | null>(null);
  const [bacCredentials, setBacCredentials] = useState<BACCredentials | null>(null);

  useEffect(() => {
    initializeMRZ();
  }, []);

  const initializeMRZ = async (): Promise<void> => {
    try {
      // Step 1: Check permissions
      const hasPermissions = await checkPermissions();
      
      if (!hasPermissions) {
        setStatus('Camera permissions required');
        
        // Step 2: Request permissions if needed
        const permissionResult = await requestPermissions();
        
        if (permissionResult === 'granted') {
          setStatus('Ready to scan MRZ');
        } else {
          setStatus('Permission denied - cannot scan');
          return;
        }
      } else {
        setStatus('Ready to scan MRZ');
      }
    } catch (error) {
      setStatus(`Initialization failed: ${error}`);
    }
  };

  const scanMRZ = async (): Promise<void> => {
    try {
      setStatus('Starting MRZ scanner...');
      
      // Step 3: Start MRZ camera with progress callback
      const result: MrzResult = await startMrzCamera(
        MrzReaderMode.ACCURATE,
        (progress: number) => {
          setStatus(`Scanning... ${progress.toFixed(1)}%`);
        }
      );

      // Step 4: Handle the result
      if (result.success && result.mrzData) {
        setMrzData(result.mrzData);
        setBacCredentials(result.bacCredentials || null);
        setStatus('MRZ scan successful!');
        
        // Optional: Show alert with key information
        Alert.alert(
          'MRZ Scanned Successfully!',
          `Document: ${result.mrzData.documentNumber}\n` +
          `Name: ${getFullName(result.mrzData)}\n` +
          `Expiry: ${formatMrzDate(result.mrzData.dateOfExpiration)}`,
          [{ text: 'OK' }]
        );
      } else {
        setStatus(`MRZ scan failed: ${result.errorMessage}`);
        Alert.alert('Scan Failed', result.errorMessage || 'Unknown error');
      }
    } catch (error) {
      setStatus(`Error: ${error}`);
      Alert.alert('Error', `MRZ scanning failed: ${error}`);
    }
  };

  const processImageExample = async (): Promise<void> => {
    // Example Base64 image (would normally come from image picker or camera)
    const exampleBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...'; // Truncated for example
    
    try {
      setStatus('Processing image...');
      
      const result: MrzResult = await processMrzImage(
        exampleBase64,
        MrzReaderMode.FAST
      );

      if (result.success && result.mrzData) {
        setMrzData(result.mrzData);
        setBacCredentials(result.bacCredentials || null);
        setStatus('Image processing successful!');
      } else {
        setStatus(`Image processing failed: ${result.errorMessage}`);
      }
    } catch (error) {
      setStatus(`Image processing error: ${error}`);
    }
  };

  const useForNFC = (): void => {
    if (!bacCredentials) {
      Alert.alert('No BAC Credentials', 'Please scan an MRZ first');
      return;
    }

    // These credentials can now be used for NFC reading
    Alert.alert(
      'BAC Credentials Ready',
      `Document Number: ${bacCredentials.documentNumber}\n` +
      `Date of Birth: ${bacCredentials.dateOfBirth}\n` +
      `Date of Expiration: ${bacCredentials.dateOfExpiration}\n\n` +
      'These credentials can be used for NFC chip reading.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>MRZ Usage Example</Text>
        <Text style={styles.subtitle}>
          Basic implementation demonstrating MRZ scanning functionality
        </Text>
      </View>

      {/* Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        <Text style={styles.statusText}>{status}</Text>
      </View>

      {/* Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Actions</Text>
        
        <TouchableOpacity style={styles.primaryButton} onPress={scanMRZ}>
          <Text style={styles.primaryButtonText}>📷 Scan MRZ with Camera</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={processImageExample}>
          <Text style={styles.secondaryButtonText}>🖼️ Process Image (Demo)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tertiaryButton} onPress={initializeMRZ}>
          <Text style={styles.tertiaryButtonText}>🔄 Reinitialize</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {mrzData && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>MRZ Results</Text>
          
          <View style={styles.resultRow}>
            <Text style={styles.label}>Document Number:</Text>
            <Text style={styles.value}>{mrzData.documentNumber}</Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={styles.label}>Full Name:</Text>
            <Text style={styles.value}>{getFullName(mrzData)}</Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={styles.label}>Nationality:</Text>
            <Text style={styles.value}>{mrzData.nationality}</Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={styles.label}>Date of Birth:</Text>
            <Text style={styles.value}>{formatMrzDate(mrzData.dateOfBirth)}</Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={styles.label}>Date of Expiration:</Text>
            <Text style={styles.value}>{formatMrzDate(mrzData.dateOfExpiration)}</Text>
          </View>

          {bacCredentials && (
            <TouchableOpacity style={styles.nfcButton} onPress={useForNFC}>
              <Text style={styles.nfcButtonText}>🔗 Use for NFC Reading</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Code Example */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Code Example</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.codeText}>
{`// Basic MRZ scanning
import { startMrzCamera, MrzReaderMode } from 'mrz-rn-library';

const scanDocument = async () => {
  try {
    const result = await startMrzCamera(
      MrzReaderMode.ACCURATE,
      (progress) => console.log(\`\${progress}%\`)
    );
    
    if (result.success) {
      console.log('Document:', result.mrzData.documentNumber);
      console.log('Name:', getFullName(result.mrzData));
      
      // Use BAC credentials for NFC
      const bacCredentials = result.bacCredentials;
    }
  } catch (error) {
    console.error('Scan failed:', error);
  }
};`}
          </Text>
        </View>
      </View>

      {/* Tips */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💡 Usage Tips</Text>
        
        <View style={styles.tipItem}>
          <Text style={styles.tipTitle}>📱 Camera Permissions</Text>
          <Text style={styles.tipText}>
            Always check and request camera permissions before starting MRZ scanning.
          </Text>
        </View>
        
        <View style={styles.tipItem}>
          <Text style={styles.tipTitle}>🎯 Scan Modes</Text>
          <Text style={styles.tipText}>
            Use ACCURATE mode for best results, FAST mode for quicker scanning.
          </Text>
        </View>
        
        <View style={styles.tipItem}>
          <Text style={styles.tipTitle}>🔗 NFC Integration</Text>
          <Text style={styles.tipText}>
            MRZ data provides BAC credentials needed for secure NFC chip reading.
          </Text>
        </View>
        
        <View style={styles.tipItem}>
          <Text style={styles.tipTitle}>📄 Document Types</Text>
          <Text style={styles.tipText}>
            Works with passports, ID cards, and other documents containing MRZ.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  nfcButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  nfcButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  codeContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  tipItem: {
    marginBottom: 16,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default MRZUsageExample;
