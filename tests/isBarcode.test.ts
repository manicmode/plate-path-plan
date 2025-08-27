import { describe, it, expect } from 'vitest';

// Helper function to detect if input is a barcode
const isBarcode = (input: string): boolean => {
  const cleaned = input.trim().replace(/\s+/g, '');
  // Check if it's all digits and has a reasonable barcode length (8-14 digits)
  return /^\d{8,14}$/.test(cleaned);
};

describe('isBarcode', () => {
  it('should detect valid barcodes', () => {
    expect(isBarcode('12345678')).toBe(true);
    expect(isBarcode('123456789012')).toBe(true);
    expect(isBarcode('12345678901234')).toBe(true);
    expect(isBarcode(' 12345678 ')).toBe(true); // with spaces
    expect(isBarcode('1234 5678')).toBe(true); // with middle space
  });

  it('should reject invalid barcodes', () => {
    expect(isBarcode('1234567')).toBe(false); // too short
    expect(isBarcode('123456789012345')).toBe(false); // too long
    expect(isBarcode('12345abc')).toBe(false); // contains letters
    expect(isBarcode('apple')).toBe(false); // text
    expect(isBarcode('organic chicken breast')).toBe(false); // description
    expect(isBarcode('')).toBe(false); // empty
    expect(isBarcode('   ')).toBe(false); // only spaces
  });

  it('should handle edge cases', () => {
    expect(isBarcode('00000000')).toBe(true); // all zeros
    expect(isBarcode('99999999')).toBe(true); // all nines
    expect(isBarcode('12-34-56-78')).toBe(false); // with dashes
    expect(isBarcode('12.34.56.78')).toBe(false); // with dots
  });
});