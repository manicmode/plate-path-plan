/**
 * Simple LRU Map with TTL support
 */
interface LRUEntry<V> {
  value: V;
  expiry: number;
  accessTime: number;
}

export class LRUMap<K, V> {
  private cache = new Map<K, LRUEntry<V>>();
  private readonly maxSize: number;

  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    // Update access time
    entry.accessTime = Date.now();
    return entry.value;
  }

  set(key: K, value: V, ttlMs = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    
    // Remove expired entries if we're at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictExpired();
      
      // If still at capacity, remove oldest accessed entry
      if (this.cache.size >= this.maxSize) {
        this.evictOldest();
      }
    }

    this.cache.set(key, {
      value,
      expiry: now + ttlMs,
      accessTime: now
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  private evictOldest(): void {
    let oldestKey: K | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.accessTime < oldestTime) {
        oldestTime = entry.accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.cache.delete(oldestKey);
    }
  }
}