export const DocumentType = {
  ID_CARD: 'ID_CARD',
  PASSPORT: 'PASSPORT',
  DRIVER_LICENSE: 'DRIVER_LICENSE',
} as const;

export type DocumentTypeValue = typeof DocumentType[keyof typeof DocumentType];

