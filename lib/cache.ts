/**
 * Cache utility for Vercel Blob storage
 */

import { put, get, del } from '@vercel/blob';
import crypto from 'crypto';

export function generateCacheKey(url: string, width: number, height: number): string {
  const hash = crypto.createHash('sha256').update(`${url}:${width}:${height}`).digest('hex');
  return `screenshot-${hash}`;
}

export async function getCachedScreenshot(cacheKey: string): Promise<Buffer | null> {
  try {
    const blob = await get(cacheKey, { access: 'private' });
    if (blob) {
      const arrayBuffer = await blob.stream.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    return null;
  } catch (error) {
    // Blob not found is expected, not an error
    if (error instanceof Error && error.message.includes('not found')) {
      return null;
    }
    console.error('[Screenshot] Error retrieving from cache:', error);
    return null;
  }
}

export async function cacheScreenshot(cacheKey: string, buffer: Buffer): Promise<void> {
  try {
    await put(cacheKey, buffer, {
      access: 'private',
      contentType: 'image/png',
    });
  } catch (error) {
    console.error('[Screenshot] Error caching screenshot:', error);
    throw error;
  }
}

export async function removeCachedScreenshot(cacheKey: string): Promise<void> {
  try {
    await del(cacheKey);
  } catch (error) {
    console.error('[Screenshot] Error removing from cache:', error);
    // Don't throw - cache deletion failure shouldn't break the app
  }
}
