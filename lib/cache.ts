// Simple in-memory cache for screenshots
interface CacheEntry {
  buffer: Buffer;
  expiresAt: number;
}

const screenshotCache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

import crypto from 'crypto';

export function generateCacheKey(
  url: string,
  width: number,
  height: number
): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${url}:${width}:${height}`)
    .digest('hex');
  return hash;
}

export async function getCachedScreenshot(
  cacheKey: string
): Promise<Buffer | null> {
  const cached = screenshotCache.get(cacheKey);
  
  if (cached && cached.expiresAt > Date.now()) {
    console.log('[Screenshot] Cache HIT for key:', cacheKey);
    return cached.buffer;
  }
  
  if (cached) {
    screenshotCache.delete(cacheKey);
  }
  
  console.log('[Screenshot] Cache MISS for key:', cacheKey);
  return null;
}

export async function cacheScreenshot(
  cacheKey: string,
  buffer: Buffer
): Promise<void> {
  screenshotCache.set(cacheKey, {
    buffer,
    expiresAt: Date.now() + CACHE_TTL,
  });
  console.log('[Screenshot] Cached screenshot for key:', cacheKey);
}

export async function removeCachedScreenshot(cacheKey: string): Promise<void> {
  screenshotCache.delete(cacheKey);
}
