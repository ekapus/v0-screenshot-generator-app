/**
 * Cache utility for Vercel Blob storage
 * Uses Vercel Blob for persistent storage with in-memory URL tracking
 */

import { put, del } from '@vercel/blob';
import crypto from 'crypto';

interface CacheEntry {
  url: string;
  expiresAt: number;
}

// In-memory cache to track blob URLs (since Blob storage is immutable)
const urlCache = new Map<string, CacheEntry>();

export function generateCacheKey(url: string, width: number, height: number): string {
  const hash = crypto.createHash('sha256').update(`${url}:${width}:${height}`).digest('hex');
  return `screenshots/${hash}.png`;
}

export async function getCachedScreenshot(cacheKey: string): Promise<Buffer | null> {
  try {
    const cached = urlCache.get(cacheKey);
    
    // Check if we have a cached URL and it's not expired
    if (cached && cached.expiresAt > Date.now()) {
      console.log('[Screenshot] Cache hit for key:', cacheKey);
      const response = await fetch(cached.url);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    }
    
    return null;
  } catch (error) {
    console.error('[Screenshot] Error retrieving from cache:', error);
    return null;
  }
}

export async function cacheScreenshot(cacheKey: string, buffer: Buffer): Promise<string> {
  try {
    const result = await put(cacheKey, buffer, {
      access: 'private',
      contentType: 'image/png',
      allowOverwrite: true,
    });
    
    // Cache the URL in memory for 24 hours
    urlCache.set(cacheKey, {
      url: result.url,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    
    console.log('[Screenshot] Cached screenshot at:', result.url);
    return result.url;
  } catch (error) {
    console.error('[Screenshot] Error caching screenshot:', error);
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
    console.error('[Screenshot] Error removing from cache:', error);
    // Don't throw - cache deletion failure shouldn't break the app
  }
}
