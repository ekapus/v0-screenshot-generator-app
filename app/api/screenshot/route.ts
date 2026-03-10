import { NextResponse, NextRequest } from 'next/server';
import { captureScreenshot } from '@/lib/screenshot';
import { isValidUrl, isWhitelistedDomain } from '@/lib/whitelist';
import { generateCacheKey, getCachedScreenshot, cacheScreenshot } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const width = parseInt(searchParams.get('width') || '1800');
    const height = parseInt(searchParams.get('height') || '945');

    // Validate URL
    if (!url || !isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Valid URL is required' },
        { status: 400 }
      );
    }

    // Check whitelist
    if (!isWhitelistedDomain(url)) {
      return NextResponse.json(
        { error: 'Domain not whitelisted. Configure WHITELISTED_DOMAINS in Vercel project settings.' },
        { status: 403 }
      );
    }

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

    // Store in cache
    await cacheScreenshot(cacheKey, screenshot);

    return new NextResponse(screenshot, {
      headers: {
        'Content-Type': 'image/png',
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('[Screenshot API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to capture screenshot' },
      { status: 500 }
    );
  }
}
