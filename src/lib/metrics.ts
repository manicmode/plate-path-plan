// Simple metrics collection for LYF v1
export interface PhotoMetrics {
  detect_ms: number;
  items_kept: number;
  one_tap_used: boolean;
  error_type?: string;
  image_kb: number;
}

export function emitPhotoMetrics(metrics: PhotoMetrics): void {
  if (import.meta.env.DEV) {
    console.table([{
      'Photo Metrics': '→',
      'Detect (ms)': metrics.detect_ms,
      'Items Kept': metrics.items_kept,
      'One-Tap Used': metrics.one_tap_used ? 'Yes' : 'No',
      'Error': metrics.error_type || 'None',
      'Image (KB)': metrics.image_kb
    }]);
  }
  
  // TODO: Wire to analytics service later
  // analytics.track('photo_detection', metrics);
}

export function incrementCounter(event: string, value: number = 1): void {
  if (import.meta.env.DEV) {
    console.log(`📊 ${event}: +${value}`);
  }
  
  // TODO: Wire to analytics service later
  // analytics.increment(event, value);
}