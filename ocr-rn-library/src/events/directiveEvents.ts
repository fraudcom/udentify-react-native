import {NativeEventEmitter, EmitterSubscription} from 'react-native';
import {OCRModule} from '../utils/moduleLoader';

let directiveEventEmitter: NativeEventEmitter | null = null;

function getDirectiveEventEmitter(): NativeEventEmitter {
  if (!directiveEventEmitter && OCRModule) {
    directiveEventEmitter = new NativeEventEmitter(OCRModule);
  }
  if (!directiveEventEmitter) {
    throw new Error(
      'Failed to create directive event emitter. OCRModule not available.',
    );
  }
  return directiveEventEmitter;
}

export interface DirectiveEvent {
  directive: string;
  timestamp: number;
}

export function addOCRDirectiveListener(
  callback: (event: DirectiveEvent) => void,
): () => void {
  try {
    const eventEmitter = getDirectiveEventEmitter();
    const subscription: EmitterSubscription = eventEmitter.addListener(
      'onOCRDirectiveChanged',
      callback,
    );
    return () => {
      subscription.remove();
    };
  } catch (error) {
    console.warn('OCRModule - addOCRDirectiveListener error:', error);
    return () => {};
  }
}

export function addHologramDirectiveListener(
  callback: (event: DirectiveEvent) => void,
): () => void {
  try {
    const eventEmitter = getDirectiveEventEmitter();
    const subscription: EmitterSubscription = eventEmitter.addListener(
      'onHologramDirectiveChanged',
      callback,
    );
    return () => {
      subscription.remove();
    };
  } catch (error) {
    console.warn('OCRModule - addHologramDirectiveListener error:', error);
    return () => {};
  }
}

export function removeAllDirectiveListeners(): void {
  try {
    if (directiveEventEmitter) {
      directiveEventEmitter.removeAllListeners('onOCRDirectiveChanged');
      directiveEventEmitter.removeAllListeners('onHologramDirectiveChanged');
    }
  } catch (error) {
    console.warn('OCRModule - removeAllDirectiveListeners error:', error);
  }
}
