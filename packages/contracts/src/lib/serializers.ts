/**
 * Serialization utilities for localStorage and JSON handling
 * Handles BigInt and other complex types that JSON.stringify doesn't support
 */

/**
 * Serialize data for localStorage (handles BigInt and other complex types)
 */
export function serializeForStorage(data: any): any {
  if (typeof data === 'bigint') {
    return { __type: 'bigint', value: data.toString() };
  }
  if (Array.isArray(data)) {
    return data.map(item => serializeForStorage(item));
  }
  if (data && typeof data === 'object' && data.constructor === Object) {
    const serialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeForStorage(value);
    }
    return serialized;
  }
  return data;
}

/**
 * Deserialize data from localStorage (handles BigInt and other complex types)
 */
export function deserializeFromStorage(data: any): any {
  if (data && typeof data === 'object' && data.__type === 'bigint') {
    return BigInt(data.value);
  }
  if (Array.isArray(data)) {
    return data.map(item => deserializeFromStorage(item));
  }
  if (data && typeof data === 'object' && data.constructor === Object) {
    const deserialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      deserialized[key] = deserializeFromStorage(value);
    }
    return deserialized;
  }
  return data;
}

/**
 * Safe JSON stringify that handles BigInt
 */
export function safeJsonStringify(data: any): string {
  return JSON.stringify(serializeForStorage(data));
}

/**
 * Safe JSON parse that handles BigInt
 */
export function safeJsonParse<T = any>(jsonString: string): T {
  return deserializeFromStorage(JSON.parse(jsonString));
}

/**
 * Cache entry interface for localStorage
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Serializable cache entry for localStorage storage
 */
export interface SerializableCacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

/**
 * Store cache entry in localStorage with TTL
 */
export function setCacheEntry<T>(key: string, data: T, ttl: number): void {
  try {
    const entry: SerializableCacheEntry = {
      data: serializeForStorage(data),
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn('Failed to set cache entry:', error);
  }
}

/**
 * Get cache entry from localStorage, checking TTL
 */
export function getCacheEntry<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: SerializableCacheEntry = JSON.parse(cached);
    const now = Date.now();
    
    if (now - entry.timestamp > entry.ttl) {
      localStorage.removeItem(key);
      return null;
    }

    return deserializeFromStorage(entry.data);
  } catch (error) {
    return null;
  }
}

/**
 * Remove cache entries by prefix
 */
export function removeCacheEntriesByPrefix(prefix: string): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to remove cache entries:', error);
  }
}