import {OCRModule} from '../utils/moduleLoader';
import type {DocumentTypeValue} from '../constants/DocumentType';
import type {DocumentSideValue} from '../constants/DocumentSide';

export async function startOCRScanning(
  serverURL: string,
  transactionID: string,
  documentType: DocumentTypeValue,
  documentSide: DocumentSideValue,
  country: string = 'TUR'
): Promise<boolean> {
  console.log('startOCRScanning called with OCRModule:', !!OCRModule);
  console.log('OCRModule - Country:', country);
  
  if (!OCRModule) {
    throw new Error('OCRModule not available. Please ensure the native module is properly linked.');
  }
  
  try {
    return await OCRModule.startOCRScanning(
      serverURL,
      transactionID,
      documentType,
      documentSide,
      country
    );
  } catch (error) {
    console.warn('OCRModule - startOCRScanning error:', error);
    return false;
  }
}

