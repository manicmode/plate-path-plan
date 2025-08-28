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