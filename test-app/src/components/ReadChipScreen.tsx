import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import LottieView from 'lottie-react-native';
import {useBottomInset} from '../hooks/useBottomInset';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface ReadChipScreenProps {
  onBack: () => void;
  onRetry: () => void;
  nfcStatus: 'idle' | 'reading' | 'success' | 'error';
  nfcStatusMessage?: string;
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

export default function ReadChipScreen({
  onBack,
  onRetry,
  nfcStatus,
  nfcStatusMessage,
}: ReadChipScreenProps) {
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
        <Text style={styles.headerTitle}>Çipi Okut</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.descriptionText}>
          Çipi okuması için telefonunuzu{'\n'}kimlik kartınıza dokundurun.
        </Text>

        <View style={styles.animationContainer}>
          <LottieView
            source={require('../assets/read_chip.json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
        </View>

        {nfcStatusMessage ? (
          <View style={styles.statusContainer}>
            <Text style={[
              styles.statusText,
              nfcStatus === 'success' && styles.statusSuccess,
              nfcStatus === 'error' && styles.statusError,
            ]}>
              {nfcStatusMessage}
            </Text>
          </View>
        ) : null}
      </View>

      {nfcStatus === 'error' && (
        <View style={[styles.buttonContainer, {paddingBottom: bottomInset}]}>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )}
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
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  descriptionText: {
    color: '#0E0E0E',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 24,
  },
  animationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieAnimation: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
  },
  statusContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  statusText: {
    color: '#18181B',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  statusSuccess: {
    color: '#28a745',
  },
  statusError: {
    color: '#dc3545',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 8,
  },
  retryButton: {
    backgroundColor: '#4535B0',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
});
