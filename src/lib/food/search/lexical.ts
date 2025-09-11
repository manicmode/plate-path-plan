/**
 * Lexical tokenization utilities for food search
 */

/**
 * Extract significant tokens (≥3 chars) from a query string
 * Used for AND semantics in manual typing suggestions
 */
export function significantTokens(q: string, min = 3): string[] {
  return q
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length >= min);
}