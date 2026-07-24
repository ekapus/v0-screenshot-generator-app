const { chromium } = require('playwright-core');

// Cache browser instance across invocations
let browser = null;

async function getBrowser() {
  if (browser) {
    return browser;
  }

  // Lambda provides Chromium via the chromium layer
  // Path on Lambda: /opt/chromium/chromium
  const chromiumPaths = [
    '/opt/chromium/chromium',  // Lambda layer path
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
      console.log(`[Screenshot] Found Chromium at: ${executablePath}`);
      break;
    } catch (e) {
      // Continue to next path
    }
  }

  if (!executablePath) {
    throw new Error('Chromium browser not found. Ensure the chromium Lambda layer is attached.');
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

function isHostnameAllowed(hostname) {
  const allowedHostnames = (process.env.ALLOWED_HOSTNAMES || 'localhost,example.com')
    .split(',')
    .map(h => h.trim().toLowerCase());
  
  return allowedHostnames.includes(hostname.toLowerCase());
}

exports.handler = async (event, context) => {
  try {
    console.log(`[Lambda] Event: ${JSON.stringify(event)}`);
    
    const queryParams = event.queryStringParameters || {};
    const { url, width, height, allowedHost } = queryParams;

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

    // Security: Validate hostname if strict mode is enabled
    if (allowedHost !== 'false' && !isHostnameAllowed(parsedUrl.hostname)) {
      console.warn(`[Lambda] Rejected screenshot request for hostname: ${parsedUrl.hostname} (allowed: ${process.env.ALLOWED_HOSTNAMES})`);
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Screenshots not allowed for this hostname' }),
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
