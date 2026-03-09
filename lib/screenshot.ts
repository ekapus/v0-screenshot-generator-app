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
    // Use screenshotapi.net - a reliable free screenshot service
    const apiUrl = `https://screenshot.screenshotapi.net/screenshot?url=${encodeURIComponent(url)}&width=${width}&height=${height}&format=png`;
    
    console.log('[Screenshot] Calling screenshot API with URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/png',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    console.log('[Screenshot] API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Screenshot] API error response:', errorText);
      throw new Error(`Screenshot API failed with status ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log('[Screenshot] Successfully captured screenshot, size:', arrayBuffer.byteLength);
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[Screenshot] Capture error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}
