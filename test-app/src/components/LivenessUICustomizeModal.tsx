import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import OptionPicker from './OptionPicker';

// Configuration options for UI customization
const FONT_SIZE_OPTIONS = [
  { value: '12', label: '12pt (Small)' },
  { value: '14', label: '14pt' },
  { value: '16', label: '16pt (Default)' },
  { value: '18', label: '18pt' },
  { value: '20', label: '20pt' },
  { value: '24', label: '24pt (Large)' },
  { value: '28', label: '28pt (XL)' },
  { value: '30', label: '30pt (XXL)' },
  { value: '32', label: '32pt (XXXL)' },
];

const FONT_NAME_OPTIONS = [
  { label: 'System Font', value: '' },
  { label: 'System Bold', value: 'System-Bold' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Helvetica', value: 'Helvetica' },
  { label: 'Times New Roman', value: 'Times-Roman' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Verdana', value: 'Verdana' },
];

const BUTTON_HEIGHT_OPTIONS = [
  { value: '40', label: '40dp (Small)' },
  { value: '48', label: '48dp (Default)' },
  { value: '56', label: '56dp (Material)' },
  { value: '64', label: '64dp (Large)' },
  { value: '70', label: '70dp (XL)' },
];

const CORNER_RADIUS_OPTIONS = [
  { value: '0', label: '0 (Square)' },
  { value: '4', label: '4 (Slight)' },
  { value: '8', label: '8 (Default)' },
  { value: '12', label: '12 (Rounded)' },
  { value: '16', label: '16 (Very Rounded)' },
  { value: '24', label: '24 (Pill)' },
];

const CAMERA_POSITION_OPTIONS = [
  { label: 'Front Camera', value: 'front' },
  { label: 'Back Camera', value: 'back' },
];

const TIMEOUT_OPTIONS = [
  { label: '10 seconds', value: '10' },
  { label: '15 seconds', value: '15' },
  { label: '20 seconds', value: '20' },
  { label: '30 seconds', value: '30' },
  { label: '45 seconds', value: '45' },
  { label: '60 seconds', value: '60' },
];

const DELAY_OPTIONS = [
  { label: '0.1 seconds', value: '0.1' },
  { label: '0.25 seconds', value: '0.25' },
  { label: '0.3 seconds', value: '0.3' },
  { label: '0.5 seconds', value: '0.5' },
  { label: '0.75 seconds', value: '0.75' },
  { label: '1.0 second', value: '1.0' },
];

const CONFIDENCE_OPTIONS = [
  { label: '0.8 (80%)', value: '0.8' },
  { label: '0.85 (85%)', value: '0.85' },
  { label: '0.9 (90%)', value: '0.9' },
  { label: '0.95 (95%)', value: '0.95' },
  { label: '0.98 (98%)', value: '0.98' },
  { label: '0.99 (99%)', value: '0.99' },
];

const BUTTON_MARGIN_OPTIONS = [
  { label: '10px', value: '10' },
  { label: '15px', value: '15' },
  { label: '20px', value: '20' },
  { label: '25px', value: '25' },
  { label: '30px', value: '30' },
  { label: '40px', value: '40' },
  { label: '50px', value: '50' },
];

// Predefined color options for easy selection
const COLOR_OPTIONS = [
  { value: '#844EE3', label: 'Purple (Default)', color: '#844EE3' },
  { value: '#007AFF', label: 'iOS Blue', color: '#007AFF' },
  { value: '#34C759', label: 'Green', color: '#34C759' },
  { value: '#FF3B30', label: 'Red', color: '#FF3B30' },
  { value: '#FF9500', label: 'Orange', color: '#FF9500' },
  { value: '#5856D6', label: 'Indigo', color: '#5856D6' },
  { value: '#AF52DE', label: 'Purple', color: '#AF52DE' },
  { value: '#FF2D92', label: 'Pink', color: '#FF2D92' },
  { value: '#8E8E93', label: 'Gray', color: '#8E8E93' },
  { value: '#000000', label: 'Black', color: '#000000' },
  { value: '#FFFFFF', label: 'White', color: '#FFFFFF' },
  { value: '#1C1C1E', label: 'Dark Gray', color: '#1C1C1E' },
  { value: '#F2F2F7', label: 'Light Gray', color: '#F2F2F7' },
  { value: '#0A84FF', label: 'Light Blue', color: '#0A84FF' },
  { value: '#30D158', label: 'Light Green', color: '#30D158' },
  { value: '#64D2FF', label: 'Cyan', color: '#64D2FF' },
];

interface LivenessUICustomizeModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (config: any) => void;
  currentConfig?: any;
}

const LivenessUICustomizeModal: React.FC<LivenessUICustomizeModalProps> = ({
  visible,
  onClose,
  onApply,
  currentConfig,
}) => {
  // Color state - using exact iOS documentation names
  const [colors, setColors] = useState({
    titleColor: currentConfig?.colors?.titleColor || '#FFFFFF',
    titleBG: currentConfig?.colors?.titleBG || '#844EE3',
    buttonErrorColor: currentConfig?.colors?.buttonErrorColor || '#FF3B30',
    buttonSuccessColor: currentConfig?.colors?.buttonSuccessColor || '#4CD964',
    buttonColor: currentConfig?.colors?.buttonColor || '#844EE3',
    buttonTextColor: currentConfig?.colors?.buttonTextColor || '#FFFFFF',
    buttonErrorTextColor: currentConfig?.colors?.buttonErrorTextColor || '#FFFFFF',
    buttonSuccessTextColor: currentConfig?.colors?.buttonSuccessTextColor || '#FFFFFF',
    buttonBackColor: currentConfig?.colors?.buttonBackColor || '#000000',
    footerTextColor: currentConfig?.colors?.footerTextColor || '#FFFFFF',
    checkmarkTintColor: currentConfig?.colors?.checkmarkTintColor || '#FFFFFF',
    backgroundColor: currentConfig?.colors?.backgroundColor || '#844EE3',
  });

  // Font configuration state
  const [fonts, setFonts] = useState({
    titleFont: {
      name: currentConfig?.fonts?.titleFont?.name || '',
      size: currentConfig?.fonts?.titleFont?.size?.toString() || '30'
    },
    buttonFont: {
      name: currentConfig?.fonts?.buttonFont?.name || '',
      size: currentConfig?.fonts?.buttonFont?.size?.toString() || '30'
    },
    footerFont: {
      name: currentConfig?.fonts?.footerFont?.name || '',
      size: currentConfig?.fonts?.footerFont?.size?.toString() || '24'
    },
    gestureFont: {
      name: currentConfig?.fonts?.gestureFont?.name || '',
      size: currentConfig?.fonts?.gestureFont?.size?.toString() || '20'
    }
  });

  // Dimensions state
  const [buttonHeight, setButtonHeight] = useState<string>(
    currentConfig?.dimensions?.buttonHeight?.toString() || '48'
  );
  const [buttonCornerRadius, setButtonCornerRadius] = useState<string>(
    currentConfig?.dimensions?.buttonCornerRadius?.toString() || '8'
  );
  const [gestureFontSize, setGestureFontSize] = useState<string>(
    currentConfig?.dimensions?.gestureFontSize?.toString() || '20'
  );
  const [buttonMarginLeft, setButtonMarginLeft] = useState<string>(
    currentConfig?.dimensions?.buttonMarginLeft?.toString() || '20'
  );
  const [buttonMarginRight, setButtonMarginRight] = useState<string>(
    currentConfig?.dimensions?.buttonMarginRight?.toString() || '20'
  );

  // Camera and timing configuration
  const [cameraPosition, setCameraPosition] = useState<string>(
    currentConfig?.configs?.cameraPosition || 'front'
  );
  const [requestTimeout, setRequestTimeout] = useState<string>(
    currentConfig?.configs?.requestTimeout?.toString() || '15'
  );
  const [errorDelay, setErrorDelay] = useState<string>(
    currentConfig?.configs?.errorDelay?.toString() || '0.25'
  );
  const [successDelay, setSuccessDelay] = useState<string>(
    currentConfig?.configs?.successDelay?.toString() || '0.75'
  );
  const [maskConfidence, setMaskConfidence] = useState<string>(
    currentConfig?.configs?.maskConfidence?.toString() || '0.95'
  );

  // Behavior state
  const [autoTake, setAutoTake] = useState<boolean>(
    currentConfig?.configs?.autoTake ?? true
  );
  const [backButtonEnabled, setBackButtonEnabled] = useState<boolean>(
    currentConfig?.configs?.backButtonEnabled ?? true
  );
  const [maskDetection, setMaskDetection] = useState<boolean>(
    currentConfig?.configs?.maskDetection ?? false
  );
  const [invertedAnimation, setInvertedAnimation] = useState<boolean>(
    currentConfig?.configs?.invertedAnimation ?? false
  );
  const [multipleFacesRejected, setMultipleFacesRejected] = useState<boolean>(
    currentConfig?.configs?.multipleFacesRejected ?? true
  );

  const handleColorChange = (colorKey: string, color: string) => {
    setColors(prev => ({
      ...prev,
      [colorKey]: color
    }));
  };

  const handleFontChange = (fontType: string, property: string, value: string) => {
    setFonts(prev => ({
      ...prev,
      [fontType]: {
        ...prev[fontType as keyof typeof prev],
        [property]: value
      }
    }));
  };

  const showAndroidInstructions = () => {
    let instructions = 'To customize UI on Android, manually update these XML files:\n\n';
    
    // Show example colors
    instructions += '📁 android/app/src/main/res/values/colors.xml:\n\n';
    instructions += '<!-- UdentifyFACE Button Background Colors -->\n';
    instructions += '<color name="udentifyface_btn_color">#844EE3</color>\n';
    instructions += '<color name="udentifyface_btn_color_success">#4CD964</color>\n';
    instructions += '<color name="udentifyface_btn_color_error">#FF3B30</color>\n';
    instructions += '<color name="udentifyface_progress_background_color">#808080</color>\n\n';
    
    instructions += '<!-- UdentifyFACE Button Text Colors -->\n';
    instructions += '<color name="udentifyface_btn_text_color">#FFFFFF</color>\n';
    instructions += '<color name="udentifyface_btn_text_color_success">#FFFFFF</color>\n';
    instructions += '<color name="udentifyface_btn_text_color_error">#FFFFFF</color>\n\n';
    
    instructions += '<!-- UdentifyFACE Background Colors -->\n';
    instructions += '<color name="udentifyface_bg_color">#FF844EE3</color>\n';
    instructions += '<color name="udentifyface_gesture_text_bg_color">#66808080</color>\n\n';
    
    // Show example dimensions
    instructions += '📁 android/app/src/main/res/values/dimens.xml:\n\n';
    instructions += '<!-- UdentifyFACE Button Dimensions -->\n';
    instructions += '<dimen name="udentify_selfie_button_height">70dp</dimen>\n';
    instructions += '<dimen name="udentify_selfie_button_horizontal_margin">16dp</dimen>\n';
    instructions += '<dimen name="udentify_selfie_button_bottom_margin">40dp</dimen>\n';
    instructions += '<dimen name="udentify_face_selfie_button_corner_radius">8dp</dimen>\n';
    instructions += '<dimen name="udentifyface_gesture_font_size">30sp</dimen>\n\n';
    
    // Show example strings
    instructions += '📁 android/app/src/main/res/values/strings.xml:\n\n';
    instructions += '<!-- UdentifyFACE Strings -->\n';
    instructions += '<string name="udentifyface_footer_button_text_default">Take Selfie</string>\n';
    instructions += '<string name="udentifyface_footer_button_text_progressing">Liveness Check</string>\n';
    instructions += '<string name="udentifyface_message_face_too_big">Move Back</string>\n';
    instructions += '<string name="udentifyface_message_face_too_small">Move Closer</string>\n\n';
    
    instructions += '⚡ After updating XML files:\n';
    instructions += 'Run "npm run android" to rebuild the app\n\n';
    instructions += '📖 For complete XML reference, check the UdentifyFACE Android documentation.';
    
    Alert.alert(
      'Android XML Update Instructions', 
      instructions,
      [
        { 
          text: 'Copy to Console', 
          onPress: () => console.log('📋 Android XML Instructions:\n\n', instructions) 
        },
        { text: 'OK' }
      ]
    );
  };

  const getCurrentConfig = () => {
    return {
      colors: {
        titleColor: colors.titleColor,
        titleBG: colors.titleBG,
        buttonErrorColor: colors.buttonErrorColor,
        buttonSuccessColor: colors.buttonSuccessColor,
        buttonColor: colors.buttonColor,
        buttonTextColor: colors.buttonTextColor,
        buttonErrorTextColor: colors.buttonErrorTextColor,
        buttonSuccessTextColor: colors.buttonSuccessTextColor,
        buttonBackColor: colors.buttonBackColor,
        footerTextColor: colors.footerTextColor,
        checkmarkTintColor: colors.checkmarkTintColor,
        backgroundColor: colors.backgroundColor,
      },
      fonts: {
        titleFont: {
          name: fonts.titleFont.name,
          size: parseInt(fonts.titleFont.size)
        },
        buttonFont: {
          name: fonts.buttonFont.name,
          size: parseInt(fonts.buttonFont.size)
        },
        footerFont: {
          name: fonts.footerFont.name,
          size: parseInt(fonts.footerFont.size)
        },
        gestureFont: {
          name: fonts.gestureFont.name,
          size: parseInt(fonts.gestureFont.size)
        }
      },
      dimensions: {
        buttonHeight: parseInt(buttonHeight),
        buttonCornerRadius: parseInt(buttonCornerRadius),
        gestureFontSize: parseInt(gestureFontSize),
        buttonMarginLeft: parseInt(buttonMarginLeft),
        buttonMarginRight: parseInt(buttonMarginRight),
      },
      configs: {
        cameraPosition,
        autoTake,
        backButtonEnabled,
        maskDetection,
        invertedAnimation,
        multipleFacesRejected,
        errorDelay: parseFloat(errorDelay),
        successDelay: parseFloat(successDelay),
        requestTimeout: parseInt(requestTimeout),
        maskConfidence: parseFloat(maskConfidence),
      },
    };
  };

  const handleApplyCustomization = () => {
    const config = getCurrentConfig();

    if (Platform.OS === 'android') {
      // Show Android limitation dialog
      Alert.alert(
        'Android UI Customization',
        'Android UdentifyFACE SDK only supports static XML resource customization.\n\nDynamic UI changes are not supported on Android platform.\n\nWould you like to see the XML update instructions?',
        [
          { text: 'View Instructions', onPress: () => showAndroidInstructions() },
          { text: 'Apply Anyway', onPress: () => applyConfiguration(config) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else {
      // iOS supports dynamic changes
      applyConfiguration(config);
    }
  };

  const applyConfiguration = (config: any) => {
    console.log('🎨 Applying Liveness UI Configuration:', JSON.stringify(config, null, 2));
    onApply(config);
    onClose();
  };

  const handleResetToDefaults = () => {
    setColors({
      titleColor: '#FFFFFF',
      titleBG: '#844EE3',
      buttonErrorColor: '#FF3B30',
      buttonSuccessColor: '#4CD964',
      buttonColor: '#844EE3',
      buttonTextColor: '#FFFFFF',
      buttonErrorTextColor: '#FFFFFF',
      buttonSuccessTextColor: '#FFFFFF',
      buttonBackColor: '#000000',
      footerTextColor: '#FFFFFF',
      checkmarkTintColor: '#FFFFFF',
      backgroundColor: '#844EE3',
    });
    setFonts({
      titleFont: { name: '', size: '30' },
      buttonFont: { name: '', size: '30' },
      footerFont: { name: '', size: '24' },
      gestureFont: { name: '', size: '20' }
    });
    setButtonHeight('48');
    setButtonCornerRadius('8');
    setGestureFontSize('20');
    setButtonMarginLeft('20');
    setButtonMarginRight('20');
    setCameraPosition('front');
    setRequestTimeout('15');
    setErrorDelay('0.25');
    setSuccessDelay('0.75');
    setMaskConfidence('0.95');
    setAutoTake(true);
    setBackButtonEnabled(true);
    setMaskDetection(false);
    setInvertedAnimation(false);
    setMultipleFacesRejected(true);
    
    Alert.alert('Reset Complete', 'All settings have been reset to defaults.');
  };

  const ColorSelector: React.FC<{ 
    title: string; 
    colorKey: string; 
    description: string; 
    selectedColor: string; 
  }> = ({ title, colorKey, description, selectedColor }) => (
    <View style={styles.colorSelectorContainer}>
      <Text style={styles.colorTitle}>{title}</Text>
      <Text style={styles.colorDescription}>{description}</Text>
      <View style={styles.colorPickerRow}>
        <View style={[styles.colorPreview, { backgroundColor: selectedColor }]} />
        <View style={styles.colorPickerFlex}>
          <OptionPicker
            label=""
            options={COLOR_OPTIONS}
            selectedValue={selectedColor}
            onValueChange={(color) => handleColorChange(colorKey, color)}
            placeholder="Select color..."
          />
        </View>
      </View>
    </View>
  );

  const FontSelector: React.FC<{
    title: string;
    fontType: string;
    fontConfig: { name: string; size: string };
  }> = ({ title, fontType, fontConfig }) => (
    <View style={styles.fontSection}>
      <Text style={styles.fontSubtitle}>{title}</Text>
      <OptionPicker
        label="Font Name"
        options={FONT_NAME_OPTIONS}
        selectedValue={fontConfig.name}
        onValueChange={(value) => handleFontChange(fontType, 'name', value)}
      />
      <OptionPicker
        label="Font Size"
        options={FONT_SIZE_OPTIONS}
        selectedValue={fontConfig.size}
        onValueChange={(value) => handleFontChange(fontType, 'size', value)}
      />
    </View>
  );

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
          <Text style={styles.headerTitle}>Liveness UI Customization</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.subtitle}>
            {Platform.OS === 'android' 
              ? 'Android UdentifyFACE SDK UI customization requires manual XML resource file updates'
              : 'Comprehensive customization of the Face Recognition & Liveness Detection interface with real-time preview'
            }
          </Text>

          {/* Android Limitation Warning */}
          {Platform.OS === 'android' && (
            <View style={styles.androidWarningContainer}>
              <Text style={styles.androidWarningTitle}>⚠️ Android Limitation</Text>
              <Text style={styles.androidWarningText}>
                Android UdentifyFACE SDK only supports <Text style={styles.boldText}>static XML resource customization</Text>.
                {'\n\n'}
                Dynamic UI changes are <Text style={styles.boldText}>not supported</Text> on Android platform.
                {'\n\n'}
                To apply UI customization on Android:
                {'\n'}• Update XML files in android/app/src/main/res/values/
                {'\n'}• Rebuild the app with "npm run android"
                {'\n\n'}
                <Text style={styles.boldText}>For dynamic UI customization, use iOS platform.</Text>
              </Text>
              <TouchableOpacity 
                style={styles.androidInfoButton}
                onPress={() => showAndroidInstructions()}
              >
                <Text style={styles.androidInfoButtonText}>📋 View XML Instructions</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* iOS Success Message */}
          {Platform.OS === 'ios' && (
            <View style={styles.iosSuccessContainer}>
              <Text style={styles.iosSuccessTitle}>✅ iOS Dynamic UI</Text>
              <Text style={styles.iosSuccessText}>
                iOS platform supports full dynamic UI customization. Changes will be applied immediately.
              </Text>
            </View>
          )}

          {/* UI Configuration Options - Only show for iOS */}
          {Platform.OS === 'ios' && (
            <>
              {/* Font Customization */}
              <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔤 Fonts</Text>
            
            <FontSelector
              title="Title Font"
              fontType="titleFont"
              fontConfig={fonts.titleFont}
            />
            
            <FontSelector
              title="Button Font"
              fontType="buttonFont"
              fontConfig={fonts.buttonFont}
            />
            
            <FontSelector
              title="Footer Font"
              fontType="footerFont"
              fontConfig={fonts.footerFont}
            />
            
            <FontSelector
              title="Gesture Font (Active Liveness)"
              fontType="gestureFont"
              fontConfig={fonts.gestureFont}
            />
          </View>

          {/* Color Customization */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌈 Colors (iOS Documentation Names)</Text>
            
            <ColorSelector
              title="Title Color"
              colorKey="titleColor"
              description="Title's font color"
              selectedColor={colors.titleColor}
            />
            
            <ColorSelector
              title="Title Background"
              colorKey="titleBG"
              description="Title's background color"
              selectedColor={colors.titleBG}
            />
            
            <ColorSelector
              title="Button Error Color"
              colorKey="buttonErrorColor"
              description="The color of the process when the operation fails"
              selectedColor={colors.buttonErrorColor}
            />
            
            <ColorSelector
              title="Button Success Color"
              colorKey="buttonSuccessColor"
              description="The color of the process when the operation succeeds"
              selectedColor={colors.buttonSuccessColor}
            />
            
            <ColorSelector
              title="Button Color"
              colorKey="buttonColor"
              description="Background color of the button"
              selectedColor={colors.buttonColor}
            />
            
            <ColorSelector
              title="Button Text Color"
              colorKey="buttonTextColor"
              description="Font color of the button text"
              selectedColor={colors.buttonTextColor}
            />
            
            <ColorSelector
              title="Button Error Text Color"
              colorKey="buttonErrorTextColor"
              description="Font color of the button text when the operation fails"
              selectedColor={colors.buttonErrorTextColor}
            />
            
            <ColorSelector
              title="Button Success Text Color"
              colorKey="buttonSuccessTextColor"
              description="Font color of the button text when the operation succeeds"
              selectedColor={colors.buttonSuccessTextColor}
            />
            
            <ColorSelector
              title="Button Back Color"
              colorKey="buttonBackColor"
              description="The color of back button"
              selectedColor={colors.buttonBackColor}
            />
            
            <ColorSelector
              title="Footer Text Color"
              colorKey="footerTextColor"
              description="Footer label's font color"
              selectedColor={colors.footerTextColor}
            />
            
            <ColorSelector
              title="Checkmark Tint Color"
              colorKey="checkmarkTintColor"
              description="The color of the checkmark"
              selectedColor={colors.checkmarkTintColor}
            />
            
            <ColorSelector
              title="Background Color"
              colorKey="backgroundColor"
              description="Background color of the view, currently used for the background of Active Liveness"
              selectedColor={colors.backgroundColor}
            />
          </View>

          {/* Dimensions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📏 Dimensions</Text>
            
            <OptionPicker
              label="Button Height"
              options={BUTTON_HEIGHT_OPTIONS}
              selectedValue={buttonHeight}
              onValueChange={setButtonHeight}
            />
            
            <OptionPicker
              label="Button Corner Radius"
              options={CORNER_RADIUS_OPTIONS}
              selectedValue={buttonCornerRadius}
              onValueChange={setButtonCornerRadius}
            />
            
            <OptionPicker
              label="Gesture Font Size"
              options={FONT_SIZE_OPTIONS}
              selectedValue={gestureFontSize}
              onValueChange={setGestureFontSize}
            />
            
            <OptionPicker
              label="Button Margin Left"
              options={BUTTON_MARGIN_OPTIONS}
              selectedValue={buttonMarginLeft}
              onValueChange={setButtonMarginLeft}
            />
            
            <OptionPicker
              label="Button Margin Right"
              options={BUTTON_MARGIN_OPTIONS}
              selectedValue={buttonMarginRight}
              onValueChange={setButtonMarginRight}
            />
          </View>

          {/* Camera & Timing Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📷 Camera & Timing</Text>
            
            <OptionPicker
              label="Camera Position"
              options={CAMERA_POSITION_OPTIONS}
              selectedValue={cameraPosition}
              onValueChange={setCameraPosition}
            />
            
            <OptionPicker
              label="Request Timeout"
              options={TIMEOUT_OPTIONS}
              selectedValue={requestTimeout}
              onValueChange={setRequestTimeout}
            />
            
            <OptionPicker
              label="Error Delay"
              options={DELAY_OPTIONS}
              selectedValue={errorDelay}
              onValueChange={setErrorDelay}
            />
            
            <OptionPicker
              label="Success Delay"
              options={DELAY_OPTIONS}
              selectedValue={successDelay}
              onValueChange={setSuccessDelay}
            />
            
            <OptionPicker
              label="Mask Detection Confidence"
              options={CONFIDENCE_OPTIONS}
              selectedValue={maskConfidence}
              onValueChange={setMaskConfidence}
            />
          </View>

          {/* Behavior Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚙️ Behavior</Text>
            
            <View style={styles.switchContainer}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Auto Take Photo</Text>
                <Text style={styles.switchDescription}>Automatically capture when face is positioned correctly</Text>
              </View>
              <Switch
                value={autoTake}
                onValueChange={setAutoTake}
                trackColor={{ false: '#e9ecef', true: '#844EE3' }}
                thumbColor={autoTake ? '#FFFFFF' : '#6c757d'}
              />
            </View>

            <View style={styles.switchContainer}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Back Button</Text>
                <Text style={styles.switchDescription}>Show back button in the interface</Text>
              </View>
              <Switch
                value={backButtonEnabled}
                onValueChange={setBackButtonEnabled}
                trackColor={{ false: '#e9ecef', true: '#844EE3' }}
                thumbColor={backButtonEnabled ? '#FFFFFF' : '#6c757d'}
              />
            </View>

            <View style={styles.switchContainer}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Mask Detection</Text>
                <Text style={styles.switchDescription}>Detect and reject faces wearing masks</Text>
              </View>
              <Switch
                value={maskDetection}
                onValueChange={setMaskDetection}
                trackColor={{ false: '#e9ecef', true: '#844EE3' }}
                thumbColor={maskDetection ? '#FFFFFF' : '#6c757d'}
              />
            </View>

            <View style={styles.switchContainer}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Inverted Animation</Text>
                <Text style={styles.switchDescription}>Interchange near and far animations</Text>
              </View>
              <Switch
                value={invertedAnimation}
                onValueChange={setInvertedAnimation}
                trackColor={{ false: '#e9ecef', true: '#844EE3' }}
                thumbColor={invertedAnimation ? '#FFFFFF' : '#6c757d'}
              />
            </View>

            <View style={styles.switchContainer}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Multiple Faces Rejected</Text>
                <Text style={styles.switchDescription}>Reject capture when multiple faces are detected</Text>
              </View>
              <Switch
                value={multipleFacesRejected}
                onValueChange={setMultipleFacesRejected}
                trackColor={{ false: '#e9ecef', true: '#844EE3' }}
                thumbColor={multipleFacesRejected ? '#FFFFFF' : '#6c757d'}
              />
            </View>
          </View>
          </>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {Platform.OS === 'android' ? (
              // Android: Only show XML instructions button
              <TouchableOpacity style={styles.button} onPress={showAndroidInstructions}>
                <Text style={styles.buttonText}>📋 Generate XML Instructions</Text>
              </TouchableOpacity>
            ) : (
              // iOS: Show configuration buttons
              <>
                <TouchableOpacity style={styles.button} onPress={handleApplyCustomization}>
                  <Text style={styles.buttonText}>Apply Configuration</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.buttonSecondary} onPress={handleResetToDefaults}>
                  <Text style={styles.buttonSecondaryText}>Reset to Defaults</Text>
                </TouchableOpacity>
              </>
            )}
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#495057',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  fontSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  fontSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  colorSelectorContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  colorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  colorDescription: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  colorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  colorPickerFlex: {
    flex: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 12,
    color: '#6c757d',
    lineHeight: 16,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 24,
  },
  button: {
    backgroundColor: '#844EE3',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#844EE3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  buttonSecondaryText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  // Android warning styles
  androidWarningContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  androidWarningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  androidWarningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: 'bold',
  },
  androidInfoButton: {
    backgroundColor: '#856404',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  androidInfoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // iOS success styles
  iosSuccessContainer: {
    backgroundColor: '#D4EDDA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C3E6CB',
  },
  iosSuccessTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 8,
  },
  iosSuccessText: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
  },
});

export default LivenessUICustomizeModal;