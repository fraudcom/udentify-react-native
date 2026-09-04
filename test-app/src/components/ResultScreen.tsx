import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {useBottomInset} from '../hooks/useBottomInset';

interface ResultData {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  gender?: string;
  motherName?: string;
  fatherName?: string;
  expiryDate?: string;
  faceImage?: string;
  // 26.1.3: native-script fields
  nativeFirstName?: string;
  nativeLastName?: string;
  nativeGender?: string;
  documentNumber?: string;
  nationality?: string;
}

// Document liveness result, present only when the OCR settings toggle is on
// and the flow ran performOCRAndDocumentLiveness.
interface LivenessResult {
  success?: boolean;
  frontSideProbability?: number;
  backSideProbability?: number;
}

interface ResultScreenProps {
  data: ResultData;
  onBack: () => void;
  onContinue: () => void;
  liveness?: LivenessResult | null;
}

// Native probabilities arrive as 0..1 doubles; render them as whole percents.
function formatProbability(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `%${Math.round(value * 100)}`;
}

function ChevronLeftIcon() {
  return (
    <Svg width={10} height={18} viewBox="0 0 10 18" fill="none">
      <Path
        d="M9 1L1 9L9 17"
        stroke="#1F1F1F"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function formatGender(gender?: string): string {
  if (!gender) return '';
  // Gender can arrive as combined codes like "E/M" or "K/F"; tokenize and match.
  const tokens = gender.trim().toUpperCase().split(/[\/,\s]+/);
  const isMale = tokens.some(t => ['M', 'MALE', 'E', 'ERKEK'].includes(t));
  const isFemale = tokens.some(t =>
    ['F', 'FEMALE', 'K', 'KADIN', 'KADİN'].includes(t),
  );
  if (isMale) return 'Erkek';
  if (isFemale) return 'Kadın';
  return gender;
}

function InfoRow({label, value}: {label: string; value?: string}) {
  if (!value || value.trim() === '') return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function ResultScreen({
  data,
  onBack,
  onContinue,
  liveness,
}: ResultScreenProps) {
  const fullName = [data.firstName, data.lastName]
    .filter(part => part && part.trim() !== '')
    .join(' ');

  const isLive = liveness?.success === true;

  const bottomInset = useBottomInset();

  return (
    <View style={styles.container}>
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {data.faceImage ? (
          <View style={styles.avatarContainer}>
            <View style={styles.avatarRing}>
              <Image
                style={styles.avatarImage}
                source={{uri: `data:image/jpeg;base64,${data.faceImage}`}}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.infos}>
          <InfoRow label="Adınız Soyadınız" value={fullName} />
          <InfoRow label="Doğum Tarihi" value={data.birthDate} />
          <InfoRow label="Cinsiyet" value={formatGender(data.gender)} />
          <InfoRow label="Anne Adı" value={data.motherName} />
          <InfoRow label="Baba Adı" value={data.fatherName} />
          <InfoRow label="Doküman Numarası" value={data.documentNumber} />
          <InfoRow label="Uyruk" value={data.nationality} />
          <InfoRow
            label="Doküman Son Kullanma Tarihi"
            value={data.expiryDate}
          />
          {/* 26.1.3: native-script fields (shown only when the document carries them) */}
          {data.nativeFirstName ? (
            <InfoRow label="Yerel Ad" value={data.nativeFirstName} />
          ) : null}
          {data.nativeLastName ? (
            <InfoRow label="Yerel Soyad" value={data.nativeLastName} />
          ) : null}
          {data.nativeGender ? (
            <InfoRow label="Yerel Cinsiyet" value={data.nativeGender} />
          ) : null}
        </View>

        {liveness ? (
          <View style={styles.livenessRow}>
            <View style={styles.livenessHeader}>
              <Text style={styles.rowLabel}>Doküman Canlılığı</Text>
              <View
                style={[
                  styles.livenessBadge,
                  isLive ? styles.livenessBadgePass : styles.livenessBadgeFail,
                ]}>
                <Text
                  style={[
                    styles.livenessBadgeText,
                    isLive
                      ? styles.livenessBadgeTextPass
                      : styles.livenessBadgeTextFail,
                  ]}>
                  {isLive ? 'Gerçek' : 'Sahte'}
                </Text>
              </View>
            </View>
            <Text style={styles.livenessScores}>
              {`Ön: ${formatProbability(liveness.frontSideProbability)} · Arka: ${formatProbability(liveness.backSideProbability)}`}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.buttonContainer, {paddingBottom: bottomInset}]}>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F1EDFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  infos: {
    paddingHorizontal: 0,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 85, 108, 0.1)',
  },
  rowLabel: {
    color: '#4C556C',
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 6,
  },
  rowValue: {
    color: '#18181B',
    fontSize: 16,
    fontWeight: '600',
  },
  livenessRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 85, 108, 0.1)',
  },
  livenessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  livenessBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  livenessBadgePass: {
    backgroundColor: '#DBF7EA',
  },
  livenessBadgeFail: {
    backgroundColor: '#FDE2E1',
  },
  livenessBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  livenessBadgeTextPass: {
    color: '#2BAC72',
  },
  livenessBadgeTextFail: {
    color: '#D7373F',
  },
  livenessScores: {
    color: '#4C556C',
    fontSize: 13,
    fontWeight: '400',
    marginTop: 8,
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
