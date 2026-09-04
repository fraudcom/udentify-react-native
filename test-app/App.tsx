import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
  Alert,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';

import { udentifyApiService } from './src/services/udentifyApiService';
import { currentConfig } from './src/config/apiConfig';
import { OCR_MODULES } from './src/constants/ocrConstants';
import { fetchTransactionProperties, resetTransactionProperties } from 'udentify-core';

// Import components
import GetStartedScreen from './src/components/GetStartedScreen';
import SelectKYCMethodScreen from './src/components/SelectKYCMethodScreen';
import ScanOCRScreen from './src/components/ScanOCRScreen';
import ScanNFCScreen from './src/components/ScanNFCScreen';
import ReadChipScreen from './src/components/ReadChipScreen';
import TabNavigator from './src/components/TabNavigator';
import OCRTab from './src/components/OCRTab';
import NFCTab from './src/components/NFCTab';
import LivenessTab from './src/components/LivenessTab';
import MRZTab from './src/components/MRZTab';
import VideoCallTab from './src/components/VideoCallTab';
import VideoCallStartScreen from './src/components/VideoCallStartScreen';
import VideoCallQueueScreen from './src/components/VideoCallQueueScreen';
import VideoCallSuccessScreen from './src/components/VideoCallSuccessScreen';
import SSLPinningTab from './src/components/SSLPinningTab';
import RemoteLanguagePackTest from './src/components/RemoteLanguagePackTest';
import PlaceholderTab from './src/components/PlaceholderTab';
import SettingsScreen from './src/components/SettingsScreen';
import APISettingsScreen from './src/components/APISettingsScreen';
import NFCSettingsScreen from './src/components/NFCSettingsScreen';
import FaceSettingsScreen from './src/components/FaceSettingsScreen';
import OCRSettingsScreen from './src/components/OCRSettingsScreen';
import LanguageSettingsScreen from './src/components/LanguageSettingsScreen';
import ScanQRScreen from './src/components/ScanQRScreen';
import ResultScreen from './src/components/ResultScreen';
import ScanHologramScreen from './src/components/ScanHologramScreen';
import ErrorScreen from './src/components/ErrorScreen';
import ConfirmMrzScreen from './src/components/ConfirmMrzScreen';
import HologramResultScreen from './src/components/HologramResultScreen';
import SuccessScreen from './src/components/SuccessScreen';
import PrepareFaceScanScreen from './src/components/PrepareFaceScanScreen';
import ActiveLivenessIntroScreen from './src/components/ActiveLivenessIntroScreen';
import {useLiveness} from './src/hooks/useLiveness';
import {SettingsProvider, useSettings} from './src/config/SettingsContext';

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

// OCR TurboModule initialization
const isTurboModuleEnabled = (global as any).__turboModuleProxy != null;
let OCRModule: any;
if (isTurboModuleEnabled) {
  try {
    const {TurboModuleRegistry} = require('react-native');
    OCRModule = TurboModuleRegistry.getEnforcing('OCRModule');
  } catch (error) {
    console.error('TurboModule failed, falling back to Legacy:', error);
    OCRModule = NativeModules.OCRModule;
  }
} else {
  OCRModule = NativeModules.OCRModule;
}

// NFC TurboModule initialization
let NFCModule: any;
if (isTurboModuleEnabled) {
  try {
    const {TurboModuleRegistry} = require('react-native');
    NFCModule = TurboModuleRegistry.getEnforcing('NFCModule');
  } catch (error) {
    console.error('TurboModule failed, falling back to Legacy:', error);
    NFCModule = NativeModules.NFCModule;
  }
} else {
  NFCModule = NativeModules.NFCModule;
}

const startNFCReading = async (credentials: any) => {
  if (!NFCModule) throw new Error('NFCModule not available');
  return await NFCModule.startNFCReading(credentials);
};

// VideoCall TurboModule initialization
let VideoCallModule: any;
if (isTurboModuleEnabled) {
  try {
    const {TurboModuleRegistry} = require('react-native');
    VideoCallModule = TurboModuleRegistry.getEnforcing('VideoCallModule');
  } catch (error) {
    console.error('TurboModule failed, falling back to Legacy:', error);
    VideoCallModule = NativeModules.VideoCallModule;
  }
} else {
  VideoCallModule = NativeModules.VideoCallModule;
}

// Finding 4.a: composed KYC flows. Each method is a step sequence that runs
// against ONE shared transaction (so the server can match face vs document).
type FlowStep = 'ocr' | 'nfc' | 'face' | 'videocall';

const KYC_FLOW_STEPS: Record<string, FlowStep[]> = {
  ekyc_turkey: ['ocr', 'nfc', 'face', 'videocall'],
  nfc: ['nfc', 'face'],
  ocr_auth: ['ocr', 'face'],
  ocr_nfc: ['ocr', 'nfc', 'face'],
};

const FACE_FLOW_MODULES = [
  'FACE_REGISTRATION',
  'FACE_AUTHENTICATION',
  'FACE_LIVENESS',
  'ACTIVE_LIVENESS',
];

// Create placeholder components for future tabs
const BiometricTab = () => (
  <PlaceholderTab
    title="Biometric"
    description="Face recognition and biometric verification will be available here."
  />
);


