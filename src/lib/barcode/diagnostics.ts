// Comprehensive barcode diagnostics for Health Scanner
export type ScanReport = {
  captureSize: { w: number; h: number };
  normalizedSize: { w: number; h: number };
  roi: { x: number; y: number; w: number; h: number; strategy: string };
  devicePixelRatio: number;
  constraints: any;
  attempts: Array<{
    idx: number;
    rotation: number;
    scale: number;
    inverted: boolean;
    crop: string;
    outcome: 'OK' | 'NotFound' | 'Checksum' | 'Format' | 'Error';
    format?: string;
    code?: string;
    elapsedMs: number;
  }>;
  final: {
    success: boolean;
    code?: string;
    normalizedAs?: string;
    checkDigitOk?: boolean;
    offLookup?: { status: 'hit' | 'miss' | 'error'; http?: number; ms?: number };
    willScore: boolean;
    willFallback: boolean;
    totalMs: number;
  };
};

// Legacy type for backward compatibility
export type DecodeAttempt = {
  pass: number;
  roi: { x: number; y: number; w: number; h: number };
  scale: number;
  rotation: number;
  inverted: boolean;
  imageSize: { w: number; h: number };
  dpr: number;
  elapsedMs: number;
  outcome: 'OK' | 'NotFound' | 'Checksum' | 'Format' | 'Error';
  format?: 'UPC_A' | 'EAN_13' | 'EAN_8' | 'CODE_128' | string;
  code?: string;
};

// Store last 3 reports globally for debugging
declare global {
  interface Window {
    __HS_LAST_REPORTS?: ScanReport[];
  }
}

// Global tracking
let currentReport: ScanReport | null = null;

export function startScanReport(
  captureSize: { w: number; h: number },
  normalizedSize: { w: number; h: number },
  roi: { x: number; y: number; w: number; h: number; strategy: string },
  devicePixelRatio: number,
  constraints: any
): void {
  if (process.env.NEXT_PUBLIC_SCAN_DEBUG !== '1') return;
  
  currentReport = {
    captureSize,
    normalizedSize,
    roi,
    devicePixelRatio,
    constraints,
    attempts: [],
    final: {
      success: false,
      willScore: false,
      willFallback: false,
      totalMs: 0
    }
  };
}

export function logAttempt(
  idx: number,
  rotation: number,
  scale: number,
  inverted: boolean,
  crop: string,
  outcome: 'OK' | 'NotFound' | 'Checksum' | 'Format' | 'Error',
  elapsedMs: number,
  format?: string,
  code?: string
): void {
  if (process.env.NEXT_PUBLIC_SCAN_DEBUG !== '1' || !currentReport) return;
  
  currentReport.attempts.push({
    idx,
    rotation,
    scale,
    inverted,
    crop,
    outcome,
    format,
    code,
    elapsedMs
  });
}

export function finalizeScanReport(
  success: boolean,
  totalMs: number,
  code?: string,
  normalizedAs?: string,
  checkDigitOk?: boolean,
  offLookup?: { status: 'hit' | 'miss' | 'error'; http?: number; ms?: number },
  willScore: boolean = false,
  willFallback: boolean = false
): ScanReport | null {
  if (process.env.NEXT_PUBLIC_SCAN_DEBUG !== '1' || !currentReport) return null;
  
  currentReport.final = {
    success,
    code,
    normalizedAs,
    checkDigitOk,
    offLookup,
    willScore,
    willFallback,
    totalMs
  };
  
  storeScanReport(currentReport);
  const report = currentReport;
  currentReport = null;
  return report;
}

export function storeScanReport(report: ScanReport) {
  if (process.env.NEXT_PUBLIC_SCAN_DEBUG === '1') {
    if (!window.__HS_LAST_REPORTS) {
      window.__HS_LAST_REPORTS = [];
    }
    
    window.__HS_LAST_REPORTS.unshift(report);
    if (window.__HS_LAST_REPORTS.length > 3) {
      window.__HS_LAST_REPORTS = window.__HS_LAST_REPORTS.slice(0, 3);
    }
    
    console.info('[HS_DIAG]', report);
  }
}

export function getLastScanReport(): ScanReport | null {
  return window.__HS_LAST_REPORTS?.[0] || null;
}

export async function copyDebugToClipboard(): Promise<boolean> {
  try {
    const lastReport = getLastScanReport();
    if (!lastReport) {
      console.warn('[HS_DIAG] No scan reports available');
      return false;
    }
    
    await navigator.clipboard.writeText(JSON.stringify(lastReport, null, 2));
    console.log('[HS_DIAG] Debug report copied to clipboard');
    return true;
  } catch (error) {
    console.error('[HS_DIAG] Failed to copy debug report:', error);
    return false;
  }
}