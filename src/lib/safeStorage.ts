
// Safe storage wrapper that handles mobile Safari failures gracefully
interface SafeStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

class SafeStorageImpl implements SafeStorage {
  private fallbackStorage: { [key: string]: string } = {};
  private isLocalStorageAvailable: boolean;

  constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorageAvailability();
  }

  private checkLocalStorageAvailability(): boolean {
    // 🔒 iOS Safari Security: Check if we're in a browser environment first
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.warn('📱 safeStorage: Browser environment not available, using fallback storage');
      return false;
    }

    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      console.log('📱 safeStorage: localStorage is available');
      return true;
    } catch (error) {
      console.warn('📱 safeStorage: localStorage not available, using fallback storage:', error);
      return false;
    }
  }

  getItem(key: string): string | null {
    try {
      // 🔒 iOS Safari Security: Double-check browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return this.fallbackStorage[key] || null;
      }

      if (this.isLocalStorageAvailable) {
        return localStorage.getItem(key);
      }
      return this.fallbackStorage[key] || null;
    } catch (error) {
      console.warn(`📱 safeStorage: Failed to get item from storage: ${key}`, error);
      return this.fallbackStorage[key] || null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      // 🔒 iOS Safari Security: Double-check browser environment
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && this.isLocalStorageAvailable) {
        localStorage.setItem(key, value);
      }
      // Always update fallback storage as backup
      this.fallbackStorage[key] = value;
    } catch (error) {
      console.warn(`📱 safeStorage: Failed to set item in storage: ${key}`, error);
      this.fallbackStorage[key] = value;
    }
  }

  removeItem(key: string): void {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.removeItem(key);
      }
      delete this.fallbackStorage[key];
    } catch (error) {
      console.warn(`Failed to remove item from storage: ${key}`, error);
      delete this.fallbackStorage[key];
    }
  }

  clear(): void {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.clear();
      }
      this.fallbackStorage = {};
    } catch (error) {
      console.warn('Failed to clear storage', error);
      this.fallbackStorage = {};
    }
  }
}

export const safeStorage = new SafeStorageImpl();

// Helper functions for JSON operations with enhanced safety
export const safeGetJSON = (key: string, defaultValue: any = null): any => {
  try {
    console.log(`📱 safeGetJSON: Attempting to get ${key}...`);
    const item = safeStorage.getItem(key);
    const result = item ? JSON.parse(item) : defaultValue;
    console.log(`📱 safeGetJSON: Successfully retrieved ${key}`);
    return result;
  } catch (error) {
    console.warn(`📱 safeGetJSON: Failed to parse JSON from storage: ${key}`, error);
    return defaultValue;
  }
};

export const safeSetJSON = (key: string, value: any): void => {
  try {
    console.log(`📱 safeSetJSON: Attempting to set ${key}...`);
    safeStorage.setItem(key, JSON.stringify(value));
    console.log(`📱 safeSetJSON: Successfully set ${key}`);
  } catch (error) {
    console.warn(`📱 safeSetJSON: Failed to stringify JSON to storage: ${key}`, error);
  }
};
