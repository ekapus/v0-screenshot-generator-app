'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function ScreenshotTester() {
  const [lambdaUrl, setLambdaUrl] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [width, setWidth] = useState('1800');
  const [height, setHeight] = useState('945');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [responseTime, setResponseTime] = useState<number | null>(null);

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setScreenshotUrl('');
    setResponseTime(null);

    if (!lambdaUrl) {
      setError('Please enter Lambda API endpoint URL');
      return;
    }

    if (!pageUrl) {
      setError('Please enter a page URL to screenshot');
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      const params = new URLSearchParams({
        url: pageUrl,
        ...(width && { width }),
        ...(height && { height }),
      });

      const response = await fetch(`${lambdaUrl}?${params}`);
      const endTime = Date.now();
      setResponseTime(endTime - startTime);

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          setError(data.error || `Failed to capture screenshot (${response.status})`);
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

  const apiUrl = lambdaUrl && pageUrl
    ? `${lambdaUrl}?url=${encodeURIComponent(pageUrl)}&width=${width || '1800'}&height=${height || '945'}`
    : '';

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">AWS Lambda Screenshot Tester</h1>
          <p className="text-lg text-muted-foreground">
            Test your Lambda function endpoint by capturing screenshots
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Form */}
          <Card className="p-6">
            <form onSubmit={handleCapture} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Lambda API Endpoint URL
                </label>
                <Input
                  type="url"
                  placeholder="https://xxxxx.execute-api.region.amazonaws.com/prod/screenshot"
                  value={lambdaUrl}
                  onChange={(e) => setLambdaUrl(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get this from your CloudFormation stack outputs
                </p>
              </div>

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
                {loading ? 'Capturing...' : 'Capture Screenshot'}
              </Button>

              {error && (
                <div className="p-3 bg-red-50 text-red-800 rounded-md text-sm">
                  {error}
                </div>
              )}

              {responseTime !== null && (
                <div className="p-3 bg-green-50 text-green-800 rounded-md text-sm">
                  Success! Response time: {responseTime}ms
                </div>
              )}
            </form>

            {/* Setup Instructions */}
            <div className="mt-8 pt-8 border-t space-y-4">
              <h3 className="font-semibold">How to Deploy</h3>
              <p className="text-sm text-muted-foreground">
                Use our interactive deployment wizard to set up your Lambda function automatically:
              </p>
              <Button asChild className="w-full" variant="secondary">
                <a href="/deploy">Open Deployment Wizard</a>
              </Button>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="text-xs">Or deploy manually:</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Install AWS SAM CLI: <code className="bg-muted px-1 rounded">pip install aws-sam-cli</code></li>
                  <li>Build: <code className="bg-muted px-1 rounded">sam build</code></li>
                  <li>Deploy: <code className="bg-muted px-1 rounded">sam deploy --guided</code></li>
                  <li>Copy the API endpoint from CloudFormation outputs into the form above</li>
                </ol>
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

            {apiUrl && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2 text-sm">API URL</h3>
                <code className="text-xs bg-muted p-3 rounded-md block overflow-x-auto break-words">
                  {apiUrl}
                </code>
              </Card>
            )}

            {screenshotUrl && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2 text-sm">Usage in Next.js</h3>
                <code className="text-xs bg-muted p-3 rounded-md block overflow-x-auto">
                  {`export const metadata = {\n  openGraph: {\n    images: [{\n      url: "${apiUrl}",\n      width: ${width},\n      height: ${height},\n    }],\n  },\n};`}
                </code>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}


