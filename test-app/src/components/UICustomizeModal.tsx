import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { takePhoto } from 'ocr-rn-library';
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

const CONTENT_MODE_OPTIONS = [
  { value: 'scaleAspectFill', label: 'Aspect Fill' },
  { value: 'scaleAspectFit', label: 'Aspect Fit' },
  { value: 'scaleToFill', label: 'Scale to Fill' },
];

const OPACITY_OPTIONS = [
  { value: '1.0', label: '100%' },
  { value: '0.8', label: '80%' },
  { value: '0.5', label: '50%' },
  { value: '0.3', label: '30%' },
];

const REVIEW_BG_BORDER_WIDTH_OPTIONS = [
  { value: '0', label: '0 (None)' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '4', label: '4' },
];

const REVIEW_BG_CORNER_RADIUS_OPTIONS = [
  { value: '0', label: '0 (Square)' },
  { value: '8', label: '8' },
  { value: '16', label: '16' },
  { value: '24', label: '24' },
];

const IQA_SERVICE_OPTIONS = [
  { value: 'true', label: 'Enabled' },
  { value: 'false', label: 'Disabled' },
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
  const [reviewBackgroundColor, setReviewBackgroundColor] = useState<string>('');
  const [reviewBgImageBase64, setReviewBgImageBase64] = useState<string>('');
  const [reviewBgContentMode, setReviewBgContentMode] = useState<string>('scaleAspectFill');
  const [reviewBgOpacity, setReviewBgOpacity] = useState<string>('1.0');
  const [reviewBgBorderColor, setReviewBgBorderColor] = useState<string>('clear');
  const [reviewBgBorderWidth, setReviewBgBorderWidth] = useState<string>('0');
  const [reviewBgCornerRadius, setReviewBgCornerRadius] = useState<string>('0');
  const [iqaServiceEnabled, setIqaServiceEnabled] = useState<string>('true');

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
      ...(reviewBackgroundColor ? { reviewBackgroundColor } : {}),
      ...(reviewBgImageBase64 ? { reviewBackgroundStyle: {
        imageBase64: reviewBgImageBase64,
        contentMode: reviewBgContentMode,
        opacity: parseFloat(reviewBgOpacity),
        borderColor: reviewBgBorderColor,
        borderWidth: parseFloat(reviewBgBorderWidth),
        cornerRadius: parseFloat(reviewBgCornerRadius),
      }} : {}),
      isIQAServiceEnabled: iqaServiceEnabled === 'true',
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
    setReviewBackgroundColor('');
    setReviewBgImageBase64('');
    setReviewBgContentMode('scaleAspectFill');
    setReviewBgOpacity('1.0');
    setReviewBgBorderColor('clear');
    setReviewBgBorderWidth('0');
    setReviewBgCornerRadius('0');
    setIqaServiceEnabled('true');
    
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

            <OptionPicker
              label="Review Background Color"
              options={[
                { value: '', label: 'Default' },
                ...BACKGROUND_COLORS,
              ]}
              selectedValue={reviewBackgroundColor}
              onValueChange={setReviewBackgroundColor}
            />

            {Platform.OS === 'ios' && (
              <>
                <View style={styles.bgImageRow}>
                  <Text style={styles.bgImageLabel}>Review Background Image (iOS only)</Text>
                  <View style={styles.bgImageButtons}>
                    <TouchableOpacity
                      style={[styles.bgImageButton, reviewBgImageBase64 ? styles.bgImageButtonActive : null]}
                      onPress={async () => {
                        try {
                          const base64 = await takePhoto();
                          setReviewBgImageBase64(base64);
                          Alert.alert('Success', 'Background image captured.');
                        } catch (e) {
                          Alert.alert('Error', `${e}`);
                        }
                      }}
                    >
                      <Text style={styles.bgImageButtonText}>
                        {reviewBgImageBase64 ? 'Retake Photo' : 'Take Photo'}
                      </Text>
                    </TouchableOpacity>
                    {reviewBgImageBase64 ? (
                      <TouchableOpacity
                        style={styles.bgImageClearButton}
                        onPress={() => setReviewBgImageBase64('')}
                      >
                        <Text style={styles.bgImageClearText}>Clear</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {reviewBgImageBase64 ? (
                  <>
                    <OptionPicker
                      label="Image Content Mode"
                      options={CONTENT_MODE_OPTIONS}
                      selectedValue={reviewBgContentMode}
                      onValueChange={setReviewBgContentMode}
                    />

                    <OptionPicker
                      label="Image Opacity"
                      options={OPACITY_OPTIONS}
                      selectedValue={reviewBgOpacity}
                      onValueChange={setReviewBgOpacity}
                    />

                    <OptionPicker
                      label="Image Border Color"
                      options={[
                        { value: 'clear', label: 'None' },
                        ...BORDER_COLORS.filter(c => c.value !== 'clear'),
                      ]}
                      selectedValue={reviewBgBorderColor}
                      onValueChange={setReviewBgBorderColor}
                    />

                    <OptionPicker
                      label="Image Border Width"
                      options={REVIEW_BG_BORDER_WIDTH_OPTIONS}
                      selectedValue={reviewBgBorderWidth}
                      onValueChange={setReviewBgBorderWidth}
                    />

                    <OptionPicker
                      label="Image Corner Radius"
                      options={REVIEW_BG_CORNER_RADIUS_OPTIONS}
                      selectedValue={reviewBgCornerRadius}
                      onValueChange={setReviewBgCornerRadius}
                    />
                  </>
                ) : null}
              </>
            )}

            <OptionPicker
              label="IQA Service (Image Quality Analysis)"
              options={IQA_SERVICE_OPTIONS}
              selectedValue={iqaServiceEnabled}
              onValueChange={setIqaServiceEnabled}
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
  bgImageRow: {
    marginTop: 12,
    marginBottom: 8,
  },
  bgImageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8,
  },
  bgImageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bgImageButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  bgImageButtonActive: {
    backgroundColor: '#28a745',
  },
  bgImageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  bgImageClearButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  bgImageClearText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default UICustomizeModal;
