'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const AWS_REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
];

interface SetupFormProps {
  onDeployStart: (deploymentId: string, region: string, hostnames: string) => void;
}

export default function SetupForm({ onDeployStart }: SetupFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Credentials Tab
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  // Configuration Tab
  const [region, setRegion] = useState('us-east-1');
  const [stackName, setStackName] = useState('screenshot-service');
  const [allowedHostnames, setAllowedHostnames] = useState('');
  const [s3Bucket, setS3Bucket] = useState('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Credentials validation
    if (!accessKeyId.trim()) {
      newErrors.accessKeyId = 'AWS Access Key ID is required';
    } else if (!/^AKIA[0-9A-Z]{16}$|^[A-Z0-9]{20}$/.test(accessKeyId.trim())) {
      newErrors.accessKeyId = 'Invalid Access Key format';
    }

    if (!secretAccessKey.trim()) {
      newErrors.secretAccessKey = 'AWS Secret Access Key is required';
    } else if (secretAccessKey.trim().length < 40) {
      newErrors.secretAccessKey = 'Secret Access Key appears too short';
    }

    // Configuration validation
    if (!stackName.trim()) {
      newErrors.stackName = 'Stack name is required';
    } else if (!/^[a-z0-9-]{1,128}$/.test(stackName)) {
      newErrors.stackName = 'Stack name must be lowercase alphanumeric with hyphens';
    }

    if (allowedHostnames.trim() && !/^[a-z0-9.,\-\s]+$/i.test(allowedHostnames)) {
      newErrors.allowedHostnames = 'Invalid hostname format';
    }

    if (s3Bucket.trim() && !/^[a-z0-9.\-]{3,63}$/.test(s3Bucket)) {
      newErrors.s3Bucket = 'Invalid S3 bucket name format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDeploy = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/deploy/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessKeyId,
          secretAccessKey,
          region,
          stackName,
          allowedHostnames: allowedHostnames.split(',').map(h => h.trim()).filter(Boolean),
          s3Bucket: s3Bucket.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to start deployment');
        return;
      }

      const { deploymentId } = await response.json();
      onDeployStart(deploymentId, region, allowedHostnames);
      toast.success('Deployment started! Monitoring progress...');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8">
      <div className="space-y-8">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Your credentials are used only to start the deployment and are never stored on our servers.
            </AlertDescription>
          </Alert>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              <strong>How to get AWS credentials:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                <li>Go to <a href="https://console.aws.amazon.com/iam" target="_blank" rel="noopener noreferrer" className="underline">AWS IAM Console</a></li>
                <li>Click "Users" in the left menu</li>
                <li>Select your user or create a new one</li>
                <li>Go to "Access keys" tab</li>
                <li>Click "Create access key"</li>
                <li>Choose "Command Line Interface (CLI)" and confirm</li>
                <li>Copy both the Access Key ID and Secret Access Key immediately</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">AWS Access Key ID</label>
              <Input
                type="text"
                placeholder="AKIA..."
                value={accessKeyId}
                onChange={(e) => {
                  setAccessKeyId(e.target.value);
                  setErrors({ ...errors, accessKeyId: '' });
                }}
                disabled={loading}
                className={errors.accessKeyId ? 'border-red-500' : ''}
              />
              {errors.accessKeyId && (
                <p className="text-xs text-red-500 mt-1">{errors.accessKeyId}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Create in AWS IAM Console under Access Keys
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">AWS Secret Access Key</label>
              <div className="relative">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  placeholder="••••••••••••••••••••"
                  value={secretAccessKey}
                  onChange={(e) => {
                    setSecretAccessKey(e.target.value);
                    setErrors({ ...errors, secretAccessKey: '' });
                  }}
                  disabled={loading}
                  className={errors.secretAccessKey ? 'border-red-500' : ''}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSecret(!showSecret)}
                  disabled={loading}
                >
                  {showSecret ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.secretAccessKey && (
                <p className="text-xs text-red-500 mt-1">{errors.secretAccessKey}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Only shown once - copy and save it immediately
              </p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-sm">Required Permissions</h4>
            <p className="text-xs text-muted-foreground">
              Your AWS user needs these permissions:
            </p>
            <code className="text-xs bg-background p-2 rounded block overflow-x-auto">
              {`- cloudformation:*
- lambda:*
- apigateway:*
- iam:PassRole
- s3:*`}
            </code>
          </div>

        {/* Configuration Section */}
        <div className="border-t pt-8">
          <h3 className="text-lg font-semibold">Deployment Configuration</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">AWS Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                {AWS_REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                Choose a region close to your users for lower latency
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">CloudFormation Stack Name</label>
              <Input
                type="text"
                placeholder="screenshot-service"
                value={stackName}
                onChange={(e) => {
                  setStackName(e.target.value);
                  setErrors({ ...errors, stackName: '' });
                }}
                disabled={loading}
                className={errors.stackName ? 'border-red-500' : ''}
              />
              {errors.stackName && (
                <p className="text-xs text-red-500 mt-1">{errors.stackName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Allowed Hostnames (Optional)
              </label>
              <Input
                type="text"
                placeholder="example.com, app.example.com"
                value={allowedHostnames}
                onChange={(e) => {
                  setAllowedHostnames(e.target.value);
                  setErrors({ ...errors, allowedHostnames: '' });
                }}
                disabled={loading}
                className={errors.allowedHostnames ? 'border-red-500' : ''}
              />
              {errors.allowedHostnames && (
                <p className="text-xs text-red-500 mt-1">{errors.allowedHostnames}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Restrict which hostnames can request screenshots (comma-separated)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                S3 Bucket for Artifacts (Optional)
              </label>
              <Input
                type="text"
                placeholder="my-sam-artifacts-bucket"
                value={s3Bucket}
                onChange={(e) => {
                  setS3Bucket(e.target.value);
                  setErrors({ ...errors, s3Bucket: '' });
                }}
                disabled={loading}
                className={errors.s3Bucket ? 'border-red-500' : ''}
              />
              {errors.s3Bucket && (
                <p className="text-xs text-red-500 mt-1">{errors.s3Bucket}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                If not provided, SAM will create one automatically
              </p>
            </div>
          </div>

        </div>

        <Button
          onClick={handleDeploy}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? 'Generating Script...' : 'Generate Deployment Script'}
        </Button>
      </div>
    </Card>
  );
}
