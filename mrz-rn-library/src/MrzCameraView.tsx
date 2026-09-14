import React from 'react';
import {
  requireNativeComponent,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle,
  Platform,
  View,
} from 'react-native';

type MrzDetectedEvent = NativeSyntheticEvent<{
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiration: string;
}>;

type MrzErrorEvent = NativeSyntheticEvent<{errorMessage: string}>;

interface NativeMrzCameraViewProps {
  style?: StyleProp<ViewStyle>;
  focusViewBorderColor?: string;
  focusViewStrokeWidth?: number;
  paused?: boolean;
  onMrzDetected?: (e: MrzDetectedEvent) => void;
  onMrzError?: (e: MrzErrorEvent) => void;
}

const NativeMrzCameraView =
  Platform.OS === 'ios' || Platform.OS === 'android'
    ? requireNativeComponent<NativeMrzCameraViewProps>('MrzCameraView')
    : null;

export interface MrzCameraViewProps {
  style?: StyleProp<ViewStyle>;
  /** Focus view border color (hex, e.g. "#4ECBA6") */
  focusViewBorderColor?: string;
  /** Focus view stroke width */
  focusViewStrokeWidth?: number;
  /** When true, the camera preview and MRZ detection are paused */
  paused?: boolean;
  /**
   * Fired when MRZ is successfully detected.
   * The native view pauses detection after firing; unmount the view or
   * navigate away to fully release the camera.
   */
  onMrzDetected?: (data: {
    documentNumber: string;
    dateOfBirth: string;
    dateOfExpiration: string;
  }) => void;
  /** Fired when the camera or SDK reports an error */
  onMrzError?: (error: {errorMessage: string}) => void;
}

export const MrzCameraView: React.FC<MrzCameraViewProps> = ({
  style,
  focusViewBorderColor,
  focusViewStrokeWidth,
  paused,
  onMrzDetected,
  onMrzError,
}) => {
  if (!NativeMrzCameraView) {
    return <View style={style} />;
  }
  return (
    <NativeMrzCameraView
      style={style}
      focusViewBorderColor={focusViewBorderColor}
      focusViewStrokeWidth={focusViewStrokeWidth}
      paused={paused}
      onMrzDetected={e => onMrzDetected?.(e.nativeEvent)}
      onMrzError={e => onMrzError?.(e.nativeEvent)}
    />
  );
};
