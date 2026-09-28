import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ScrollView,
  TextInput,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';

interface ConfirmMrzScreenProps {
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiration: string;
  onConfirm: (
    documentNumber: string,
    dateOfBirth: string,
    dateOfExpiration: string,
  ) => void;
  onRescan: () => void;
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

export default function ConfirmMrzScreen({
  documentNumber,
  dateOfBirth,
  dateOfExpiration,
  onConfirm,
  onRescan,
  onBack,
}: ConfirmMrzScreenProps) {
  const [docNumber, setDocNumber] = useState(documentNumber);
  const [birthDate, setBirthDate] = useState(dateOfBirth);
  const [expiryDate, setExpiryDate] = useState(dateOfExpiration);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ChevronLeftIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bilgileri Onayla</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.contentArea} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>
          Bilgileri Gözden Geçirin ve Onaylayın
        </Text>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Seri No</Text>
          <TextInput
            style={styles.fieldInput}
            value={docNumber}
            onChangeText={setDocNumber}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Doğum Tarihi</Text>
          <TextInput
            style={styles.fieldInput}
            value={birthDate}
            onChangeText={setBirthDate}
            autoCorrect={false}
          />
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Doküman Son Kullanma Tarihi</Text>
          <TextInput
            style={styles.fieldInput}
            value={expiryDate}
            onChangeText={setExpiryDate}
            autoCorrect={false}
          />
        </View>
      </ScrollView>

      <View style={styles.bottomSection}>
        <Text style={styles.confirmQuestion}>Bilgileriniz doğru mu?</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.rescanButton} onPress={onRescan}>
            <Text style={styles.rescanButtonText}>Hayır / Güncelle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => onConfirm(docNumber, birthDate, expiryDate)}>
            <Text style={styles.confirmButtonText}>Evet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  contentArea: {
    backgroundColor: '#FAFBFD',
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
  sectionTitle: {
    color: '#1F1F1F',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  fieldRow: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(76, 85, 108, 0.1)',
  },
  fieldLabel: {
    color: '#4C556C',
    fontSize: 12,
    fontWeight: '400',
  },
  fieldInput: {
    color: '#18181B',
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
    marginTop: 6,
  },
  bottomSection: {
    backgroundColor: '#FAFBFD',
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 8,
  },
  confirmQuestion: {
    color: '#0E0E0E',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rescanButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F3F0FE',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescanButtonText: {
    color: '#4535B0',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4535B0',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
