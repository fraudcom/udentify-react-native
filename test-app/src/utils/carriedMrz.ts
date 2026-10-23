// The three chip access fields an NFC redo needs, as the SDKs take them: the
// document number as printed in the MRZ, and both dates as YYMMDD.
export interface CarriedMrz {
  documentNumber: string;
  dateOfBirth: string;
  expiryDate: string;
}

// `15.03.1990` (the printed format of an OCR result) or an MRZ date that already is
// `900315`. Anything else is null: a date is never guessed.
export function toYYMMDD(value?: string | null): string | null {
  const text = (value ?? '').trim();
  if (/^\d{6}$/.test(text)) {
    return text;
  }
  const match = /^(\d{2})[./-](\d{2})[./-](\d{4})$/.exec(text);
  if (!match) {
    return null;
  }
  const [, day, month, year] = match;
  const d = Number(day);
  const m = Number(month);
  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return null;
  }
  return `${year.slice(2)}${month}${day}`;
}

function documentNumberOf(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, '').toUpperCase();
}

// All three fields or nothing: a partial value would only fail at the chip.
export function carriedMrz(
  documentNumber?: string | null,
  dateOfBirth?: string | null,
  expiryDate?: string | null,
): CarriedMrz | null {
  const number = documentNumberOf(documentNumber);
  const birth = toYYMMDD(dateOfBirth);
  const expiry = toYYMMDD(expiryDate);
  return number && birth && expiry
    ? {documentNumber: number, dateOfBirth: birth, expiryDate: expiry}
    : null;
}

// From the extractedData of an OCR result. The printed values must match the MRZ
// exactly, so a scan of the MRZ itself is the better source when both exist.
export function carriedMrzFromOcr(
  extracted?: Record<string, any> | null,
): CarriedMrz | null {
  return carriedMrz(
    extracted?.documentNumber,
    extracted?.birthDate,
    extracted?.expiryDate ?? extracted?.expireDate,
  );
}
