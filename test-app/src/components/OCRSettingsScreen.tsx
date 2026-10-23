import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Switch,
  TextInput,
} from 'react-native';
import Slider from './Slider';
import Svg, {Path} from 'react-native-svg';
import {useSettings} from '../config/SettingsContext';

interface OCRSettingsScreenProps {
  onBack: () => void;
}

// Blur Coefficient range matches the native SDK clamp (-1.0 to 1.0).
const BLUR_MIN = -1;
const BLUR_MAX = 1;
const BLUR_STEP = 0.01;

// Detection Accuracy range matches the native SDK clamp (0 to 200).
const DETECTION_MIN = 0;
const DETECTION_MAX = 200;
const DETECTION_STEP = 1;

// 26.1.3: raw photo crop ratio (0.0 to 1.0, default 0.35).
const CROP_MIN = 0;
const CROP_MAX = 1;
const CROP_STEP = 0.05;

// Hologram V2 (26.1.2+): flash/no-flash durations in seconds, bitrate 1-10.
// Total duration is derived (no-flash + flash) as in the 6.6.2 design.
const HOLO_DURATION_MIN = 0;
const HOLO_DURATION_MAX = 10;
const BITRATE_MIN = 1;
const BITRATE_MAX = 10;

function clampInt(text: string, min: number, max: number, fallback: number): number {
  const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10);
  if (isNaN(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
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

function formatBlur(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function formatRatio(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export default function OCRSettingsScreen({onBack}: OCRSettingsScreenProps) {
  const {settings, updateSettings} = useSettings();

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
        <Text style={styles.headerTitle}>OCR Ayarları</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView>
        <View style={styles.row}>
          <Text style={styles.toggleLabel}>Enable OCR Review</Text>
          <Switch
            value={settings.ocrEnableReview}
            onValueChange={val => updateSettings({ocrEnableReview: val})}
            trackColor={{false: '#E9E9EA', true: '#65C466'}}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.toggleLabel}>Enable IQA</Text>
          <Switch
            value={settings.ocrEnableIQA}
            onValueChange={val => updateSettings({ocrEnableIQA: val})}
            trackColor={{false: '#E9E9EA', true: '#65C466'}}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.toggleLabel}>Enable Hologram Check</Text>
          <Switch
            value={settings.ocrEnableHologramCheck}
            onValueChange={val => updateSettings({ocrEnableHologramCheck: val})}
            trackColor={{false: '#E9E9EA', true: '#65C466'}}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Hologram V2 (26.1.2+): duration/bitrate parameters, per design 6.6.2 */}
        {settings.ocrEnableHologramCheck && (
          <>
            <View style={styles.numberRow}>
              <Text style={styles.numberLabel}>No-Flash Duration</Text>
              <TextInput
                style={styles.numberInput}
                value={String(settings.hologramNoFlashDuration)}
                onChangeText={text => {
                  const noFlash = clampInt(
                    text,
                    HOLO_DURATION_MIN,
                    HOLO_DURATION_MAX,
                    settings.hologramNoFlashDuration,
                  );
                  updateSettings({
                    hologramNoFlashDuration: noFlash,
                    hologramTotalDuration: noFlash + settings.hologramFlashDuration,
                  });
                }}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            <View style={styles.numberRow}>
              <Text style={styles.numberLabel}>Flash Duration</Text>
              <TextInput
                style={styles.numberInput}
                value={String(settings.hologramFlashDuration)}
                onChangeText={text => {
                  const flash = clampInt(
                    text,
                    HOLO_DURATION_MIN,
                    HOLO_DURATION_MAX,
                    settings.hologramFlashDuration,
                  );
                  updateSettings({
                    hologramFlashDuration: flash,
                    hologramTotalDuration: settings.hologramNoFlashDuration + flash,
                  });
                }}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            <View style={styles.numberRow}>
              <Text style={styles.numberLabelDisabled}>Total Duration</Text>
              <Text style={styles.numberValueDisabled}>
                {settings.hologramTotalDuration}
              </Text>
            </View>

            <View style={styles.numberRow}>
              <Text style={styles.numberLabel}>Bitrate (1-10)</Text>
              <TextInput
                style={styles.numberInput}
                value={String(settings.hologramBitrate)}
                onChangeText={text => {
                  updateSettings({
                    hologramBitrate: clampInt(
                      text,
                      BITRATE_MIN,
                      BITRATE_MAX,
                      settings.hologramBitrate,
                    ),
                  });
                }}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </>
        )}

        <View style={styles.row}>
          <Text style={styles.toggleLabel}>Document Liveness</Text>
          <Switch
            value={settings.ocrDocumentLiveness}
            onValueChange={val => updateSettings({ocrDocumentLiveness: val})}
            trackColor={{false: '#E9E9EA', true: '#65C466'}}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.sliderRow}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Blur Coefficient:</Text>
            <Text style={styles.sliderValue}>
              {formatBlur(settings.ocrBlurCoefficient)}
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={BLUR_MIN}
            maximumValue={BLUR_MAX}
            step={BLUR_STEP}
            value={settings.ocrBlurCoefficient}
            onValueChange={val => updateSettings({ocrBlurCoefficient: val})}
            minimumTrackTintColor="#4535B0"
            maximumTrackTintColor="#E8E8E8"
            thumbTintColor="#FFFFFF"
          />
        </View>

        <View style={styles.sliderRow}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Detection Accuracy:</Text>
            <Text style={styles.sliderValue}>
              {settings.ocrDetectionAccuracy}
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={DETECTION_MIN}
            maximumValue={DETECTION_MAX}
            step={DETECTION_STEP}
            value={settings.ocrDetectionAccuracy}
            onValueChange={val => updateSettings({ocrDetectionAccuracy: val})}
            minimumTrackTintColor="#4535B0"
            maximumTrackTintColor="#E8E8E8"
            thumbTintColor="#FFFFFF"
          />
        </View>

        {/* 26.1.3: raw photo crop ratio */}
        <View style={styles.sliderRow}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Raw Photo Crop Ratio:</Text>
            <Text style={styles.sliderValue}>
              {formatRatio(settings.ocrRawPhotoCropRatio)}
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={CROP_MIN}
            maximumValue={CROP_MAX}
            step={CROP_STEP}
            value={settings.ocrRawPhotoCropRatio}
            onValueChange={val => updateSettings({ocrRawPhotoCropRatio: val})}
            minimumTrackTintColor="#4535B0"
            maximumTrackTintColor="#E8E8E8"
            thumbTintColor="#FFFFFF"
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.toggleLabel}>Video Call</Text>
          <Switch
            value={settings.ocrVideoCall}
            onValueChange={val => updateSettings({ocrVideoCall: val})}
            trackColor={{false: '#E9E9EA', true: '#65C466'}}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.urlRow}>
          <TextInput
            style={styles.urlInput}
            value={settings.ocrVideoCallUrl}
            onChangeText={val => updateSettings({ocrVideoCallUrl: val})}
            placeholder="https://demo.udentify.io:8082"
            placeholderTextColor="#9AA0AE"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>
      </ScrollView>
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
  sliderRow: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    color: '#4535B0',
    fontSize: 14,
    fontWeight: '700',
  },
  sliderValue: {
    color: '#4C556C',
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 32,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    height: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  numberLabel: {
    flex: 1,
    color: '#1F1F1F',
    fontSize: 14,
    fontWeight: '500',
  },
  numberLabelDisabled: {
    flex: 1,
    color: '#BABEC7',
    fontSize: 14,
    fontWeight: '500',
  },
  numberInput: {
    color: '#1F1F1F',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 48,
    padding: 0,
  },
  numberValueDisabled: {
    color: '#BABEC7',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 48,
  },
  urlRow: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  urlInput: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '400',
    padding: 0,
  },
});
