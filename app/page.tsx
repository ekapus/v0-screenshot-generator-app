'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export default function OGImageGenerator() {
  const [title, setTitle] = useState('My Awesome Article');
  const [description, setDescription] = useState('Learn how to generate dynamic OG images');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [imageUrl, setImageUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const generatePreview = () => {
    const params = new URLSearchParams({
      title,
      ...(description && { description }),
      ...(bgColor && { bg: bgColor }),
      ...(imageUrl && { image: imageUrl }),
    });
    setPreviewUrl(`/api/og?${params}`);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(previewUrl);
  };

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">OG Image Generator</h1>
          <p className="text-muted-foreground">Generate dynamic Open Graph images for your content</p>
        </div>

        {/* Generator */}
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter image title..."
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">{title.length}/100</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description (optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description..."
                maxLength={150}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">{description.length}/150</p>
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium mb-2">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <Input
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium mb-2">Image URL (optional)</label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                type="url"
              />
            </div>

            <Button onClick={generatePreview} className="w-full">Generate Preview</Button>
          </div>
        </Card>

        {/* Preview */}
        {previewUrl && (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden bg-muted">
              <img
                src={previewUrl}
                alt="OG Image Preview"
                className="w-full"
                style={{ aspectRatio: '1200/630' }}
              />
            </div>

            {/* API URL */}
            <Card className="p-4 bg-muted">
              <p className="text-sm font-medium mb-2">API Endpoint:</p>
              <code className="text-xs break-all bg-background p-3 rounded block mb-3">
                {previewUrl}
              </code>
              <Button onClick={copyUrl} variant="outline" size="sm" className="w-full">
                Copy URL
              </Button>
            </Card>

            {/* Usage Instructions */}
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Usage in Next.js Metadata</h3>
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`export const metadata = {
  openGraph: {
    title: "My Awesome Article",
    description: "Learn how to generate dynamic OG images",
    images: [
      {
        url: "${previewUrl}",
        width: 1200,
        height: 630,
        type: 'image/png',
      },
    ],
  },
};`}
              </pre>
            </Card>

            {/* Query Parameters */}
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Query Parameters</h3>
              <ul className="space-y-2 text-sm">
                <li><strong>title</strong> - Page title (required)</li>
                <li><strong>description</strong> - Optional subtitle</li>
                <li><strong>bg</strong> - Background color (hex code, default: #ffffff)</li>
                <li><strong>image</strong> - Optional image URL</li>
              </ul>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
