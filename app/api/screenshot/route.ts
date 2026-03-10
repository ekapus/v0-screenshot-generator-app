import { NextRequest, NextResponse } from 'next/server';
import { isValidUrl, isWhitelistedDomain } from '@/lib/whitelist';
import { generateCacheKey, getCachedScreenshot, cacheScreenshot } from '@/lib/cache';
import { captureScreenshot } from '@/lib/screenshot';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const widthParam = searchParams.get('width');
    const heightParam = searchParams.get('height');

    // Validate URL
    if (!url) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
    }

    if (!isValidUrl(url)) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    if (!isWhitelistedDomain(url)) {
      return NextResponse.json({ error: 'Domain not whitelisted' }, { status: 403 });
    }

    // Parse dimensions
    const width = Math.min(Math.max(parseInt(widthParam || '1800'), 320), 3840);
    const height = Math.min(Math.max(parseInt(heightParam || '945'), 240), 2160);

    // Check cache
    const cacheKey = generateCacheKey(url, width, height);
    const cached = await getCachedScreenshot(cacheKey);

    if (cached) {
      return new NextResponse(cached, {
        headers: {
          'Content-Type': 'image/png',
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Capture screenshot
    const screenshot = await captureScreenshot(url, width, height);

    // Cache it
    await cacheScreenshot(cacheKey, screenshot);

    return new NextResponse(screenshot, {
      headers: {
        'Content-Type': 'image/png',
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('[Screenshot] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to capture screenshot' },
      { status: 500 }
    );
  }
}
