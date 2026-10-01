import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export const runtime = 'nodejs';

function isAllowedUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const hostname = url.hostname.toLowerCase();
  const isPrivateIpv4 = /^(10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[0-1]))\./.test(hostname);
  return hostname !== 'localhost' && hostname !== '::1' && !isPrivateIpv4;
}

function getMeta(html: string, name: string) {
  const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'));
  return match?.[1]?.replace(/&amp;/g, '&').trim();
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character] || character);
}

export async function GET(request: NextRequest) {
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

    const response = await fetch(pageUrl, {
      headers: { 'User-Agent': 'SelfHostedOGGenerator/1.0' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `The page returned ${response.status}` }, { status: 502 });
    }

    const html = (await response.text()).slice(0, 2_000_000);
    const source = new URL(pageUrl);
    const title = getMeta(html, 'og:title') || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || source.hostname;
    const description = getMeta(html, 'og:description') || getMeta(html, 'description') || `A preview image for ${source.hostname}`;
    const safeTitle = escapeXml(title.slice(0, 120));
    const safeDescription = escapeXml(description.slice(0, 220));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#f4f7fb"/>
      <rect x="${Math.round(width * 0.055)}" y="${Math.round(height * 0.1)}" width="${Math.round(width * 0.89)}" height="${Math.round(height * 0.8)}" rx="28" fill="#ffffff" stroke="#d9e2ec" stroke-width="2"/>
      <text x="${Math.round(width * 0.11)}" y="${Math.round(height * 0.42)}" fill="#102a43" font-family="Arial, sans-serif" font-size="${Math.max(32, Math.round(width * 0.04))}" font-weight="700">${safeTitle}</text>
      <text x="${Math.round(width * 0.11)}" y="${Math.round(height * 0.58)}" fill="#52606d" font-family="Arial, sans-serif" font-size="${Math.max(18, Math.round(width * 0.018))}">${safeDescription}</text>
      <text x="${Math.round(width * 0.11)}" y="${Math.round(height * 0.76)}" fill="#829ab1" font-family="Arial, sans-serif" font-size="${Math.max(14, Math.round(width * 0.012))}">${escapeXml(source.hostname)}</text>
    </svg>`;
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('[OG] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Failed to generate OG image' }, { status: 500 });
  }
}

