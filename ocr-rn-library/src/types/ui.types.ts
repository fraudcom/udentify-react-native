import type {IQAScreenStyle} from './iqa.types';

export interface DocumentLivenessResponse {
  success: boolean;
  livenessScore: number;
  isLive: boolean;
  frontSideProbability: number;
  backSideProbability: number;
  message: string;
  timestamp: number;
}

export interface OCRUIConfiguration {
  placeholderTemplate?: 'hidden' | 'defaultStyle' | 'countrySpecificStyle';
  orientation?: 'horizontal' | 'vertical';
  
  backgroundColor?: string;
  /** Opacity (0.0-1.0) applied to `backgroundColor` on the placeholder/mask container. iOS only — Android has no dynamic color-override path for this SDK (see the static XML resource overrides documented in the README instead). */
  opacity?: number;
  borderColor?: string;
  cornerRadius?: number;
  borderWidth?: number;
  maskLayerColor?: string;
  buttonBackColor?: string;
  
  detectionAccuracy?: number;
  blurCoefficient?: number;
  /** 26.1.3: ratio (0.0-1.0) of the captured document image kept as the raw photo crop (default 0.35). */
  rawPhotoCropRatio?: number;
  /** 26.1.3: hologram capture — seconds recorded without flash before the flash sequence (default 2). */
  noFlashDuration?: number;
  /** 26.1.3: hologram capture — seconds of the flash sequence (default 3). */
  flashDuration?: number;
  /** 26.1.3: hologram capture — total recording duration in seconds (default 5). */
  totalDuration?: number;
  /** 26.1.3: hologram capture — video bitrate override (SDK default when unset). */
  bitrate?: number;
  requestTimeout?: number;
  backButtonEnabled?: boolean;
  reviewScreenEnabled?: boolean;
  reviewBackgroundColor?: string;
  reviewBackgroundStyle?: {
    imageBase64: string;
    contentMode?: 'scaleToFill' | 'scaleAspectFit' | 'scaleAspectFill';
    opacity?: number;
    borderColor?: string;
    borderWidth?: number;
    cornerRadius?: number;
  };
  footerViewHidden?: boolean;
  
  footerBackgroundColor?: string;
  footerTextColor?: string;
  footerFontSize?: number;
  footerHeight?: number;
  
  useButtonBackgroundColor?: string;
  useButtonTextColor?: string;
  useButtonFontSize?: number;
  useButtonHeight?: number;
  
  retakeButtonBackgroundColor?: string;
  retakeButtonTextColor?: string;
  retakeButtonFontSize?: number;
  retakeButtonHeight?: number;
  
  titleTextColor?: string;
  titleFontSize?: number;
  instructionTextColor?: string;
  instructionFontSize?: number;
  reviewTitleTextColor?: string;
  reviewTitleFontSize?: number;
  reviewInstructionTextColor?: string;
  reviewInstructionFontSize?: number;
  
  progressBackgroundColor?: string;
  progressColor?: string;
  progressCompletionColor?: string;
  progressCornerRadius?: number;
  progressTextColor?: string;
  progressFontSize?: number;
  
  tableName?: string;

  /** iOS only — colors the document's detection border while scanning. Android's SDK has no matching capability. */
  documentDetectionConfig?: {
    borderColorOnSuccess?: string;
    borderColorOnFailure?: string;
  };

  isIQAServiceEnabled?: boolean;
  iqaScreenStyle?: IQAScreenStyle;
}

