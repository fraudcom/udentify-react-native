import {NativeModules} from 'react-native';

interface CustomScreensNative {
  setEnabled(enabled: boolean, language: string): Promise<string[]>;
}

// Native module (Android and iOS) that puts the example custom screens in
// front of the OCR, NFC and Face redos, in the app's language. Resolves with the roles it covers.
const native: CustomScreensNative | undefined = NativeModules.CustomScreens;

export async function setCustomScreens(enabled: boolean, language: string): Promise<string[]> {
  if (!native) {
    return [];
  }
  return native.setEnabled(enabled, language);
}
