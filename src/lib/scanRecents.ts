interface ScanRecentItem {
  ts: number;
  mode: 'barcode' | 'photo' | 'manual' | 'voice';
  label: string;
  id?: string;
}

const STORAGE_KEY = 'scan_recents_v1';
const MAX_RECENTS = 20;

export function addScanRecent(item: Omit<ScanRecentItem, 'ts'>) {
  try {
    const recents = getScanRecents();
    const newItem: ScanRecentItem = {
      ...item,
      ts: Date.now()
    };
    
    // Remove any existing entry with the same id or label
    const filtered = recents.filter(r => 
      r.id !== newItem.id && r.label !== newItem.label
    );
    
    // Add new item at the beginning
    const updated = [newItem, ...filtered].slice(0, MAX_RECENTS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save scan recent:', error);
  }
}

export function getScanRecents(): ScanRecentItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load scan recents:', error);
    return [];
  }
}

export function clearScanRecents() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear scan recents:', error);
  }
}

export function removeScanRecent(ts: number) {
  try {
    const recents = getScanRecents();
    const filtered = recents.filter(r => r.ts !== ts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.warn('Failed to remove scan recent:', error);
  }
}