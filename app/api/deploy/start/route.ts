import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// Global deployment states store
const deploymentStates = global as any;
if (!deploymentStates._deployments) {
  deploymentStates._deployments = new Map<string, any>();
}

interface DeploymentState {
  id: string;
  status: 'running' | 'completed' | 'failed';
  stage: 'validate' | 'generate' | 'complete';
  currentStep: string;
  progress: number;
  logs: Array<{ timestamp: string; message: string; level: string }>;
  error?: string;
  deployScript?: string;
  credentials: { accessKeyId: string; secretAccessKey: string };
  config: { region: string; stackName: string; allowedHostnames: string[] };
  completedSteps: string[];
  createdAt: number;
}

function addLog(deploymentId: string, message: string, level: 'info' | 'error' | 'warning' = 'info') {
  const state = deploymentStates._deployments.get(deploymentId);
  if (state) {
    state.logs.push({
      timestamp: new Date().toISOString(),
      message,
      level,
    });
  }
}

function generateDeploymentScript(state: DeploymentState): string {
  const hostnames = state.config.allowedHostnames.join(',') || '*';
  
  return `#!/bin/bash
set -e

# AWS Lambda Screenshot Service - Deployment Script
# Generated for region: ${state.config.region}
# Stack name: ${state.config.stackName}

echo "=========================================="
echo "AWS Lambda Screenshot Service Deployment"
echo "=========================================="
echo ""

# Check for required tools
echo "Checking for required tools..."
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI not found. Please install AWS CLI v2"
    echo "Visit: https://aws.amazon.com/cli/"
    exit 1
fi

if ! command -v sam &> /dev/null; then
    echo "ERROR: AWS SAM CLI not found. Please install AWS SAM CLI"
    echo "Install with: pip install aws-sam-cli"
    exit 1
fi

echo "✓ AWS CLI found: $(aws --version)"
echo "✓ SAM CLI found: $(sam --version)"
echo ""

# Verify credentials
echo "Verifying AWS credentials..."
if aws sts get-caller-identity > /dev/null 2>&1; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
    echo "✓ Authenticated as: $USER_ARN"
    echo "  Account ID: $ACCOUNT_ID"
else
    echo "ERROR: AWS credential validation failed"
    echo "Make sure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set correctly"
    exit 1
fi
echo ""

# Set environment variables
export AWS_DEFAULT_REGION="${state.config.region}"
export ALLOWED_HOSTNAMES="${hostnames}"

# Build
echo "Building SAM application..."
sam build

echo "✓ Build completed"
echo ""

# Deploy
echo "Deploying to CloudFormation..."
sam deploy \\
  --stack-name ${state.config.stackName} \\
  --region ${state.config.region} \\
  --capabilities CAPABILITY_IAM \\
  --no-confirm-changeset \\
  --parameter-overrides AllowedHostnames="$ALLOWED_HOSTNAMES"

echo ""
echo "=========================================="
echo "✓ Deployment completed successfully!"
echo "=========================================="
echo ""

# Get outputs
echo "Retrieving stack outputs..."
aws cloudformation describe-stacks \\
  --stack-name ${state.config.stackName} \\
  --region ${state.config.region} \\
  --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \\
  --output table

echo ""
echo "Your Lambda function is now deployed and ready to use!"
`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credentials, config } = body;

    if (!credentials?.accessKeyId || !credentials?.secretAccessKey) {
      return NextResponse.json(
        { error: 'Missing AWS credentials' },
        { status: 400 }
      );
    }

    if (!config?.region || !config?.stackName) {
      return NextResponse.json(
        { error: 'Missing deployment configuration' },
        { status: 400 }
      );
    }

    const deploymentId = randomUUID();

    // Initialize deployment state
    deploymentStates._deployments.set(deploymentId, {
      id: deploymentId,
      status: 'running',
      stage: 'validate',
      currentStep: 'Validating credentials...',
      progress: 0,
      logs: [],
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      config: {
        region: config.region,
        stackName: config.stackName,
        allowedHostnames: config.allowedHostnames || [],
      },
      completedSteps: [],
      createdAt: Date.now(),
    } as DeploymentState);

    // Start deployment async
    startDeployment(deploymentId).catch((err) => {
      console.error('[v0] Deployment error:', err);
    });

    return NextResponse.json({ deploymentId });
  } catch (error) {
    console.error('[v0] API error:', error);
    return NextResponse.json(
      { error: 'Failed to start deployment' },
      { status: 500 }
    );
  }
}

