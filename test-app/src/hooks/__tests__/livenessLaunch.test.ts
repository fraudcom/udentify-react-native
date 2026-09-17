import {describe, it, expect, jest} from '@jest/globals';
import {
  buildLivenessCredentials,
  planLivenessLaunch,
  dispatchLivenessLaunch,
} from '../livenessLaunch';

const baseParams = {
  serverURL: 'https://example.com',
  transactionID: 'tx-123',
  userID: 'user-1',
  autoTake: true,
  invertedAnimation: false,
};

describe('buildLivenessCredentials', () => {
  it('maps params and applies defaults', () => {
    const creds = buildLivenessCredentials(baseParams);
    expect(creds).toMatchObject({
      serverURL: 'https://example.com',
      transactionID: 'tx-123',
      userID: 'user-1',
      autoTake: true,
      invertedAnimation: false,
      errorDelay: 0.1,
      successDelay: 0.75,
      requestTimeout: 10,
      eyesOpenThreshold: 0.75,
      maskConfidence: 0.95,
      activeLivenessAutoNextEnabled: true,
      blinkDetectionEnabled: false,
      runInBackground: false,
    });
  });

  it('passes invertedAnimation through', () => {
    expect(
      buildLivenessCredentials({...baseParams, invertedAnimation: true})
        .invertedAnimation,
    ).toBe(true);
  });
});

describe('planLivenessLaunch', () => {
  const creds = buildLivenessCredentials(baseParams);

  it('faceCapture phase always maps to startFaceRecognitionRegistration (active)', () => {
    expect(planLivenessLaunch('faceCapture', 'active', creds)).toEqual({
      method: 'startFaceRecognitionRegistration',
      args: [creds],
    });
  });

  it('hybrid is single-session: faceCapture phase maps straight to startHybridLiveness as registration', () => {
    expect(planLivenessLaunch('faceCapture', 'hybrid', creds)).toEqual({
      method: 'startHybridLiveness',
      args: [creds, false],
    });
  });

  it('liveness + active maps to startActiveLiveness with isAuthentication true', () => {
    expect(planLivenessLaunch('liveness', 'active', creds)).toEqual({
      method: 'startActiveLiveness',
      args: [creds, true],
    });
  });

  it('liveness + hybrid also maps to startHybridLiveness as registration (single session)', () => {
    expect(planLivenessLaunch('liveness', 'hybrid', creds)).toEqual({
      method: 'startHybridLiveness',
      args: [creds, false],
    });
  });

  it('faceCapture + passive maps to startFaceRecognitionRegistration', () => {
    expect(planLivenessLaunch('faceCapture', 'passive', creds)).toEqual({
      method: 'startFaceRecognitionRegistration',
      args: [creds],
    });
  });

  it('passive never launches a second liveness session, even if asked', () => {
    expect(planLivenessLaunch('liveness', 'passive', creds)).toEqual({
      method: 'startFaceRecognitionRegistration',
      args: [creds],
    });
  });
});

describe('dispatchLivenessLaunch (two-session flow)', () => {
  function makeMockModule() {
    return {
      startFaceRecognitionRegistration: jest.fn(async () => ({ok: true})),
      startActiveLiveness: jest.fn(async () => ({ok: true})),
      startHybridLiveness: jest.fn(async () => ({ok: true})),
    };
  }

  it('faceCapture phase calls startFaceRecognitionRegistration only', async () => {
    const mod = makeMockModule();
    await dispatchLivenessLaunch(mod, {
      ...baseParams,
      phase: 'faceCapture',
      mode: 'active',
    });
    expect(mod.startFaceRecognitionRegistration).toHaveBeenCalledTimes(1);
    expect(mod.startActiveLiveness).not.toHaveBeenCalled();
    expect(mod.startHybridLiveness).not.toHaveBeenCalled();
  });

  it('liveness + active calls startActiveLiveness with isAuthentication=true', async () => {
    const mod = makeMockModule();
    await dispatchLivenessLaunch(mod, {
      ...baseParams,
      phase: 'liveness',
      mode: 'active',
    });
    expect(mod.startActiveLiveness).toHaveBeenCalledTimes(1);
    const callArgs = mod.startActiveLiveness.mock.calls[0] as any[];
    expect(callArgs[1]).toBe(true);
    expect(mod.startHybridLiveness).not.toHaveBeenCalled();
  });

  it('hybrid calls startHybridLiveness once with isAuthentication=false (single session)', async () => {
    const mod = makeMockModule();
    await dispatchLivenessLaunch(mod, {
      ...baseParams,
      phase: 'faceCapture',
      mode: 'hybrid',
    });
    expect(mod.startHybridLiveness).toHaveBeenCalledTimes(1);
    const callArgs = mod.startHybridLiveness.mock.calls[0] as any[];
    expect(callArgs[1]).toBe(false);
    expect(mod.startFaceRecognitionRegistration).not.toHaveBeenCalled();
    expect(mod.startActiveLiveness).not.toHaveBeenCalled();
  });

  it('passes the configured credentials (autoTake/invertedAnimation) through', async () => {
    const mod = makeMockModule();
    await dispatchLivenessLaunch(mod, {
      ...baseParams,
      phase: 'liveness',
      mode: 'active',
      autoTake: false,
      invertedAnimation: true,
    });
    const creds: any = (mod.startActiveLiveness.mock.calls[0] as any[])[0];
    expect(creds.autoTake).toBe(false);
    expect(creds.invertedAnimation).toBe(true);
    expect(creds.transactionID).toBe('tx-123');
  });
});
