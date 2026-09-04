import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import Svg, {Path, Circle, Rect} from 'react-native-svg';
import {useBottomInset} from '../hooks/useBottomInset';

interface VideoCallQueueScreenProps {
  onBack: () => void;
  onContinue: () => void;
  waitTime?: string;
  queueNumber?: number;
  isWeakConnection?: boolean;
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

function ListCheckIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 5.5L5 7L8 4"
        stroke="#4535B0"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.5 11.5L5 13L8 10"
        stroke="#4535B0"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M11 6H20"
        stroke="#4535B0"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M11 12H20"
        stroke="#4535B0"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M11 18H20"
        stroke="#4535B0"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M3.5 17.5L5 19L8 16"
        stroke="#4535B0"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WifiBandwidthIcon() {
  return (
    <Svg width={22} height={17} viewBox="0 0 24 20" fill="none">
      <Path
        d="M1.5 6C5 2.5 8.5 1 12 1C15.5 1 19 2.5 22.5 6"
        stroke="#4535B0"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M5 10C7.5 7.5 9.5 6.5 12 6.5C14.5 6.5 16.5 7.5 19 10"
        stroke="#4535B0"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M8.5 14C9.5 13 10.5 12.5 12 12.5C13.5 12.5 14.5 13 15.5 14"
        stroke="#4535B0"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={17.5} r={1.5} fill="#4535B0" />
    </Svg>
  );
}

function AlertIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke="#73510D"
        strokeWidth={2}
        fill="#FDE68A"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 9V13"
        stroke="#73510D"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={16} r={1} fill="#73510D" />
    </Svg>
  );
}

function ClockQueueIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke="#4535B0" strokeWidth={2} />
      <Path
        d="M12 7V12L15 14"
        stroke="#4535B0"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UserQueueIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke="#4535B0" strokeWidth={2} />
      <Path
        d="M5 20C5 16.134 8.134 13 12 13C15.866 13 19 16.134 19 20"
        stroke="#4535B0"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function VideoCallQueueScreen({
  onBack,
  onContinue,
  waitTime = '4 dk.',
  queueNumber = 3,
  isWeakConnection = false,
}: VideoCallQueueScreenProps) {
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
        <Text style={styles.headerTitle}>Görüşme Sırası Bekleme</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Auto Queue Controls */}
        <Text style={styles.sectionTitle}>
          Otomatik Sıra Bekleme Kontrolleri:
        </Text>

        <View style={styles.checkItem}>
          <View style={styles.checkIconContainer}>
            <ListCheckIcon />
          </View>
          <Text style={styles.checkText}>
            <Text style={styles.checkBold}>İzinler: </Text>
            Kamera ve mikrofon erişimini onaylayın. Engellenirse hemen
            talimatlara yönlendirin.
          </Text>
        </View>

        <View style={styles.checkItem}>
          <View style={styles.checkIconContainer}>
            <WifiBandwidthIcon />
          </View>
          <Text style={styles.checkText}>
            <Text style={styles.checkBold}>Bant Genişliği Testi: </Text>
            Hızlı bir hız testi yapın. Bağlantı çok zayıfsa, daha fazla
            varyasyon görüntüleyin.
          </Text>
        </View>

        {/* Weak Connection Warning */}
        {isWeakConnection && (
          <View style={styles.warningCard}>
            <View style={styles.warningIconContainer}>
              <AlertIcon />
            </View>
            <Text style={styles.warningText}>
              Bağlantınız zayıf. Devam etmeden önce Wifi modeminize yaklaşın.
            </Text>
          </View>
        )}

        {/* Waiting Room Section */}
        <Text style={[styles.sectionTitle, styles.waitingSectionTitle]}>
          Bekleme Odası:
        </Text>

        {/* Wait Time Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardInner}>
            <View style={styles.infoIconContainer}>
              <ClockQueueIcon />
            </View>
            <Text style={styles.infoLabel}>Bekleme Süresi:</Text>
          </View>
          <Text style={styles.infoValue}>{waitTime}</Text>
        </View>

        {/* Queue Number Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardInner}>
            <View style={styles.infoIconContainer}>
              <UserQueueIcon />
            </View>
            <Text style={styles.infoLabel}>Sıra Numarası:</Text>
          </View>
          <Text style={styles.infoValue}>{queueNumber}</Text>
        </View>
      </ScrollView>

      <View style={[styles.buttonContainer, {paddingBottom: bottomInset}]}>
        <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
          <Text style={styles.continueButtonText}>Görüşmeye Devam Et</Text>
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
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    color: '#1F1F1F',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  waitingSectionTitle: {
    marginTop: 8,
  },
  checkItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  checkIconContainer: {
    width: 24,
    paddingTop: 2,
  },
  checkText: {
    flex: 1,
    color: '#18181B',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  checkBold: {
    fontWeight: '700',
    color: '#1F1F1F',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  warningIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningText: {
    flex: 1,
    color: '#73510D',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 16,
    marginBottom: 10,
  },
  infoCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F0FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    color: '#18181B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  infoValue: {
    color: '#4535B0',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 16,
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
