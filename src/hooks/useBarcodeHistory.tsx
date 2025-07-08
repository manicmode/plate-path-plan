import { useState, useEffect } from 'react';
import { safeGetJSON, safeSetJSON } from '@/lib/safeStorage';

export interface BarcodeHistoryItem {
  barcode: string;
  productName: string;
  brand?: string;
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    sugar: number;
    fiber: number;
    sodium: number;
  };
  image?: string;
  source: string;
  timestamp: Date;
  region?: string;
}

const STORAGE_KEY = 'barcode_scan_history';
const MAX_HISTORY_ITEMS = 50;

export const useBarcodeHistory = () => {
  const [barcodeHistory, setBarcodeHistory] = useState<BarcodeHistoryItem[]>([]);

  // Load history from storage
  useEffect(() => {
    const stored = safeGetJSON(STORAGE_KEY, []);
    const processed = stored.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp)
    }));
    setBarcodeHistory(processed);
  }, []);

  // Save history to storage
  const saveToStorage = (history: BarcodeHistoryItem[]) => {
    safeSetJSON(STORAGE_KEY, history);
  };

  const addToHistory = (item: Omit<BarcodeHistoryItem, 'timestamp'>) => {
    const newItem: BarcodeHistoryItem = {
      ...item,
      timestamp: new Date()
    };

    setBarcodeHistory(prev => {
      // Remove any existing entry with the same barcode
      const filtered = prev.filter(existing => existing.barcode !== item.barcode);
      
      // Add new item at the beginning
      const updated = [newItem, ...filtered];
      
      // Keep only the most recent items
      const trimmed = updated.slice(0, MAX_HISTORY_ITEMS);
      
      saveToStorage(trimmed);
      return trimmed;
    });
  };

  const removeFromHistory = (barcode: string) => {
    setBarcodeHistory(prev => {
      const filtered = prev.filter(item => item.barcode !== barcode);
      saveToStorage(filtered);
      return filtered;
    });
  };

  const clearHistory = () => {
    setBarcodeHistory([]);
    saveToStorage([]);
  };

  const getRecentBarcodes = (limit: number = 10) => {
    return barcodeHistory.slice(0, limit);
  };

  return {
    barcodeHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getRecentBarcodes
  };
};
