import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Switch,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Svg, {Path, Circle} from 'react-native-svg';
import {useSettings} from '../config/SettingsContext';

interface APISettingsScreenProps {
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

function ClearIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#FF4444" strokeWidth={1.5} />
      <Path
        d="M15 9L9 15M9 9L15 15"
        stroke="#FF4444"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function APISettingsScreen({onBack}: APISettingsScreenProps) {
  const {settings, updateSettings} = useSettings();

  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [timeout, setTimeout_] = useState(String(settings.timeout / 1000));
  const [channelId, setChannelId] = useState(settings.channelId);
  const [qrCodeActivation, setQrCodeActivation] = useState(
    settings.qrCodeActivation,
  );

  const handleSave = async () => {
    const timeoutMs = parseInt(timeout, 10) * 1000;
    if (isNaN(timeoutMs) || timeoutMs <= 0) {
      Alert.alert('Hata', 'Zaman asimi degeri gecerli bir sayi olmalidir.');
      return;
    }

    await updateSettings({
      apiKey,
      baseUrl,
      baseURL: baseUrl,
      timeout: timeoutMs,
      channelId,
      qrCodeActivation,
    });

    Alert.alert('Basarili', 'API ayarlari kaydedildi.', [
      {text: 'Tamam', onPress: onBack},
    ]);
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
        <Text style={styles.headerTitle}>API Ayarları</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* API Key */}
          <View style={styles.row}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>API Key</Text>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry
                placeholder="API Key"
                placeholderTextColor="#BABEC7"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setApiKey('')}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <ClearIcon />
            </TouchableOpacity>
          </View>

          {/* Base URL */}
          <View style={styles.row}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Base URL</Text>
              <TextInput
                style={styles.input}
                value={baseUrl}
                onChangeText={setBaseUrl}
                placeholder="https://example.com:8082"
                placeholderTextColor="#BABEC7"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setBaseUrl('')}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <ClearIcon />
            </TouchableOpacity>
          </View>

          {/* Timeout */}
          <View style={styles.row}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Timeout (sn)</Text>
              <TextInput
                style={styles.input}
                value={timeout}
                onChangeText={setTimeout_}
                placeholder="30"
                placeholderTextColor="#BABEC7"
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setTimeout_('')}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <ClearIcon />
            </TouchableOpacity>
          </View>

          {/* Channel ID */}
          <View style={styles.row}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Channel ID</Text>
              <TextInput
                style={styles.input}
                value={channelId}
                onChangeText={setChannelId}
                placeholder="Channel ID"
                placeholderTextColor="#BABEC7"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* QR Code Activation */}
          <View style={styles.row}>
            <Text style={styles.toggleLabel}>QR Code Activation</Text>
            <Switch
              value={qrCodeActivation}
              onValueChange={setQrCodeActivation}
              trackColor={{false: '#E9E9EA', true: '#65C466'}}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Save Button */}
          <View style={styles.saveContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
    minHeight: 53,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  inputContainer: {
    flex: 1,
  },
  label: {
    color: '#BABEC7',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  input: {
    color: '#1F1F1F',
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  clearButton: {
    marginLeft: 12,
  },
  toggleLabel: {
    flex: 1,
    color: '#4535B0',
    fontSize: 14,
    fontWeight: '700',
  },
  saveContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  saveButton: {
    backgroundColor: '#4535B0',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
