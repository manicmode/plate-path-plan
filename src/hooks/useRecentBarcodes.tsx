import { useState, useEffect } from 'react';
import { safeGetJSON, safeSetJSON } from '@/lib/safeStorage';

interface RecentBarcode {
  barcode: string;
  productName: string;
  timestamp: Date;
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    sugar: number;
    fiber: number;
    sodium: number;
  };
}

const STORAGE_KEY = 'recent_barcodes';
const MAX_RECENT_ITEMS = 10;

export const useRecentBarcodes = () => {
  const [recentBarcodes, setRecentBarcodes] = useState<RecentBarcode[]>([]);

  // Load recent barcodes from storage
  useEffect(() => {
    const stored = safeGetJSON(STORAGE_KEY, []);
    // Convert timestamp strings back to Date objects
    const processed = stored.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp)
    }));
    setRecentBarcodes(processed);
  }, []);

  // Save recent barcodes to storage
  const saveToStorage = (barcodes: RecentBarcode[]) => {
    safeSetJSON(STORAGE_KEY, barcodes);
  };

  const addRecentBarcode = (barcodeData: Omit<RecentBarcode, 'timestamp'>) => {
    const newItem: RecentBarcode = {
      ...barcodeData,
      timestamp: new Date()
    };

    setRecentBarcodes(prev => {
      // Remove any existing entry with the same barcode
      const filtered = prev.filter(item => item.barcode !== barcodeData.barcode);
      
      // Add new item at the beginning
      const updated = [newItem, ...filtered];
      
      // Keep only the most recent items
      const trimmed = updated.slice(0, MAX_RECENT_ITEMS);
      
      saveToStorage(trimmed);
      return trimmed;
    });
  };

  const removeRecentBarcode = (barcode: string) => {
    setRecentBarcodes(prev => {
      const filtered = prev.filter(item => item.barcode !== barcode);
      saveToStorage(filtered);
      return filtered;
    });
  };

  const clearRecentBarcodes = () => {
    setRecentBarcodes([]);
    saveToStorage([]);
  };

  return {
    recentBarcodes,
    addRecentBarcode,
    removeRecentBarcode,
    clearRecentBarcodes
  };
};
