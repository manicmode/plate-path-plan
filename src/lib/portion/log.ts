/**
 * Portion Logging Utility
 * Dev-only telemetry with ⧉ PORTION prefix
 */

export function portionLog(tag: string, payload: unknown): void {
  // Only log in development
  if (import.meta.env.DEV) {
    console.info(`⧉ PORTION ${tag}`, payload);
  }
}

// Specialized logging functions for common cases
export function logPlateDetection(area?: number, confidence?: number): void {
  portionLog('plate', { area, confidence });
}

export function logCountHit(name: string, parsed: string, grams: number): void {
  portionLog('count-hit', { name, parsed, grams });
}

export function logAreaScale(
  name: string, 
  plateRatio?: number, 
  base?: number, 
  scaled?: number
): void {
  portionLog('area-scale', { name, plateRatio, base, scaled });
}

export function logFinalPortion(
  name: string, 
  grams: number, 
  source: string, 
  range?: [number, number]
): void {
  portionLog('final', { name, grams, source, range });
}