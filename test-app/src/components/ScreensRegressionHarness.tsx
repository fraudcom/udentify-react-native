/**
 * TEMPORARY test harness - not part of the app. Verifies VideoCallView
 * against react-native-screens' native stack:
 *
 *  1. mount crash: pushing the call screen attaches VideoCallView from inside
 *     ScreenStack.onUpdate's own commitNowAllowingStateLoss()
 *  2. session retention: pushing a screen OVER the call screen removes the
 *     call screen's fragment (detaching our view) and popping re-attaches the
 *     same view instance
 *  3. registration: after a call ends while its view is still mounted, JS
 *     lookups must stop resolving to that view
 *  4. one call at a time: starting a second call ends the first
 *
 * Uses ScreenStack/ScreenStackItem directly rather than react-navigation, so
 * the native code path is exactly the one in the crash report and no extra
 * dependencies are needed.
 */
import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {ScreenStack, ScreenStackItem, enableScreens} from 'react-native-screens';
import {
  VideoCall,
  VideoCallView,
  type VideoCallCredentials,
} from 'video-call-rn-library';

import {udentifyApiService} from '../services/udentifyApiService';
import {currentConfig} from '../config/apiConfig';
import {videoCallConfig} from '../config/videoCallConfig';

const TAG = 'RNS_HARNESS';
const log = (...args: unknown[]) => console.log(TAG, ...args);

type Entry =
  | {route: 'home'}
  | {route: 'dummy'}
  | {route: 'call'; creds: VideoCallCredentials};

async function fetchCredentials(): Promise<VideoCallCredentials | null> {
  const perms = await VideoCall.checkPermissions();
  if (!perms.hasCameraPermission || !perms.hasRecordAudioPermission) {
    const granted = await VideoCall.requestPermissions();
    if (granted !== 'granted') {
      Alert.alert('Permission required');
      return null;
    }
  }
  const txId = await udentifyApiService.getVideoCallTransactionId(152);
  if (!txId) {
    Alert.alert('No transaction id');
    return null;
  }
  return {
    serverURL: currentConfig.baseUrl,
    wssURL: currentConfig.wssURL || 'wss://vcs.fraud.com',
    userID: `harness_${Date.now()}`,
    transactionID: txId,
    clientName: currentConfig.clientName || 'TestClient_RN',
    idleTimeout: '30',
  };
}

export default function ScreensRegressionHarness() {
  const [entries, setEntries] = useState<Entry[]>([{route: 'home'}]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('-');

  const push = (e: Entry) => setEntries(prev => [...prev, e]);
  const pop = () => setEntries(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));

  const startCall = useCallback(
    async (label: string) => {
      if (loading) return;
      setLoading(true);
      try {
        const creds = await fetchCredentials();
        if (!creds) {
          setLoading(false);
          return;
        }
        log(label, 'tx=', creds.transactionID);
        setLoading(false);
        push({route: 'call', creds});
      } catch (e) {
        log('start error', e);
        Alert.alert('Error', String(e));
        setLoading(false);
      }
    },
    [loading],
  );

  return (
    <ScreenStack style={styles.fill}>
      {entries.map((entry, i) => {
        const key = `${entry.route}-${i}`;
        if (entry.route === 'home') {
          return (
            <ScreenStackItem
              key={key}
              screenId={key}
              style={StyleSheet.absoluteFill}
              headerConfig={{title: 'Harness', hidden: false}}>
              <View style={styles.center}>
                {loading ? (
                  <ActivityIndicator size="large" />
                ) : (
                  <Button
                    title="1. Start call (push call screen)"
                    onPress={() => startCall('PUSH_CALL_SCREEN')}
                  />
                )}
              </View>
            </ScreenStackItem>
          );
        }
        if (entry.route === 'call') {
          return (
            <ScreenStackItem
              key={key}
              screenId={key}
              style={StyleSheet.absoluteFill}
              onDismissed={pop}
              headerConfig={{title: 'Call', hidden: true}}>
              <View style={styles.fill}>
                <VideoCallView
                  style={StyleSheet.absoluteFill}
                  credentials={entry.creds}
                  config={videoCallConfig}
                  onStatusChanged={s => {
                    log('STATUS', s);
                    setStatus(String(s));
                  }}
                  onError={e => log('ERROR', JSON.stringify(e))}
                  onUserStateChanged={s => log('USER_STATE', s)}
                  onParticipantStateChanged={e =>
                    log('PARTICIPANT_STATE', JSON.stringify(e))
                  }
                  onVideoCallEnded={e => log('ENDED', JSON.stringify(e))}
                />
                <View style={styles.overlay} pointerEvents="box-none">
                  <Text style={styles.badge}>
                    screen #{i} status: {status}
                  </Text>
                  <Button
                    title="2. Push dummy OVER call"
                    onPress={() => {
                      log('PUSH_DUMMY');
                      push({route: 'dummy'});
                    }}
                  />
                  <View style={styles.gap} />
                  <Button
                    title="4. Start SECOND call over this one"
                    onPress={() => startCall('PUSH_SECOND_CALL')}
                  />
                  <View style={styles.gap} />
                  <Button
                    title="End call"
                    onPress={async () => {
                      log('END_CALL');
                      try {
                        const r = await VideoCall.endVideoCall();
                        log('END_CALL_RESULT', JSON.stringify(r));
                      } catch (e) {
                        log('endVideoCall rejected', String(e));
                      }
                    }}
                  />
                  <View style={styles.gap} />
                  <Button
                    title="3. Probe after end (status + cancel)"
                    onPress={async () => {
                      try {
                        const st = await VideoCall.getVideoCallStatus();
                        log('PROBE_STATUS', String(st));
                      } catch (e) {
                        log('PROBE_STATUS_ERR', String(e));
                      }
                      try {
                        await VideoCall.cancelVideoCall();
                        log('PROBE_CANCEL', 'resolved');
                      } catch (e: any) {
                        log('PROBE_CANCEL_CODE', String(e?.code), 'MSG', String(e?.message));
                      }
                    }}
                  />
                  <View style={styles.gap} />
                  <Button
                    title="Pop this screen (unmount)"
                    onPress={() => {
                      log('POP_CALL_SCREEN');
                      pop();
                    }}
                  />
                </View>
              </View>
            </ScreenStackItem>
          );
        }
        return (
          <ScreenStackItem
            key={key}
            screenId={key}
            style={StyleSheet.absoluteFill}
            onDismissed={pop}
            headerConfig={{title: 'Dummy', hidden: false}}>
            <View style={styles.center}>
              <Text style={styles.text}>Call screen is now covered.</Text>
              <View style={styles.gap} />
              <Button
                title="3. Pop back to call"
                onPress={() => {
                  log('POP_DUMMY');
                  pop();
                }}
              />
              <View style={styles.gap} />
              <Button
                title="Query status from JS"
                onPress={async () => {
                  try {
                    const s = await VideoCall.getVideoCallStatus();
                    log('STATUS_WHILE_COVERED', String(s));
                  } catch (e) {
                    log('STATUS_WHILE_COVERED_ERR', String(e));
                  }
                }}
              />
            </View>
          </ScreenStackItem>
        );
      })}
    </ScreenStack>
  );
}

enableScreens(true);

const styles = StyleSheet.create({
  fill: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'},
  overlay: {position: 'absolute', left: 12, right: 12, bottom: 30},
  badge: {color: '#fff', backgroundColor: '#000a', padding: 6, marginBottom: 8},
  gap: {height: 8},
  text: {fontSize: 16, color: '#111'},
});
