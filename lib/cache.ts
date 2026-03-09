import { put, del } from '@vercel/blob';
import crypto from 'crypto';

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const urlCache = new Map<string, CacheEntry>();

export function generateCacheKey(
  url: string,
  width: number,
  height: number
): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${url}:${width}:${height}`)
    .digest('hex');
  return `screenshots/${hash}.png`;
}

export async function getCachedScreenshot(
  cacheKey: string
): Promise<Buffer | null> {
  try {
    const cached = urlCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      const response = await fetch(cached.url);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

export async function cacheScreenshot(
  cacheKey: string,
  buffer: Buffer
): Promise<string> {
  try {
    const result = await put(cacheKey, buffer, {
      access: 'private',
      contentType: 'image/png',
      allowOverwrite: true,
    });

    urlCache.set(cacheKey, {
      url: result.url,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    return result.url;
  } catch (error) {
    throw error;
  }
}

export async function removeCachedScreenshot(cacheKey: string): Promise<void> {
  try {
    const cached = urlCache.get(cacheKey);
    if (cached) {
      await del(cached.url);
      urlCache.delete(cacheKey);
    }
  } catch (error) {
    // Silently ignore deletion errors
  }
}
