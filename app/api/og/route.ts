import { chromium } from 'playwright';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function isAllowedUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const hostname = url.hostname.toLowerCase();
  const isPrivateIpv4 = /^(10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[0-1]))\./.test(hostname);
  const isPrivateHostname =
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local');

  if (isPrivateHostname || isPrivateIpv4) return false;

  const allowedDomains = (process.env.WHITELISTED_DOMAINS || '')
    .split(',')
    .map((domain) =>
      domain
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/^www\./, ''),
    )
    .filter(Boolean);

  return allowedDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

export async function GET(request: NextRequest) {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;

  try {
    const { searchParams } = new URL(request.url);
    const pageUrl = searchParams.get('url');
    const width = Math.min(Math.max(Number(searchParams.get('width') || 1800), 320), 3840);
    const height = Math.min(Math.max(Number(searchParams.get('height') || 945), 240), 2160);

    if (!pageUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
      if (!isAllowedUrl(pageUrl)) throw new Error('Domain is not allowed');
    } catch {
      return NextResponse.json({ error: 'Invalid or disallowed URL provided' }, { status: 400 });
    }

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
      userAgent: 'SelfHostedScreenshotGenerator/1.0',
    });

    await page.goto(pageUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const image = await page.screenshot({ type: 'png', fullPage: false });

    return new NextResponse(image, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('[Screenshot] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Failed to capture screenshot' }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
