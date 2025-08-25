// Comprehensive barcode diagnostics for Health Scanner
export type DecodeAttempt = {
  pass: number;
  roi: { x: number; y: number; w: number; h: number }; // in canvas pixels
  scale: number;        // 1.0, 0.75, 0.5, etc.
  rotation: number;     // 0, 90, 180, 270, ±8
  inverted: boolean;    // true if luminance inverted
  imageSize: { w: number; h: number };     // canvas size
  dpr: number;          // devicePixelRatio used
  elapsedMs: number;    // time spent on this pass
  outcome: 'OK' | 'NotFound' | 'Checksum' | 'Format' | 'Error';
  format?: 'UPC_A' | 'EAN_13' | 'EAN_8' | 'CODE_128' | string;
  code?: string;
};

export type ScanReport = {
  reqId: string;
  videoConstraints: any;
  captureSize: { w: number; h: number };   // before normalization
  normalizedSize: { w: number; h: number }; // after normalization
  roiStrategy: 'reticle' | 'center-box';
  attempts: DecodeAttempt[];
  final: {
    success: boolean;
    code?: string;
    normalizedAs?: string; // e.g. UPC_A normalized from leading-0 EAN13
    checkDigitOk?: boolean;
    offLookup?: { status: 'hit' | 'miss' | 'error'; ms: number; http?: number }
  };
};

// Store last 3 reports globally for debugging
declare global {
  interface Window {
    __HS_LAST_REPORTS?: ScanReport[];
  }
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
    
    console.log('[HS_DIAG]', report);
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