function App(): React.JSX.Element {
  // Navigation state
  const [screen, setScreen] = useState<'getStarted' | 'selectKYC' | 'scanOCR' | 'scanNFC' | 'confirmMrz' | 'readChip' | 'ocrProcessing' | 'result' | 'scanError' | 'scanHologram' | 'hologramResult' | 'success' | 'settings' | 'apiSettings' | 'nfcSettings' | 'faceSettings' | 'ocrSettings' | 'languageSettings' | 'videoCallStart' | 'videoCallQueue' | 'videoCallSuccess' | 'faceRegLoading' | 'scanQR' | 'main' | 'prepareFaceScan' | 'activeLivenessIntro' | 'livenessSuccess'>('getStarted');
  const {settings} = useSettings();
  const [isScanning, setIsScanning] = useState(false);
  const [pendingOcrTransactionID, setPendingOcrTransactionID] = useState<string>('');
  const [ocrConfirmData, setOcrConfirmData] = useState<Record<string, any>>({});
  // Document liveness result for the Result screen (only set when the OCR
  // settings "Document Liveness" toggle is on).
  const [ocrLivenessResult, setOcrLivenessResult] = useState<{
    success?: boolean;
    frontSideProbability?: number;
    backSideProbability?: number;
  } | null>(null);
  // Transaction ID of the current OCR flow, reused for the hologram step.
  const [ocrFlowTransactionID, setOcrFlowTransactionID] = useState<string>('');
  const [scanErrorDetail, setScanErrorDetail] = useState<string>('');
  const [hologramSuccess, setHologramSuccess] = useState<boolean>(true);
  const [hologramDetail, setHologramDetail] = useState<{
    hologramExists?: boolean;
    ocrIdAndHologramIdMatch?: boolean;
    ocrFaceAndHologramFaceMatch?: boolean;
  }>({});
  const [isHologramStarting, setIsHologramStarting] = useState<boolean>(false);
  const [kycFlowActive, setKycFlowActive] = useState(false);
  // U18 flow (26.1.2): a dedicated KYC method, not a setting. IQA+OCR only.
  const [u18FlowActive, setU18FlowActive] = useState(false);

  // QR Code Activation flow state. When the toggle is on, selecting any KYC
  // method first opens the QR scan screen; the scanned value is reused as the
  // transaction ID for that flow (no /transaction/start call).
  const qrTransactionIDRef = useRef<string>('');
  const pendingQRMethodRef = useRef<string | null>(null);

  // Composed KYC flow state (finding 4.a). flowSteps is null when no composed
  // flow is running; the refs avoid stale closures in async step handlers.
  const [flowSteps, setFlowSteps] = useState<FlowStep[] | null>(null);
  const flowStepIndexRef = useRef(0);
  const flowTransactionIDRef = useRef('');

  // Builds the transaction moduleList for a composed flow (finding 4.a).
  function buildFlowModules(method: string): string[] {
    const steps = KYC_FLOW_STEPS[method] ?? [];
    const modules: string[] = [];
    if (steps.includes('ocr')) {
      modules.push(OCR_MODULES.OCR);
      if (settings.ocrEnableHologramCheck) {
        modules.push(OCR_MODULES.OCR_HOLOGRAM);
      }
    }
    if (steps.includes('nfc')) {
      modules.push('NFC');
    }
    if (steps.includes('face')) {
      modules.push(...FACE_FLOW_MODULES);
    }
    if (steps.includes('videocall')) {
      modules.push('VIDEO_CALL');
    }
    return modules;
  }

  // Starts a composed flow: one transaction for all steps, then the first step.
  async function startKycMethodFlow(method: string) {
    const steps = KYC_FLOW_STEPS[method];
    if (!steps) return;
    try {
      setScreen('faceRegLoading');
      // VIDEO_CALL transactions additionally require transactionSource and
      // channelId (same fields the standalone video call start sends).
      const includesVideoCall = steps.includes('videocall');
      const transactionID = await acquireTransactionID(() =>
        udentifyApiService.startTransaction(
          buildFlowModules(method),
          includesVideoCall
            ? {
                transactionSource: 1,
                channelId: parseInt(settings.channelId, 10) || 152,
              }
            : undefined,
        ),
      );
      console.log('App - Composed flow started:', method, steps, transactionID);
      flowTransactionIDRef.current = transactionID;
      flowStepIndexRef.current = 0;
      setFlowSteps(steps);
      enterFlowStep(steps[0]);
    } catch (error) {
      console.error('App - Composed flow start error:', error);
      setScanErrorDetail(`${error}`);
      setScreen('scanError');
    }
  }

  async function enterFlowStep(step: FlowStep) {
    if (step === 'ocr') {
      setScreen('scanOCR');
    } else if (step === 'nfc') {
      setNfcStatus('idle');
      setNfcStatusMessage('');
      // Clear out any document-liveness badge from a preceding OCR step so
      // the Result screen shown after this step doesn't display a stale
      // result the NFC step itself never computed.
      setOcrLivenessResult(null);
      // Unlike the OCR and face-registration entry points, this flow (e.g.
      // the standalone "nfc" composed flow, which is just ['nfc', 'face'])
      // never otherwise asks for camera/phone-state permission before the
      // MRZ camera scan or the native liveness call that follows it.
      await requestPermissions();
      setScreen('scanNFC');
    } else if (step === 'face') {
      // Face screens read the transaction from faceRegistrationTransactionID.
      setFaceRegistrationTransactionID(flowTransactionIDRef.current);
      setScreen('prepareFaceScan');
    } else {
      setScreen('videoCallStart');
    }
  }

  // Advances the composed flow. Returns false when no composed flow is active
  // so callers can fall back to their standalone behavior.
  function advanceFlowIfActive(): boolean {
    if (!flowSteps) return false;
    const nextIndex = flowStepIndexRef.current + 1;
    if (nextIndex < flowSteps.length) {
      flowStepIndexRef.current = nextIndex;
      enterFlowStep(flowSteps[nextIndex]);
    } else {
      resetFlow();
      setScreen('success');
    }
    return true;
  }

  function resetFlow() {
    setFlowSteps(null);
    flowStepIndexRef.current = 0;
    flowTransactionIDRef.current = '';
  }

  // Navigate to a KYC method's start screen (the normal, non-QR routing).
  function navigateToMethod(method: string) {
    setU18FlowActive(method === 'u18');
    if (KYC_FLOW_STEPS[method]) {
      startKycMethodFlow(method);
    } else if (method === 'video_call') {
      setScreen('videoCallStart');
    } else if (method === 'face_registration') {
      setKycFlowActive(true);
      setFaceRegistrationTransactionID('');
      setScreen('scanOCR');
    } else {
      setScreen('scanOCR');
    }
  }

  // Entry point from the KYC method picker. With QR Code Activation on, show the
  // QR scan screen first and continue to the method once a code is scanned.
  function startMethod(method: string) {
    if (settings.qrCodeActivation) {
      pendingQRMethodRef.current = method;
      setScreen('scanQR');
    } else {
      navigateToMethod(method);
    }
  }

  // QR scanned: store the value as the transaction ID and continue into the
  // selected method's start screen.
  function handleQRScanned(value: string) {
    qrTransactionIDRef.current = value;
    const method = pendingQRMethodRef.current;
    pendingQRMethodRef.current = null;
    navigateToMethod(method ?? 'ocr');
  }

  // QR scan cancelled (back button): abort and return to the method picker.
  function handleQRCancel() {
    pendingQRMethodRef.current = null;
    qrTransactionIDRef.current = '';
    setScreen('selectKYC');
  }

  // Acquire a transaction ID for a flow. With QR Code Activation on, reuse the
  // value scanned at method selection; otherwise run the flow's normal behavior.
  function acquireTransactionID(fallback: () => Promise<string>): Promise<string> {
    // A composed flow (finding 4.a) shares ONE transaction across all steps.
    if (flowTransactionIDRef.current) {
      return Promise.resolve(flowTransactionIDRef.current);
    }
    if (settings.qrCodeActivation && qrTransactionIDRef.current) {
      return Promise.resolve(qrTransactionIDRef.current);
    }
    return fallback();
  }

  // Face registration flow state
  const [faceRegistrationTransactionID, setFaceRegistrationTransactionID] = useState<string>('');
  const [faceRegistrationLoading, setFaceRegistrationLoading] = useState(false);
  const [livenessLoading, setLivenessLoading] = useState(false);
  // Tracks which of the two sequential native sessions is running so the shared
  // success handler routes correctly: faceCapture -> liveness intro, liveness -> success.
  const livenessPhaseRef = useRef<'faceCapture' | 'liveness'>('faceCapture');
  // Both sessions must act on the SAME user: session 1 registers the face
  // photo under this ID, session 2 proves liveness for it (finding 3.b).
  const faceRegUserIDRef = useRef<string>('');

  const {launch: launchLivenessNative, applyUiSettings: applyFaceUiSettings} =
    useLiveness({
    onSuccess: (result: any) => {
      setLivenessLoading(false);
      // The event fires as a "result", not a "failure", even when the SDK
      // itself reports success:false (e.g. a completed-but-unverified
      // session) - check the payload rather than treating any result event
      // as an automatic green light.
      if (result?.faceIDMessage?.success === false) {
        console.error('App - liveness result reported failure:', result);
        Alert.alert(
          'Hata',
          'Yüz tanıma işlemi başarısız oldu. Lütfen tekrar deneyin.',
        );
        return;
      }
      if (livenessPhaseRef.current === 'faceCapture') {
        if (
          settings.faceLivenessMode === 'passive' ||
          settings.faceLivenessMode === 'hybrid'
        ) {
          // Passive and hybrid are single-session (hybrid runs active commands
          // and passive analysis in the same camera, finding 3.c); done.
          setScreen('livenessSuccess');
        } else {
          // Active: face captured/registered, continue to the liveness intro.
          setScreen('activeLivenessIntro');
        }
      } else {
        setScreen('livenessSuccess');
      }
    },
    onFailure: (error: any) => {
      setLivenessLoading(false);
      console.error('App - liveness failure:', error);
      Alert.alert(
        'Hata',
        'Yüz tanıma işlemi başarısız oldu. Lütfen tekrar deneyin.',
      );
    },
    onDismiss: () => {
      setLivenessLoading(false);
    },
  });

  // Video call flow state
  const [isVideoCallLoading, setIsVideoCallLoading] = useState(false);

  // NFC flow state
  const [nfcStatus, setNfcStatus] = useState<'idle' | 'reading' | 'success' | 'error'>('idle');
  const [nfcStatusMessage, setNfcStatusMessage] = useState<string>('');

  // Shared state for MRZ data that can be used by NFC tab
  const [mrzData, setMrzData] = useState<{
    documentNumber?: string;
    dateOfBirth?: string;
    dateOfExpiration?: string;
  } | null>(null);

  // Current active tab state
  const [activeTab, setActiveTab] = useState<string>('ocr');

  // Handle MRZ data extraction
  const handleMrzDataExtracted = (documentNumber?: string, dateOfBirth?: string, dateOfExpiration?: string) => {
    console.log('App - MRZ data extracted:', { documentNumber, dateOfBirth, dateOfExpiration });
    setMrzData({
      documentNumber,
      dateOfBirth,
      dateOfExpiration,
    });
  };

  // Handle switch to NFC tab with MRZ data
  const handleSwitchToNFC = () => {
    console.log('App - Switching to NFC tab with MRZ data:', mrzData);
    setActiveTab('nfc');
  };

  // Clear KYC flow flag when navigating away from face registration flow screens
  useEffect(() => {
    const faceRegScreens = ['scanOCR', 'faceRegLoading', 'prepareFaceScan', 'activeLivenessIntro', 'livenessSuccess'];
    if (!faceRegScreens.includes(screen)) {
      setKycFlowActive(false);
    }
    // Drop any scanned QR transaction ID once the flow is over and we are back
    // at the picker / landing, so the next selection scans a fresh code.
    if (screen === 'selectKYC' || screen === 'getStarted') {
      qrTransactionIDRef.current = '';
      pendingQRMethodRef.current = null;
      // Abandoning a composed flow mid-way resets it.
      setFlowSteps(null);
      flowStepIndexRef.current = 0;
      flowTransactionIDRef.current = '';
    }
  }, [screen]);

  // Video call ended callback - navigate to queue screen
  useEffect(() => {
    if (!VideoCallModule) return;

    const eventEmitter = Platform.OS === 'ios'
      ? new NativeEventEmitter(VideoCallModule)
      : DeviceEventEmitter;

    const endedListener = eventEmitter.addListener('VideoCall_onVideoCallEnded', (data) => {
      console.log('App - Video call ended:', data);
      setIsVideoCallLoading(false);
      setScreen(data?.success === false ? 'videoCallStart' : 'videoCallSuccess');
    });

    const dismissedListener = eventEmitter.addListener('VideoCall_onVideoCallDismissed', () => {
      console.log('App - Video call dismissed');
      setIsVideoCallLoading(false);
      setScreen('videoCallStart');
    });

    return () => {
      endedListener.remove();
      dismissedListener.remove();
    };
  }, []);

  // Hologram check completion - the native SDK records and auto-verifies, then
  // emits a result. Show the hologram result screen on completion or failure.
  useEffect(() => {
    if (!OCRModule) return;

    const eventEmitter = Platform.OS === 'ios'
      ? new NativeEventEmitter(OCRModule)
      : DeviceEventEmitter;

    const completeListener = eventEmitter.addListener('onHologramComplete', (result) => {
      console.log('App - Hologram complete:', result);
      setHologramSuccess(result?.success !== false);
      setHologramDetail({
        hologramExists: result?.hologramExists,
        ocrIdAndHologramIdMatch: result?.ocrIdAndHologramIdMatch,
        ocrFaceAndHologramFaceMatch: result?.ocrFaceAndHologramFaceMatch,
      });
      setScreen('hologramResult');
    });

    const errorListener = eventEmitter.addListener('onHologramError', (error) => {
      console.error('App - Hologram error:', error);
      setHologramSuccess(false);
      setScreen('hologramResult');
    });

    // 26.1.3: surface the IQA result including the new per-module `checks` map
    // (e.g. photoCheatSatisfied, chipExistenceSatisfied, signatureExistenceSatisfied).
    const iqaListener = eventEmitter.addListener('onIQAResult', (result) => {
      // rawMessage/displayMessage are the server's authoritative fields (e.g.
      // err_iqa_blur_detected); feedback is only the SDK's local enum.
      console.log(
        'App - IQA result:',
        result?.documentSide,
        'raw:', result?.rawMessage,
        'display:', result?.displayMessage,
        'feedback:', result?.feedback,
        'qualified:', result?.qualified,
      );
      console.log('App - IQA checks:', JSON.stringify(result?.checks));
    });

    return () => {
      completeListener.remove();
      errorListener.remove();
      iqaListener.remove();
    };
  }, []);

  // Apply the OCR UI settings (Review, IQA, Blur, Detection Accuracy) to the
  // native module before scanning. Other OCR settings (Document Liveness,
  // Hologram, Video Call) are handled as flow branches, not UI config.
  async function applyOcrUiSettings(overrides: Record<string, unknown> = {}) {
    try {
      if (OCRModule?.configureUISettings) {
        await OCRModule.configureUISettings({
          reviewScreenEnabled: settings.ocrEnableReview,
          isIQAServiceEnabled: settings.ocrEnableIQA,
          blurCoefficient: settings.ocrBlurCoefficient,
          detectionAccuracy: settings.ocrDetectionAccuracy,
          // 26.1.3: raw photo crop ratio + hologram flash/bitrate durations
          rawPhotoCropRatio: settings.ocrRawPhotoCropRatio,
          noFlashDuration: settings.hologramNoFlashDuration,
          flashDuration: settings.hologramFlashDuration,
          totalDuration: settings.hologramTotalDuration,
          bitrate: settings.hologramBitrate,
          ...overrides,
        });
      }
    } catch (error) {
      console.error('App - applyOcrUiSettings error:', error);
    }
  }

  // Handle starting video call from VideoCallStartScreen
  async function handleStartVideoCall() {
    if (isVideoCallLoading) return;

    setIsVideoCallLoading(true);
    try {
      if (!VideoCallModule) {
        Alert.alert('Hata', 'Video görüşme modülü kullanılamıyor.');
        setIsVideoCallLoading(false);
        return;
      }

      const channelId = parseInt(settings.channelId, 10) || 152;
      const transactionId = await acquireTransactionID(async () => {
        const id = await udentifyApiService.getVideoCallTransactionId(channelId);
        if (!id) {
          Alert.alert('Hata', 'İşlem numarası alınamadı.');
          throw new Error('NO_VIDEO_TX');
        }
        return id;
      });

      const credentials = {
        serverURL: settings.baseUrl || currentConfig.baseUrl,
        wssURL: settings.wssURL || currentConfig.wssURL || 'wss://api-dev.udentify.com/v1',
        // Reuse the same userID the face-registration/liveness steps used in
        // this composed flow, so the server can correlate face vs. video
        // call for the same user (finding 3.b). Only mint a fresh one when
        // video call is reached standalone, with no prior face step.
        userID: faceRegUserIDRef.current || `user_${Date.now()}`,
        transactionID: transactionId,
        clientName: settings.clientName || currentConfig.clientName || 'TestClient',
        idleTimeout: '30',
      };

      console.log('App - Starting video call with credentials:', credentials);
      const result = await VideoCallModule.startVideoCall(credentials);

      if (!result.success) {
        Alert.alert('Hata', result.error?.message || 'Video görüşme başlatılamadı.');
      }
      setIsVideoCallLoading(false);
    } catch (error) {
      const msg = (error as Error)?.message;
      if (msg === 'NO_VIDEO_TX') {
        // The "could not get transaction" alert was already shown.
        setIsVideoCallLoading(false);
        return;
      }
      console.error('App - Video call start error:', error);
      Alert.alert('Hata', `Video görüşme başlatılamadı: ${error}`);
      setIsVideoCallLoading(false);
    }
  }

  // Request camera permissions (Android)
  async function requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        ]);
        if (grants[PermissionsAndroid.PERMISSIONS.CAMERA] !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Izin Gerekli', 'Kamera izni gereklidir.');
          return false;
        }
        if (grants[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Izin Gerekli', 'Telefon durumu izni gereklidir.');
          return false;
        }
        return true;
      } catch (error) {
        console.error('App - Permission request error:', error);
        return false;
      }
    }
    return true;
  }

  // Handle start scan from ScanOCRScreen - opens camera directly
  async function handleStartScan() {
    try {
      setIsScanning(true);

      const hasPermissions = await requestPermissions();
      if (!hasPermissions) return;

      console.log('App - Getting transaction ID...');
      // U18 flow (26.1.2): IQA+OCR only. The transaction is started with just the
      // OCR module, ["U18", "PAYMENT"] properties and transactionSource 1.
      const transactionID = await acquireTransactionID(() =>
        udentifyApiService.startTransaction(
          !u18FlowActive && settings.ocrEnableHologramCheck
            ? [OCR_MODULES.OCR, OCR_MODULES.OCR_HOLOGRAM]
            : [OCR_MODULES.OCR],
          u18FlowActive
            ? { transactionProperties: ['U18', 'PAYMENT'], transactionSource: 1 }
            : undefined,
        ),
      );
      console.log('App - Got transaction ID:', transactionID);

      // 26.1.3: fetch & cache the transaction properties (e.g. U18) so the SDK
      // flow started below honours them. U18 in the cache also disables the
      // document face check during capture (photoless IDs must be capturable).
      if (u18FlowActive) {
        try {
          await resetTransactionProperties().catch(() => {});
          const props = await fetchTransactionProperties(currentConfig.baseUrl, transactionID);
          console.log('App - Transaction properties fetched:', props);
        } catch (e) {
          console.warn('App - fetchTransactionProperties failed:', e);
        }
      }

      // Apply the OCR UI settings (Review, IQA, Blur, Detection Accuracy)
      // before opening the scanner. The U18 flow always runs IQA.
      await applyOcrUiSettings(
        u18FlowActive ? {isIQAServiceEnabled: true} : {},
      );

      const success = await OCRModule.startOCRScanning(
        currentConfig.baseUrl,
        transactionID,
        'ID_CARD',
        'BOTH',
        'TUR'
      );

      if (success) {
        // Scanning done; run OCR (optionally with document liveness) to extract
        // document data, then show confirmation.
        setScreen('ocrProcessing');

        if (settings.ocrDocumentLiveness && !u18FlowActive) {
          const livenessResult = await OCRModule.performOCRAndDocumentLiveness(
            currentConfig.baseUrl,
            transactionID,
            '', // Empty front image (use stored capture)
            '', // Empty back image (use stored capture)
            'ID_CARD',
            'TUR'
          );

          console.log('App - OCR + Document Liveness result:', livenessResult);
          if (!livenessResult || livenessResult.success === false) {
            setScanErrorDetail('Dokuman canlilik kontrolu basarisiz oldu.');
            setScreen('scanError');
            return;
          }
          setOcrConfirmData(
            livenessResult?.ocrData?.extractedData ||
              livenessResult?.extractedData ||
              {},
          );
          setOcrLivenessResult({
            success: livenessResult?.success,
            frontSideProbability: livenessResult?.frontSideProbability,
            backSideProbability: livenessResult?.backSideProbability,
          });
        } else {
          const ocrResult = await OCRModule.performOCR(
            currentConfig.baseUrl,
            transactionID,
            '', // Empty front image (use stored capture)
            '', // Empty back image (use stored capture)
            'ID_CARD',
            'TUR'
          );

          console.log('App - OCR result:', ocrResult);
          if (!ocrResult || ocrResult.success === false) {
            setScanErrorDetail('OCR islemi basarisiz oldu.');
            setScreen('scanError');
            return;
          }
          setOcrConfirmData(ocrResult?.extractedData || {});
          setOcrLivenessResult(null);
        }

        setOcrFlowTransactionID(transactionID);
        setScreen('result');
      } else {
        setScanErrorDetail('Tarama baslatilamadi.');
        setScreen('scanError');
      }
    } catch (error) {
      console.error('App - Scan error:', error);
      setScanErrorDetail(`${error}`);
      setScreen('scanError');
    } finally {
      setIsScanning(false);
    }
  }

  // From the Result confirm screen: if Hologram Check is on, show the hologram
  // intro screen before opening the camera; otherwise go straight to success.
  // The U18 flow (26.1.2) is IQA+OCR only: summary then success, never hologram.
  // In a composed flow (4.a) the hologram belongs to the OCR step only, and
  // the flow advances to its next step instead of finishing.
  function handleResultContinue() {
    const currentStep = flowSteps ? flowSteps[flowStepIndexRef.current] : null;
    const hologramApplies = !flowSteps || currentStep === 'ocr';
    if (
      !u18FlowActive &&
      hologramApplies &&
      settings.ocrEnableHologramCheck &&
      ocrFlowTransactionID
    ) {
      setScreen('scanHologram');
      return;
    }
    if (advanceFlowIfActive()) return;
    setScreen('success');
  }

  // Start the native hologram camera. The SDK records and auto-verifies, then
  // emits onHologramComplete / onHologramError (handled by the effect above),
  // which navigates to the hologram result screen.
  async function startHologramFlow() {
    try {
      setIsHologramStarting(true);

      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        setIsHologramStarting(false);
        return;
      }

      const success = await OCRModule.startHologramCamera(
        currentConfig.baseUrl,
        ocrFlowTransactionID,
      );

      if (!success) {
        Alert.alert('Hata', 'Hologram kamerası başlatılamadı.');
      }
    } catch (error) {
      console.error('App - Hologram start error:', error);
      Alert.alert('Hata', `${error}`);
    } finally {
      setIsHologramStarting(false);
    }
  }

  // Handle OCR scan for face registration flow
  async function handleStartFaceRegOCR() {
    try {
      setFaceRegistrationLoading(true);

      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        setFaceRegistrationLoading(false);
        return;
      }

      console.log('App - Getting transaction ID for face registration...');
      const transactionID = await acquireTransactionID(() =>
        udentifyApiService.startTransaction([
          OCR_MODULES.OCR,
          ...(settings.ocrEnableHologramCheck ? [OCR_MODULES.OCR_HOLOGRAM] : []),
          'FACE_REGISTRATION',
          'FACE_AUTHENTICATION',
          'FACE_LIVENESS',
          'ACTIVE_LIVENESS',
        ]),
      );
      console.log('App - Got face reg transaction ID:', transactionID);

      await applyOcrUiSettings();

      const success = await OCRModule.startOCRScanning(
        currentConfig.baseUrl,
        transactionID,
        'ID_CARD',
        'BOTH',
        'TUR'
      );

      if (success) {
        setFaceRegistrationTransactionID(transactionID);
        setScreen('faceRegLoading');

        setTimeout(() => {
          setScreen('prepareFaceScan');
        }, 1500);
      } else {
        Alert.alert('Hata', 'Tarama baslatılamadı.');
      }
    } catch (error) {
      console.error('App - Face reg OCR error:', error);
      Alert.alert('Hata', `${error}`);
    } finally {
      setFaceRegistrationLoading(false);
    }
  }

  // Install the Face settings into the liveness SDK's global settings provider.
  // The camera reads these from the provider, not from launch credentials (3.d).
  // The wrapper replaces ALL colors once a colors object is sent, so the full
  // palette is listed; backgroundColor carries alpha (AARRGGBB) so the camera
  // preview stays visible under the overlay (finding 3.e).
  async function applyFaceUiSettingsFromSettings() {
    await applyFaceUiSettings({
      configs: {
        autoTake: settings.faceAutoSelfie,
        invertedAnimation: settings.faceInvertedAnimation,
        multipleFacesRejected: !settings.faceAllowMultipleFaces,
      },
      colors: {
        titleColor: '#FFFFFF',
        titleBG: '#7AFFFFFF',
        buttonErrorColor: '#FF4D30',
        buttonSuccessColor: '#4DD963',
        buttonColor: '#4535B0',
        buttonTextColor: '#FFFFFF',
        buttonErrorTextColor: '#FFFFFF',
        buttonSuccessTextColor: '#FFFFFF',
        buttonBackColor: '#FFFFFF',
        footerTextColor: '#FFFFFF',
        checkmarkTintColor: '#FFFFFF',
        backgroundColor: '#8C4535B0',
      },
    });
  }

  // The Yüz Kayıt liveness flow runs two sequential native sessions. Both share
  // the same credentials; the phase decides which native method fires.
  function resolveLivenessParams(phase: 'faceCapture' | 'liveness') {
    const raw = settings.faceLivenessMode;
    const mode = raw === 'hybrid' || raw === 'passive' ? raw : 'active';
    return {
      phase,
      mode: mode as 'passive' | 'active' | 'hybrid',
      serverURL: currentConfig.baseUrl,
      transactionID: faceRegistrationTransactionID,
      userID: faceRegUserIDRef.current,
      autoTake: settings.faceAutoSelfie,
      invertedAnimation: settings.faceInvertedAnimation,
    };
  }

  // Session 1: face capture / registration (Yüz Tanıma -> Camera).
  async function launchFaceCapture() {
    try {
      setLivenessLoading(true);
      livenessPhaseRef.current = 'faceCapture';
      // New flow, new user; session 2 reuses this same ID.
      faceRegUserIDRef.current = Date.now().toString();
      await applyFaceUiSettingsFromSettings();
      await launchLivenessNative(resolveLivenessParams('faceCapture'));
    } catch (error) {
      setLivenessLoading(false);
      console.error('App - launchFaceCapture error:', error);
      Alert.alert('Hata', `${error}`);
    }
  }

  // Session 2: active or hybrid liveness (Aktif/Hibrit Canlılık).
  async function launchLiveness() {
    try {
      setLivenessLoading(true);
      livenessPhaseRef.current = 'liveness';
      await applyFaceUiSettingsFromSettings();
      await launchLivenessNative(resolveLivenessParams('liveness'));
    } catch (error) {
      setLivenessLoading(false);
      console.error('App - launchLiveness error:', error);
      Alert.alert('Hata', `${error}`);
    }
  }

  // Handle NFC chip reading with MRZ data
  async function handleStartNfcReading(
    docNumber?: string,
    dob?: string,
    expiry?: string
  ) {
    const documentNum = docNumber || mrzData?.documentNumber;
    const birthDate = dob || mrzData?.dateOfBirth;
    const expiryDate = expiry || mrzData?.dateOfExpiration;

    if (!documentNum || !birthDate || !expiryDate) {
      Alert.alert('Hata', 'MRZ verileri eksik. Lütfen MRZ taramasını tekrarlayın.');
      setNfcStatus('error');
      setNfcStatusMessage('MRZ verileri eksik.');
      return;
    }

    try {
      setNfcStatus('reading');
      setNfcStatusMessage('İşlem numarası alınıyor...');

      const transactionID = await acquireTransactionID(() =>
        udentifyApiService.startTransaction(['NFC']),
      );

      setNfcStatusMessage('Telefonunuzu kimlik kartınıza yaklaştırın...');

      const credentials = {
        documentNumber: documentNum.trim(),
        dateOfBirth: birthDate.trim(),
        expiryDate: expiryDate.trim(),
        serverURL: currentConfig.baseUrl,
        transactionID: transactionID,
        requestTimeout: 30,
        isActiveAuthenticationEnabled: settings.isActiveAuthenticationEnabled,
        isPassiveAuthenticationEnabled: settings.isPassiveAuthenticationEnabled,
        enableAutoTriggering: true,
        logLevel: 'warning',
      };

      const result = await startNFCReading(credentials);

      if (result && result.success) {
        setNfcStatus('success');
        setNfcStatusMessage('Çip okuma başarılı!');
        // Merge onto whatever OCR already extracted (document type, native-
        // script names, etc.) instead of replacing it wholesale - a prior OCR
        // step's fields would otherwise be lost once NFC finishes.
        setOcrConfirmData(prev => ({
          ...prev,
          firstName: result.firstName,
          lastName: result.lastName,
          birthDate: result.dateOfBirth,
          gender: result.gender,
          expiryDate: result.expiryDate,
          faceImage: result.faceImage,
          documentNumber: result.documentNumber,
          nationality: result.nationality,
          personalNumber: result.personalNumber,
          placeOfBirth: result.placeOfBirth,
          passedPA: result.passedPA,
          passedAA: result.passedAA,
        }));
        setTimeout(() => {
          setScreen('result');
        }, 1500);
      } else {
        setNfcStatus('error');
        setNfcStatusMessage('Çip okuma başarısız oldu. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('App - NFC reading error:', error);
      setNfcStatus('error');
      setNfcStatusMessage(`Çip okuma hatası: ${error}`);
    }
  }

  const tabs = [
    {
      id: 'ssl',
      title: 'SSL',
      component: SSLPinningTab,
    },
    {
      id: 'language',
      title: 'Language',
      component: RemoteLanguagePackTest,
    },
    {
      id: 'ocr',
      title: 'OCR',
      component: OCRTab,
      props: {
        pendingTransactionID: pendingOcrTransactionID,
        onProcessingStarted: () => setPendingOcrTransactionID(''),
      },
    },
    {
      id: 'nfc',
      title: 'NFC',
      component: NFCTab,
      props: {
        mrzData: mrzData,
      },
    },
    {
      id: 'mrz',
      title: 'MRZ',
      component: MRZTab,
      props: {
        onMrzDataExtracted: handleMrzDataExtracted,
        onSwitchToNFC: handleSwitchToNFC,
        onStartNfcFlow: (docNum?: string, dob?: string, exp?: string) => {
          handleMrzDataExtracted(docNum, dob, exp);
          setNfcStatus('idle');
          setNfcStatusMessage('');
          setScreen('readChip');
          setTimeout(() => handleStartNfcReading(docNum, dob, exp), 300);
        },
      },
    },
    {
      id: 'liveness',
      title: 'Liveness',
      component: LivenessTab,
      props: {
        presetTransactionID: faceRegistrationTransactionID,
        onPresetTransactionConsumed: () => setFaceRegistrationTransactionID(''),
      },
    },
    {
      id: 'videocall',
      title: 'Video Call',
      component: VideoCallTab,
      props: {
        onOpenVideoCallFlow: () => setScreen('videoCallStart'),
      },
    },
  ];

  if (screen === 'getStarted') {
    return (
      <GetStartedScreen
        onGetStarted={() => setScreen('selectKYC')}
        onSettingsPress={() => setScreen('settings')}
      />
    );
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        onBack={() => setScreen('getStarted')}
        onNavigate={(section) => {
          if (section === 'api') {
            setScreen('apiSettings');
          } else if (section === 'nfc') {
            setScreen('nfcSettings');
          } else if (section === 'face') {
            setScreen('faceSettings');
          } else if (section === 'ocr') {
            setScreen('ocrSettings');
          } else if (section === 'language') {
            setScreen('languageSettings');
          } else if (section === 'debug') {
            setScreen('main');
          } else {
            console.log('App - Navigate to settings section:', section);
          }
        }}
      />
    );
  }

  if (screen === 'apiSettings') {
    return (
      <APISettingsScreen
        onBack={() => setScreen('settings')}
      />
    );
  }

  if (screen === 'nfcSettings') {
    return (
      <NFCSettingsScreen
        onBack={() => setScreen('settings')}
      />
    );
  }

  if (screen === 'faceSettings') {
    return (
      <FaceSettingsScreen
        onBack={() => setScreen('settings')}
      />
    );
  }

  if (screen === 'ocrSettings') {
    return (
      <OCRSettingsScreen
        onBack={() => setScreen('settings')}
      />
    );
  }

  if (screen === 'languageSettings') {
    return (
      <LanguageSettingsScreen
        onBack={() => setScreen('settings')}
      />
    );
  }

  if (screen === 'videoCallStart') {
    return (
      <VideoCallStartScreen
        onBack={() => {
          setIsVideoCallLoading(false);
          setScreen('selectKYC');
        }}
        onStartCall={() => setScreen('videoCallQueue')}
        // onTestSuccess={() => setScreen('videoCallSuccess')}
        loading={isVideoCallLoading}
      />
    );
  }

  if (screen === 'videoCallSuccess') {
    return (
      <VideoCallSuccessScreen
        onBack={() => setScreen('selectKYC')}
        onContinue={() => {
          if (advanceFlowIfActive()) return;
          setScreen('selectKYC');
        }}
      />
    );
  }

  if (screen === 'videoCallQueue') {
    return (
      <VideoCallQueueScreen
        onBack={() => {
          setScreen('videoCallStart');
        }}
        onContinue={handleStartVideoCall}
      />
    );
  }

  if (screen === 'selectKYC') {
    return (
      <SelectKYCMethodScreen
        onBack={() => setScreen('getStarted')}
        onStart={(method) => startMethod(method)}
      />
    );
  }

  if (screen === 'scanNFC') {
    return (
      <ScanNFCScreen
        onBack={() => setScreen('selectKYC')}
        onMrzDetected={(documentNumber, dateOfBirth, dateOfExpiration) => {
          handleMrzDataExtracted(
            documentNumber,
            dateOfBirth,
            dateOfExpiration,
          );
          // Let the user review/edit the MRZ data before the NFC reading starts.
          setScreen('confirmMrz');
        }}
      />
    );
  }

  if (screen === 'confirmMrz') {
    return (
      <ConfirmMrzScreen
        documentNumber={mrzData?.documentNumber ?? ''}
        dateOfBirth={mrzData?.dateOfBirth ?? ''}
        dateOfExpiration={mrzData?.dateOfExpiration ?? ''}
        onBack={() => setScreen('scanNFC')}
        onRescan={() => setScreen('scanNFC')}
        onConfirm={(documentNumber, dateOfBirth, dateOfExpiration) => {
          handleMrzDataExtracted(
            documentNumber,
            dateOfBirth,
            dateOfExpiration,
          );
          setNfcStatus('idle');
          setNfcStatusMessage('');
          setScreen('readChip');
          // Start NFC reading once the chip screen has rendered.
          setTimeout(
            () =>
              handleStartNfcReading(
                documentNumber,
                dateOfBirth,
                dateOfExpiration,
              ),
            300,
          );
        }}
      />
    );
  }

  if (screen === 'readChip') {
    return (
      <ReadChipScreen
        onBack={() => {
          setNfcStatus('idle');
          setNfcStatusMessage('');
          setScreen('confirmMrz');
        }}
        onRetry={() => handleStartNfcReading()}
        nfcStatus={nfcStatus}
        nfcStatusMessage={nfcStatusMessage}
      />
    );
  }

  if (screen === 'scanOCR') {
    return (
      <ScanOCRScreen
        onBack={() => {
          if (kycFlowActive) { setKycFlowActive(false); }
          if (u18FlowActive) { setU18FlowActive(false); }
          setScreen('selectKYC');
        }}
        onStartScan={kycFlowActive ? handleStartFaceRegOCR : handleStartScan}
        loading={kycFlowActive ? faceRegistrationLoading : isScanning}
      />
    );
  }

  if (screen === 'scanError') {
    return (
      <ErrorScreen
        onBack={() => setScreen('scanOCR')}
        onRetry={() => {
          setScreen('scanOCR');
          handleStartScan();
        }}
        errorDetail={scanErrorDetail}
      />
    );
  }

  if (screen === 'scanQR') {
    return (
      <ScanQRScreen onScanned={handleQRScanned} onCancel={handleQRCancel} />
    );
  }

  if (screen === 'faceRegLoading') {
    return (
      <View style={{flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator size="large" color="#4535B0" />
      </View>
    );
  }

  if (screen === 'prepareFaceScan') {
    return (
      <PrepareFaceScanScreen
        onBack={() => {
          setFaceRegistrationTransactionID('');
          setKycFlowActive(false);
          setScreen('selectKYC');
        }}
        onOpenCamera={launchFaceCapture}
        loading={livenessLoading}
      />
    );
  }

  if (screen === 'activeLivenessIntro') {
    return (
      <ActiveLivenessIntroScreen
        onBack={() => setScreen('prepareFaceScan')}
        onOpenCamera={launchLiveness}
        loading={livenessLoading}
      />
    );
  }

  if (screen === 'livenessSuccess') {
    return (
      <SuccessScreen
        headerTitle="Onay Ekranı"
        title="Yüz Tanıma İşlemi Başarılı"
        subtitle="Yüz tanıma işlemi başarılı bir şekilde tamamlanmıştır."
        buttonLabel="Devam Et"
        onHome={() => {
          setFaceRegistrationTransactionID('');
          setKycFlowActive(false);
          if (advanceFlowIfActive()) return;
          setScreen('getStarted');
        }}
      />
    );
  }

  if (screen === 'ocrProcessing') {
    return (
      <View style={{flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator size="large" color="#4535B0" />
      </View>
    );
  }

  if (screen === 'result') {
    return (
      <ResultScreen
        data={ocrConfirmData}
        liveness={ocrLivenessResult}
        onBack={() => {
          setOcrConfirmData({});
          setOcrLivenessResult(null);
          setOcrFlowTransactionID('');
          setScreen('selectKYC');
        }}
        onContinue={handleResultContinue}
      />
    );
  }

  if (screen === 'scanHologram') {
    return (
      <ScanHologramScreen
        onBack={() => setScreen('result')}
        onStartScan={startHologramFlow}
        loading={isHologramStarting}
      />
    );
  }

  if (screen === 'hologramResult') {
    // Failed hologram must not advance the flow; send the user back to retry.
    if (!hologramSuccess) {
      return (
        <ErrorScreen
          headerTitle="Onay Ekranı"
          title="Hologram Kontrolü Başarısız"
          subtitle={'Hologram kontrol işlemi tamamlanamadı.\nLütfen tekrar deneyin.'}
          onBack={() => setScreen('scanHologram')}
          onRetry={() => {
            setScreen('scanHologram');
            startHologramFlow();
          }}
        />
      );
    }
    return (
      <HologramResultScreen
        success
        hologramExists={hologramDetail.hologramExists}
        idAndHologramIdMatch={hologramDetail.ocrIdAndHologramIdMatch}
        faceAndHologramFaceMatch={hologramDetail.ocrFaceAndHologramFaceMatch}
        onContinue={() => {
          setOcrConfirmData({});
          setOcrLivenessResult(null);
          setOcrFlowTransactionID('');
          setHologramDetail({});
          if (advanceFlowIfActive()) return;
          setScreen('success');
        }}
      />
    );
  }

  if (screen === 'success') {
    return (
      <SuccessScreen
        onHome={() => {
          setOcrConfirmData({});
          setU18FlowActive(false);
          setScreen('getStarted');
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {kycFlowActive && (
        <View style={styles.ocrResultHeader}>
          <TouchableOpacity
            style={styles.ocrResultBackButton}
            onPress={() => {
              setKycFlowActive(false);
              setScreen('selectKYC');
            }}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <ChevronLeftIcon />
          </TouchableOpacity>
          <Text style={styles.ocrResultHeaderTitle}>Yüz Kayıt</Text>
          <View style={styles.ocrResultHeaderSpacer} />
        </View>
      )}
      {!kycFlowActive && (
        <View style={styles.ocrResultHeader}>
          <TouchableOpacity
            style={styles.ocrResultBackButton}
            onPress={() => setScreen('getStarted')}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <ChevronLeftIcon />
          </TouchableOpacity>
          <Text style={styles.ocrResultHeaderTitle}>Debug</Text>
          <View style={styles.ocrResultHeaderSpacer} />
        </View>
      )}
      <TabNavigator
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hideTabBar={kycFlowActive}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  ocrResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  ocrResultBackButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  ocrResultHeaderTitle: {
    flex: 1,
    color: '#4535B0',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  ocrResultHeaderSpacer: {
    width: 32,
  },
});

function AppWithProviders(): React.JSX.Element {
  return (
    <SettingsProvider>
      <App />
    </SettingsProvider>
  );
}

export default AppWithProviders;