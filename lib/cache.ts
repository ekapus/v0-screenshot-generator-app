import crypto from 'crypto';

interface CacheEntry {
  buffer: Buffer;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function generateCacheKey(url: string, width: number, height: number): string {
  const hash = crypto.createHash('sha256').update(`${url}:${width}:${height}`).digest('hex');
  return hash;
}

export async function getCachedScreenshot(key: string): Promise<Buffer | null> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.buffer;
  }
  cache.delete(key);
  return null;
}

export async function cacheScreenshot(key: string, buffer: Buffer): Promise<void> {
  cache.set(key, {
    buffer,
    timestamp: Date.now(),
  });
}
