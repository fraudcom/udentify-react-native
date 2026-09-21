import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Switch,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {useSettings} from '../config/SettingsContext';

interface NFCSettingsScreenProps {
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

export default function NFCSettingsScreen({onBack}: NFCSettingsScreenProps) {
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
        <Text style={styles.headerTitle}>NFC Ayarları</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.row}>
        <Text style={styles.toggleLabel}>Active Authentication</Text>
        <Switch
          value={settings.isActiveAuthenticationEnabled}
          onValueChange={val =>
            updateSettings({isActiveAuthenticationEnabled: val})
          }
          trackColor={{false: '#E9E9EA', true: '#65C466'}}
          thumbColor="#FFFFFF"
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.toggleLabel}>Passive Authentication</Text>
        <Switch
          value={settings.isPassiveAuthenticationEnabled}
          onValueChange={val =>
            updateSettings({isPassiveAuthenticationEnabled: val})
          }
          trackColor={{false: '#E9E9EA', true: '#65C466'}}
          thumbColor="#FFFFFF"
        />
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
});
