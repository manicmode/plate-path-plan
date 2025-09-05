export interface ScanResult {
  value: string;
  format: string;
}

// Legacy interface for backward compatibility with existing components
export interface LegacyScanResult {
  ok: boolean;
  raw?: string;
  format?: string;
  checksumOk?: boolean;
  attempts: number;
  ms: number;
  reason?: string;
}