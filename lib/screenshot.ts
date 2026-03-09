/**
 * Screenshot utility using a serverless-compatible approach
 * Uses a free screenshot API that works on Vercel functions
 */

const DEFAULT_WIDTH = 1800;
const DEFAULT_HEIGHT = 945;
const MAX_WIDTH = 3840;
const MAX_HEIGHT = 2160;

export interface ScreenshotOptions {
  width?: number;
  height?: number;
}

function validateDimensions(width?: number, height?: number) {
  const w = Math.min(Math.max(width || DEFAULT_WIDTH, 320), MAX_WIDTH);
  const h = Math.min(Math.max(height || DEFAULT_HEIGHT, 240), MAX_HEIGHT);
  return { width: w, height: h };
}

/**
 * Capture screenshot using a public screenshot API
 * This approach works reliably on Vercel serverless functions
 */
export async function captureScreenshot(
  url: string,
  options: ScreenshotOptions = {}
): Promise<Buffer> {
  const { width, height } = validateDimensions(options.width, options.height);
  
  try {
    // Use a free public screenshot API
    // api.screenshotapi.net is a free service that provides screenshots
    const apiUrl = `https://api.screenshotapi.net/v3/capture?url=${encodeURIComponent(url)}&width=${width}&height=${height}&format=png&device=desktop`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/png',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to capture screenshot: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[Screenshot] Capture error:', error);
    throw error;
  }
}
