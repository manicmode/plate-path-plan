/**
 * Name sanitization helper to clean up duplicate "Generic" prefixes
 */

export function sanitizeName(name: string): string {
  return name.replace(/^\s*generic\s+/i, '').replace(/\s+/g, ' ').trim();
}