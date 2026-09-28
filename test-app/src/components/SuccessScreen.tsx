import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Svg, {Path, Circle} from 'react-native-svg';
import {useBottomInset} from '../hooks/useBottomInset';

interface SuccessScreenProps {
  onHome: () => void;
  headerTitle?: string;
  title?: string;
  subtitle?: React.ReactNode;
  buttonLabel?: string;
}

function SuccessIcon() {
  return (
    <Svg width={74} height={74} viewBox="0 0 74 74" fill="none">
      <Circle cx={37} cy={37} r={37} fill="#DBF7EA" />
      <Circle cx={37} cy={37} r={29} fill="#2BAC72" />
      <Path
        d="M24.4653 40.586L32.1791 47.851L51.5224 29.0212"
        stroke="white"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function SuccessScreen({
  onHome,
  headerTitle = 'Onay Ekranı',
  title = 'Tebrikler',
  subtitle,
  buttonLabel = 'Ana Ekrana Dön',
}: SuccessScreenProps) {
  const bottomInset = useBottomInset();
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
      </View>

      <View style={styles.content}>
        <SuccessIcon />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {subtitle ?? (
            <>
              Bu aşamadan sonra{' '}
              <Text style={styles.subtitleBold}>
                veri güvenliğiniz açısından
              </Text>{' '}
              bilgilerinizi 3. kişilerle paylaşmamanızı tavsiye ederiz.
            </>
          )}
        </Text>
      </View>

      <View style={[styles.buttonContainer, {paddingBottom: bottomInset}]}>
        <TouchableOpacity style={styles.homeButton} onPress={onHome}>
          <Text style={styles.homeButtonText}>{buttonLabel}</Text>
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
    justifyContent: 'center',
    paddingTop: 56,
    paddingHorizontal: 12,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  headerTitle: {
    color: '#4535B0',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
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
  subtitleBold: {
    fontWeight: '700',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 8,
  },
  homeButton: {
    backgroundColor: '#4535B0',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
});
