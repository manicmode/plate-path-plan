export interface HealthScanItem {
  name: string;
  grams?: number;
  source: 'object' | 'label';
  confidence?: number;
  canonicalName?: string;
}

export interface HealthScanResult {
  items: HealthScanItem[];
  _debug?: any;
}

export interface HealthScanState {
  image?: string;
  items: HealthScanItem[];
  isLoading: boolean;
  error?: string;
}