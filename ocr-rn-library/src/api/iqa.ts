import {OCRModule} from '../utils/moduleLoader';

export interface PerformIQAResult {
  qualified: boolean;
  displayMessage?: string;
  rawMessage?: string;
  documentSide?: string;
  timestamp: number;
}

export async function takePhoto(): Promise<string> {
  if (!OCRModule) {
    throw new Error('OCRModule not available.');
  }
  return await OCRModule.takePhoto();
}

export async function performIQA(
  serverURL: string,
  transactionID: string,
  imageBase64: string,
  documentType: string,
  documentSide: string,
  country: string = 'TUR',
): Promise<PerformIQAResult> {
  if (!OCRModule) {
    throw new Error('OCRModule not available.');
  }
  return (await OCRModule.performIQA(
    serverURL,
    transactionID,
    imageBase64,
    documentType,
    documentSide,
    country,
  )) as PerformIQAResult;
}
