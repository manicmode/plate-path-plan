// Forensic barcode diagnostics for Health Scanner
export type Attempt = {
  idx: number;
  crop: 'full' | 'bandH' | 'bandV' | 'q1' | 'q2' | 'q3' | 'q4';
  scale: number;
  rotation: number;
  inverted: boolean;
  outcome: 'OK' | 'NotFound' | 'Checksum' | 'Error';
  format?: 'UPC_A' | 'EAN_13' | 'EAN_8' | 'UPC_E' | 'CODE_128' | 'ITF';
  code?: string;
  elapsedMs: number;
  roi: { w: number; h: number };
  dpr: number;
};

export type ScanReport = {
  reqId: string;
  env: { innerHeight: number; cssVh: string; dpr: number };
  constraints?: any;
  captureSize?: { w: number; h: number };
  normalizedSize?: { w: number; h: number };
  roiStrategy: 'reticle' | 'center';
  attempts: Attempt[];
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
  reqId: string,
  env: { innerHeight: number; cssVh: string; dpr: number },
  roiStrategy: 'reticle' | 'center',
  constraints?: any,
  captureSize?: { w: number; h: number },
  normalizedSize?: { w: number; h: number }
): void {
  if (!isDebugEnabled()) return;
  
  currentReport = {
    reqId,
    env,
    constraints,
    captureSize,
    normalizedSize,
    roiStrategy,
    attempts: [],
    final: {
      success: false,
      willScore: false,
      willFallback: false,
      totalMs: 0
    }
  };
}

export function logAttempt(attempt: Attempt): void {
  if (!isDebugEnabled() || !currentReport) return;
  
  currentReport.attempts.push(attempt);
}

export function finalizeScanReport(final: ScanReport['final']): ScanReport | null {
  if (!isDebugEnabled() || !currentReport) return null;
  
  currentReport.final = final;
  
  storeScanReport(currentReport);
  const report = currentReport;
  currentReport = null;
  return report;
}

// Helper function to check if debug is enabled
function isDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SCAN_DEBUG === '1' || 
         new URLSearchParams(window.location.search).get('scan_debug') === '1' ||
         localStorage.getItem('SCAN_DEBUG') === '1';
}

export function storeScanReport(report: ScanReport) {
  if (isDebugEnabled()) {
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