import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  instantiateServerBasedLocalization,
  getLocalizationMap,
  clearLocalizationCache,
  mapSystemLanguageToEnum,
} from 'udentify-core';
import { devConfig } from '../config/apiConfig';
import { udentifyApiService } from '../services/udentifyApiService';

const SUPPORTED_LANGUAGES = [
  { code: 'EN', name: 'English', flag: '🇺🇸' },
  { code: 'ES', name: 'Spanish', flag: '🇪🇸' },
  { code: 'FR', name: 'French', flag: '🇫🇷' },
  { code: 'DE', name: 'German', flag: '🇩🇪' },
  { code: 'IT', name: 'Italian', flag: '🇮🇹' },
  { code: 'TR', name: 'Turkish', flag: '🇹🇷' },
  { code: 'PT', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'RU', name: 'Russian', flag: '🇷🇺' },
  { code: 'AR', name: 'Arabic', flag: '🇸🇦' },
  { code: 'ZH', name: 'Chinese', flag: '🇨🇳' },
  { code: 'JA', name: 'Japanese', flag: '🇯🇵' },
  { code: 'KO', name: 'Korean', flag: '🇰🇷' },
];

export default function RemoteLanguagePackTest() {
  const [serverUrl, setServerUrl] = useState(devConfig.baseUrl);
  const [transactionId, setTransactionId] = useState('');
  const [language, setLanguage] = useState('EN');
  const [timeout, setTimeout] = useState('30');
  const [results, setResults] = useState<string>('');
  const [localizationMap, setLocalizationMap] = useState<Record<string, string> | null>(null);
  const [isFetchingTransactionId, setIsFetchingTransactionId] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setResults(prev => `[${timestamp}] ${message}\n${prev}`);
  };

  const handleInstantiateLocalization = async () => {
    try {
      setIsLoading(true);
      log('Starting localization instantiation...');
      log(`Language: ${language}, Server: ${serverUrl}`);
      
      await instantiateServerBasedLocalization(
        language,
        serverUrl,
        transactionId,
        parseInt(timeout)
      );
      
      log('✓ Localization instantiated successfully');
      
      // Automatically fetch the localization map
      log('Fetching localization map...');
      const map = await getLocalizationMap();
      
      if (map) {
        setLocalizationMap(map);
        const entryCount = Object.keys(map).length;
        log(`✓ Retrieved localization map with ${entryCount} entries`);
        Alert.alert('Success', `Localization loaded with ${entryCount} entries`);
      } else {
        log('No localization map available');
        Alert.alert('Success', 'Localization instantiated but no map available');
      }
    } catch (error: any) {
      log(`✗ Error: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetLocalizationMap = async () => {
    try {
      log('Fetching localization map...');
      
      const map = await getLocalizationMap();
      
      if (map) {
        setLocalizationMap(map);
        const entryCount = Object.keys(map).length;
        log(`✓ Retrieved localization map with ${entryCount} entries`);
        
        // Show first 5 entries as sample
        const sampleEntries = Object.entries(map).slice(0, 5);
        log('Sample entries:');
        sampleEntries.forEach(([key, value]) => {
          log(`  ${key}: ${value}`);
        });
        
        Alert.alert('Success', `Retrieved ${entryCount} localization entries`);
      } else {
        log('No localization map available');
        setLocalizationMap(null);
        Alert.alert('Info', 'No localization map available');
      }
    } catch (error: any) {
      log(`✗ Error: ${error.message}`);
      Alert.alert('Error', error.message);
    }
  };

  const handleClearCache = async () => {
    try {
      log(`Clearing cache for language: ${language}`);
      
      await clearLocalizationCache(language);
      
      log('✓ Cache cleared successfully');
      setLocalizationMap(null);
      Alert.alert('Success', 'Cache cleared successfully');
    } catch (error: any) {
      log(`✗ Error: ${error.message}`);
      Alert.alert('Error', error.message);
    }
  };

  const handleMapSystemLanguage = async () => {
    try {
      log('Detecting system language...');
      
      const systemLang = await mapSystemLanguageToEnum();
      
      if (systemLang) {
        log(`✓ System language: ${systemLang}`);
        setLanguage(systemLang);
        Alert.alert('Success', `System language: ${systemLang}`);
      } else {
        log('System language not supported');
        Alert.alert('Info', 'System language not supported');
      }
    } catch (error: any) {
      log(`✗ Error: ${error.message}`);
      Alert.alert('Error', error.message);
    }
  };

  const handleFetchTransactionId = async () => {
    try {
      setIsFetchingTransactionId(true);
      log('Fetching transaction ID from server...');
      log(`Server: ${serverUrl}`);
      
      const txId = await udentifyApiService.startTransaction(['OCR']);
      
      if (txId) {
        setTransactionId(txId);
        log(`✓ Transaction ID received: ${txId.substring(0, 20)}...`);
        Alert.alert('Success', `Transaction ID fetched successfully`);
      } else {
        log('✗ No transaction ID returned from server');
        Alert.alert('Error', 'No transaction ID returned from server');
      }
    } catch (error: any) {
      log(`✗ Error fetching transaction ID: ${error.message}`);
      Alert.alert('Error', `Failed to fetch transaction ID: ${error.message}`);
    } finally {
      setIsFetchingTransactionId(false);
    }
  };

  const handleTestFullWorkflow = async () => {
    try {
      log('=== Starting Full Workflow Test ===');
      
      // Step 1: Detect system language
      log('Step 1: Detecting system language...');
      const systemLang = await mapSystemLanguageToEnum();
      const testLang = systemLang || 'EN';
      setLanguage(testLang);
      log(`Using language: ${testLang}`);
      
      // Step 2: Instantiate localization
      log('Step 2: Instantiating localization...');
      await instantiateServerBasedLocalization(
        testLang,
        serverUrl,
        transactionId,
        parseInt(timeout)
      );
      log('✓ Localization instantiated');
      
      // Step 3: Get localization map
      log('Step 3: Fetching localization map...');
      const map = await getLocalizationMap();
      if (map) {
        setLocalizationMap(map);
        log(`✓ Retrieved ${Object.keys(map).length} entries`);
      } else {
        log('No map available');
      }
      
      log('=== Full Workflow Test Complete ===');
      Alert.alert('Success', 'Full workflow test completed successfully');
    } catch (error: any) {
      log(`✗ Workflow Error: ${error.message}`);
      Alert.alert('Error', error.message);
    }
  };

  const clearResults = () => {
    setResults('');
    setLocalizationMap(null);
  };

  const handleQuickLoadLanguage = async (langCode: string) => {
    try {
      setLanguage(langCode);
      setIsLoading(true);
      log(`=== Quick Load: ${langCode} ===`);
      
      // Always fetch a fresh transaction ID for each language load
      log('Fetching fresh transaction ID...');
      const txId = await udentifyApiService.startTransaction(['OCR']);
      if (txId) {
        setTransactionId(txId);
        log(`✓ Transaction ID: ${txId.substring(0, 20)}...`);
      } else {
        throw new Error('Failed to get transaction ID');
      }
      
      // Clear cache first to force fresh download
      log(`Clearing cache for ${langCode}...`);
      await clearLocalizationCache(langCode);
      log(`✓ Cache cleared`);
      
      // Instantiate localization
      log(`Loading ${langCode} localization from server...`);
      log(`Server: ${serverUrl}`);
      log(`Transaction: ${txId.substring(0, 20)}...`);
      await instantiateServerBasedLocalization(
        langCode,
        serverUrl,
        txId,
        parseInt(timeout)
      );
      log(`✓ ${langCode} instantiated`);
      
      // Fetch localization map
      log(`Fetching localization map for ${langCode}...`);
      const map = await getLocalizationMap();
      if (map) {
        setLocalizationMap(map);
        const entries = Object.keys(map).length;
        log(`✓ ${langCode} loaded with ${entries} entries`);
        Alert.alert('Success', `${langCode} localization loaded\n${entries} entries`);
      } else {
        log(`✗ No localization map returned for ${langCode}`);
        setLocalizationMap(null);
        Alert.alert('Warning', `${langCode} loaded but no localization data available. Server may not have this language pack.`);
      }
    } catch (error: any) {
      log(`✗ Error loading ${langCode}: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Remote Language Pack Test</Text>

      {/* Quick Language Picker */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Load Language</Text>
        <Text style={styles.helperText}>Select a language to fetch and display localizations</Text>
        <View style={styles.languageGrid}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageButton,
                language === lang.code && styles.languageButtonActive,
                isLoading && styles.languageButtonDisabled,
              ]}
              onPress={() => handleQuickLoadLanguage(lang.code)}
              disabled={isLoading}
            >
              <Text style={styles.languageFlag}>{lang.flag}</Text>
              <Text style={[
                styles.languageCode,
                language === lang.code && styles.languageCodeActive,
              ]}>
                {lang.code}
              </Text>
              <Text style={styles.languageName}>{lang.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Localization Strings Display */}
      {localizationMap && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Localization Strings ({Object.keys(localizationMap).length} total)
          </Text>
          <View style={styles.localizationList}>
            {Object.entries(localizationMap).slice(0, 15).map(([key, value]) => (
              <View key={key} style={styles.localizationItem}>
                <Text style={styles.localizationKey}>{key}</Text>
                <Text style={styles.localizationValue}>{value}</Text>
              </View>
            ))}
            {Object.keys(localizationMap).length > 15 && (
              <Text style={styles.moreItemsText}>
                ... and {Object.keys(localizationMap).length - 15} more entries
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Configuration Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuration</Text>
        
        <Text style={styles.label}>Language Code:</Text>
        <TextInput
          style={styles.input}
          value={language}
          onChangeText={setLanguage}
          placeholder="EN, FR, TR, etc."
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Server URL:</Text>
        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="https://api.udentify.com"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Transaction ID:</Text>
        <View style={styles.transactionContainer}>
          <TextInput
            style={[styles.input, styles.transactionInput]}
            value={transactionId}
            onChangeText={setTransactionId}
            placeholder="Enter transaction ID or fetch from server"
          />
          <TouchableOpacity 
            style={[styles.fetchButton, isFetchingTransactionId && styles.fetchButtonDisabled]} 
            onPress={handleFetchTransactionId}
            disabled={isFetchingTransactionId}
          >
            <Text style={styles.fetchButtonText}>
              {isFetchingTransactionId ? 'Fetching...' : 'Fetch ID'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Timeout (seconds):</Text>
        <TextInput
          style={styles.input}
          value={timeout}
          onChangeText={setTimeout}
          placeholder="30"
          keyboardType="numeric"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity style={styles.button} onPress={handleMapSystemLanguage}>
          <Text style={styles.buttonText}>1. Detect System Language</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleInstantiateLocalization}>
          <Text style={styles.buttonText}>2. Instantiate Localization</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleGetLocalizationMap}>
          <Text style={styles.buttonText}>3. Get Localization Map</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleClearCache}>
          <Text style={styles.buttonText}>4. Clear Cache</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleTestFullWorkflow}>
          <Text style={styles.buttonText}>Run Full Workflow Test</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearResults}>
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      {/* Status Section */}
      {localizationMap && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Map Status</Text>
          <Text style={styles.statusText}>
            Entries: {Object.keys(localizationMap).length}
          </Text>
        </View>
      )}

      {/* Results Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Results Log</Text>
        <ScrollView style={styles.resultsContainer}>
          <Text style={styles.resultsText}>{results || 'No results yet. Run a test above.'}</Text>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 5,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  transactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  transactionInput: {
    flex: 1,
  },
  fetchButton: {
    backgroundColor: '#5856D6',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    minWidth: 90,
    alignItems: 'center',
  },
  fetchButtonDisabled: {
    backgroundColor: '#999',
  },
  fetchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#34C759',
    marginTop: 10,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  resultsContainer: {
    maxHeight: 300,
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultsText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
  helperText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 15,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  languageButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    width: '30%',
    alignItems: 'center',
    minHeight: 90,
    justifyContent: 'center',
  },
  languageButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  languageButtonDisabled: {
    opacity: 0.5,
  },
  languageFlag: {
    fontSize: 28,
    marginBottom: 5,
  },
  languageCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  languageCodeActive: {
    color: '#4CAF50',
  },
  languageName: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  localizationList: {
    gap: 8,
  },
  localizationItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  localizationKey: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  localizationValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  moreItemsText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
});

