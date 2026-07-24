'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function DeployPage() {
  const [copied, setCopied] = useState(false);

  const downloadScript = async () => {
    try {
      const response = await fetch('/api/deploy/script');
      const scriptContent = await response.text();
      
      const element = document.createElement('a');
      const file = new Blob([scriptContent], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = 'deploy.sh';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);
      
      toast.success('Script downloaded! Edit the configuration variables and run it.');
    } catch (error) {
      toast.error('Failed to download script');
    }
  };

  const copyToClipboard = async () => {
    try {
      const response = await fetch('/api/deploy/script');
      const scriptContent = await response.text();
      await navigator.clipboard.writeText(scriptContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Script copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy script');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Deploy to AWS Lambda</h1>
          <p className="text-lg text-muted-foreground">
            Download the deployment script, configure it, and run it on your local machine
          </p>
        </div>

        <Card className="p-8 space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Getting Started</h2>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-semibold text-blue-600 min-w-fit">1.</span>
                <span>Download the deployment script using the button below</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-blue-600 min-w-fit">2.</span>
                <span>Open the script in a text editor and edit the configuration variables at the top:
                  <ul className="mt-2 ml-4 space-y-1 text-xs text-muted-foreground">
                    <li>• AWS_ACCESS_KEY_ID</li>
                    <li>• AWS_SECRET_ACCESS_KEY</li>
                    <li>• AWS_REGION</li>
                    <li>• STACK_NAME</li>
                    <li>• ALLOWED_HOSTNAMES</li>
                  </ul>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-blue-600 min-w-fit">3.</span>
                <span>Make the script executable: <code className="bg-muted px-2 py-1 rounded text-xs">chmod +x deploy.sh</code></span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-blue-600 min-w-fit">4.</span>
                <span>Run the script: <code className="bg-muted px-2 py-1 rounded text-xs">./deploy.sh</code></span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-blue-600 min-w-fit">5.</span>
                <span>The script will output your API endpoint URL when complete</span>
              </li>
            </ol>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={downloadScript} size="lg" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Deployment Script
            </Button>
            <Button onClick={copyToClipboard} variant="outline" size="lg" className="w-full">
              <Copy className="h-4 w-4 mr-2" />
              {copied ? 'Copied!' : 'Copy Script'}
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-blue-50 border-blue-200 space-y-4">
          <div className="flex gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Prerequisites</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• AWS CLI v2: <code className="bg-white/50 px-1 rounded">aws --version</code></li>
                <li>• AWS SAM CLI: <code className="bg-white/50 px-1 rounded">sam --version</code></li>
                <li>• Docker (required for SAM build with --use-container)</li>
                <li>• Valid AWS credentials with IAM permissions for CloudFormation, Lambda, API Gateway, and S3</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-amber-50 border-amber-200 space-y-4">
          <div className="flex gap-2">
            <CheckCircle2 className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-2">Configuration Variables</h3>
              <p className="text-sm text-amber-800 mb-3">Edit these in the script before running:</p>
              <div className="bg-white/50 p-3 rounded text-xs space-y-2 font-mono">
                <div><span className="text-blue-600">AWS_ACCESS_KEY_ID</span> - Your AWS access key</div>
                <div><span className="text-blue-600">AWS_SECRET_ACCESS_KEY</span> - Your AWS secret key</div>
                <div><span className="text-blue-600">AWS_REGION</span> - AWS region (e.g., us-east-1)</div>
                <div><span className="text-blue-600">STACK_NAME</span> - CloudFormation stack name</div>
                <div><span className="text-blue-600">ALLOWED_HOSTNAMES</span> - Comma-separated domains</div>
                <div><span className="text-blue-600">S3_BUCKET</span> - (optional) S3 bucket for artifacts</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-green-50 border-green-200 space-y-4">
          <div className="flex gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-2">What the Script Does</h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li>✓ Validates AWS credentials and prerequisites</li>
                <li>✓ Builds the Lambda function with SAM</li>
                <li>✓ Packages the application for deployment</li>
                <li>✓ Creates CloudFormation stack on AWS</li>
                <li>✓ Outputs your Lambda API endpoint URL</li>
                <li>✓ Provides commands to test your deployment</li>
              </ul>
            </div>
          </div>
        </Card>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800 text-sm">
            <strong>Tip:</strong> The script is idempotent - you can run it multiple times to update your deployment. Simply edit the configuration and run again.
          </AlertDescription>
        </Alert>
      </div>
    </main>
  );
}
