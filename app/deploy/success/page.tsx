'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, ExternalLink } from 'lucide-react';

export default function SuccessPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center">
      <div className="max-w-2xl mx-auto px-4 w-full">
        <Card className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>

          <h1 className="text-4xl font-bold mb-2">Deployment Complete!</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Your AWS Lambda screenshot service is now live and ready to use.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold text-green-900 mb-4">Next Steps</h3>
            <ol className="space-y-3 text-sm text-green-800 list-decimal list-inside">
              <li>Check your email for the AWS CloudFormation stack details</li>
              <li>Copy the API Endpoint from the deployment outputs</li>
              <li>Test the endpoint using the screenshot tester</li>
              <li>Integrate the endpoint into your applications</li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">API Usage Example</h3>
            <code className="text-xs bg-white p-3 rounded block overflow-x-auto text-blue-900">
              {`curl "https://YOUR_ENDPOINT/screenshot?url=https://example.com&width=1800&height=945"`}
            </code>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => router.push('/')}
              size="lg"
              className="w-full"
            >
              Go to Screenshot Tester
            </Button>
            <Button
              onClick={() => router.push('/deploy')}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Deploy Another Service
            </Button>
          </div>

          <div className="mt-8 pt-8 border-t space-y-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <span>📚</span>
              <a href="https://docs.aws.amazon.com/lambda" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                AWS Lambda Documentation
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            <p className="flex items-center gap-2">
              <span>📖</span>
              <a href="https://aws.amazon.com/blogs/compute/lambdas-best-practices/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                Lambda Best Practices
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
