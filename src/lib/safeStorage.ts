
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
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('localStorage not available, using fallback storage:', error);
      return false;
    }
  }

  getItem(key: string): string | null {
    try {
      if (this.isLocalStorageAvailable) {
        return localStorage.getItem(key);
      }
      return this.fallbackStorage[key] || null;
    } catch (error) {
      console.warn(`Failed to get item from storage: ${key}`, error);
      return this.fallbackStorage[key] || null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.setItem(key, value);
      }
      // Always update fallback storage as backup
      this.fallbackStorage[key] = value;
    } catch (error) {
      console.warn(`Failed to set item in storage: ${key}`, error);
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

// Helper functions for JSON operations
export const safeGetJSON = (key: string, defaultValue: any = null): any => {
  try {
    const item = safeStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Failed to parse JSON from storage: ${key}`, error);
    return defaultValue;
  }
};

export const safeSetJSON = (key: string, value: any): void => {
  try {
    safeStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to stringify JSON to storage: ${key}`, error);
  }
};
