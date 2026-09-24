import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {startMrzCamera} from 'mrz-rn-library';
import MrzCardGuide from '../assets/mrz_card_guide.svg';
import MrzFocusFrame from '../assets/mrz_focus_frame.svg';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// Figma reference frame: 375 x 812 (3.2. MRZ Scan, node 1:6374).
// Card guide       -> left 24, top 303, w 327, h 207
// Green focus frame -> left 16, top 443, w 343, h 76
// Both are centered horizontally on the frame (center x = 187.5).
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = CARD_WIDTH * (207 / 327);
const CARD_TOP = SCREEN_HEIGHT * (303 / 812);

const FRAME_WIDTH = SCREEN_WIDTH - 32;
const FRAME_HEIGHT = FRAME_WIDTH * (76 / 343);
// Green frame sits 140px down a 207px card in Figma and overhangs the card.
const FRAME_TOP = CARD_TOP + CARD_HEIGHT * (140 / 207);

interface ScanNFCScreenProps {
  onBack: () => void;
  onMrzDetected: (
    documentNumber: string,
    dateOfBirth: string,
    dateOfExpiration: string,
  ) => void;
}

function ChevronLeftIcon() {
  return (
    <Svg width={10} height={18} viewBox="0 0 10 18" fill="none">
      <Path
        d="M9 1L1 9L9 17"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ScanNFCScreen({
  onBack,
  onMrzDetected,
}: ScanNFCScreenProps) {
  // TEMPORARY: the inline MrzCameraView has an unstable camera lifecycle
  // (intermittent / one-shot detection). Until that native wrapper is hardened,
  // scanning is driven through the SDK's reliable modal `startMrzCamera` flow.
  // The custom Figma design below is kept intact so we can switch back to the
  // inline overlay (re-add <MrzCameraView/>) once the camera lifecycle is fixed.
  const startedRef = useRef(false);
  const onMrzDetectedRef = useRef(onMrzDetected);
  const onBackRef = useRef(onBack);
  onMrzDetectedRef.current = onMrzDetected;
  onBackRef.current = onBack;

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    (async () => {
      try {
        const result = await startMrzCamera(undefined, {
          focusViewBorderColor: '#2BAC72',
          instructionText:
            'Kartınızın arkasındaki MRZ kodunu çerçevenin içine yerleştirin.',
          headerTitle: 'MRZ Alanını Tara',
          autoCaptureText: 'Otomatik Yakalama',
        });

        const documentNumber =
          result.mrzData?.documentNumber ?? result.documentNumber;
        const dateOfBirth = result.mrzData?.dateOfBirth ?? result.dateOfBirth;
        const dateOfExpiration =
          result.mrzData?.dateOfExpiration ?? result.dateOfExpiration;

        if (result.success && documentNumber && dateOfBirth && dateOfExpiration) {
          onMrzDetectedRef.current(
            documentNumber,
            dateOfBirth,
            dateOfExpiration,
          );
        } else {
          // Cancelled by the user or failed without data - go back.
          onBackRef.current();
        }
      } catch (error) {
        console.error('ScanNFCScreen - startMrzCamera error:', error);
        onBackRef.current();
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.7)" />

      {/* The SDK's modal scanner is launched on mount (see useEffect) and
          presents over this screen, so we only show a plain black backdrop
          here to avoid flashing the custom design for a moment before the
          modal appears. */}
      {/* TEMPORARILY HIDDEN: custom Figma design flashes before startMrzCamera.
          Re-enable when switching back to the inline overlay.
      <View style={styles.dimOverlay} pointerEvents="none" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ChevronLeftIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MRZ Alanını Tara</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={styles.instructionText}>
        Kartınızın arkasındaki MRZ kodunu{'\n'}çerçevenin içine yerleştirin.
      </Text>

      <View style={styles.cardWrap} pointerEvents="none">
        <MrzCardGuide width={CARD_WIDTH} height={CARD_HEIGHT} />
      </View>

      <View style={styles.frameWrap} pointerEvents="none">
        <MrzFocusFrame width={FRAME_WIDTH} height={FRAME_HEIGHT} />
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.captureButton} pointerEvents="none">
          <Text style={styles.captureButtonText}>Otomatik Yakalama</Text>
        </View>
      </View>
      */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 12,
    height: 100,
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
  instructionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    alignSelf: 'center',
    width: 343,
    marginTop: 16,
  },
  cardWrap: {
    position: 'absolute',
    top: CARD_TOP,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  frameWrap: {
    position: 'absolute',
    top: FRAME_TOP,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 36,
    left: 16,
    right: 16,
  },
  captureButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
});
