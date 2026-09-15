import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import LottieView from 'lottie-react-native';
import HandGestureIcon from '../assets/hand-gesture.svg';
import CreditCardCheckIcon from '../assets/credit-card-check.svg';
import BrightnessHighIcon from '../assets/brightness-high.svg';
import {useBottomInset} from '../hooks/useBottomInset';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface ScanHologramScreenProps {
  onBack: () => void;
  onStartScan: () => void;
  loading?: boolean;
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

export default function ScanHologramScreen({
  onBack,
  onStartScan,
  loading = false,
}: ScanHologramScreenProps) {
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
        <Text style={styles.headerTitle}>Hologram Kontrolü</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.animationContainer}>
          <LottieView
            source={require('../assets/Hologram Scan (1).json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            Bu adımda, kimliğinizin ön yüzünde{'\n'}bulunan hologramın
            parlamasını doğrulayacaksınız.
          </Text>
        </View>

        <Text style={styles.tipsTitle}>Faydalı İpuçları</Text>

        <View style={styles.tipsContainer}>
          <View style={styles.tipRow}>
            <HandGestureIcon width={24} height={24} />
            <Text style={styles.tipText}>
              <Text style={styles.tipBold}>Hologramın Üzerini Kapatmayın: </Text>
              <Text style={styles.tipRegular}>
                Hologramın üzerini kapattığınızda doğrulama işlemi başarısız
                olacaktır.
              </Text>
            </Text>
          </View>

          <View style={styles.tipRow}>
            <CreditCardCheckIcon width={24} height={24} />
            <Text style={styles.tipText}>
              <Text style={styles.tipBold}>Kimlik Doğrulamasını Bekleyin: </Text>
              <Text style={styles.tipRegular}>
                Kamera açıldığında, önce kimlik kartınızı doğrulanır. Doğrulama
                tamamladıktan sonra hologram kontrolü başlayacaktır.
              </Text>
            </Text>
          </View>

          <View style={styles.tipRow}>
            <BrightnessHighIcon width={24} height={24} />
            <Text style={styles.tipText}>
              <Text style={styles.tipBold}>Parlamayı Bekleyin: </Text>
              <Text style={styles.tipRegular}>
                Telefonunuzun flaşı açıldıktan sonra cihazı sabit tutarken,
                kimlik kartınızı yavaşça yukarı ve aşağı doğru eğin.
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.buttonContainer, {paddingBottom: bottomInset}]}>
        <TouchableOpacity
          style={[styles.startButton, loading && styles.startButtonDisabled]}
          onPress={onStartScan}
          disabled={loading}>
          <Text style={styles.startButtonText}>
            {loading ? 'Yükleniyor...' : 'Hologram Kontrolüne Başla'}
          </Text>
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
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  lottieAnimation: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.35,
  },
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  descriptionText: {
    color: '#18181B',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
  tipsTitle: {
    color: '#1F1F1F',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 24,
    marginBottom: 16,
  },
  tipsContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#1F1F1F',
    letterSpacing: -0.42,
  },
  tipBold: {
    fontWeight: '700',
    color: '#1F1F1F',
  },
  tipRegular: {
    fontWeight: '400',
    color: '#18181B',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 8,
  },
  startButton: {
    backgroundColor: '#4535B0',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
});
