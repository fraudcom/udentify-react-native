export interface HologramResponse {
  success: boolean;
  transactionID: string;
  idNumber: string;
  hologramExists: boolean;
  ocrIdAndHologramIdMatch: boolean;
  ocrFaceAndHologramFaceMatch: boolean;
  hologramFaceImageBase64?: string;
  error?: string;
  timestamp: number;
}

