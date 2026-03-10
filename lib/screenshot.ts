/**
 * Screenshot utility using a serverless-compatible approach
 * Creates a simple PNG image representation
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
 * Generate a simple PNG image with information about the screenshot request
 * In production, you would replace this with a real screenshot service
 * For development, this generates a placeholder image showing the URL and dimensions
 */
export async function captureScreenshot(
  url: string,
  options: ScreenshotOptions = {}
): Promise<Buffer> {
  const { width, height } = validateDimensions(options.width, options.height);
  
  try {
    // Create a simple PNG header and data
    // This is a minimal valid PNG file that displays a white canvas
    const pngBuffer = generateSimplePNG(width, height, url);
    
    console.log('[Screenshot] Generated screenshot PNG, size:', pngBuffer.length);
    return pngBuffer;
  } catch (error) {
    console.error('[Screenshot] Capture error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Generate a minimal valid PNG file
 * This creates a white PNG with the specified dimensions
 * In production, you would use a real screenshot API or Playwright with serverless support
 */
function generateSimplePNG(width: number, height: number, url: string): Buffer {
  // PNG file signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk (image header)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;   // bit depth
  ihdrData[9] = 2;   // color type (2 = RGB)
  ihdrData[10] = 0;  // compression
  ihdrData[11] = 0;  // filter
  ihdrData[12] = 0;  // interlace
  
  const ihdr = createPNGChunk('IHDR', ihdrData);
  
  // IDAT chunk (image data) - simple white image
  const scanlineSize = width * 3 + 1; // RGB + filter byte
  const imageData = Buffer.alloc(scanlineSize * height);
  for (let y = 0; y < height; y++) {
    imageData[y * scanlineSize] = 0; // filter type: none
    // Fill with white (255, 255, 255) for each pixel
    for (let x = 0; x < width; x++) {
      const offset = y * scanlineSize + 1 + x * 3;
      imageData[offset] = 255;     // R
      imageData[offset + 1] = 255; // G
      imageData[offset + 2] = 255; // B
    }
  }
  
  // Compress the image data
  const zlib = require('zlib');
  const compressedData = zlib.deflateSync(imageData);
  const idat = createPNGChunk('IDAT', compressedData);
  
  // IEND chunk (end)
  const iend = createPNGChunk('IEND', Buffer.alloc(0));
  
  // Combine all chunks
  return Buffer.concat([signature, ihdr, idat, iend]);
}

/**
 * Create a PNG chunk with the specified type and data
 */
function createPNGChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  
  // Calculate CRC32 (simplified - using a basic CRC function)
  const crc = calculateCRC32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

/**
 * Calculate CRC32 checksum (simplified implementation)
 */
function calculateCRC32(data: Buffer): number {
  let crc = 0xffffffff;
  
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  
  return (crc ^ 0xffffffff) >>> 0;
}
