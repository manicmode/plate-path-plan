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
    
    // Only remove duplicate by id if both have ids, otherwise allow multiple entries with same label
    const filtered = recents.filter(r => {
      // If both have IDs, remove duplicates by ID
      if (r.id && newItem.id) {
        return r.id !== newItem.id;
      }
      // Otherwise, allow multiple entries (don't filter by label to allow multiple scans)
      return true;
    });
    
    // Add new item at the beginning
    const updated = [newItem, ...filtered].slice(0, MAX_RECENTS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    console.log('Recent scan added:', { total: updated.length, newItem });
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