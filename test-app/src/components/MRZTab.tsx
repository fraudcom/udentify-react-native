import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  Switch,
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
  type MrzUICustomization,
} from 'mrz-rn-library';

interface MRZTabProps {
  onMrzDataExtracted?: (documentNumber?: string, dateOfBirth?: string, dateOfExpiration?: string) => void;
  onSwitchToNFC?: () => void;
}

const MRZTab: React.FC<MRZTabProps> = ({ onMrzDataExtracted, onSwitchToNFC }) => {
  // State variables
  const [status, setStatus] = useState<string>('Ready');
  const [mrzResult, setMrzResult] = useState<MrzResult | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  // Removed fake mode selection - SDK doesn't have different modes
  const [scanProgress, setScanProgress] = useState<number>(0);
  
  // UI Customization state
  const [customizationMode, setCustomizationMode] = useState<'default' | 'custom' | 'minimal'>('default');
  
  // Individual customization controls
  const [focusViewBorderColor, setFocusViewBorderColor] = useState<string>('#007AFF');
  const [focusViewStrokeWidth, setFocusViewStrokeWidth] = useState<number>(3);
  const [instructionText, setInstructionText] = useState<string>('Place document MRZ within the frame');
  const [instructionTextColor, setInstructionTextColor] = useState<string>('#FFFFFF');
  const [showCancelButton, setShowCancelButton] = useState<boolean>(true);
  const [cancelButtonText, setCancelButtonText] = useState<string>('Cancel');
  const [cancelButtonColor, setCancelButtonColor] = useState<string>('#FF3B30');

  // MRZ data for NFC integration
  const [documentNumber, setDocumentNumber] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [dateOfExpiration, setDateOfExpiration] = useState<string | null>(null);

  useEffect(() => {
    checkCameraPermissions();
  }, []);

  // Update individual controls when preset mode changes
  const applyPresetMode = (mode: 'default' | 'custom' | 'minimal') => {
    switch (mode) {
      case 'custom':
        setFocusViewBorderColor('#FF6B6B');
        setFocusViewStrokeWidth(5);
        setInstructionText('🔍 Custom: Align MRZ area with the red frame');
        setInstructionTextColor('#FF6B6B');
        setShowCancelButton(true);
        setCancelButtonText('Exit');
        setCancelButtonColor('#FF6B6B');
        break;
      case 'minimal':
        setFocusViewBorderColor('#4ECDC4');
        setFocusViewStrokeWidth(2);
        setInstructionText('Place document here');
        setInstructionTextColor('#4ECDC4');
        setShowCancelButton(false);
        setCancelButtonText('Cancel');
        setCancelButtonColor('#FF3B30');
        break;
      case 'default':
      default:
        setFocusViewBorderColor('#007AFF');
        setFocusViewStrokeWidth(3);
        setInstructionText('Place document MRZ within the frame');
        setInstructionTextColor('#FFFFFF');
        setShowCancelButton(true);
        setCancelButtonText('Cancel');
        setCancelButtonColor('#FF3B30');
        break;
    }
  };

  // Get UI customization from current state
  const getUICustomization = (): MrzUICustomization => {
    return {
      focusViewBorderColor,
      focusViewStrokeWidth,
      instructionText,
      instructionTextColor,
      showCancelButton,
      cancelButtonText,
      cancelButtonColor,
    };
  };

  const checkCameraPermissions = async (): Promise<void> => {
    try {
      const hasPermissions = await checkPermissions();
      setStatus(hasPermissions ? 'Camera permissions granted' : 'Camera permissions required');
    } catch (error) {
      setStatus(`Permission check failed: ${error}`);
    }
  };

  const requestCameraPermissions = async (): Promise<void> => {
    try {
      const result = await requestPermissions();
      console.log('Permission request result:', result);
      await checkCameraPermissions();
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setStatus(`Permission request failed: ${error}`);
    }
  };

  const handleProgressUpdate = useCallback((progress: number) => {
    setScanProgress(progress);
    // Match Flutter's progress display format
    setStatus(`Scanning... ${progress.toStringAsFixed(1)}%`);
  }, []);

  const startMrzScanning = async (): Promise<void> => {
    if (isScanning) return;

    setIsScanning(true);
    setStatus('Starting MRZ camera...');
    setMrzResult(null);
    setScanProgress(0);

    try {
      const customization = getUICustomization();
      const result = await startMrzCamera(handleProgressUpdate, customization);

      setMrzResult(result);
      setIsScanning(false);
      setScanProgress(0);

      if (result.success) {
        setDocumentNumber(result.documentNumber || null);
        setDateOfBirth(result.dateOfBirth || null);
        setDateOfExpiration(result.dateOfExpiration || null);
        setStatus('MRZ scan successful!');

        // Notify parent component about the extracted data
        if (onMrzDataExtracted) {
          onMrzDataExtracted(result.documentNumber, result.dateOfBirth, result.dateOfExpiration);
        }
      } else {
        setStatus(`MRZ scan failed: ${result.errorMessage || 'Unknown error'}`);
      }
    } catch (error) {
      setStatus(`MRZ scan failed: ${error}`);
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const cancelScanning = async (): Promise<void> => {
    try {
      await cancelMrzScanning();
      setStatus('MRZ scanning cancelled');
      setIsScanning(false);
      setScanProgress(0);
    } catch (error) {
      setStatus(`Cancel failed: ${error}`);
    }
  };

  const useForNfc = (): void => {
    if (mrzResult && mrzResult.success) {
      // Switch to NFC tab if callback provided
      if (onSwitchToNFC) {
        onSwitchToNFC();
      }

      // Show success alert
      Alert.alert(
        'MRZ Data Ready for NFC',
        `Document: ${documentNumber || 'N/A'}\nDOB: ${dateOfBirth || 'N/A'}\nExp: ${dateOfExpiration || 'N/A'}`,
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

  // Removed fake mode selector - SDK doesn't have different modes

  const renderCustomizationSelector = (): React.ReactElement => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>UI Customization</Text>
      
      {/* Preset Modes */}
      <Text style={styles.sectionTitle}>Quick Presets</Text>
      <View style={styles.customizationContainer}>
        {[
          { key: 'default', label: 'Default', color: '#007AFF' },
          { key: 'custom', label: 'Custom (Red)', color: '#FF6B6B' },
          { key: 'minimal', label: 'Minimal (Teal)', color: '#4ECDC4' },
        ].map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.customizationButton,
              customizationMode === option.key && { 
                backgroundColor: option.color,
                borderColor: option.color,
              },
            ]}
            onPress={() => {
              const mode = option.key as 'default' | 'custom' | 'minimal';
              setCustomizationMode(mode);
              applyPresetMode(mode);
            }}
            disabled={isScanning}
          >
            <Text
              style={[
                styles.customizationButtonText,
                customizationMode === option.key && styles.customizationButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Individual Controls */}
      <Text style={styles.sectionTitle}>Custom Settings</Text>
      
      {/* Focus View Border Color */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Focus Border Color</Text>
        <View style={styles.colorPickerContainer}>
          {[
            { color: '#007AFF', name: 'Blue' },
            { color: '#FF6B6B', name: 'Red' },
            { color: '#4ECDC4', name: 'Teal' },
            { color: '#45B7D1', name: 'Sky Blue' },
            { color: '#96CEB4', name: 'Mint' },
            { color: '#FECA57', name: 'Yellow' },
            { color: '#FF9FF3', name: 'Pink' },
            { color: '#54A0FF', name: 'Royal Blue' },
          ].map((colorOption) => (
            <TouchableOpacity
              key={colorOption.color}
              style={[
                styles.colorOption,
                { backgroundColor: colorOption.color },
                focusViewBorderColor === colorOption.color && styles.colorOptionSelected,
              ]}
              onPress={() => setFocusViewBorderColor(colorOption.color)}
              disabled={isScanning}
            >
              {focusViewBorderColor === colorOption.color && (
                <Text style={styles.colorOptionCheck}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Focus View Stroke Width */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Border Thickness: {focusViewStrokeWidth}</Text>
        <View style={styles.sliderContainer}>
          <TouchableOpacity
            style={[styles.sliderButton, focusViewStrokeWidth <= 1 && styles.sliderButtonDisabled]}
            onPress={() => setFocusViewStrokeWidth(Math.max(1, focusViewStrokeWidth - 1))}
            disabled={isScanning || focusViewStrokeWidth <= 1}
          >
            <Text style={styles.sliderButtonText}>-</Text>
          </TouchableOpacity>
          <View style={styles.sliderTrack}>
            <View 
              style={[
                styles.sliderFill, 
                { 
                  width: `${(focusViewStrokeWidth - 1) / 9 * 100}%`,
                  backgroundColor: focusViewBorderColor
                }
              ]} 
            />
          </View>
          <TouchableOpacity
            style={[styles.sliderButton, focusViewStrokeWidth >= 10 && styles.sliderButtonDisabled]}
            onPress={() => setFocusViewStrokeWidth(Math.min(10, focusViewStrokeWidth + 1))}
            disabled={isScanning || focusViewStrokeWidth >= 10}
          >
            <Text style={styles.sliderButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.inputHint}>Border thickness (1-10)</Text>
      </View>
      
      {/* Instruction Text */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Instruction Text</Text>
        <TextInput
          style={styles.textInput}
          value={instructionText}
          onChangeText={setInstructionText}
          placeholder="Place document MRZ within the frame"
          placeholderTextColor="#999"
          multiline
          editable={!isScanning}
        />
      </View>
      
      {/* Instruction Text Color */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Instruction Text Color</Text>
        <View style={styles.colorPickerContainer}>
          {[
            { color: '#FFFFFF', name: 'White' },
            { color: '#000000', name: 'Black' },
            { color: '#FF6B6B', name: 'Red' },
            { color: '#4ECDC4', name: 'Teal' },
            { color: '#007AFF', name: 'Blue' },
            { color: '#FECA57', name: 'Yellow' },
            { color: '#96CEB4', name: 'Mint' },
            { color: '#FF9FF3', name: 'Pink' },
          ].map((colorOption) => (
            <TouchableOpacity
              key={colorOption.color}
              style={[
                styles.colorOption,
                { backgroundColor: colorOption.color },
                instructionTextColor === colorOption.color && styles.colorOptionSelected,
                colorOption.color === '#FFFFFF' && styles.colorOptionWhite,
              ]}
              onPress={() => setInstructionTextColor(colorOption.color)}
              disabled={isScanning}
            >
              {instructionTextColor === colorOption.color && (
                <Text style={[
                  styles.colorOptionCheck,
                  colorOption.color === '#FFFFFF' && { color: '#000' }
                ]}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Cancel Button Settings */}
      <View style={styles.inputGroup}>
        <View style={styles.switchRow}>
          <Text style={styles.inputLabel}>Show Cancel Button</Text>
          <Switch
            value={showCancelButton}
            onValueChange={setShowCancelButton}
            trackColor={{ false: "#767577", true: focusViewBorderColor }}
            thumbColor={showCancelButton ? "#fff" : "#f4f3f4"}
            disabled={isScanning}
          />
        </View>
      </View>
      
      {showCancelButton && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cancel Button Text</Text>
            <TextInput
              style={styles.textInput}
              value={cancelButtonText}
              onChangeText={setCancelButtonText}
              placeholder="Cancel"
              placeholderTextColor="#999"
              editable={!isScanning}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cancel Button Color</Text>
            <View style={styles.colorPickerContainer}>
              {[
                { color: '#FF3B30', name: 'Red' },
                { color: '#FF6B6B', name: 'Light Red' },
                { color: '#FF9500', name: 'Orange' },
                { color: '#FFCC02', name: 'Yellow' },
                { color: '#34C759', name: 'Green' },
                { color: '#007AFF', name: 'Blue' },
                { color: '#5856D6', name: 'Purple' },
                { color: '#8E8E93', name: 'Gray' },
              ].map((colorOption) => (
                <TouchableOpacity
                  key={colorOption.color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: colorOption.color },
                    cancelButtonColor === colorOption.color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setCancelButtonColor(colorOption.color)}
                  disabled={isScanning}
                >
                  {cancelButtonColor === colorOption.color && (
                    <Text style={styles.colorOptionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}
      

    </View>
  );

  const renderActionButtons = (): React.ReactElement => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Actions</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={checkCameraPermissions}
          disabled={isScanning}
        >
          <Text style={styles.buttonSecondaryText}>Check Permissions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={requestCameraPermissions}
          disabled={isScanning}
        >
          <Text style={styles.buttonSecondaryText}>Request Permissions</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.button, styles.buttonPrimary, isScanning && styles.buttonDisabled]}
        onPress={startMrzScanning}
        disabled={isScanning}
      >
        <View style={styles.buttonContent}>
          {isScanning && <ActivityIndicator size="small" color="white" style={styles.spinner} />}
          <Text style={styles.buttonPrimaryText}>
            {isScanning ? 'Scanning...' : 'Start MRZ Camera'}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.buttonDanger, !isScanning && styles.buttonDisabled]}
        onPress={cancelScanning}
        disabled={!isScanning}
      >
        <Text style={styles.buttonDangerText}>Cancel Scanning</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMrzResults = (): React.ReactElement | null => {
    if (!mrzResult) return null;

    const { success, mrzData, errorMessage, bacCredentials } = mrzResult;

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>MRZ Results</Text>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Success:</Text>
          <Text style={[styles.resultValue, success ? styles.successText : styles.errorText]}>
            {success ? 'Yes' : 'No'}
          </Text>
        </View>

        {success && mrzData ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Document Information</Text>
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
            <Text style={styles.sectionTitle}>Personal Information</Text>
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
                <Text style={styles.sectionTitle}>BAC Credentials (for NFC)</Text>
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
              <Text style={styles.buttonSuccessText}>Use for NFC Reading</Text>
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

  const renderInformation = (): React.ReactElement => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>About MRZ & UI Customization</Text>
      <Text style={styles.infoText}>
        <Text style={styles.boldText}>Machine Readable Zone (MRZ)</Text> is a standardized format found on the bottom of ID cards and passports. 
        It contains essential information needed for NFC reading including document number, date of birth, and expiration date.
      </Text>
      <Text style={styles.infoText}>
        After successful MRZ scanning, you can use the extracted data to automatically populate the NFC reading form.
      </Text>
      <Text style={styles.infoText}>
        <Text style={styles.boldText}>UI Customization Features:</Text>
      </Text>
      <Text style={styles.infoText}>
        • <Text style={styles.boldText}>Quick Presets:</Text> Choose from Default, Custom (Red), or Minimal (Teal) themes
      </Text>
      <Text style={styles.infoText}>
        • <Text style={styles.boldText}>Custom Settings:</Text> Fine-tune every aspect of the scanner UI with easy color pickers, thickness slider, instruction text, and button settings
      </Text>
      <Text style={styles.infoText}>
        • <Text style={styles.boldText}>Real-time Updates:</Text> All changes are applied immediately to the actual scanner interface
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        <Text style={styles.statusText}>{status}</Text>
        {isScanning && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${scanProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{scanProgress.toFixed(1)}%</Text>
          </View>
        )}
      </View>

      {renderCustomizationSelector()}
      {renderActionButtons()}
      {renderMrzResults()}
      {renderInformation()}
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
  progressContainer: {
    marginTop: 12,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  // UI Customization styles
  customizationContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  customizationButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  customizationButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  customizationButtonTextActive: {
    color: 'white',
  },
  customizationInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  // Color picker styles
  colorPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#333',
    borderWidth: 3,
  },
  colorOptionWhite: {
    borderColor: '#ddd',
    borderWidth: 1,
  },
  colorOptionCheck: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  // Input controls styles
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sliderButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
});

export default MRZTab;
