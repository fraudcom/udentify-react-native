export {DocumentType} from './constants/DocumentType';
export type {DocumentTypeValue} from './constants/DocumentType';
export {DocumentSide} from './constants/DocumentSide';
export type {DocumentSideValue} from './constants/DocumentSide';
export {IQAFeedback} from './constants/IQAFeedback';
export type {IQAFeedbackValue} from './constants/IQAFeedback';

export type {
  IQAResult,
  IQABannerStyle,
  IQAButtonStyle,
  IQAProgressBarStyle,
  IQAImageStyle,
  IQAResultAreaPositioning,
  IQAScreenStyle,
} from './types/iqa.types';

export type {
  OCRResponse,
  OCRAndDocumentLivenessResponse,
} from './types/ocr.types';

export type {HologramResponse} from './types/hologram.types';

export type {
  DocumentLivenessResponse,
  OCRUIConfiguration,
} from './types/ui.types';

export {startOCRScanning} from './api/scanning';
export {performOCR, performOCRAndDocumentLiveness} from './api/ocr';
export {performDocumentLiveness} from './api/liveness';
export {startHologramCamera, performHologramCheck} from './api/hologram';
export {configureUISettings} from './api/config';
export type {PerformIQAResult} from './api/iqa';
export {performIQA, takePhoto} from './api/iqa';

export {addIQAResultListener, removeAllIQAResultListeners} from './events/iqaEvents';

export type {DirectiveEvent} from './events/directiveEvents';
export {
  addOCRDirectiveListener,
  addHologramDirectiveListener,
  removeAllDirectiveListeners,
} from './events/directiveEvents';
