// Navigation helper for health analysis flows
import { NavigateFunction } from 'react-router-dom';

export interface HealthAnalysisParams {
  source: 'off' | 'manual' | 'barcode' | 'photo' | 'voice';
  barcode?: string | null;
  name?: string;
  brand?: string;
  product?: any;
  imageData?: string;
}

/**
 * Navigate to health analysis - this routes to the scan hub which handles health modals
 * This replaces the broken /health-report route with the working modal system
 */
export function goToHealthReport(navigate: NavigateFunction, params: HealthAnalysisParams) {
  console.warn('[NAV] goToHealthReport', { 
    path: '/scan',
    params: {
      source: params.source,
      barcode: params.barcode,
      name: params.name
    }
  });
  
  // Navigate to scan hub with state data for the health modal
  navigate('/scan', { 
    state: { 
      autoOpenHealth: true,
      analysisParams: params
    } 
  });
}

/**
 * Centralized navigation to Health Analysis using URL params
 */
export function goToHealthAnalysis(
  navigate: (to: string, opts?: any) => void,
  payload: { source: 'off' | 'manual' | 'barcode' | 'photo'; barcode?: string; name?: string }
) {
  const params = new URLSearchParams({
    modal: 'health',                 // Force the health analyzer, not scanner
    source: String(payload.source),
    barcode: payload.barcode ?? '',
    name: payload.name ?? '',
  });
  
  console.warn('[NAV][goToHealthAnalysis]', { 
    path: `/scan?${params.toString()}`,
    payload 
  });
  
  navigate(`/scan?${params.toString()}`);
}