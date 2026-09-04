export const DocumentSide = {
  FRONT: 'FRONT',
  BACK: 'BACK',
  BOTH: 'BOTH',
} as const;

export type DocumentSideValue = typeof DocumentSide[keyof typeof DocumentSide];

