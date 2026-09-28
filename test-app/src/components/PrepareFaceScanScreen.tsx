import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import NoAccessoriesIcon from '../assets/tip-no-accessories.svg';
import LightIcon from '../assets/tip-light.svg';
import FaceTemplateIcon from '../assets/tip-face-template.svg';
import {useBottomInset} from '../hooks/useBottomInset';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface PrepareFaceScanScreenProps {
  onBack: () => void;
  onOpenCamera: () => void;
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

export default function PrepareFaceScanScreen({
  onBack,
  onOpenCamera,
  loading = false,
}: PrepareFaceScanScreenProps) {
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
        <Text style={styles.headerTitle}>Yüz Tanıma</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Design 9.1 (finding 3.g): do/don't avatar guide with YAP / YAPMA */}
        <View style={styles.animationContainer}>
          <Image
            source={require('../assets/face-prepare-guide.png')}
            style={styles.guideImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.tipsTitle}>Faydalı İpuçları</Text>

        <View style={styles.tipsContainer}>
          <View style={styles.tipRow}>
            <NoAccessoriesIcon width={24} height={24} />
            <Text style={styles.tipText}>
              <Text style={styles.tipBold}>Aksesuarları Çıkarın: </Text>
              <Text style={styles.tipRegular}>
                Net bir görünüm için güneş gözlüğü, şapka veya maskenizi çıkarın.
              </Text>
            </Text>
          </View>

          <View style={styles.tipRow}>
            <LightIcon width={24} height={24} />
            <Text style={styles.tipText}>
              <Text style={styles.tipBold}>Işık Yönünü Ayarlayın: </Text>
              <Text style={styles.tipRegular}>
                Işık kaynağının (doğal veya yapay) yüzünüzü eşit şekilde
                aydınlattığından emin olun. Görüntü kalitesini düşürecek yoğun
                gölgeleri veya arka plandan gelen aşırı parlak ışığı (ters
                ışık/silüet etkisi) engelleyiniz.
              </Text>
            </Text>
          </View>

          <View style={styles.tipRow}>
            <FaceTemplateIcon width={24} height={24} />
            <Text style={styles.tipText}>
              <Text style={styles.tipBold}>
                Yüzü Telefon Ekranına Konumlandırma:{' '}
              </Text>
              <Text style={styles.tipRegular}>
                Telefonunuzu göz hizasında tutun ve yüzünüzü ekranda gösterilen
                şablonun içine yerleştirin.
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.buttonContainer, {paddingBottom: bottomInset}]}>
        <TouchableOpacity
          style={[styles.startButton, loading && styles.startButtonDisabled]}
          onPress={onOpenCamera}
          disabled={loading}>
          <Text style={styles.startButtonText}>
            {loading ? 'Yükleniyor...' : 'Kamerayı Aç'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
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
  headerSpacer: {width: 32},
  scrollView: {flex: 1},
  scrollContent: {paddingBottom: 16},
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  guideImage: {
    width: SCREEN_WIDTH - 68,
    height: (SCREEN_WIDTH - 68) * (184 / 307),
  },
  tipsTitle: {
    color: '#1F1F1F',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 24,
    marginTop: 24,
    marginBottom: 16,
  },
  tipsContainer: {paddingHorizontal: 24, gap: 16},
  tipRow: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
  tipText: {flex: 1, fontSize: 14, lineHeight: 20, color: '#1F1F1F'},
  tipBold: {fontWeight: '700', color: '#1F1F1F'},
  tipRegular: {fontWeight: '400', color: '#18181B'},
  buttonContainer: {paddingHorizontal: 16, paddingBottom: 36, paddingTop: 8},
  startButton: {
    backgroundColor: '#4535B0',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  startButtonDisabled: {opacity: 0.6},
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
});
