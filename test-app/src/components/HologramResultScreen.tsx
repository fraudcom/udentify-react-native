import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import HologramSuccessIcon from '../assets/hologram-success.svg';

interface HologramResultScreenProps {
  onContinue: () => void;
  success?: boolean;
  // Verification detail from the native onHologramComplete event - present
  // only for a successful check, since a failed check has nothing to report.
  hologramExists?: boolean;
  idAndHologramIdMatch?: boolean;
  faceAndHologramFaceMatch?: boolean;
}

function CheckDetailRow({label, passed}: {label: string; passed?: boolean}) {
  if (passed === undefined) return null;
  return (
    <View style={styles.checkRow}>
      <Text style={styles.checkLabel}>{label}</Text>
      <Text style={passed ? styles.checkPass : styles.checkFail}>
        {passed ? 'Eşleşti' : 'Eşleşmedi'}
      </Text>
    </View>
  );
}

export default function HologramResultScreen({
  onContinue,
  success = true,
  hologramExists,
  idAndHologramIdMatch,
  faceAndHologramFaceMatch,
}: HologramResultScreenProps) {
  const title = success
    ? 'Hologram Kontrolü Başarılı'
    : 'Hologram Kontrolü Başarısız';
  const description = success
    ? 'Hologram kontrol işlemi\nbaşarılı bir şekilde tamamlanmıştır.'
    : 'Hologram kontrol işlemi tamamlanamadı.\nLütfen tekrar deneyin.';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Onay Ekranı</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <HologramSuccessIcon width={74} height={74} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {success ? (
          <View style={styles.checkList}>
            <CheckDetailRow label="Hologram Tespit Edildi" passed={hologramExists} />
            <CheckDetailRow label="Kimlik No Eşleşmesi" passed={idAndHologramIdMatch} />
            <CheckDetailRow label="Yüz Eşleşmesi" passed={faceAndHologramFaceMatch} />
          </View>
        ) : null}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
          <Text style={styles.continueButtonText}>Devam Et</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingTop: 56,
    paddingHorizontal: 12,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    color: '#1F1F1F',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
    marginTop: 24,
  },
  description: {
    color: '#18181B',
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 23,
    letterSpacing: 0.1,
    marginTop: 12,
  },
  checkList: {
    marginTop: 24,
    width: '100%',
    gap: 8,
  },
  checkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3F0FE',
    borderRadius: 8,
  },
  checkLabel: {
    color: '#18181B',
    fontSize: 14,
    fontWeight: '500',
  },
  checkPass: {
    color: '#16A34A',
    fontSize: 14,
    fontWeight: '700',
  },
  checkFail: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 8,
  },
  continueButton: {
    backgroundColor: '#4535B0',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
});
