export type BarcodeKind = 'EAN13' | 'UPC' | 'EAN8' | 'UNKNOWN';

export function normalizeBarcode(raw: string): { normalized: string; kind: BarcodeKind } {
  const digits = (raw || '').replace(/\D+/g, '');
  if (!digits) return { normalized: '', kind: 'UNKNOWN' };

  // EAN-13 (13 digits) as-is
  if (digits.length === 13) return { normalized: digits, kind: 'EAN13' };

  // UPC-A (12) → EAN-13 by prefixing '0'
  if (digits.length === 12) return { normalized: '0' + digits, kind: 'UPC' };

  // EAN-8 (8) keep as-is (server must handle both)
  if (digits.length === 8) return { normalized: digits, kind: 'EAN8' };

  // Anything else → try left-pad UPC to EAN-13 when length 11
  if (digits.length === 11) return { normalized: '0' + digits + calcEAN13Check('0' + digits), kind: 'UPC' };

  return { normalized: digits, kind: 'UNKNOWN' };
}

// Optional: compute/check digit when needed (keep minimal for safety)
function calcEAN13Check(first12: string): string {
  const d = first12.slice(0, 12).split('').map(Number);
  const sum = d.reduce((acc, n, i) => acc + n * (i % 2 ? 3 : 1), 0);
  const cd = (10 - (sum % 10)) % 10;
  return String(cd);
}
