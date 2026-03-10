const { chromium } = require('playwright-core');
const chromium_binary = require('@sparticuz/chromium');

// Cache browser instance across Lambda invocations
let browser = null;

async function getBrowser() {
  if (browser) {
    return browser;
  }

  const executablePath = await chromium_binary.executablePath;
  browser = await chromium.launch({
    executablePath,
    args: chromium_binary.args,
    headless: true,
  });

  return browser;
}

exports.handler = async (event) => {
  try {
    const { url, width = 1800, height = 945 } = event.queryStringParameters || {};

    // Validate URL
    if (!url) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'URL parameter is required' }),
      };
    }

    try {
      new URL(url);
    } catch {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid URL provided' }),
      };
    }

    // Validate dimensions
    const w = Math.min(Math.max(parseInt(width) || 1800, 320), 3840);
    const h = Math.min(Math.max(parseInt(height) || 945, 240), 2160);

    console.log(`[Lambda] Capturing screenshot: ${url} at ${w}x${h}`);

    const browser = await getBrowser();
    const context = await browser.newContext({
      viewport: { width: w, height: h },
    });

    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    try {
      await page.goto(url, { waitUntil: 'networkidle' });
    } catch (error) {
      console.error('[Lambda] Navigation timeout or error:', error.message);
      // Continue anyway - we may have partial page content
    }

    // Wait for animations
    await page.waitForTimeout(1000);

    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    await context.close();

    console.log(`[Lambda] Screenshot captured: ${screenshot.length} bytes`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': screenshot.length,
      },
      body: screenshot.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('[Lambda] Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Failed to capture screenshot' }),
    };
  }
};
