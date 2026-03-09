'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function ScreenshotDashboard() {
  const [url, setUrl] = useState('');
  const [width, setWidth] = useState('1280');
  const [height, setHeight] = useState('720');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [cacheStatus, setCacheStatus] = useState('');

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCacheStatus('');
    setScreenshotUrl('');

    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        url,
        ...(width && { width }),
        ...(height && { height }),
      });

      const response = await fetch(`/api/screenshot?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to capture screenshot');
        return;
      }

      const cacheHeader = response.headers.get('X-Cache');
      setCacheStatus(cacheHeader || 'UNKNOWN');

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setScreenshotUrl(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Screenshot API</h1>
          <p className="text-lg text-muted-foreground">
            Capture screenshots of whitelisted domains with configurable dimensions
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <form onSubmit={handleCapture} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    URL
                  </label>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Width (px)
                  </label>
                  <Input
                    type="number"
                    placeholder="1280"
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
                    placeholder="720"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    disabled={loading}
                    min="240"
                    max="2160"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Capturing...' : 'Capture Screenshot'}
                </Button>
              </form>

              {error && (
                <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}

              {cacheStatus && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 rounded-md text-sm">
                  Cache Status: <strong>{cacheStatus}</strong>
                  {cacheStatus === 'HIT' && ' - Served from cache'}
                  {cacheStatus === 'MISS' && ' - Fresh capture'}
                </div>
              )}
            </Card>

            {/* API Usage */}
            <Card className="p-6 mt-6">
              <h3 className="font-semibold mb-3">API Usage</h3>
              <div className="text-xs bg-muted p-3 rounded-md font-mono overflow-x-auto space-y-2">
                <div>
                  <div className="text-muted-foreground">GET</div>
                  <div className="text-foreground break-words">
                    /api/screenshot?url=&lt;url&gt;&width=&lt;width&gt;&height=&lt;height&gt;
                  </div>
                </div>
                
                {url && (
                  <div className="pt-2 border-t">
                    <div className="text-muted-foreground mb-1">Your API URL:</div>
                    <div className="text-foreground break-words bg-background p-2 rounded border">
                      /api/screenshot?url={encodeURIComponent(url)}&width={width || '1280'}&height={height || '720'}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 text-sm text-muted-foreground space-y-1">
                <div><strong>url</strong> - Required. URL to screenshot</div>
                <div><strong>width</strong> - Optional. Default: 1280</div>
                <div><strong>height</strong> - Optional. Default: 720</div>
              </div>
            </Card>
          </div>

          {/* Screenshot Display */}
          <div className="lg:col-span-2">
            <Card className="p-6 h-full flex flex-col items-center justify-center">
              {screenshotUrl ? (
                <div className="w-full">
                  <img
                    src={screenshotUrl}
                    alt="Screenshot"
                    className="w-full border rounded-md"
                  />
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <p className="mb-2">No screenshot captured yet</p>
                  <p className="text-sm">Enter a whitelisted URL and click Capture Screenshot</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
