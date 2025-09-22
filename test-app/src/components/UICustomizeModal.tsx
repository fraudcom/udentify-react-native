import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
} from 'react-native';
import OptionPicker from './OptionPicker';

// UI Customization options based on the OCR iOS documentation
const PLACEHOLDER_TEMPLATES = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'defaultStyle', label: 'Default Style' },
  { value: 'countrySpecificStyle', label: 'Country Specific Style' },
];

const ORIENTATIONS = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
];

const BACKGROUND_COLORS = [
  { value: 'purple', label: 'Purple' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'red', label: 'Red' },
  { value: 'black', label: 'Black' },
  { value: 'white', label: 'White' },
];

const BORDER_COLORS = [
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
  { value: 'gray', label: 'Gray' },
  { value: 'clear', label: 'Clear' },
];

const CORNER_RADIUS_OPTIONS = [
  { value: '0', label: '0 (Square)' },
  { value: '8', label: '8 (Default)' },
  { value: '12', label: '12 (Rounded)' },
  { value: '20', label: '20 (Very Rounded)' },
];

const DETECTION_ACCURACY_OPTIONS = [
  { value: '0', label: '0 (Lowest)' },
  { value: '10', label: '10 (Default)' },
  { value: '50', label: '50 (Medium)' },
  { value: '100', label: '100 (Highest)' },
];

interface UICustomizeModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (config: any) => void;
}

const UICustomizeModal: React.FC<UICustomizeModalProps> = ({
  visible,
  onClose,
  onApply,
}) => {
  // State for UI customization options
  const [placeholderTemplate, setPlaceholderTemplate] = useState<string>('defaultStyle');
  const [orientation, setOrientation] = useState<string>('horizontal');
  const [backgroundColor, setBackgroundColor] = useState<string>('purple');
  const [borderColor, setBorderColor] = useState<string>('white');
  const [cornerRadius, setCornerRadius] = useState<string>('8');
  const [detectionAccuracy, setDetectionAccuracy] = useState<string>('10');
  const [backButtonEnabled, setBackButtonEnabled] = useState<string>('true');
  const [reviewScreenEnabled, setReviewScreenEnabled] = useState<string>('true');

  const handleApplyCustomization = () => {
    const config = {
      placeholderTemplate,
      orientation,
      backgroundColor,
      borderColor,
      cornerRadius: parseInt(cornerRadius),
      detectionAccuracy: parseInt(detectionAccuracy),
      backButtonEnabled: backButtonEnabled === 'true',
      reviewScreenEnabled: reviewScreenEnabled === 'true',
    };

    onApply(config);
    onClose();
  };

  const handleResetToDefaults = () => {
    setPlaceholderTemplate('defaultStyle');
    setOrientation('horizontal');
    setBackgroundColor('purple');
    setBorderColor('white');
    setCornerRadius('8');
    setDetectionAccuracy('10');
    setBackButtonEnabled('true');
    setReviewScreenEnabled('true');
    
    Alert.alert('Reset Complete', 'All settings have been reset to defaults.');
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>OCR UI Customization</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.subtitle}>
            Configure the appearance and behavior of the OCR camera interface
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Placeholder Settings</Text>
            
            <OptionPicker
              label="Placeholder Template"
              options={PLACEHOLDER_TEMPLATES}
              selectedValue={placeholderTemplate}
              onValueChange={setPlaceholderTemplate}
            />
            
            <OptionPicker
              label="Orientation"
              options={ORIENTATIONS}
              selectedValue={orientation}
              onValueChange={setOrientation}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visual Styling</Text>
            
            <OptionPicker
              label="Background Color"
              options={BACKGROUND_COLORS}
              selectedValue={backgroundColor}
              onValueChange={setBackgroundColor}
            />
            
            <OptionPicker
              label="Border Color"
              options={BORDER_COLORS}
              selectedValue={borderColor}
              onValueChange={setBorderColor}
            />
            
            <OptionPicker
              label="Corner Radius"
              options={CORNER_RADIUS_OPTIONS}
              selectedValue={cornerRadius}
              onValueChange={setCornerRadius}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Behavior Settings</Text>
            
            <OptionPicker
              label="Detection Accuracy"
              options={DETECTION_ACCURACY_OPTIONS}
              selectedValue={detectionAccuracy}
              onValueChange={setDetectionAccuracy}
            />
            
            <OptionPicker
              label="Back Button Enabled"
              options={[
                { value: 'true', label: 'Enabled' },
                { value: 'false', label: 'Disabled' }
              ]}
              selectedValue={backButtonEnabled}
              onValueChange={setBackButtonEnabled}
            />
            
            <OptionPicker
              label="Review Screen Enabled"
              options={[
                { value: 'true', label: 'Enabled' },
                { value: 'false', label: 'Disabled' }
              ]}
              selectedValue={reviewScreenEnabled}
              onValueChange={setReviewScreenEnabled}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleApplyCustomization}>
              <Text style={styles.buttonText}>Apply Configuration</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.buttonSecondary} onPress={handleResetToDefaults}>
              <Text style={styles.buttonSecondaryText}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingTop: 50, // Account for status bar
  },
  closeButton: {
    padding: 8,
    width: 40,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6c757d',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Balance the close button
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 24,
    lineHeight: 22,
    textAlign: 'center',
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
    paddingBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6c757d',
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UICustomizeModal;
