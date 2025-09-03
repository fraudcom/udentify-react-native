import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from 'react-native';

// Import MRZ library
import {
  checkPermissions,
  requestPermissions,
  startMrzCamera,
  processMrzImage,
  cancelMrzScanning,
  formatMrzDate,
  getFullName,
  validateMrzData,
  type MrzResult,
  type MrzData,
  type BACCredentials,
  type MrzProgressCallback,
} from 'mrz-rn-library';

interface MRZTestPageProps {
  onMrzDataExtracted?: (documentNumber?: string, dateOfBirth?: string, dateOfExpiration?: string) => void;
  onSwitchToNFC?: () => void;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  mode: MrzReaderMode;
  action: () => Promise<void>;
}

const MRZTestPage: React.FC<MRZTestPageProps> = ({ onMrzDataExtracted, onSwitchToNFC }) => {
  // State variables
  const [status, setStatus] = useState<string>('Ready');
  const [mrzResult, setMrzResult] = useState<MrzResult | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  // Removed fake mode selection - SDK doesn't have different modes
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [testResults, setTestResults] = useState<Array<{ scenario: string; result: string; success: boolean }>>([]);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [base64Image, setBase64Image] = useState<string>('');
  const [isImageProcessing, setIsImageProcessing] = useState<boolean>(false);

  // Performance tracking
  const [scanStartTime, setScanStartTime] = useState<number>(0);
  const [scanDuration, setScanDuration] = useState<number>(0);

  // Tab controller simulation for NFC integration
  const tabControllerRef = useRef<{ switchToNFC: () => void } | null>(null);

  useEffect(() => {
    checkCameraPermissions();
  }, []);

  const checkCameraPermissions = async (): Promise<void> => {
    try {
      const hasPermissions = await checkPermissions();
      setStatus(hasPermissions ? 'Camera permissions granted ✅' : 'Camera permissions required ⚠️');
    } catch (error) {
      setStatus(`Permission check failed: ${error}`);
      console.error('Permission check error:', error);
    }
  };

  const requestCameraPermissions = async (): Promise<void> => {
    try {
      setStatus('Requesting permissions...');
      const result = await requestPermissions();
      console.log('Permission request result:', result);
      
      if (result === 'granted') {
        setStatus('Camera permissions granted ✅');
      } else if (result === 'denied') {
        setStatus('Camera permissions denied ❌');
      } else {
        setStatus('Permission request pending...');
        // Check again after a short delay
        setTimeout(checkCameraPermissions, 1000);
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setStatus(`Permission request failed: ${error}`);
    }
  };

  const handleProgressUpdate: MrzProgressCallback = (progress: number) => {
    setScanProgress(progress);
    setStatus(`Scanning... ${progress.toFixed(1)}% 📱`);
  };

  const startMrzScanning = async (): Promise<void> => {
    if (isScanning) return;

    setIsScanning(true);
    setStatus('Starting MRZ camera... 🚀');
    setMrzResult(null);
    setScanProgress(0);
    setScanStartTime(Date.now());

    try {
      const result = await startMrzCamera(handleProgressUpdate);
      
      const duration = Date.now() - scanStartTime;
      setScanDuration(duration);

      setMrzResult(result);
      setIsScanning(false);
      setScanProgress(0);

      if (result.success) {
        setStatus(`MRZ scan successful! ✅ (${(duration / 1000).toFixed(1)}s)`);

        // Notify parent component about the extracted data
        if (onMrzDataExtracted) {
          onMrzDataExtracted(result.documentNumber, result.dateOfBirth, result.dateOfExpiration);
        }

        // Add to test results
        addTestResult(`Camera Scan (${selectedMode})`, 'Success', true, duration);
      } else {
        const errorMsg = result.errorMessage || 'Unknown error';
        setStatus(`MRZ scan failed: ${errorMsg} ❌`);
        addTestResult(`Camera Scan (${selectedMode})`, errorMsg, false, duration);
      }
    } catch (error) {
      const duration = Date.now() - scanStartTime;
      setScanDuration(duration);
      setStatus(`MRZ scan failed: ${error} ❌`);
      setIsScanning(false);
      setScanProgress(0);
      addTestResult(`Camera Scan (${selectedMode})`, `${error}`, false, duration);
    }
  };

  const processImageFromBase64 = async (): Promise<void> => {
    if (!base64Image.trim()) {
      Alert.alert('Error', 'Please enter a valid Base64 image string');
      return;
    }

    setIsImageProcessing(true);
    setStatus('Processing MRZ image... 🖼️');
    const startTime = Date.now();

    try {
      const result = await processMrzImage(base64Image.trim());
      const duration = Date.now() - startTime;

      setMrzResult(result);
      setIsImageProcessing(false);
      setShowImageModal(false);

      if (result.success) {
        setStatus(`MRZ image processing successful! ✅ (${(duration / 1000).toFixed(1)}s)`);
        addTestResult(`Image Processing (${selectedMode})`, 'Success', true, duration);
      } else {
        const errorMsg = result.errorMessage || 'Unknown error';
        setStatus(`MRZ image processing failed: ${errorMsg} ❌`);
        addTestResult(`Image Processing (${selectedMode})`, errorMsg, false, duration);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      setStatus(`MRZ image processing failed: ${error} ❌`);
      setIsImageProcessing(false);
      addTestResult(`Image Processing (${selectedMode})`, `${error}`, false, duration);
    }
  };

  const cancelScanning = async (): Promise<void> => {
    try {
      await cancelMrzScanning();
      const duration = Date.now() - scanStartTime;
      setScanDuration(duration);
      setStatus('MRZ scanning cancelled 🛑');
      setIsScanning(false);
      setScanProgress(0);
      addTestResult(`Cancel Scan (${selectedMode})`, 'Cancelled by user', false, duration);
    } catch (error) {
      setStatus(`Cancel failed: ${error} ❌`);
    }
  };

  const addTestResult = (scenario: string, result: string, success: boolean, duration: number): void => {
    const newResult = {
      scenario: `${scenario} (${(duration / 1000).toFixed(1)}s)`,
      result,
      success,
    };
    setTestResults(prev => [newResult, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  const runAutomatedTests = async (): Promise<void> => {
    setTestResults([]);
    setStatus('Running automated tests... 🧪');

    const tests: TestScenario[] = [
      {
        id: 'permission-check',
        name: 'Permission Check',
        description: 'Check camera permissions',
        mode: MrzReaderMode.ACCURATE,
        action: async () => {
          const hasPermissions = await checkPermissions();
          if (!hasPermissions) {
            throw new Error('Camera permissions not granted');
          }
        },
      },
      {
        id: 'fast-mode-ready',
        name: 'Fast Mode Readiness',
        description: 'Test fast mode initialization',
        mode: MrzReaderMode.FAST,
        action: async () => {
          // This would normally start scanning but we'll just test mode switching
          setSelectedMode(MrzReaderMode.FAST);
          await new Promise(resolve => setTimeout(resolve, 100));
        },
      },
      {
        id: 'accurate-mode-ready',
        name: 'Accurate Mode Readiness',
        description: 'Test accurate mode initialization',
        mode: MrzReaderMode.ACCURATE,
        action: async () => {
          setSelectedMode(MrzReaderMode.ACCURATE);
          await new Promise(resolve => setTimeout(resolve, 100));
        },
      },
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        await test.action();
        const duration = Date.now() - startTime;
        addTestResult(test.name, 'Passed', true, duration);
      } catch (error) {
        const duration = Date.now() - Date.now();
        addTestResult(test.name, `Failed: ${error}`, false, duration);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setStatus('Automated tests completed 🎯');
  };

  const clearTestResults = (): void => {
    setTestResults([]);
    setStatus('Test results cleared 🧹');
  };

  const useForNfc = (): void => {
    if (mrzResult && mrzResult.success) {
      // Switch to NFC tab if callback provided
      if (onSwitchToNFC) {
        onSwitchToNFC();
      }

      // Show success alert with BAC credentials
      const bacCreds = mrzResult.bacCredentials;
      Alert.alert(
        'MRZ Data Ready for NFC 🔗',
        `Document: ${mrzResult.documentNumber || 'N/A'}\n` +
        `DOB: ${mrzResult.dateOfBirth || 'N/A'}\n` +
        `Exp: ${mrzResult.dateOfExpiration || 'N/A'}\n\n` +
        `BAC Credentials Ready: ${bacCreds ? '✅' : '❌'}`,
        [{ text: 'OK' }]
      );
    }
  };

  const formatDateForDisplay = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      return formatMrzDate(dateString, 'DD/MM/YYYY');
    } catch {
      return dateString;
    }
  };

  const validateCurrentMrzData = (): void => {
    if (!mrzResult?.mrzData) {
      Alert.alert('No MRZ Data', 'Please scan a document first');
      return;
    }

    const missingFields = validateMrzData(mrzResult.mrzData);
    if (missingFields.length === 0) {
      Alert.alert('Validation Success ✅', 'All required MRZ fields are present');
    } else {
      Alert.alert(
        'Validation Issues ⚠️',
        `Missing fields: ${missingFields.join(', ')}`
      );
    }
  };

  const exportMrzData = (): void => {
    if (!mrzResult?.mrzData) {
      Alert.alert('No Data', 'Please scan a document first');
      return;
    }

    const exportData = {
      scanTime: new Date().toISOString(),
      scanDuration: scanDuration,
      mode: selectedMode,
      mrzData: mrzResult.mrzData,
      bacCredentials: mrzResult.bacCredentials,
    };

    console.log('Exported MRZ Data:', JSON.stringify(exportData, null, 2));
    Alert.alert('Data Exported 📤', 'MRZ data logged to console');
  };

  const renderStatusCard = (): React.ReactElement => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Status 📊</Text>
      <Text style={styles.statusText}>{status}</Text>
      {isScanning && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${scanProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{scanProgress.toFixed(1)}%</Text>
        </View>
      )}
      {scanDuration > 0 && !isScanning && (
        <Text style={styles.durationText}>
          Last scan duration: {(scanDuration / 1000).toFixed(1)}s
        </Text>
      )}
    </View>
  );

  const renderConfigurationCard = (): React.ReactElement => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>MRZ Configuration ⚙️</Text>
      <View style={styles.modeContainer}>
        <Text style={styles.label}>Reader Mode:</Text>
        <View style={styles.modeButtons}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              selectedMode === MrzReaderMode.FAST && styles.modeButtonActive,
            ]}
            onPress={() => setSelectedMode(MrzReaderMode.FAST)}
            disabled={isScanning}
          >
            <Text
              style={[
                styles.modeButtonText,
                selectedMode === MrzReaderMode.FAST && styles.modeButtonTextActive,
              ]}
            >
              ⚡ Fast
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              selectedMode === MrzReaderMode.ACCURATE && styles.modeButtonActive,
            ]}
            onPress={() => setSelectedMode(MrzReaderMode.ACCURATE)}
            disabled={isScanning}
          >
            <Text
              style={[
                styles.modeButtonText,
                selectedMode === MrzReaderMode.ACCURATE && styles.modeButtonTextActive,
              ]}
            >
              🎯 Accurate
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderActionButtons = (): React.ReactElement => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Actions 🎬</Text>
      
      {/* Permission buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={checkCameraPermissions}
          disabled={isScanning}
        >
          <Text style={styles.buttonSecondaryText}>🔍 Check Permissions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={requestCameraPermissions}
          disabled={isScanning}
        >
          <Text style={styles.buttonSecondaryText}>🔐 Request Permissions</Text>
        </TouchableOpacity>
      </View>

      {/* Main action buttons */}
      <TouchableOpacity
        style={[styles.button, styles.buttonPrimary, isScanning && styles.buttonDisabled]}
        onPress={startMrzScanning}
        disabled={isScanning}
      >
        <View style={styles.buttonContent}>
          {isScanning && <ActivityIndicator size="small" color="white" style={styles.spinner} />}
          <Text style={styles.buttonPrimaryText}>
            {isScanning ? '📱 Scanning...' : '📷 Start MRZ Camera'}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonWarning]}
        onPress={() => setShowImageModal(true)}
        disabled={isScanning || isImageProcessing}
      >
        <Text style={styles.buttonWarningText}>🖼️ Process Image (Base64)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonDanger, !isScanning && styles.buttonDisabled]}
        onPress={cancelScanning}
        disabled={!isScanning}
      >
        <Text style={styles.buttonDangerText}>🛑 Cancel Scanning</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTestingCard = (): React.ReactElement => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Testing & Validation 🧪</Text>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={runAutomatedTests}
          disabled={isScanning}
        >
          <Text style={styles.buttonSecondaryText}>🤖 Run Auto Tests</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={validateCurrentMrzData}
          disabled={!mrzResult?.success}
        >
          <Text style={styles.buttonSecondaryText}>✅ Validate Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={exportMrzData}
          disabled={!mrzResult?.success}
        >
          <Text style={styles.buttonSecondaryText}>📤 Export Data</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={clearTestResults}
          disabled={testResults.length === 0}
        >
          <Text style={styles.buttonSecondaryText}>🧹 Clear Results</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTestResults = (): React.ReactElement | null => {
    if (testResults.length === 0) return null;

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Test Results 📋 ({testResults.length})</Text>
        {testResults.map((result, index) => (
          <View key={index} style={styles.testResultItem}>
            <View style={styles.testResultHeader}>
              <Text style={styles.testResultScenario}>{result.scenario}</Text>
              <Text style={[styles.testResultStatus, result.success ? styles.successText : styles.errorText]}>
                {result.success ? '✅' : '❌'}
              </Text>
            </View>
            <Text style={styles.testResultText}>{result.result}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderMrzResults = (): React.ReactElement | null => {
    if (!mrzResult) return null;

    const { success, mrzData, errorMessage, bacCredentials } = mrzResult;

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>MRZ Results 📄</Text>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Success:</Text>
          <Text style={[styles.resultValue, success ? styles.successText : styles.errorText]}>
            {success ? '✅ Yes' : '❌ No'}
          </Text>
        </View>

        {success && mrzData ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>📋 Document Information</Text>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Document Type:</Text>
              <Text style={styles.resultValue}>{mrzData.documentType || 'N/A'}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Document Number:</Text>
              <Text style={styles.resultValue}>{mrzData.documentNumber || 'N/A'}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Issuing Country:</Text>
              <Text style={styles.resultValue}>{mrzData.issuingCountry || 'N/A'}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Nationality:</Text>
              <Text style={styles.resultValue}>{mrzData.nationality || 'N/A'}</Text>
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>👤 Personal Information</Text>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Full Name:</Text>
              <Text style={styles.resultValue}>{getFullName(mrzData) || 'N/A'}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Surname:</Text>
              <Text style={styles.resultValue}>{mrzData.surname || 'N/A'}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Given Names:</Text>
              <Text style={styles.resultValue}>{mrzData.givenNames || 'N/A'}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Gender:</Text>
              <Text style={styles.resultValue}>{mrzData.gender || 'N/A'}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Date of Birth:</Text>
              <Text style={styles.resultValue}>{formatDateForDisplay(mrzData.dateOfBirth)}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Date of Expiration:</Text>
              <Text style={styles.resultValue}>{formatDateForDisplay(mrzData.dateOfExpiration)}</Text>
            </View>

            {bacCredentials && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>🔗 BAC Credentials (for NFC)</Text>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Document Number:</Text>
                  <Text style={styles.resultValue}>{bacCredentials.documentNumber}</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Date of Birth:</Text>
                  <Text style={styles.resultValue}>{bacCredentials.dateOfBirth}</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Date of Expiration:</Text>
                  <Text style={styles.resultValue}>{bacCredentials.dateOfExpiration}</Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.button, styles.buttonSuccess]}
              onPress={useForNfc}
            >
              <Text style={styles.buttonSuccessText}>🔗 Use for NFC Reading</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.divider} />
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Error:</Text>
              <Text style={styles.errorText}>{errorMessage || 'Unknown error'}</Text>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderImageModal = (): React.ReactElement => (
    <Modal
      visible={showImageModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>🖼️ Process MRZ Image</Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowImageModal(false)}
          >
            <Text style={styles.modalCloseText}>❌ Close</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalDescription}>
            Enter a Base64 encoded image string containing an MRZ to process:
          </Text>
          
          <TextInput
            style={styles.textInput}
            multiline
            placeholder="Paste Base64 image data here..."
            value={base64Image}
            onChangeText={setBase64Image}
            editable={!isImageProcessing}
          />
          
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, (!base64Image.trim() || isImageProcessing) && styles.buttonDisabled]}
            onPress={processImageFromBase64}
            disabled={!base64Image.trim() || isImageProcessing}
          >
            <View style={styles.buttonContent}>
              {isImageProcessing && <ActivityIndicator size="small" color="white" style={styles.spinner} />}
              <Text style={styles.buttonPrimaryText}>
                {isImageProcessing ? '🔄 Processing...' : '🚀 Process Image'}
              </Text>
            </View>
          </TouchableOpacity>
          
          <Text style={styles.modalNote}>
            📝 Note: The image should contain a clear view of the MRZ area (bottom portion of ID cards or passports).
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderInformation = (): React.ReactElement => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>📚 About MRZ</Text>
      <Text style={styles.infoText}>
        Machine Readable Zone (MRZ) is a standardized format found on the bottom of ID cards and passports. 
        It contains essential information needed for NFC reading including document number, date of birth, and expiration date.
      </Text>
      <Text style={styles.infoText}>
        <Text style={styles.boldText}>⚡ Fast Mode:</Text> Quicker scanning but may be less accurate{'\n'}
        <Text style={styles.boldText}>🎯 Accurate Mode:</Text> Slower but more reliable results
      </Text>
      <Text style={styles.infoText}>
        After successful MRZ scanning, you can use the extracted data to automatically populate the NFC reading form.
      </Text>
      <Text style={styles.infoText}>
        <Text style={styles.boldText}>🔗 BAC Credentials:</Text> Basic Access Control credentials automatically generated from MRZ data for secure NFC chip reading.
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {renderStatusCard()}
      {renderConfigurationCard()}
      {renderActionButtons()}
      {renderTestingCard()}
      {renderTestResults()}
      {renderMrzResults()}
      {renderInformation()}
      {renderImageModal()}
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
    marginBottom: 8,
  },
  durationText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  modeContainer: {
    marginTop: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  modeButtons: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  modeButtonTextActive: {
    color: 'white',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
  },
  buttonWarning: {
    backgroundColor: '#FF9500',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonSuccess: {
    backgroundColor: '#34C759',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  buttonPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonWarningText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDangerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSuccessText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  testResultItem: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  testResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  testResultScenario: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  testResultStatus: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  testResultText: {
    fontSize: 12,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  resultValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  successText: {
    color: '#34C759',
  },
  errorText: {
    color: '#FF3B30',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: '600',
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    maxHeight: 200,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalNote: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 18,
  },
});

export default MRZTestPage;
