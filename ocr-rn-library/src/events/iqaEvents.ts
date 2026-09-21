import {NativeEventEmitter, EmitterSubscription} from 'react-native';
import {OCRModule} from '../utils/moduleLoader';
import type {IQAResult} from '../types/iqa.types';

let iqaEventEmitter: NativeEventEmitter | null = null;

function getIQAEventEmitter(): NativeEventEmitter {
  if (!iqaEventEmitter && OCRModule) {
    iqaEventEmitter = new NativeEventEmitter(OCRModule);
  }
  if (!iqaEventEmitter) {
    throw new Error('Failed to create IQA event emitter. OCRModule not available.');
  }
  return iqaEventEmitter;
}

export function addIQAResultListener(
  callback: (result: IQAResult) => void
): () => void {
  try {
    const eventEmitter = getIQAEventEmitter();
    const subscription: EmitterSubscription = eventEmitter.addListener(
      'onIQAResult',
      callback
    );
    
    return () => {
      subscription.remove();
    };
  } catch (error) {
    console.warn('OCRModule - addIQAResultListener error:', error);
    return () => {};
  }
}

export function removeAllIQAResultListeners(): void {
  try {
    if (iqaEventEmitter) {
      iqaEventEmitter.removeAllListeners('onIQAResult');
    }
  } catch (error) {
    console.warn('OCRModule - removeAllIQAResultListeners error:', error);
  }
}

