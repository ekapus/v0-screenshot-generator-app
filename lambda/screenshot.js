const { chromium } = require('playwright-core');

// Cache browser instance across invocations
let browser = null;

async function getBrowser() {
  if (browser) {
    return browser;
  }

  // Use system Chromium on Lightsail/Linux
  // Fallback to standard paths if running locally
  const chromiumPaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];

  let executablePath = null;
  for (const path of chromiumPaths) {
    try {
      require('fs').accessSync(path);
      executablePath = path;
      break;
    } catch (e) {
      // Continue to next path
    }
  }

  if (!executablePath) {
    throw new Error('Chromium browser not found. Please install chromium or chromium-browser.');
  }

  console.log(`[Screenshot] Using Chromium at: ${executablePath}`);

  browser = await chromium.launch({
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    headless: true,
  });

  return browser;
}

exports.handler = async (event, context) => {
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

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid URL provided' }),
      };
    }

    // Security: Only allow screenshots of same hostname as the request
    const requestHostname = event.requestHostname;
    const screenshotHostname = parsedUrl.hostname;

    if (screenshotHostname !== requestHostname) {
      console.warn(`[Lambda] Rejected screenshot request for different hostname: ${screenshotHostname} (request from: ${requestHostname})`);
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Screenshots only allowed for the same hostname' }),
      };
    }

    // Validate dimensions
    const w = Math.min(Math.max(parseInt(width) || 1800, 320), 3840);
    const h = Math.min(Math.max(parseInt(height) || 945, 240), 2160);

    console.log(`[Lambda] Capturing screenshot: ${url} at ${w}x${h}`);

    const browser = await getBrowser();
    const context_obj = await browser.newContext({
      viewport: { width: w, height: h },
    });

    const page = await context_obj.newPage();
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

    await context_obj.close();

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
