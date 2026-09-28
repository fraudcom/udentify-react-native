import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {useBottomInset} from '../hooks/useBottomInset';

// Placeholder intro screen for the Hybrid liveness flow. Content (illustration,
// tips, copy) is intentionally empty for now and will be designed later.
interface HybridLivenessIntroScreenProps {
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

export default function HybridLivenessIntroScreen({
  onBack,
  onOpenCamera,
  loading = false,
}: HybridLivenessIntroScreenProps) {
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
        <Text style={styles.headerTitle}>Hibrit Canlılık</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content} />

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
  content: {flex: 1},
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
