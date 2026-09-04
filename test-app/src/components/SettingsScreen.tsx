import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {useSettings} from '../config/SettingsContext';

// On Android, the core SafeAreaView is a no-op and the app draws edge-to-edge,
// so the header would render behind the status bar. Pad it down by the status
// bar height. iOS top inset is handled by SafeAreaView.
const TOP_INSET =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

interface SettingsScreenProps {
  onBack: () => void;
  onNavigate: (section: string) => void;
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

function ChevronRightIcon() {
  return (
    <Svg width={9} height={16} viewBox="0 0 9 16" fill="none">
      <Path
        d="M1 1L8 8L1 15"
        stroke="#4535B0"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const SETTINGS_SECTIONS = [
  {id: 'api', label: 'API Ayarları'},
  {id: 'nfc', label: 'NFC Ayarları'},
  {id: 'face', label: 'Yüz Ayarları'},
  {id: 'ocr', label: 'OCR Ayarları'},
  {id: 'language', label: 'Dil Ayarları'},
  {id: 'devTools', label: 'Dev Tools (Language Pack Test)'},
];

export default function SettingsScreen({
  onBack,
  onNavigate,
}: SettingsScreenProps) {
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
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {SETTINGS_SECTIONS.map((section, index) => (
          <TouchableOpacity
            key={section.id}
            style={[
              styles.row,
              index === 0 && styles.rowFirst,
            ]}
            onPress={() => onNavigate(section.id)}
            activeOpacity={0.6}>
            <Text style={styles.rowLabel}>{section.label}</Text>
            <ChevronRightIcon />
          </TouchableOpacity>
        ))}

        {/* Debug menu: gate the legacy tab playground ('main') behind a toggle */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Debug Menu</Text>
          <Switch
            value={settings.debugMenuEnabled}
            onValueChange={value => updateSettings({debugMenuEnabled: value})}
            trackColor={{false: '#E9E9EA', true: '#4535B0'}}
            thumbColor="#FFFFFF"
          />
        </View>

        {settings.debugMenuEnabled && (
          <TouchableOpacity
            style={styles.row}
            onPress={() => onNavigate('debug')}
            activeOpacity={0.6}>
            <Text style={styles.rowLabel}>Debug Flows (main)</Text>
            <ChevronRightIcon />
          </TouchableOpacity>
        )}
      </View>
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
    height: 56 + TOP_INSET,
    paddingTop: TOP_INSET,
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
  content: {
    marginTop: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    height: 53,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E8',
  },
  rowFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E8',
  },
  rowLabel: {
    color: '#4535B0',
    fontSize: 14,
    fontWeight: '700',
  },
});
