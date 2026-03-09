/**
 * Screenshot API route
 * GET /api/screenshot?url=<url>&width=<width>&height=<height>
 * 
 * Captures screenshots of web pages with domain whitelist validation and caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidUrl, isWhitelistedDomain } from '@/lib/whitelist';
import { generateCacheKey, getCachedScreenshot, cacheScreenshot } from '@/lib/cache';
import { captureScreenshot } from '@/lib/screenshot';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const widthParam = searchParams.get('width');
    const heightParam = searchParams.get('height');

    // Validate URL parameter exists
    if (!url) {
      return NextResponse.json(
        { error: 'Missing required parameter: url' },
        { status: 400 }
      );
    }

    // Validate URL format
    if (!isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Check whitelist
    if (!isWhitelistedDomain(url)) {
      return NextResponse.json(
        { error: 'Domain not whitelisted' },
        { status: 403 }
      );
    }

    // Parse and validate dimensions
    const width = widthParam ? parseInt(widthParam, 10) : undefined;
    const height = heightParam ? parseInt(heightParam, 10) : undefined;

    if ((widthParam && isNaN(width!)) || (heightParam && isNaN(height!))) {
      return NextResponse.json(
        { error: 'Invalid width or height parameter' },
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = generateCacheKey(url, width || 1800, height || 945);

    // Check cache first
    let screenshotBuffer: Buffer | null = null;
    try {
      screenshotBuffer = await getCachedScreenshot(cacheKey);
      if (screenshotBuffer) {
        console.log('[Screenshot] Cache hit for:', url);
        return new NextResponse(screenshotBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=86400', // 24 hours
            'X-Cache': 'HIT',
          },
        });
      }
    } catch (error) {
      console.error('[Screenshot] Cache check failed:', error);
      // Continue to capture if cache fails
    }

    // Capture screenshot
    console.log('[Screenshot] Capturing new screenshot for:', url);
    screenshotBuffer = await captureScreenshot(url, { width, height });

    // Cache the screenshot
    try {
      await cacheScreenshot(cacheKey, screenshotBuffer);
    } catch (error) {
      console.error('[Screenshot] Failed to cache, but returning screenshot:', error);
      // Don't fail the request if caching fails
    }

    return new NextResponse(screenshotBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400', // 24 hours
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('[Screenshot] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to capture screenshot' },
      { status: 500 }
    );
  }
}
