import React, {useCallback, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Linking,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import ScanQrFrame from '../assets/scan_qr_frame.svg';

interface ScanQRScreenProps {
  // Called once with the decoded QR value (the transaction ID).
  onScanned: (value: string) => void;
  // Called when the user backs out without scanning.
  onCancel: () => void;
}

function ChevronLeftIcon() {
  return (
    <Svg width={9} height={16} viewBox="0 0 9 16" fill="none">
      <Path
        d="M8 1L1 8L8 15"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ScanQRScreen({onScanned, onCancel}: ScanQRScreenProps) {
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');
  // Guard so the scanner reports the QR only once even though
  // onCodeScanned can fire continuously while the code stays in frame.
  const handledRef = useRef(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().catch(err => {
        console.error('ScanQR - requestPermission error:', err);
      });
    }
  }, [hasPermission, requestPermission]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (handledRef.current) {
        return;
      }
      const value = codes[0]?.value?.trim();
      if (value) {
        handledRef.current = true;
        console.log('ScanQR - QR scanned, transaction ID length:', value.length);
        onScanned(value);
      }
    },
  });

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {hasPermission && device ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          codeScanner={codeScanner}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Text style={styles.fallbackText}>
            {device == null
              ? 'Kamera bulunamadi.'
              : 'Kamera izni gerekli. QR okutmak icin izin verin.'}
          </Text>
          {!hasPermission && (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={() => Linking.openSettings()}>
              <Text style={styles.permissionButtonText}>Ayarlari Ac</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Dark layer over the camera (Figma: rgba(0,0,0,0.7)) */}
      <View style={styles.darkLayer} pointerEvents="none" />

      {/* Scan frame (Figma node 202:2238) centered */}
      <View style={styles.frameWrapper} pointerEvents="none">
        <ScanQrFrame width={FRAME_SIZE} height={FRAME_SIZE} />
      </View>

      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancel}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <ChevronLeftIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QR Kodu Okutun</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>
    </View>
  );
}

// Figma frame is 274.544 x 274.595 (node 202:2238).
const FRAME_SIZE = 275;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#1A1A1A',
  },
  fallbackText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: '#4535B0',
    paddingHorizontal: 24,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  darkLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  frameWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 12,
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  headerSpacer: {
    width: 32,
  },
});
