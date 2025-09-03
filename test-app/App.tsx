import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

// Import components
import TabNavigator from './src/components/TabNavigator';
import OCRTab from './src/components/OCRTab';
import NFCTab from './src/components/NFCTab';
import LivenessTab from './src/components/LivenessTab';
import MRZTab from './src/components/MRZTab';
import VideoCallTab from './src/components/VideoCallTab';
import PlaceholderTab from './src/components/PlaceholderTab';

// Create placeholder components for future tabs
const BiometricTab = () => (
  <PlaceholderTab 
    title="Biometric" 
    description="Face recognition and biometric verification will be available here." 
  />
);

const SettingsTab = () => (
  <PlaceholderTab 
    title="Settings" 
    description="App configuration and settings will be available here." 
  />
);

function App(): React.JSX.Element {
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

  const tabs = [
    {
      id: 'ocr',
      title: 'OCR',
      component: OCRTab,
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
      },
    },
    {
      id: 'liveness',
      title: 'Liveness',
      component: LivenessTab,
    },
    {
      id: 'videocall',
      title: 'Video Call',
      component: VideoCallTab,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <TabNavigator 
        tabs={tabs} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
});

export default App;