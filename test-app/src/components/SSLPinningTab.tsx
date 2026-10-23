import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  loadCertificateFromAssets,
  removeSSLCertificate,
  getSSLCertificateBase64,
  isSSLPinningEnabled,
} from 'udentify-core';

/**
 * SSL Pinning Test Tab
 * Tests all SSL pinning functionality from udentify-core
 */
const SSLPinningTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isPinningEnabled, setIsPinningEnabled] = useState<boolean | null>(null);
  const [certificateInfo, setCertificateInfo] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    checkInitialStatus();
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 20));
    console.log(`SSLPinningTab - ${message}`);
  };

  const checkInitialStatus = async () => {
    try {
      const enabled = await isSSLPinningEnabled();
      setIsPinningEnabled(enabled);
      addLog(`Initial SSL pinning status: ${enabled ? 'ENABLED' : 'DISABLED'}`);
      
      if (enabled) {
        const cert = await getSSLCertificateBase64();
        if (cert) {
          setCertificateInfo(`Certificate set (${cert.length} chars)`);
          addLog('Certificate is currently set');
        }
      }
    } catch (error) {
      addLog(`Error checking initial status: ${error}`);
    }
  };

  const handleLoadFromAssets = async () => {
    setLoading(true);
    addLog('Attempting to load certificate from assets...');
    
    try {
      // Try to load a test certificate from assets
      // Certificate should be named 'test_certificate.cer' in iOS bundle and Android assets
      const success = await loadCertificateFromAssets('test_certificate', 'cer');
      
      if (success) {
        addLog('✓ Certificate loaded successfully from assets');
        Alert.alert('Success', 'Certificate loaded and set successfully!');
        await checkStatus();
      } else {
        addLog('✗ Failed to load certificate from assets');
        Alert.alert('Failed', 'Could not load certificate from assets');
      }
    } catch (error: any) {
      addLog(`✗ Error: ${error.message || error}`);
      Alert.alert(
        'Error',
        'Make sure test_certificate.cer is in:\n- iOS: Added to Xcode project\n- Android: android/app/src/main/assets/\n\nError: ' + error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCertificate = async () => {
    Alert.alert(
      'Remove Certificate',
      'Are you sure you want to remove the SSL certificate?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            addLog('Removing SSL certificate...');
            
            try {
              const success = await removeSSLCertificate();
              if (success) {
                addLog('✓ Certificate removed successfully');
                Alert.alert('Success', 'SSL certificate removed');
                await checkStatus();
              }
            } catch (error: any) {
              addLog(`✗ Error: ${error.message || error}`);
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleGetCertificate = async () => {
    setLoading(true);
    addLog('Retrieving current certificate...');
    
    try {
      const cert = await getSSLCertificateBase64();
      
      if (cert) {
        const certInfo = `Certificate: ${cert.substring(0, 50)}...\nLength: ${cert.length} characters`;
        setCertificateInfo(certInfo);
        addLog(`✓ Certificate retrieved (${cert.length} chars)`);
        Alert.alert('Certificate Retrieved', certInfo);
      } else {
        setCertificateInfo(null);
        addLog('No certificate is currently set');
        Alert.alert('No Certificate', 'No SSL certificate is currently set');
      }
    } catch (error: any) {
      addLog(`✗ Error: ${error.message || error}`);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setLoading(true);
    addLog('Checking SSL pinning status...');
    await checkStatus();
    setLoading(false);
  };

  const checkStatus = async () => {
    try {
      const enabled = await isSSLPinningEnabled();
      setIsPinningEnabled(enabled);
      addLog(`SSL pinning is ${enabled ? 'ENABLED' : 'DISABLED'}`);
      
      if (enabled) {
        const cert = await getSSLCertificateBase64();
        if (cert) {
          setCertificateInfo(`${cert.substring(0, 50)}... (${cert.length} chars)`);
        }
      } else {
        setCertificateInfo(null);
      }
    } catch (error: any) {
      addLog(`✗ Error checking status: ${error.message || error}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SSL Pinning Test</Text>
        <Text style={styles.subtitle}>
          Test SSL certificate pinning functionality from udentify-core
        </Text>
      </View>

      {/* Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>SSL Pinning:</Text>
            <View style={[
              styles.statusBadge,
              isPinningEnabled ? styles.statusEnabled : styles.statusDisabled
            ]}>
              <Text style={styles.statusBadgeText}>
                {isPinningEnabled === null ? 'UNKNOWN' : isPinningEnabled ? 'ENABLED' : 'DISABLED'}
              </Text>
            </View>
          </View>
          {certificateInfo && (
            <View style={styles.certInfo}>
              <Text style={styles.certInfoText}>{certificateInfo}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleLoadFromAssets}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Load Certificate from Assets</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonInfo]}
          onPress={handleGetCertificate}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Get Current Certificate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonInfo]}
          onPress={handleCheckStatus}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Check SSL Pinning Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={handleRemoveCertificate}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Remove Certificate</Text>
        </TouchableOpacity>
      </View>

      {/* Logs Section */}
      <View style={styles.section}>
        <View style={styles.logHeader}>
          <Text style={styles.sectionTitle}>Activity Log</Text>
          <TouchableOpacity onPress={clearLogs}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.logContainer}>
          {logs.length === 0 ? (
            <Text style={styles.logEmpty}>No activity yet</Text>
          ) : (
            logs.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log}
              </Text>
            ))
          )}
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Setup Instructions</Text>
        <View style={styles.instructionBox}>
          <Text style={styles.instructionTitle}>iOS:</Text>
          <Text style={styles.instructionText}>
            1. Add test_certificate.cer to Xcode project{'\n'}
            2. Ensure it's added to the app target{'\n'}
            3. Certificate must be in DER format
          </Text>
          
          <Text style={[styles.instructionTitle, styles.instructionTitleSpaced]}>Android:</Text>
          <Text style={styles.instructionText}>
            1. Place test_certificate.cer in:{'\n'}
               android/app/src/main/assets/{'\n'}
            2. Certificate must be in DER format
          </Text>

          <Text style={[styles.instructionTitle, styles.instructionTitleSpaced]}>Convert PEM to DER:</Text>
          <Text style={styles.instructionCode}>
            openssl x509 -in cert.pem -outform der -out test_certificate.cer
          </Text>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  section: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  statusContainer: {
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusEnabled: {
    backgroundColor: '#4CAF50',
  },
  statusDisabled: {
    backgroundColor: '#FF5252',
  },
  statusBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  certInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
  },
  certInfoText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#5856D6',
  },
  buttonInfo: {
    backgroundColor: '#34C759',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clearButton: {
    color: '#007AFF',
    fontSize: 14,
  },
  logContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 10,
    maxHeight: 300,
  },
  logText: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 5,
  },
  logEmpty: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  instructionBox: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  instructionTitleSpaced: {
    marginTop: 15,
  },
  instructionText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  instructionCode: {
    fontSize: 12,
    color: '#007AFF',
    fontFamily: 'monospace',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SSLPinningTab;

