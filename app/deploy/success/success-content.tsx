'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, ExternalLink, Download, Copy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deployScript, setDeployScript] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const deploymentId = searchParams.get('id');

  useEffect(() => {
    const fetchScript = async () => {
      if (!deploymentId) return;
      
      try {
        const res = await fetch(`/api/deploy/status/${deploymentId}`);
        const data = await res.json();
        if (data.deployScript) {
          setDeployScript(data.deployScript);
        }
      } catch (err) {
        console.error('Failed to fetch script:', err);
      }
    };

    fetchScript();
  }, [deploymentId]);

  const downloadScript = () => {
    if (!deployScript) return;
    
    const element = document.createElement('a');
    const file = new Blob([deployScript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'deploy.sh';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Script downloaded!');
  };

  const copyScript = () => {
    navigator.clipboard.writeText(deployScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Script copied to clipboard!');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center">
      <div className="max-w-3xl mx-auto px-4 w-full">
        <Card className="p-8">
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>

          <h1 className="text-4xl font-bold mb-2 text-center">Configuration Ready!</h1>
          <p className="text-lg text-muted-foreground mb-8 text-center">
            Your deployment script is ready. Download it and run on your local machine to deploy to AWS.
          </p>

          {deployScript && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-amber-900 mb-4">Deployment Script</h3>
              <div className="bg-white border border-amber-200 rounded p-4 mb-4">
                <pre className="text-xs overflow-x-auto text-amber-900 whitespace-pre-wrap break-words max-h-64">
                  {deployScript.substring(0, 500)}...
                </pre>
              </div>
              <div className="flex gap-2">
                <Button onClick={downloadScript} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download Script
                </Button>
                <Button onClick={copyScript} variant="outline" className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy Script'}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-blue-900 mb-4">Setup Instructions</h3>
            <ol className="space-y-3 text-sm text-blue-800 list-decimal list-inside">
              <li><strong>Install required tools:</strong> AWS CLI and SAM CLI on your local machine</li>
              <li><strong>Download the script:</strong> Click the "Download Script" button above</li>
              <li><strong>Set AWS credentials:</strong>
                <code className="block bg-white p-2 rounded mt-1 text-xs">
                  {`export AWS_ACCESS_KEY_ID=<your-key>`}<br/>
                  {`export AWS_SECRET_ACCESS_KEY=<your-secret>`}
                </code>
              </li>
              <li><strong>Run the script:</strong>
                <code className="block bg-white p-2 rounded mt-1 text-xs">
                  chmod +x deploy.sh && ./deploy.sh
                </code>
              </li>
              <li><strong>Wait for completion:</strong> Deployment typically takes 2-5 minutes</li>
              <li><strong>Copy the endpoint:</strong> The script will output your Lambda endpoint URL</li>
            </ol>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-green-900 mb-4">After Deployment</h3>
            <ul className="space-y-2 text-sm text-green-800 list-disc list-inside">
              <li>Test your endpoint using the screenshot tester</li>
              <li>Integrate the endpoint into your applications</li>
              <li>Monitor CloudWatch logs for debugging</li>
              <li>Review Lambda best practices for optimization</li>
            </ul>
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
              Configure Another Deployment
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
