import type {IQAFeedbackValue} from '../constants/IQAFeedback';

export interface IQAResult {
  documentSide: 'frontSide' | 'backSide' | 'bothSides';
  feedback: IQAFeedbackValue;
  message: string;
  /** 26.1.3: whether the image passed all IQA modules. */
  qualified?: boolean;
  /** 26.1.3: localized display message for the IQA result. */
  displayMessage?: string;
  /** 26.1.3: raw server message for the IQA result. */
  rawMessage?: string;
  /**
   * 26.1.3: per-module IQA check results keyed by check name
   * (e.g. photoCheatSatisfied, chipExistenceSatisfied, signatureExistenceSatisfied).
   */
  checks?: Record<string, boolean>;
  timestamp: number;
}

export interface IQABannerStyle {
  backgroundColor?: string;
  iconColor?: string;
  titleColor?: string;
  descriptionColor?: string;
  fontSize?: number;
}

export interface IQAButtonStyle {
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
}

export interface IQAProgressBarStyle {
  backgroundColor?: string;
  progressColor?: string;
  completionColor?: string;
  textColor?: string;
  fontSize?: number;
}

export interface IQAImageStyle {
  backgroundColor?: string;
  borderColor?: string;
  cornerRadius?: number;
  borderWidth?: number;
}

export interface IQAResultAreaPositioning {
  target?: 'container' | 'containerNoSafeArea' | 'overlayImage' | 'ocrPhoto' | 'footerView';
  horizontalPadding?: number;
  verticalOffset?: number;
}

export interface IQAScreenStyle {
  backgroundColor?: string;
  
  titleTextColor?: string;
  titleFontSize?: number;
  
  successBanner?: IQABannerStyle;
  failureBanner?: IQABannerStyle;
  reasonBanner?: IQABannerStyle;
  
  successButton?: IQAButtonStyle;
  retakeButton?: IQAButtonStyle;
  
  progressBar?: IQAProgressBarStyle;
  
  dismissAfterSuccessInSeconds?: number;
  
  overlayImageStyle?: IQAImageStyle;
  ocrImageStyle?: IQAImageStyle;
  
  resultAreaPositioning?: IQAResultAreaPositioning;
}

