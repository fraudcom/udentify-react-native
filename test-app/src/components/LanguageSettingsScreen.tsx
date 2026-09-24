import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {useSettings} from '../config/SettingsContext';

interface LanguageSettingsScreenProps {
  onBack: () => void;
}

const SUPPORTED_LANGUAGES = [
  {code: 'EN', name: 'English'},
  {code: 'ES', name: 'Espanol'},
  {code: 'FR', name: 'French'},
  {code: 'DE', name: 'German'},
  {code: 'IT', name: 'Italian'},
  {code: 'TR', name: 'Turkce'},
  {code: 'PT', name: 'Portuguese'},
  {code: 'RU', name: 'Russian'},
  {code: 'AR', name: 'Arabic'},
  {code: 'ZH', name: 'Chinese'},
  {code: 'JA', name: 'Japanese'},
  {code: 'KO', name: 'Korean'},
];

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

function ChevronDownIcon({up}: {up: boolean}) {
  return (
    <Svg
      width={12}
      height={7}
      viewBox="0 0 12 7"
      fill="none"
      style={up ? {transform: [{rotate: '180deg'}]} : undefined}>
      <Path
        d="M1 1L6 6L11 1"
        stroke="#4535B0"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckmarkIcon() {
  return (
    <Svg width={16} height={12} viewBox="0 0 16 12" fill="none">
      <Path
        d="M1 6L5.5 10.5L14.5 1.5"
        stroke="#4535B0"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function LanguageSettingsScreen({
  onBack,
}: LanguageSettingsScreenProps) {
  const {settings, updateSettings} = useSettings();
  const [isOpen, setIsOpen] = useState(false);

  const selectedLanguage =
    SUPPORTED_LANGUAGES.find(l => l.code === settings.language) ||
    SUPPORTED_LANGUAGES[0];

  const handleSelect = (code: string) => {
    updateSettings({language: code});
    setIsOpen(false);
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
        <Text style={styles.headerTitle}>Dil Ayarları</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setIsOpen(!isOpen)}
          activeOpacity={0.6}>
          <View>
            <Text style={styles.dropdownLabel}>Dil</Text>
            <Text style={styles.dropdownValue}>{selectedLanguage.name}</Text>
          </View>
          <ChevronDownIcon up={isOpen} />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.listContainer}>
            <View style={styles.listDivider} />
            {SUPPORTED_LANGUAGES.map((lang, index) => {
              const isSelected = lang.code === settings.language;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageRow,
                    index < SUPPORTED_LANGUAGES.length - 1 &&
                      styles.languageRowBorder,
                  ]}
                  onPress={() => handleSelect(lang.code)}
                  activeOpacity={0.6}>
                  <Text
                    style={[
                      styles.languageName,
                      isSelected && styles.languageNameSelected,
                    ]}>
                    {lang.name}
                  </Text>
                  {isSelected && <CheckmarkIcon />}
                </TouchableOpacity>
              );
            })}
          </View>
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
  content: {
    marginTop: 0,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  dropdownLabel: {
    color: '#4C556C',
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 4,
  },
  dropdownValue: {
    color: '#4535B0',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    backgroundColor: '#FFFFFF',
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(76, 85, 108, 0.1)',
    marginHorizontal: 15,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: 44,
  },
  languageRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(76, 85, 108, 0.1)',
    marginHorizontal: 0,
  },
  languageName: {
    color: '#1F1F1F',
    fontSize: 14,
    fontWeight: '400',
  },
  languageNameSelected: {
    fontWeight: '600',
  },
});
