import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import ErrorIcon from '../assets/ic_alert_error.svg';
import {useBottomInset} from '../hooks/useBottomInset';

interface ErrorScreenProps {
  onRetry: () => void;
  onBack?: () => void;
  headerTitle?: string;
  title?: string;
  subtitle?: string;
  errorDetail?: string;
  buttonLabel?: string;
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

export default function ErrorScreen({
  onRetry,
  onBack,
  headerTitle = 'Kimliğini Tara',
  title = 'Tarama Başarısız',
  subtitle = 'Kimlik tarama işlemi tamamlanamamıştır.',
  errorDetail,
  buttonLabel = 'Tekrar Dene',
}: ErrorScreenProps) {
  const bottomInset = useBottomInset();
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <ChevronLeftIcon />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <ErrorIcon width={74} height={74} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {errorDetail ? (
          <Text style={styles.errorDetail}>{errorDetail}</Text>
        ) : null}
      </View>

      <View style={[styles.buttonContainer, {paddingBottom: bottomInset}]}>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>{buttonLabel}</Text>
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
    justifyContent: 'space-between',
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
  },
  headerTitle: {
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
  subtitle: {
    color: '#18181B',
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 23,
    letterSpacing: 0.1,
    marginTop: 8,
  },
  errorDetail: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 12,
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
