/**
 * Score extraction and normalization utilities for health analysis
 * Handles various score formats and ensures consistent 0-100 scaling
 */

/**
 * Extract and normalize health score to 0-100 scale
 * Handles fractions (e.g., "7/10"), decimals (0-1 scale), and percentages (0-100)
 */
export function extractScore(raw: unknown): number | undefined {
  const candidate =
    raw && typeof raw === 'object' ? (raw as any).score ?? (raw as any).value ?? raw : raw;
  if (candidate == null) return undefined;
  const s = String(candidate).trim();

  // Handle fraction format (e.g., "7/10")
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const num = Number(frac[1]), den = Number(frac[2] || 100);
    if (Number.isFinite(num) && Number.isFinite(den) && den > 0) {
      return Math.max(0, Math.min(100, (num / den) * 100));
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  const pct = n <= 1 ? n * 100 : n;           // accept 0–1 and 0–100
  return Math.max(0, Math.min(100, pct));     // clamp
}

/**
 * Log score normalization for telemetry
 * Helps identify scale issues across different pipelines
 */
export function logScoreNorm(prefix: string, edgeScore: unknown, legacyScore: unknown): void {
  const pct0_100 = extractScore(edgeScore) ?? extractScore(legacyScore);
  const score10 = pct0_100 != null ? pct0_100 / 10 : undefined;
  
  console.log(prefix, { 
    pct0_100, 
    score10,
    edgeRaw: edgeScore,
    legacyRaw: legacyScore
  });
}