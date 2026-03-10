import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageUrl = searchParams.get('url');
    const width = searchParams.get('width') || '1800';
    const height = searchParams.get('height') || '945';

    if (!pageUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter. Example: /api/og?url=https://example.com' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(pageUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      );
    }

    // Use screenshotone.com API for reliable screenshots
    // Get API key from environment or use demo mode
    const apiKey = process.env.SCREENSHOT_API_KEY || 'demo';
    const screenshotApiUrl = `https://api.screenshotone.com/take?access_key=${apiKey}&url=${encodeURIComponent(pageUrl)}&viewport_width=${width}&viewport_height=${height}&format=png`;

    console.log('[OG] Requesting screenshot from:', screenshotApiUrl.split('?')[0]);

    const response = await fetch(screenshotApiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/png',
      },
    });

    if (!response.ok) {
      console.error('[OG] Screenshot API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Screenshot service returned ${response.status}` },
        { status: 500 }
      );
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('[OG] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to capture screenshot' },
      { status: 500 }
    );
  }
}

