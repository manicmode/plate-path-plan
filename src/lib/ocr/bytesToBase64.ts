export async function bytesToBase64JPEG(bytes: Uint8Array): Promise<string> {
  // Browser-safe encoding: Blob + FileReader (no huge spreads)
  const blob = new Blob([bytes], { type: 'image/jpeg' });
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error || new Error('readAsDataURL failed'));
    r.readAsDataURL(blob);
  });
  // "data:image/jpeg;base64,<payload>"
  return (dataUrl.split(',')[1] || '');
}

// Node/SSR fallback (should not run on web)
export function bytesToBase64Node(bytes: Uint8Array): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Buffer } = require('buffer');
  return Buffer.from(bytes).toString('base64');
}