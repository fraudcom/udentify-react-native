import React, {useMemo, useRef, useState} from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

/**
 * Pure-JS slider, drop-in replacement for @react-native-community/slider.
 *
 * The community slider ships a Fabric component (RNCSliderComponentView) that,
 * under the New Architecture on iOS, gets dead-stripped from the app binary
 * because it is only ever referenced by string via NSClassFromString. That
 * produces the runtime "Unimplemented component: <RNCSlider>" error. This
 * component avoids the native dependency entirely, so it works identically on
 * iOS and Android across both architectures.
 */
interface SliderProps {
  style?: StyleProp<ViewStyle>;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  value?: number;
  onValueChange?: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
}

const THUMB_SIZE = 24;

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

const quantize = (v: number, min: number, max: number, step: number) => {
  const bounded = clamp(v, min, max);
  if (!step || step <= 0) {
    return bounded;
  }
  const snapped = min + Math.round((bounded - min) / step) * step;
  // Avoid floating-point drift (e.g. 0.35000000000000003).
  const decimals = (String(step).split('.')[1] || '').length;
  return clamp(parseFloat(snapped.toFixed(decimals)), min, max);
};

const Slider: React.FC<SliderProps> = ({
  style,
  minimumValue = 0,
  maximumValue = 1,
  step = 0,
  value = 0,
  onValueChange,
  minimumTrackTintColor = '#4535B0',
  maximumTrackTintColor = '#E8E8E8',
  thumbTintColor = '#FFFFFF',
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const widthRef = useRef(0);

  const range = maximumValue - minimumValue || 1;
  const ratio = clamp((value - minimumValue) / range, 0, 1);

  const emit = (locationX: number) => {
    const w = widthRef.current;
    if (w <= 0 || !onValueChange) {
      return;
    }
    const usable = Math.max(w - THUMB_SIZE, 1);
    const x = clamp(locationX - THUMB_SIZE / 2, 0, usable);
    const raw = minimumValue + (x / usable) * range;
    onValueChange(quantize(raw, minimumValue, maximumValue, step));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => emit(e.nativeEvent.locationX),
        onPanResponderMove: e => emit(e.nativeEvent.locationX),
      }),
    // emit closes over the latest props via refs / fresh render, recreate cheaply
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minimumValue, maximumValue, step, range, onValueChange],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setTrackWidth(w);
  };

  const usable = Math.max(trackWidth - THUMB_SIZE, 0);
  const thumbLeft = usable * ratio;

  return (
    <View
      style={[styles.container, style]}
      onLayout={onLayout}
      {...panResponder.panHandlers}>
      <View style={styles.trackWrapper}>
        <View
          style={[styles.track, {backgroundColor: maximumTrackTintColor}]}
        />
        <View
          style={[
            styles.track,
            styles.filledTrack,
            {
              backgroundColor: minimumTrackTintColor,
              width: thumbLeft + THUMB_SIZE / 2,
            },
          ]}
        />
      </View>
      <View
        style={[
          styles.thumb,
          {backgroundColor: thumbTintColor, left: thumbLeft},
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
  },
  trackWrapper: {
    height: 4,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
  },
  filledTrack: {
    right: undefined,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default Slider;
