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
 * Generate OpenFoodFacts image URLs from barcode using correct path format
 */
export function offImageForBarcode(barcode: string): { imageUrl?: string; imageThumbUrl?: string } {
  if (!isEan(barcode)) return {};
  
  const correctPath = offPathFromBarcode(barcode);
  if (!correctPath) return {};
  
  const baseUrl = `https://images.openfoodfacts.org/images/products`;
  
  return {
    imageUrl: `${baseUrl}/${correctPath}/front_en.jpg`,
    imageThumbUrl: `${baseUrl}/${correctPath}/front_en.200.jpg`
  };
}

/**
 * Create OFF image URL from EAN with correct path chunking
 */
export function offImageUrlFromEan(ean: string, file: string = "front_en.jpg"): string {
  const path = offPathFromBarcode(ean);
  if (!path) return '';
  return `https://images.openfoodfacts.org/images/products/${path}/${file}`;
}

/**
 * Build correct OFF path as 848/000/082/3328 for barcode 8480000823328
 */
export function offPathFromBarcode(barcode: string) {
  const digits = (barcode || '').replace(/\D/g, '');
  if (!digits) return null;
  const len = digits.length;
  if (len < 8) return digits;

  const upto = len - 4;
  const parts: string[] = [];
  for (let i = 0; i < upto; i += 3) parts.push(digits.slice(i, i + 3));
  parts.push(digits.slice(upto));
  return parts.join('/');
}

/**
 * Generate multiple OFF image URL candidates to try in order
 */
export function offImageCandidates(barcode: string, size = 200, lang = 'en') {
  const p = offPathFromBarcode(barcode);
  if (!p) return [];
  return [
    `https://images.openfoodfacts.org/images/products/${p}/front_${lang}.${size}.jpg`,
    `https://images.openfoodfacts.org/images/products/${p}/front.${size}.jpg`,
    `https://images.openfoodfacts.org/images/products/${p}/front_${lang}.400.jpg`,
    `https://images.openfoodfacts.org/images/products/${p}/front.400.jpg`,
  ];
}