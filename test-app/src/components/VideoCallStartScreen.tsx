import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Svg, {Path, Circle} from 'react-native-svg';
import LottieView from 'lottie-react-native';
import StopwatchIcon from '../assets/stopwatch.svg';
import {useBottomInset} from '../hooks/useBottomInset';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface VideoCallStartScreenProps {
  onBack: () => void;
  onStartCall: () => void;
  onTestSuccess?: () => void;
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

// Figma: wifi-check 1 (mynaui) - exact SVG from Figma export, 24x24 viewBox
function WifiCheckIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 9.483C4.69881 6.92144 8.27909 5.49541 12 5.5M15 6.322L16.379 7.898C16.4087 7.93141 16.4456 7.95775 16.4868 7.97509C16.528 7.99243 16.5726 8.00033 16.6173 7.99822C16.6619 7.99611 16.7056 7.98404 16.745 7.9629C16.7844 7.94175 16.8185 7.91206 16.845 7.876L19.645 4M19 12.9C15.134 9.033 8.866 9.033 5 12.9M16 16.157C14.9391 15.0962 13.5003 14.5002 12 14.5002C10.4997 14.5002 9.06088 15.0962 8 16.157M12 19.25V18.75"
        stroke="#4535B0"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Figma: credit-card-check (mynaui) - composed from Figma vector exports
function CreditCardCheckIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {/* Card body */}
      <Path
        d="M21 11.25V16.0536C21 17.1715 21 17.7305 20.7822 18.1579C20.5905 18.5342 20.2837 18.8405 19.9074 19.0322C19.48 19.25 18.921 19.25 17.8031 19.25H6.19691C5.07899 19.25 4.5192 19.25 4.0918 19.0322C3.71547 18.8405 3.40973 18.5342 3.21799 18.1579C3 17.7301 3 17.1703 3 16.0502V9.25V8.4502C3 7.33009 3 6.76962 3.21799 6.3418C3.40973 5.96547 3.71547 5.65973 3.93181 5.46799C4.35962 5.25 4.92009 5.25 6.0402 5.25H12.5"
        stroke="#4535B0"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Card detail lines */}
      <Path
        d="M14.5 13.05H18.5"
        stroke="#4535B0"
        strokeWidth={1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14.5 15.05H18.5"
        stroke="#4535B0"
        strokeWidth={1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Person body arc */}
      <Path
        d="M12.55 15.35C12.36 11.617 6.74 11.617 6.55 15.35"
        stroke="#4535B0"
        strokeWidth={1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Person head */}
      <Circle
        cx={9.55}
        cy={9.93}
        r={1.2}
        fill="#4535B0"
        stroke="#4535B0"
        strokeWidth={1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Checkmark */}
      <Path
        d="M16.75 8.07L18.234 9.648C18.3701 9.79255 18.6155 9.7819 18.7365 9.62626L21.75 5.75"
        stroke="#4535B0"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function VideoCallStartScreen({
  onBack,
  onStartCall,
  onTestSuccess,
  loading = false,
}: VideoCallStartScreenProps) {
  const bottomInset = useBottomInset();
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header - Figma: y=44, h=56, backdrop-blur */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ChevronLeftIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Görüşmeye Hazırlan</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Lottie Animation - replaces Figma illustration */}
        <View style={styles.animationContainer}>
          <LottieView
            source={require('../assets/Video Call.json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
        </View>

        {/* Description - Figma: Inter Medium 18px, #0E0E0E, centered, tracking -0.36 */}
        <Text style={styles.descriptionText}>
          Kimlik doğrulama işleminiz için operatörle{'\n'}bir video görüşme
          yapacaksınız.
        </Text>

        {/* Time Estimation Card - Figma: bg #F3F0FE, rounded 10, h=76 */}
        <View style={styles.timeCard}>
          <View style={styles.timeIconContainer}>
            <StopwatchIcon width={41} height={48} />
          </View>
          <View style={styles.timeTextContainer}>
            <Text style={styles.timeTitle}>Tahmini Süre</Text>
            <Text style={styles.timeSubtitle}>
              Tahmini bekleme süresi: 2-5 dakika.
            </Text>
          </View>
        </View>

        {/* Tips Section - Figma: Inter SemiBold 16px, #1F1F1F */}
        <Text style={styles.sectionTitle}>Faydalı İpuçları</Text>

        {/* Tip 1 - wifi-check icon */}
        <View style={styles.tipItem}>
          <View style={styles.tipIconContainer}>
            <WifiCheckIcon />
          </View>
          <Text style={styles.tipText}>
            <Text style={styles.tipBold}>İnternet Bağlantı Hızı: </Text>
            Görüşme sırasında aksaklık yaşanmaması için internet bağlantınızı
            kontrol edin.
          </Text>
        </View>

        {/* Tip 2 - credit-card-check icon */}
        <View style={styles.tipItem}>
          <View style={styles.tipIconContainer}>
            <CreditCardCheckIcon />
          </View>
          <Text style={styles.tipText}>
            <Text style={styles.tipBold}>Fiziki Kimlik Gerekli: </Text>
            Orijinal, fiziksel kimlik kartınızı kullanın (ekran görüntüsü,
            fotokopi vb. kullanmayın).
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Button - Figma: bg #4535B0, h=48, rounded 8, w=343 */}
      <View style={[styles.buttonContainer, {paddingBottom: bottomInset}]}>
        <TouchableOpacity
          style={[styles.startButton, loading && styles.startButtonDisabled]}
          onPress={onStartCall}
          disabled={loading}>
          {loading ? (
            <View style={styles.buttonRow}>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
                style={styles.spinner}
              />
              <Text style={styles.startButtonText}>Bağlanıyor...</Text>
            </View>
          ) : (
            <Text style={styles.startButtonText}>Video Görüşmeye Başla</Text>
          )}
        </TouchableOpacity>
        {onTestSuccess && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={onTestSuccess}>
            <Text style={styles.testButtonText}>Test: Onay Ekranını Aç</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Header: Figma y=44 h=56, backdrop-blur 12px, bg white 75%
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
  // Figma: Inter Bold 16px, #4535B0, centered
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
  // Lottie animation area - replaces Figma illustration (198x130)
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    height: SCREEN_WIDTH * 0.45,
  },
  lottieAnimation: {
    width: SCREEN_WIDTH * 0.55,
    height: SCREEN_WIDTH * 0.55,
  },
  // Figma: Inter Medium 18px, #0E0E0E, centered, letter-spacing -0.36
  descriptionText: {
    color: '#0E0E0E',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: -0.36,
    paddingHorizontal: 16,
    marginTop: 32,
    marginBottom: 24,
  },
  // Figma: bg #F3F0FE, rounded 10, x=24 w=327 h=76
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F0FE',
    borderRadius: 10,
    marginHorizontal: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    height: 76,
    gap: 12,
    marginBottom: 24,
  },
  timeIconContainer: {
    width: 41,
    height: 47,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeTextContainer: {
    flex: 1,
  },
  // Figma: Inter SemiBold 16px, #1F1F1F
  timeTitle: {
    color: '#1F1F1F',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 19,
    marginBottom: 4,
  },
  // Figma: Inter Regular 14px, #18181B
  timeSubtitle: {
    color: '#18181B',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 13,
  },
  // Figma: Inter SemiBold 16px, #1F1F1F, x=24
  sectionTitle: {
    color: '#1F1F1F',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 19,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  // Figma: gap 12 between icon and text, gap 16 between items
  tipItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
    marginHorizontal: 24,
  },
  tipIconContainer: {
    width: 24,
    height: 24,
  },
  // Figma: Inter 14px, #18181B, tracking -0.16, leading 20
  tipText: {
    flex: 1,
    color: '#18181B',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: -0.16,
  },
  // Figma: Inter Bold 14px, #1F1F1F
  tipBold: {
    fontWeight: '700',
    color: '#1F1F1F',
  },
  // Figma: bottom 36px from screen bottom, px 16
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 8,
  },
  // Figma: bg #4535B0, h=48, rounded 8, w=343
  startButton: {
    backgroundColor: '#4535B0',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  startButtonDisabled: {
    backgroundColor: '#A89ED4',
  },
  // Figma: Inter Bold 14px, white, centered, leading 20
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  testButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4535B0',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  testButtonText: {
    color: '#4535B0',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
});
