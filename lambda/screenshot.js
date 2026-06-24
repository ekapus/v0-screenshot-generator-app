const chromium = require('@sparticuz/chromium');
const { chromium: playwrightChromium } = require('playwright-core');

/**
 * AWS Lambda handler for screenshot generation
 * 
 * Environment Variables:
 * - ALLOWED_HOSTS: Comma-separated list of allowed hostnames (e.g., "example.com,another.com")
 * - SCREENSHOT_TIMEOUT: Navigation timeout in ms (default: 30000)
 * - MAX_SCREENSHOT_WIDTH: Maximum screenshot width (default: 3840)
 * - MAX_SCREENSHOT_HEIGHT: Maximum screenshot height (default: 2160)
 */

const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || '*').split(',').map(h => h.trim());
const SCREENSHOT_TIMEOUT = parseInt(process.env.SCREENSHOT_TIMEOUT || '30000', 10);
const MAX_WIDTH = parseInt(process.env.MAX_SCREENSHOT_WIDTH || '3840', 10);
const MAX_HEIGHT = parseInt(process.env.MAX_SCREENSHOT_HEIGHT || '2160', 10);
const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;

/**
 * Launch a new browser instance for this invocation
 * Each Lambda invocation gets its own browser instance
 */
async function launchBrowser() {
  try {
    const executablePath = await chromium.executablePath();
    
    console.log(`[Screenshot] Launching Chromium from: ${executablePath}`);

    const browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    return browser;
  } catch (error) {
    console.error('[Screenshot] Failed to launch browser:', error);
    throw new Error(`Failed to launch Chromium: ${error.message}`);
  }
}

/**
 * Validate hostname against allowed hosts
 */
function isHostnameAllowed(hostname) {
  if (ALLOWED_HOSTS.includes('*')) {
    return true; // Allow all if wildcard
  }
  return ALLOWED_HOSTS.includes(hostname);
}

/**
 * Validate and normalize URL
 */
function validateUrl(urlString) {
  try {
    const url = new URL(urlString);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are supported' };
    }

    return { valid: true, url };
  } catch {
    return { valid: false, error: 'Invalid URL provided' };
  }
}

/**
 * Validate and normalize dimensions
 */
function validateDimensions(width, height) {
  const w = Math.min(Math.max(parseInt(width) || 1800, MIN_WIDTH), MAX_WIDTH);
  const h = Math.min(Math.max(parseInt(height) || 945, MIN_HEIGHT), MAX_HEIGHT);
  return { width: w, height: h };
}

/**
 * Lambda handler for screenshot requests
 */
exports.handler = async (event, context) => {
  // Disable context object cleanup to allow Lambda to reuse the connection
  context.callbackWaitsForEmptyEventLoop = false;

  let browser = null;
  let page = null;
  let context_obj = null;

  try {
    // Parse query parameters from API Gateway event
    const queryParams = event.queryStringParameters || {};
    const { url, width = '1800', height = '945' } = queryParams;

    // Validate URL parameter exists
    if (!url) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'URL parameter is required' }),
      };
    }

    // Validate URL format
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: urlValidation.error }),
      };
    }

    // Validate hostname is allowed
    const { hostname } = urlValidation.url;
    if (!isHostnameAllowed(hostname)) {
      console.warn(`[Screenshot] Rejected screenshot request for hostname: ${hostname}`);
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Hostname not allowed: ${hostname}` }),
      };
    }

    // Validate and normalize dimensions
    const { width: w, height: h } = validateDimensions(width, height);

    console.log(`[Screenshot] Starting screenshot capture: url=${url}, dimensions=${w}x${h}`);

    // Launch browser for this invocation
    browser = await launchBrowser();

    // Create browser context with specified viewport
    context_obj = await browser.newContext({
      viewport: { width: w, height: h },
    });

    // Create page in context
    page = await context_obj.newPage();
    page.setDefaultTimeout(SCREENSHOT_TIMEOUT);
    page.setDefaultNavigationTimeout(SCREENSHOT_TIMEOUT);

    // Navigate to URL with error handling
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
    } catch (navigationError) {
      console.warn(`[Screenshot] Navigation timeout/error (continuing with partial content): ${navigationError.message}`);
      // Continue anyway - we may have partial page content
    }

    // Wait for animations to complete
    await page.waitForTimeout(1000);

    // Capture screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    console.log(`[Screenshot] Screenshot captured successfully: ${screenshot.length} bytes`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': screenshot.length.toString(),
      },
      body: screenshot.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('[Screenshot] Handler error:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to capture screenshot',
        details: error.message 
      }),
    };
  } finally {
    // Clean up resources for this invocation
    try {
      if (page) {
        await page.close();
      }
      if (context_obj) {
        await context_obj.close();
      }
      if (browser) {
        await browser.close();
      }
    } catch (cleanupError) {
      console.error('[Screenshot] Cleanup error:', cleanupError);
    }
  }
};
