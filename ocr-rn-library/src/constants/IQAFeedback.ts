export const IQAFeedback = {
  SUCCESS: 'success',
  BLUR_DETECTED: 'blurDetected',
  GLARE_DETECTED: 'glareDetected',
  HOLOGRAM_GLARE: 'hologramGlare',
  CARD_NOT_DETECTED: 'cardNotDetected',
  CARD_CLASSIFICATION_MISMATCH: 'cardClassificationMismatch',
  CARD_NOT_INTACT: 'cardNotIntact',
  FACE_NOT_DETECTED: 'faceNotDetected',
  MULTIPLE_DOCUMENTS_DETECTED: 'multipleDocumentsDetected',
  CHIP_NOT_DETECTED: 'chipNotDetected',
  SIGNATURE_NOT_DETECTED: 'signatureNotDetected',
  MODEL_FAILED: 'modelFailed',
  HIDDEN_PHOTO_NOT_DETECTED: 'hiddenPhotoNotDetected',
  PHOTO_CHEAT_DETECTED: 'photoCheatDetected',
  OTHER: 'other',
} as const;

export type IQAFeedbackValue = typeof IQAFeedback[keyof typeof IQAFeedback];

