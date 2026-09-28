import {useEffect, useState} from 'react';
import {NativeModules, Platform} from 'react-native';

// Visual margin kept above the Android system navigation bar.
const GAP = 16;
// Design baseline padding used on iOS and as the pre-resolve Android fallback.
const DEFAULT_BASE = 36;

// Resolved once from native, then reused across every screen.
let cachedInset: number | null = null;

/**
 * Bottom padding for a screen-anchored action bar, so it never sits under the
 * Android navigation bar. iOS returns `base` unchanged; Android adds the real
 * WindowInsets navigation-bar height.
 *
 * @param base Design padding used on iOS / until the native inset resolves.
 */
export function useBottomInset(base: number = DEFAULT_BASE): number {
  const [inset, setInset] = useState<number | null>(cachedInset);

  useEffect(() => {
    if (Platform.OS !== 'android' || cachedInset != null) {
      return;
    }
    const mod = NativeModules.InsetsModule;
    if (!mod?.getBottomInset) {
      return;
    }
    mod
      .getBottomInset()
      .then((value: number) => {
        cachedInset = value;
        setInset(value);
      })
      .catch((error: unknown) => {
        console.warn('useBottomInset - getBottomInset error:', error);
      });
  }, []);

  if (Platform.OS !== 'android') {
    return base;
  }
  return inset != null ? inset + GAP : base;
}
