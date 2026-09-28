import React, {createContext, useContext, useState, useEffect, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {currentConfig, getCurrentConfig, type ApiConfig} from './apiConfig';
import {udentifyApiService} from '../services/udentifyApiService';

const STORAGE_KEY = '@udentify_settings';

export interface AppSettings {
  // API config fields
  apiKey: string;
  baseUrl: string;
  baseURL: string;
  wssURL: string;
  clientName: string;
  timeout: number;
  retryAttempts: number;
  // Extra settings
  channelId: string;
  qrCodeActivation: boolean;
  // NFC settings
  isActiveAuthenticationEnabled: boolean;
  isPassiveAuthenticationEnabled: boolean;
  // Face settings
  faceAutoSelfie: boolean;
  faceInvertedAnimation: boolean;
  faceAllowMultipleFaces: boolean;
  faceLivenessMode: string;
  // OCR settings
  ocrEnableReview: boolean;
  ocrEnableIQA: boolean;
  ocrEnableHologramCheck: boolean;
  ocrDocumentLiveness: boolean;
  ocrBlurCoefficient: number;
  ocrDetectionAccuracy: number;
  ocrVideoCall: boolean;
  ocrVideoCallUrl: string;
  // OCR 26.1.3 settings
  ocrRawPhotoCropRatio: number;
  hologramNoFlashDuration: number;
  hologramFlashDuration: number;
  hologramTotalDuration: number;
  hologramBitrate: number;
  // Language settings
  language: string;
  // Debug: when enabled, testers can open the legacy tab playground ('main')
  debugMenuEnabled: boolean;
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  isLoaded: boolean;
}

function getDefaultSettings(): AppSettings {
  const config = getCurrentConfig();
  return {
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    baseURL: config.baseURL || config.baseUrl,
    wssURL: config.wssURL || '',
    clientName: config.clientName || '',
    timeout: config.timeout,
    retryAttempts: config.retryAttempts,
    channelId: '152',
    qrCodeActivation: false,
    isActiveAuthenticationEnabled: true,
    isPassiveAuthenticationEnabled: false,
    faceAutoSelfie: true,
    faceInvertedAnimation: false,
    faceAllowMultipleFaces: false,
    faceLivenessMode: 'active',
    ocrEnableReview: true,
    ocrEnableIQA: false,
    ocrEnableHologramCheck: false,
    ocrDocumentLiveness: true,
    ocrBlurCoefficient: 0.1,
    ocrDetectionAccuracy: 5,
    ocrVideoCall: true,
    ocrVideoCallUrl: config.baseURL || config.baseUrl,
    // OCR 26.1.3 defaults
    ocrRawPhotoCropRatio: 0.35,
    hologramNoFlashDuration: 2,
    hologramFlashDuration: 3,
    hologramTotalDuration: 5,
    hologramBitrate: 6,
    language: 'TR',
    debugMenuEnabled: false,
  };
}

function syncToLegacy(settings: AppSettings) {
  // Sync to mutable currentConfig (so existing imports keep working)
  currentConfig.apiKey = settings.apiKey;
  currentConfig.baseUrl = settings.baseUrl;
  currentConfig.baseURL = settings.baseURL;
  currentConfig.wssURL = settings.wssURL;
  currentConfig.clientName = settings.clientName;
  currentConfig.timeout = settings.timeout;
  currentConfig.retryAttempts = settings.retryAttempts;

  // Sync the API service singleton
  udentifyApiService.configure(settings.baseUrl, settings.apiKey);
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({children}: {children: React.ReactNode}) {
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          const saved: Partial<AppSettings> = JSON.parse(raw);
          const merged = {...getDefaultSettings(), ...saved};
          setSettings(merged);
          syncToLegacy(merged);
        }
      })
      .catch(err => {
        console.error('SettingsContext - Failed to load settings:', err);
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = {...prev, ...partial};
      syncToLegacy(next);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(err => {
        console.error('SettingsContext - Failed to save settings:', err);
      });
      return next;
    });
  }, []);

  const resetSettings = useCallback(async () => {
    const defaults = getDefaultSettings();
    setSettings(defaults);
    syncToLegacy(defaults);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(err => {
      console.error('SettingsContext - Failed to clear settings:', err);
    });
  }, []);

  return (
    <SettingsContext.Provider value={{settings, updateSettings, resetSettings, isLoaded}}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}
