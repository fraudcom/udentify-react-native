import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Switch,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {useSettings} from '../config/SettingsContext';

interface FaceSettingsScreenProps {
  onBack: () => void;
}

function ChevronLeftIcon() {
  return (
    <Svg width={9} height={16} viewBox="0 0 9 16" fill="none">
      <Path
        d="M8 1L1 8L8 15"
        stroke="#4535B0"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronDownIcon() {
  return (
    <Svg width={12} height={7} viewBox="0 0 12 7" fill="none">
      <Path
        d="M1 1L6 6L11 1"
        stroke="#4C556C"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const LIVENESS_MODE_LABELS: Record<string, string> = {
  passive: 'Passive Liveness',
  active: 'Active Liveness',
  hybrid: 'Hybrid Liveness',
};

const LIVENESS_MODES = ['passive', 'active', 'hybrid'] as const;

export default function FaceSettingsScreen({onBack}: FaceSettingsScreenProps) {
  const {settings, updateSettings} = useSettings();

  const showLivenessModePicker = () => {
    const options = LIVENESS_MODES.map(m => LIVENESS_MODE_LABELS[m]);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, 'Cancel'],
          cancelButtonIndex: options.length,
          title: 'Liveness Mode',
        },
        (buttonIndex: number) => {
          if (buttonIndex < LIVENESS_MODES.length) {
            updateSettings({faceLivenessMode: LIVENESS_MODES[buttonIndex]});
          }
        },
      );
    } else {
      Alert.alert(
        'Liveness Mode',
        undefined,
        [
          ...LIVENESS_MODES.map(mode => ({
            text: LIVENESS_MODE_LABELS[mode],
            onPress: () => updateSettings({faceLivenessMode: mode}),
          })),
          {text: 'Cancel', style: 'cancel' as const},
        ],
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBFD" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ChevronLeftIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yüz Ayarları</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.row}>
        <Text style={styles.toggleLabel}>Auto Selfie</Text>
        <Switch
          value={settings.faceAutoSelfie}
          onValueChange={val => updateSettings({faceAutoSelfie: val})}
          trackColor={{false: '#E9E9EA', true: '#65C466'}}
          thumbColor="#FFFFFF"
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.toggleLabel}>Inverted Animation</Text>
        <Switch
          value={settings.faceInvertedAnimation}
          onValueChange={val => updateSettings({faceInvertedAnimation: val})}
          trackColor={{false: '#E9E9EA', true: '#65C466'}}
          thumbColor="#FFFFFF"
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.toggleLabel}>Allow Multiple Faces</Text>
        <Switch
          value={settings.faceAllowMultipleFaces}
          onValueChange={val => updateSettings({faceAllowMultipleFaces: val})}
          trackColor={{false: '#E9E9EA', true: '#65C466'}}
          thumbColor="#FFFFFF"
        />
      </View>

      <TouchableOpacity
        style={styles.pickerRow}
        onPress={showLivenessModePicker}
        activeOpacity={0.6}>
        <View style={styles.pickerTextContainer}>
          <Text style={styles.pickerCaption}>Liveness Mode</Text>
          <Text style={styles.pickerValue}>
            {LIVENESS_MODE_LABELS[settings.faceLivenessMode] || 'Active Liveness'}
          </Text>
        </View>
        <ChevronDownIcon />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  headerTitle: {
    flex: 1,
    color: '#4535B0',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  headerSpacer: {
    width: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    height: 53,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  toggleLabel: {
    flex: 1,
    color: '#4535B0',
    fontSize: 14,
    fontWeight: '700',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    height: 67,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
    marginTop: 12,
  },
  pickerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  pickerCaption: {
    color: '#4C556C',
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 4,
  },
  pickerValue: {
    color: '#4535B0',
    fontSize: 14,
    fontWeight: '600',
  },
});
