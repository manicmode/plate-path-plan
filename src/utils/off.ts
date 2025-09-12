/**
 * OpenFoodFacts utilities
 */

export function offImageUrlFromEan(ean: string, file: string = "front_en.jpg"): string {
  const id = ean.replace(/\D/g, "");
  const parts = [id.slice(0,3), id.slice(3,6), id.slice(6,9), id.slice(9)];
  const path = parts.filter(Boolean).join("/");
  return `https://images.openfoodfacts.org/images/products/${path}/${file}`;
}