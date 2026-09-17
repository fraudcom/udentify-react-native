import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Modal,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import LottieView from 'lottie-react-native';
import {useBottomInset} from '../hooks/useBottomInset';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface KYCMethod {
  value: string;
  label: string;
}

// Finding 4.a: the demo offers these composed KYC flows.
const KYC_METHODS: KYCMethod[] = [
  {value: 'ekyc_turkey', label: 'eKYC (Türkiye)'},
  {value: 'nfc', label: 'NFC Kimlik Doğrulama'},
  {value: 'ocr_auth', label: 'OCR Kimlik Doğrulama'},
  {value: 'ocr_nfc', label: 'NFC ve OCR ile Kimlik Doğrulama'},
  {value: 'video_call', label: 'Görüntülü Görüşme'},
  {value: 'face_registration', label: 'Yüz Kayıt'},
  {value: 'u18', label: '18 Yaş Altı Doğrulama (U18)'},
];

interface SelectKYCMethodScreenProps {
  onBack: () => void;
  onStart: (method: string) => void;
}

function ChevronLeftIcon() {
  return (
    <Svg width={12} height={20} viewBox="0 0 12 20" fill="none">
      <Path
        d="M10 18L2 10L10 2"
        stroke="white"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronDownIcon() {
  return (
    <Svg width={14} height={8} viewBox="0 0 14 8" fill="none">
      <Path
        d="M1 1L7 7L13 1"
        stroke="#4C556C"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function SelectKYCMethodScreen({
  onBack,
  onStart,
}: SelectKYCMethodScreenProps) {
  const bottomInset = useBottomInset();
  const [selectedMethod, setSelectedMethod] = useState('ekyc_turkey');
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = KYC_METHODS.find(m => m.value === selectedMethod);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4535B0" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ChevronLeftIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giriş Ekranına Dön</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.animationContainer}>
          <LottieView
            source={require('../assets/Onboarding - KYC Method.json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
        </View>

        <Text style={styles.description}>
          Kimlik doğrulama işlemini başlatmak için tercih ettiğiniz yöntemi seçin.
        </Text>
      </View>

      <View style={[styles.bottomSection, {paddingBottom: bottomInset}]}>
        <TouchableOpacity
          style={styles.pickerContainer}
          activeOpacity={0.7}
          onPress={() => setModalVisible(true)}>
          <Text style={styles.pickerLabel}>Giriş Yöntemi Seçiniz</Text>
          <View style={styles.picker}>
            <Text style={styles.pickerValue}>
              {selectedOption?.label ?? ''}
            </Text>
            <ChevronDownIcon />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => onStart(selectedMethod)}>
          <Text style={styles.startButtonText}>Başla</Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}>
          <View style={[styles.modalContent, {paddingBottom: bottomInset}]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Giriş Yöntemi Seçiniz</Text>
            {KYC_METHODS.map(item => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.modalItem,
                  item.value === selectedMethod && styles.modalItemSelected,
                ]}
                onPress={() => {
                  setSelectedMethod(item.value);
                  setModalVisible(false);
                }}>
                <View style={styles.modalRadio}>
                  {item.value === selectedMethod && (
                    <View style={styles.modalRadioInner} />
                  )}
                </View>
                <Text
                  style={[
                    styles.modalItemText,
                    item.value === selectedMethod &&
                      styles.modalItemTextSelected,
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4535B0',
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
    marginRight: 32,
    lineHeight: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  lottieAnimation: {
    width: SCREEN_WIDTH * 0.77,
    height: SCREEN_WIDTH * 0.77,
  },
  description: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    width: 283,
    marginTop: 16,
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    gap: 8,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 66,
    justifyContent: 'center',
  },
  pickerLabel: {
    color: '#4C556C',
    fontSize: 12,
    fontWeight: '400',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  pickerValue: {
    color: '#4535B0',
    fontSize: 14,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#FFFFFF',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  startButtonText: {
    color: '#4535B0',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  modalItemSelected: {
    backgroundColor: '#F0EDFF',
  },
  modalRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4535B0',
  },
  modalItemText: {
    fontSize: 15,
    color: '#4B5563',
  },
  modalItemTextSelected: {
    color: '#4535B0',
    fontWeight: '600',
  },
});