async function startDeployment(deploymentId: string) {
  const state = deploymentStates._deployments.get(deploymentId) as DeploymentState;
  if (!state) return;

  try {
    // Stage 1: Validate credentials format
    state.stage = 'validate';
    state.currentStep = 'Validating credentials...';
    state.progress = 10;
    addLog(deploymentId, 'Starting deployment configuration');

    if (!state.credentials.accessKeyId || !state.credentials.secretAccessKey) {
      throw new Error('Missing AWS credentials');
    }

    addLog(deploymentId, `Access Key ID: ${state.credentials.accessKeyId.substring(0, 4)}...${state.credentials.accessKeyId.substring(state.credentials.accessKeyId.length - 4)}`);
    addLog(deploymentId, `Secret Key length: ${state.credentials.secretAccessKey.length} characters`);

    // Check credential format
    const accessKeyPattern = /^AKIA[0-9A-Z]{16}$|^[A-Z0-9]{20}$/;
    if (!accessKeyPattern.test(state.credentials.accessKeyId)) {
      addLog(deploymentId, 'Warning: Access Key ID format looks unusual', 'warning');
    }

    if (state.credentials.secretAccessKey.length < 40) {
      addLog(deploymentId, 'Warning: Secret Access Key appears too short', 'warning');
    }

    addLog(deploymentId, 'Credentials format validation passed');
    state.completedSteps.push('validate');

    // Stage 2: Generate deployment script
    state.stage = 'generate';
    state.currentStep = 'Generating deployment script...';
    state.progress = 50;
    addLog(deploymentId, 'Generating AWS SAM deployment script');

    const deployScript = generateDeploymentScript(state);
    state.deployScript = deployScript;

    addLog(deploymentId, 'Deployment script generated successfully');
    addLog(deploymentId, '');
    addLog(deploymentId, '📋 NEXT STEPS:');
    addLog(deploymentId, '1. Download the deployment script from the "Download Script" button');
    addLog(deploymentId, '2. On your local machine, ensure AWS CLI and SAM CLI are installed');
    addLog(deploymentId, '3. Set your AWS credentials:');
    addLog(deploymentId, '   export AWS_ACCESS_KEY_ID=<your-key-id>');
    addLog(deploymentId, '   export AWS_SECRET_ACCESS_KEY=<your-secret>');
    addLog(deploymentId, '4. Run the script: chmod +x deploy.sh && ./deploy.sh');
    addLog(deploymentId, '5. The script will deploy your Lambda function to AWS');
    addLog(deploymentId, '');
    addLog(deploymentId, 'The deployment will take 2-5 minutes to complete.');
    state.completedSteps.push('generate');

    // Stage 3: Complete
    state.stage = 'complete';
    state.currentStep = 'Ready to deploy';
    state.progress = 100;
    state.status = 'completed';
    addLog(deploymentId, 'Configuration complete!');

    state.completedSteps.push('complete');
  } catch (err: any) {
    state.status = 'failed';
    const errorMsg = (err?.message || String(err) || 'Unknown error occurred') as string;
    state.error = errorMsg;
    addLog(deploymentId, state.error, 'error');
  }
}

// Cleanup old deployments after 1 hour
if (!deploymentStates._cleanupInterval) {
  deploymentStates._cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, state] of deploymentStates._deployments.entries()) {
      if (state.createdAt && now - state.createdAt > 3600000) {
        deploymentStates._deployments.delete(id);
      }
    }
  }, 600000); // Check every 10 minutes
}
