// src/lib/offImages.ts
export const offPathFromEan = (ean: string) =>
  `${ean.slice(0,3)}/${ean.slice(3,6)}/${ean.slice(6,9)}/${ean.slice(9)}`;

export function offImageCandidates(ean: string, locale = 'en') {
  const p = offPathFromEan(ean);
  const bases = [
    // use STATIC first (friendlier to hotlinking), then IMAGES as fallbacks
    `https://static.openfoodfacts.org/images/products/${p}`,
    `https://images.openfoodfacts.org/images/products/${p}`,
  ];
  const names = [
    `front_${locale}.400.jpg`,
    `front.400.jpg`,
    `front_${locale}.200.jpg`,
    `front.200.jpg`,
    `front_${locale}.jpg`,
    `front.jpg`,
  ];
  const urls: string[] = [];
  for (const b of bases) for (const n of names) urls.push(`${b}/${n}`);
  return Array.from(new Set(urls)); // de-dupe
}