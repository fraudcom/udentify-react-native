export interface OCRResponse {
  success: boolean;
  transactionID: string;
  documentType: string;
  extractedData: {
    firstName?: string;
    lastName?: string;
    documentNumber?: string;
    expiryDate?: string;
    birthDate?: string;
    nationality?: string;
    licenseType?: string;
    motherName?: string;
    fatherName?: string;
    gender?: string;
    identityNo?: string;
    documentIssuer?: string;
    countryCode?: string;
    isDocumentExpired?: boolean;
    isIDValid?: boolean;
    hasPhoto?: boolean;
    hasSignature?: boolean;
    /** 26.1.3: given name in the document's native script (empty unless the document carries native-script data). */
    nativeFirstName?: string;
    /** 26.1.3: surname in the document's native script (empty unless the document carries native-script data). */
    nativeLastName?: string;
    /** 26.1.3: gender in the document's native script (empty unless the document carries native-script data). */
    nativeGender?: string;
    /** Base64-encoded JPEG of the document portrait extracted by OCR (no data: prefix). */
    faceImage?: string;
  };
  message: string;
  timestamp: number;
}

export interface OCRAndDocumentLivenessResponse {
  success: boolean;
  transactionID: string;
  timestamp: number;
  
  ocrData?: OCRResponse;
  
  frontSideProbability?: number;
  backSideProbability?: number;
  frontSideResults?: Array<{
    name: string;
    probability: number;
    calibration: string;
  }>;
  backSideResults?: Array<{
    name: string;
    probability: number;
    calibration: string;
  }>;
}

