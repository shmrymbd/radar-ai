/**
 * In-memory cache for classification historical data
 * Implements LRU (Least Recently Used) eviction policy
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

export class ClassificationCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private defaultTTL: number; // Time to live in milliseconds

  constructor(maxSize: number = 100, defaultTTL: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate cache key from parameters
   */
  private generateKey(
    deviceId: string,
    timePeriod: string,
    options?: Record<string, any>
  ): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    return `${deviceId}:${timePeriod}:${optionsStr}`;
  }

  /**
   * Get data from cache
   */
  public get<T>(
    deviceId: string,
    timePeriod: string,
    options?: Record<string, any>
  ): T | null {
    const key = this.generateKey(deviceId, timePeriod, options);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  public set<T>(
    deviceId: string,
    timePeriod: string,
    data: T,
    options?: Record<string, any>,
    ttl?: number
  ): void {
    const key = this.generateKey(deviceId, timePeriod, options);

    // Evict least recently used if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + (ttl || this.defaultTTL),
      accessCount: 0,
      lastAccessed: now
    };

    this.cache.set(key, entry);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      console.log(`🗑️ Evicted cache entry: ${lruKey}`);
    }
  }

  /**
   * Invalidate cache entries for a specific device
   */
  public invalidateDevice(deviceId: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${deviceId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries for device: ${deviceId}`);
  }

  /**
   * Invalidate all cache entries
   */
  public invalidateAll(): void {
    const count = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Invalidated all ${count} cache entries`);
  }

  /**
   * Remove expired entries
   */
  public cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{
      key: string;
      age: number;
      accessCount: number;
      expiresIn: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      accessCount: entry.accessCount,
      expiresIn: entry.expiresAt - now
    }));

    // Calculate hit rate (simplified)
    const totalAccess = entries.reduce((sum, e) => sum + e.accessCount, 0);
    const hitRate = this.cache.size > 0 ? totalAccess / this.cache.size : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      entries: entries.sort((a, b) => b.accessCount - a.accessCount)
    };
  }

  /**
   * Warm up cache with commonly accessed data
   */
  public async warmUp(
    deviceIds: string[],
    timePeriods: string[],
    dataFetcher: (deviceId: string, timePeriod: string) => Promise<any>
  ): Promise<void> {
    console.log(`🔥 Warming up cache for ${deviceIds.length} devices and ${timePeriods.length} time periods...`);

    const promises = [];

    for (const deviceId of deviceIds) {
      for (const timePeriod of timePeriods) {
        promises.push(
          dataFetcher(deviceId, timePeriod)
            .then(data => {
              this.set(deviceId, timePeriod, data);
            })
            .catch(error => {
              console.error(`❌ Error warming cache for ${deviceId}:${timePeriod}:`, error);
            })
        );
      }
    }

    await Promise.all(promises);
    console.log(`✅ Cache warmup complete. ${this.cache.size} entries cached`);
  }
}

// Singleton instance
let cacheInstance: ClassificationCache | null = null;

export function getClassificationCache(): ClassificationCache {
  if (!cacheInstance) {
    cacheInstance = new ClassificationCache();

    // Setup cleanup interval (every 5 minutes)
    setInterval(() => {
      cacheInstance!.cleanup();
    }, 5 * 60 * 1000);
  }

  return cacheInstance;
}
