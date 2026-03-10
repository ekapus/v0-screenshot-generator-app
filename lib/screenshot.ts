/**
 * Screenshot utility using urlbox.io (serverless-compatible screenshot service)
 * Free tier available, works on Vercel and v0 sandbox
 */

const DEFAULT_WIDTH = 1800;
const DEFAULT_HEIGHT = 945;

export async function captureScreenshot(
  url: string,
  width: number = DEFAULT_WIDTH,
  height: number = DEFAULT_HEIGHT
): Promise<Buffer> {
  try {
    // Use urlbox.io - a reliable screenshot service with free tier
    // This works in both v0 sandbox and Vercel serverless
    const apiUrl = new URL('https://api.urlbox.io/v1/render');
    apiUrl.searchParams.set('url', url);
    apiUrl.searchParams.set('width', String(width));
    apiUrl.searchParams.set('height', String(height));
    apiUrl.searchParams.set('format', 'png');
    
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      timeout: 30000,
    });

    if (!response.ok) {
      throw new Error(`Screenshot API returned ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[Screenshot] Error:', error instanceof Error ? error.message : String(error));
    throw new Error('Failed to capture screenshot');
  }
}
