/**
 * Screenshot utility using Playwright
 */

import { chromium } from 'playwright';

const DEFAULT_WIDTH = 1800;
const DEFAULT_HEIGHT = 945;
const MAX_WIDTH = 3840;
const MAX_HEIGHT = 2160;
const SCREENSHOT_TIMEOUT = 30000; // 30 seconds

export interface ScreenshotOptions {
  width?: number;
  height?: number;
}

function validateDimensions(width?: number, height?: number) {
  const w = Math.min(Math.max(width || DEFAULT_WIDTH, 320), MAX_WIDTH);
  const h = Math.min(Math.max(height || DEFAULT_HEIGHT, 240), MAX_HEIGHT);
  return { width: w, height: h };
}

export async function captureScreenshot(
  url: string,
  options: ScreenshotOptions = {}
): Promise<Buffer> {
  const { width, height } = validateDimensions(options.width, options.height);
  
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      viewport: { width, height },
    });

    const page = await context.newPage();

    // Set a timeout for page load
    page.setDefaultTimeout(SCREENSHOT_TIMEOUT);
    page.setDefaultNavigationTimeout(SCREENSHOT_TIMEOUT);

    try {
      await page.goto(url, { waitUntil: 'networkidle' });
    } catch (error) {
      console.error('[Screenshot] Navigation timeout or error:', error);
      // Continue anyway - we may have partial page content
    }

    // Wait a bit for any animations/lazy loading
    await page.waitForTimeout(1000);

    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    await context.close();
    return screenshot;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
