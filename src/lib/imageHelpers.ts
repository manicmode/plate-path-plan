/**
 * Image helper functions for food items
 */

/**
 * Check if a string is a valid EAN/UPC barcode
 */
export function isEan(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  
  // Remove any non-digits
  const digits = code.replace(/\D/g, '');
  
  // Valid EAN/UPC lengths: 8, 12, 13, 14
  return [8, 12, 13, 14].includes(digits.length);
}

/**
 * Generate OpenFoodFacts image URLs from barcode
 */
export function offImageForBarcode(barcode: string): { imageUrl?: string; imageThumbUrl?: string } {
  if (!isEan(barcode)) return {};
  
  const cleanBarcode = barcode.replace(/\D/g, '');
  
  // OFF image URL pattern
  const baseUrl = `https://images.openfoodfacts.org/images/products`;
  
  // Format barcode with slashes (e.g., 123456789012 -> 123/456/789/012)
  const formattedBarcode = cleanBarcode.replace(/(\d{3})/g, '$1/').replace(/\/$/, '');
  
  return {
    imageUrl: `${baseUrl}/${formattedBarcode}/front_en.jpg`,
    imageThumbUrl: `${baseUrl}/${formattedBarcode}/front_en.200.jpg`
  };
}