# Screenshot API Configuration

## Environment Variables

Configure the following environment variable in your project settings:

### `WHITELISTED_DOMAINS`
**Required** - Comma-separated list of domains that are allowed to be screenshotted.

Supports:
- Exact domain matches: `example.com`
- Wildcard subdomains: `*.example.com`

**Example:**
```
WHITELISTED_DOMAINS=example.com,github.com,*.vercel.app
```

## Default Dimensions

- **Width**: 1280px (min: 320px, max: 3840px)
- **Height**: 720px (min: 240px, max: 2160px)

## API Endpoints

### GET /api/screenshot

Captures a screenshot of a whitelisted URL.

**Query Parameters:**
- `url` (required) - The URL to screenshot
- `width` (optional) - Screenshot width in pixels (default: 1280)
- `height` (optional) - Screenshot height in pixels (default: 720)

**Example Request:**
```
GET /api/screenshot?url=https://example.com&width=1920&height=1080
```

**Response:**
- **200 OK** - PNG image binary data
- **400 Bad Request** - Invalid URL or parameters
- **403 Forbidden** - Domain not whitelisted
- **500 Internal Server Error** - Screenshot capture failed

**Headers:**
- `X-Cache: HIT` - Screenshot served from cache
- `X-Cache: MISS` - Fresh screenshot captured
- `Cache-Control: public, max-age=86400` - 24-hour browser cache

## Caching

Screenshots are cached in Vercel Blob storage based on URL + dimensions. The cache key is a SHA-256 hash of `url:width:height`. Subsequent requests for the same URL and dimensions are served from the cache, improving performance.

## Security

- Only domains in the `WHITELISTED_DOMAINS` list can be screenshotted
- All URLs are validated before processing
- Dimensions are validated and clamped to safe ranges
- Screenshots are stored privately in Vercel Blob
