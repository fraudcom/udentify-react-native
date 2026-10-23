import {OCRModule} from '../utils/moduleLoader';
import type {DocumentTypeValue} from '../constants/DocumentType';
import type {OCRResponse, OCRAndDocumentLivenessResponse} from '../types/ocr.types';

export async function performOCR(
  serverURL: string,
  transactionID: string,
  frontSideImage: string,
  backSideImage: string,
  documentType: DocumentTypeValue,
  country: string = 'TUR'
): Promise<OCRResponse> {
  try {
    return await OCRModule?.performOCR(
      serverURL,
      transactionID,
      frontSideImage,
      backSideImage,
      documentType,
      country
    );
  } catch (error) {
    console.warn('OCRModule - performOCR error:', error);
    throw error;
  }
}

export async function performOCRAndDocumentLiveness(
  serverURL: string,
  transactionID: string,
  frontSideImage: string,
  backSideImage: string,
  documentType: DocumentTypeValue,
  country: string = 'TUR'
): Promise<OCRAndDocumentLivenessResponse> {
  try {
    return await OCRModule?.performOCRAndDocumentLiveness(
      serverURL,
      transactionID,
      frontSideImage,
      backSideImage,
      documentType,
      country
    );
  } catch (error) {
    console.warn('OCRModule - performOCRAndDocumentLiveness error:', error);
    throw error;
  }
}

