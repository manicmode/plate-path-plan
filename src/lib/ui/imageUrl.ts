export function toDisplayableImageUrl(u?: string | null): string | null {
  if (!u) return null;
  if (u.startsWith('http')) return u;

  if (u.startsWith('data:image/')) {
    try {
      const headerEnd = u.indexOf(',');
      const meta = u.slice(5, headerEnd);             // e.g. "image/jpeg;base64"
      const mime = meta.split(';')[0];                // "image/jpeg"
      const b64 = u.slice(headerEnd + 1);

      const byteChars = atob(b64);
      const buf = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) buf[i] = byteChars.charCodeAt(i);

      const blob = new Blob([buf], { type: mime });
      return URL.createObjectURL(blob);
    } catch {
      return u; // fallback to original
    }
  }
  return u;
}