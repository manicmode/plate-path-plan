/**
 * Enhanced localStorage adapter with versioning and user scoping
 * Provides type-safe, versioned storage with automatic fallbacks
 */

const VERSION = 1;

const k = (base: string, userId?: string) =>
  `${base}:${userId ?? 'anon'}:v${VERSION}`;

export const store = {
  /**
   * Get data from localStorage with fallback
   */
  get<T>(key: string, fallback: T, userId?: string): T {
    try { 
      const data = localStorage.getItem(k(key, userId));
      return data ? JSON.parse(data) as T : fallback;
    }
    catch { 
      return fallback; 
    }
  },

  /**
   * Set data in localStorage
   */
  set<T>(key: string, userId: string | undefined, value: T): void {
    try {
      localStorage.setItem(k(key, userId), JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  /**
   * Add item to front of array, removing duplicates and limiting size
   */
  upsertToFront<T extends { id: string }>(
    key: string, 
    userId: string | undefined, 
    item: T, 
    max: number = 50
  ): T[] {
    const arr = this.get(key, [] as T[], userId);
    const next = [item, ...arr.filter(x => x.id !== item.id)].slice(0, max);
    this.set(key, userId, next);
    return next;
  },

  /**
   * Remove item from array by id
   */
  removeById<T extends { id: string }>(
    key: string, 
    userId: string | undefined, 
    id: string
  ): T[] {
    const arr = this.get(key, [] as T[], userId);
    const filtered = arr.filter(x => x.id !== id);
    this.set(key, userId, filtered);
    return filtered;
  },

  /**
   * Update or add item in array
   */
  updateOrAdd<T extends { id: string }>(
    key: string,
    userId: string | undefined,
    item: T
  ): T[] {
    const arr = this.get(key, [] as T[], userId);
    const existingIndex = arr.findIndex(x => x.id === item.id);
    
    if (existingIndex >= 0) {
      arr[existingIndex] = item;
    } else {
      arr.push(item);
    }
    
    this.set(key, userId, arr);
    return arr;
  }
};