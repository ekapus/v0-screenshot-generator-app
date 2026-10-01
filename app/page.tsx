'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function ScreenshotOGGenerator() {
  const [pageUrl, setPageUrl] = useState('');
  const [width, setWidth] = useState('1800');
  const [height, setHeight] = useState('945');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setScreenshotUrl('');

    if (!pageUrl) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        url: pageUrl,
        ...(width && { width }),
        ...(height && { height }),
      });

      const response = await fetch(`/api/og?${params}`);

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          setError(data.error || 'Failed to capture screenshot');
        } else {
          setError(`Failed to capture screenshot (${response.status})`);
        }
        return;
      }

      const blob = await response.blob();
      setScreenshotUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const apiUrl = pageUrl
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/og?url=${encodeURIComponent(pageUrl)}&width=${width || '1800'}&height=${height || '945'}`
    : '';

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">OG Image Generator</h1>
          <p className="text-lg text-muted-foreground">
            Generate dynamic OG images locally from any web page&apos;s metadata
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Form */}
          <Card className="p-6">
            <form onSubmit={handleCapture} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Page URL to Screenshot
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Width (px)
                  </label>
                  <Input
                    type="number"
                    placeholder="1800"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    disabled={loading}
                    min="320"
                    max="3840"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Height (px)
                  </label>
                  <Input
                    type="number"
                    placeholder="945"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    disabled={loading}
                    min="240"
                    max="2160"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Capturing...' : 'Generate Screenshot'}
              </Button>

              {error && (
                <div className="p-3 bg-red-50 text-red-800 rounded-md text-sm">
                  {error}
                </div>
              )}
            </form>

            {/* API Usage */}
            <div className="mt-8 pt-8 border-t">
              <h3 className="font-semibold mb-3">API Endpoint</h3>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Use this URL in your meta tags:
                </p>
                {apiUrl && (
                  <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto break-words">
                    {apiUrl}
                  </div>
                )}
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="mt-8 pt-8 border-t">
              <h3 className="font-semibold mb-3">Self-hosted generation</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  No screenshot API or external rendering service is required. The server fetches the page&apos;s title and description, then creates the image locally with SVG and Sharp.
                </p>
                <p>
                  For safety, local and private-network URLs are blocked. Public HTTP and HTTPS pages can be fetched without any API key or external service.
                </p>
              </div>
            </div>
          </Card>

          {/* Preview */}
          <div className="space-y-4">
            {screenshotUrl ? (
              <Card className="overflow-hidden">
                <img
                  src={screenshotUrl}
                  alt="Screenshot"
                  className="w-full"
                />
              </Card>
            ) : (
              <Card className="h-96 flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">Screenshot preview will appear here</p>
              </Card>
            )}

            {screenshotUrl && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2 text-sm">HTML Meta Tag</h3>
                <code className="text-xs bg-muted p-3 rounded-md block overflow-x-auto">
                  {`<meta property="og:image" content="${apiUrl}" />`}
                </code>
              </Card>
            )}

            {screenshotUrl && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2 text-sm">Next.js Metadata</h3>
                <code className="text-xs bg-muted p-3 rounded-md block overflow-x-auto">
                  {`export const metadata = {\n  openGraph: {\n    images: [\n      {\n        url: "${apiUrl}",\n        width: ${width},\n        height: ${height},\n      },\n    ],\n  },\n};`}
                </code>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

