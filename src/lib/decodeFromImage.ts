// Uses existing decode helpers. Prefer your current frame-decoder from canvas.
export async function decodeBarcodeFromFile(file: File): Promise<string | null> {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width; canvas.height = bmp.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0);

  // Try the BarcodeDetector API as a fallback:
  if ('BarcodeDetector' in window) {
    // @ts-ignore
    const det = new BarcodeDetector({ formats: ['ean_13','ean_8','upc_a','upc_e','code_128','qr_code'] });
    // @ts-ignore
    const hits = await det.detect(canvas);
    return hits?.[0]?.rawValue || null;
  }

  return null;
}