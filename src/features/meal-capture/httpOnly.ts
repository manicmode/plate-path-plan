/**
 * HTTP-only URL guard
 * Ensures no base64 URLs leak into navigation or props
 */

export function httpOnly(url?: string): string | undefined {
  if (!url) return undefined;
  
  // Only allow HTTP/HTTPS URLs, reject data: URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Log rejection for debugging
  if (import.meta.env.VITE_DEBUG_MEAL === '1') {
    console.warn('[MEAL][HTTP_ONLY][REJECT]', { 
      urlType: url.startsWith('data:') ? 'base64' : 'other',
      length: url.length 
    });
  }
  
  return undefined;
}