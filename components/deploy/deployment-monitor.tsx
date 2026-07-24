'use client';

import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Copy, Download, Loader } from 'lucide-react';
import { toast } from 'sonner';
import DeploymentStepper from './deployment-stepper';
import LogViewer from './log-viewer';

interface DeploymentStatus {
  stage: string;
  progress: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: string;
  completedSteps: string[];
  logs: Array<{ timestamp: string; message: string; level: 'info' | 'error' | 'warning' }>;
  stackOutput?: {
    ApiEndpoint?: string;
    LambdaFunctionName?: string;
    LambdaRoleArn?: string;
  };
  error?: string;
}

interface DeploymentMonitorProps {
  deploymentId: string;
  region: string;
  allowedHostnames: string;
  onComplete: () => void;
}

const STAGES = [
  { id: 'validate', label: 'Validating Credentials' },
  { id: 'build', label: 'Building SAM Application' },
  { id: 'package', label: 'Packaging Application' },
  { id: 'deploy', label: 'Deploying to CloudFormation' },
  { id: 'outputs', label: 'Retrieving Outputs' },
];

export default function DeploymentMonitor({
  deploymentId,
  region,
  allowedHostnames,
  onComplete,
}: DeploymentMonitorProps) {
  const [status, setStatus] = useState<DeploymentStatus | null | undefined>(undefined);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/deploy/status/${deploymentId}`);
        if (!response.ok) throw new Error('Failed to fetch status');

        const data = await response.json();
        setStatus(data);

        if (data.status === 'completed' || data.status === 'failed') {
          setIsRunning(false);
          if (data.status === 'completed') {
            toast.success('Deployment completed successfully!');
          } else {
            toast.error(data.error || 'Deployment failed');
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    // Poll immediately and then every 1 second
    pollStatus();
    pollIntervalRef.current = setInterval(pollStatus, 1000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [deploymentId]);

  useEffect(() => {
    if (status?.status === 'completed') {
      setTimeout(onComplete, 2000);
    }
  }, [status?.status, onComplete]);

  if (!status) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  const currentStageIndex = STAGES.findIndex(s => s.id === status.stage);
  const progressPercent = (currentStageIndex + 1) / STAGES.length * 100;

  const handleCancel = async () => {
    try {
      await fetch(`/api/deploy/cancel/${deploymentId}`, { method: 'POST' });
      setIsRunning(false);
      toast.success('Deployment cancelled');
    } catch {
      toast.error('Failed to cancel deployment');
    }
  };

  const handleCopyEndpoint = () => {
    if (status.stackOutput?.ApiEndpoint) {
      navigator.clipboard.writeText(status.stackOutput.ApiEndpoint);
      toast.success('Endpoint copied to clipboard');
    }
  };

  const handleDownloadSummary = () => {
    const summary = `AWS Lambda Screenshot Service Deployment Summary
================================================

Deployment ID: ${deploymentId}
Region: ${region}
Status: ${status.status}
Timestamp: ${new Date().toISOString()}

Allowed Hostnames: ${allowedHostnames || 'None'}

Stack Outputs:
${status.stackOutput?.ApiEndpoint ? `API Endpoint: ${status.stackOutput.ApiEndpoint}` : ''}
${status.stackOutput?.LambdaFunctionName ? `Lambda Function: ${status.stackOutput.LambdaFunctionName}` : ''}
${status.stackOutput?.LambdaRoleArn ? `IAM Role: ${status.stackOutput.LambdaRoleArn}` : ''}

Logs:
${status.logs.map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`).join('\n')}
`;

    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deployment-${deploymentId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Deployment in Progress</h2>
            <p className="text-sm text-muted-foreground">Deployment ID: {deploymentId}</p>
          </div>
          {status.status === 'completed' && (
            <CheckCircle className="h-8 w-8 text-green-600" />
          )}
          {status.status === 'failed' && (
            <AlertCircle className="h-8 w-8 text-red-600" />
          )}
          {status.status === 'running' && (
            <Loader className="h-8 w-8 animate-spin text-blue-600" />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{status.currentStep}</span>
            <span className="text-muted-foreground">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </Card>

      {/* Stepper */}
      <DeploymentStepper
        stages={STAGES}
        currentStage={status.stage}
        completedStages={status.completedSteps}
        status={status.status}
      />

      {/* Error Alert */}
      {status.status === 'failed' && status.error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Deployment Failed</h3>
              <p className="text-sm text-red-700 mt-1">{status.error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Output */}
      {status.status === 'completed' && status.stackOutput?.ApiEndpoint && (
        <Card className="p-6 bg-green-50 border-green-200">
          <h3 className="font-semibold mb-4 text-green-900">Deployment Outputs</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-green-700 mb-1 uppercase font-semibold">API Endpoint</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white p-3 rounded-md text-xs overflow-x-auto border border-green-200">
                  {status.stackOutput.ApiEndpoint}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyEndpoint}
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {status.stackOutput.LambdaFunctionName && (
              <div>
                <p className="text-xs text-green-700 mb-1 uppercase font-semibold">Function Name</p>
                <code className="bg-white p-3 rounded-md text-xs block border border-green-200">
                  {status.stackOutput.LambdaFunctionName}
                </code>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="logs" className="w-full">
        <TabsList>
          <TabsTrigger value="logs">Deployment Logs</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <LogViewer logs={status.logs} />
        </TabsContent>

        <TabsContent value="details">
          <Card className="p-6">
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Deployment Status</p>
                  <p className="font-semibold capitalize">{status.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Stage</p>
                  <p className="font-semibold">{status.stage}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Region</p>
                  <p className="font-semibold">{region}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Progress</p>
                  <p className="font-semibold">{Math.round(progressPercent)}%</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex gap-3">
        {isRunning && (
          <Button
            variant="destructive"
            onClick={handleCancel}
            className="flex-1"
          >
            Cancel Deployment
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleDownloadSummary}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Summary
        </Button>
      </div>
    </div>
  );
}
