import crypto from 'crypto';

const cache = new Map<string, { data: Buffer; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function generateCacheKey(url: string, width: number, height: number): string {
  return crypto.createHash('md5').update(`${url}:${width}:${height}`).digest('hex');
}

export async function getCachedScreenshot(key: string): Promise<Buffer | null> {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export async function cacheScreenshot(key: string, data: Buffer): Promise<void> {
  cache.set(key, { data, timestamp: Date.now() });
}
