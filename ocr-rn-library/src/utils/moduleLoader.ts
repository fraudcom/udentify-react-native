import {NativeModules} from 'react-native';

const isTurboModuleEnabled = (global as any).__turboModuleProxy != null;

let OCRModule: any;

console.log('🚀 OCRLibrary - Loading started');
console.log('🔧 TurboModule enabled:', isTurboModuleEnabled);

try {
  if (isTurboModuleEnabled) {
    const NativeOCRModule = require('../NativeOCRModule').default;
    OCRModule = NativeOCRModule;
    console.log('✅ OCRLibrary - TurboModule loaded successfully');
  } else {
    OCRModule = NativeModules.OCRModule;
    console.log('✅ OCRLibrary - Legacy module loaded successfully');
  }
} catch (error) {
  console.warn('❌ OCRLibrary - Failed to load module:', error);
  OCRModule = NativeModules.OCRModule;
  console.log('🔄 OCRLibrary - Falling back to legacy module');
}

console.log('🔧 TurboModule enabled:', isTurboModuleEnabled);
console.log('📦 OCRModule found:', !!OCRModule);

export {OCRModule};

