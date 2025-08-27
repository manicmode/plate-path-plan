import { useCallback } from 'react';
import { addScanRecent } from '@/lib/scanRecents';

export function useScanRecents() {
  const addRecent = useCallback((item: {
    mode: 'barcode' | 'photo' | 'manual' | 'voice';
    label: string;
    id?: string;
  }) => {
    try {
      addScanRecent(item);
      console.log('scan_recent_added', { 
        mode: item.mode, 
        timestamp: Date.now() 
      });
    } catch (error) {
      console.warn('Failed to add scan recent:', error);
    }
  }, []);

  return { addRecent };
}