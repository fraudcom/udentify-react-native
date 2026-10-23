import {useCallback, useEffect, useRef} from 'react';
import {
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
  Platform,
} from 'react-native';
import {
  dispatchLivenessLaunch,
  type LivenessMode,
  type LivenessPhase,
  type BuildCredentialsParams,
} from './livenessLaunch';

const isTurboModuleEnabled = (global as any).__turboModuleProxy != null;

function resolveLivenessModule(): any {
  if (isTurboModuleEnabled) {
    try {
      const {TurboModuleRegistry} = require('react-native');
      return TurboModuleRegistry.getEnforcing('LivenessModule');
    } catch (error) {
      return NativeModules.LivenessModule;
    }
  }
  return NativeModules.LivenessModule;
}

export interface LivenessHandlers {
  onSuccess: (result: any) => void;
  onFailure: (error: any) => void;
  onDismiss: () => void;
}

export interface LaunchParams extends BuildCredentialsParams {
  phase: LivenessPhase;
  mode: LivenessMode;
}

export function useLiveness(handlers: LivenessHandlers) {
  const moduleRef = useRef<any>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  // Native liveness events are broadcast to every listener on the shared
  // module, including the standalone debug "Liveness" tab, which registers
  // its own listeners on the same events. Without this guard, exercising
  // liveness from the debug tab would also fire these app-level handlers and
  // hijack navigation into the real KYC screens. Only react to events that
  // occurred while a launch() from *this* hook is in flight.
  const sessionActiveRef = useRef(false);

  if (!moduleRef.current) {
    moduleRef.current = resolveLivenessModule();
  }

  useEffect(() => {
    const mod = moduleRef.current;
    if (!mod) {
      console.error('useLiveness - LivenessModule not available');
      return;
    }
    const emitter =
      Platform.OS === 'ios' ? new NativeEventEmitter(mod) : DeviceEventEmitter;

    const guarded = (fn: (e: any) => void) => (e: any) => {
      if (!sessionActiveRef.current) return;
      sessionActiveRef.current = false;
      fn(e);
    };

    const subs = [
      emitter.addListener(
        'onFaceRecognitionResult',
        guarded(e => handlersRef.current.onSuccess(e)),
      ),
      emitter.addListener(
        'onActiveLivenessResult',
        guarded(e => handlersRef.current.onSuccess(e)),
      ),
      emitter.addListener(
        'onFaceRecognitionFailure',
        guarded(e => handlersRef.current.onFailure(e)),
      ),
      emitter.addListener(
        'onActiveLivenessFailure',
        guarded(e => handlersRef.current.onFailure(e)),
      ),
      emitter.addListener(
        'onDidDismiss',
        guarded(() => handlersRef.current.onDismiss()),
      ),
    ];

    return () => subs.forEach(s => s.remove());
  }, []);

  const launch = useCallback(async (params: LaunchParams) => {
    const mod = moduleRef.current;
    if (!mod) {
      throw new Error('LivenessModule not available');
    }
    sessionActiveRef.current = true;
    try {
      return await dispatchLivenessLaunch(mod, params);
    } catch (error) {
      sessionActiveRef.current = false;
      throw error;
    }
  }, []);

  // The SDK camera reads configs (autoTake, invertedAnimation, ...) and colors
  // from the globally installed ApiSettingsProvider, NOT from the launch
  // credentials (findings 3.d/3.e). This installs them; call before every launch.
  const applyUiSettings = useCallback(
    async (uiSettings: {
      configs?: Record<string, unknown>;
      colors?: Record<string, unknown>;
    }) => {
      const mod = moduleRef.current;
      if (!mod?.configureUISettings) {
        return;
      }
      try {
        await mod.configureUISettings(uiSettings);
      } catch (error) {
        console.error('useLiveness - configureUISettings error:', error);
      }
    },
    [],
  );

  return {launch, applyUiSettings};
}
