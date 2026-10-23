import {OCRModule} from '../utils/moduleLoader';
import type {DocumentLivenessResponse} from '../types/ui.types';

export async function performDocumentLiveness(
  serverURL: string,
  transactionID: string,
  frontSideImage: string,
  backSideImage: string
): Promise<DocumentLivenessResponse> {
  try {
    return await OCRModule?.performDocumentLiveness(
      serverURL,
      transactionID,
      frontSideImage,
      backSideImage
    );
  } catch (error) {
    console.warn('OCRModule - performDocumentLiveness error:', error);
    throw error;
  }
}

