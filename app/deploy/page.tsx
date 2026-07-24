'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SetupForm from '@/components/deploy/setup-form';
import DeploymentMonitor from '@/components/deploy/deployment-monitor';

export default function DeployPage() {
  const router = useRouter();
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [region, setRegion] = useState('');
  const [allowedHostnames, setAllowedHostnames] = useState('');

  if (deploymentId) {
    return (
      <DeploymentMonitor
        deploymentId={deploymentId}
        region={region}
        allowedHostnames={allowedHostnames}
        onComplete={() => {
          setTimeout(() => router.push('/deploy/success'), 2000);
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Deploy to AWS Lambda</h1>
          <p className="text-lg text-muted-foreground">
            Set up your screenshot service on AWS with a single click
          </p>
        </div>

        <SetupForm
          onDeployStart={(id, r, h) => {
            setDeploymentId(id);
            setRegion(r);
            setAllowedHostnames(h);
          }}
        />
      </div>
    </main>
  );
}
