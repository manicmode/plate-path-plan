// src/lib/offImages.ts
export function chunkBarcode(code: string) {
  const digits = (code ?? '').replace(/\D/g, '');
  return digits.match(/.{1,3}/g)?.join('/') ?? '';
}

export function offImageCandidates(code: string, lang: string = 'en') {
  const base = `https://images.openfoodfacts.org/images/products/${chunkBarcode(code)}`;
  // Try high → low, and language → generic
  return [
    `${base}/front_${lang}.400.jpg`,
    `${base}/front_${lang}.200.jpg`,
    `${base}/front.400.jpg`,
    `${base}/front.jpg`,
  ];
}