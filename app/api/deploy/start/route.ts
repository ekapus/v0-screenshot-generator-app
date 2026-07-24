import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Global deployment states store
const deploymentStates = global as any;
if (!deploymentStates._deployments) {
  deploymentStates._deployments = new Map<string, any>();
}

interface DeployRequest {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  stackName: string;
  allowedHostnames: string[];
  s3Bucket?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DeployRequest;

    // Validate input
    if (!body.accessKeyId || !body.secretAccessKey || !body.region || !body.stackName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate AWS credentials format
    if (!/^AKIA[0-9A-Z]{16}$/.test(body.accessKeyId)) {
      return NextResponse.json(
        { error: 'Invalid AWS Access Key format' },
        { status: 400 }
      );
    }

    if (body.secretAccessKey.length < 20) {
      return NextResponse.json(
        { error: 'Invalid AWS Secret Access Key' },
        { status: 400 }
      );
    }

    const deploymentId = randomUUID();

    // Initialize deployment state
    deploymentStates._deployments.set(deploymentId, {
      status: 'running',
      stage: 'validate',
      progress: 0,
      currentStep: 'Validating credentials...',
      completedSteps: [],
      logs: [],
      config: {
        region: body.region,
        stackName: body.stackName,
        allowedHostnames: body.allowedHostnames,
        s3Bucket: body.s3Bucket,
      },
      credentials: {
        accessKeyId: body.accessKeyId,
        secretAccessKey: body.secretAccessKey,
      },
      stackOutput: null,
      error: null,
    });

    // Start deployment process in background
    startDeployment(deploymentId);

    return NextResponse.json({ deploymentId });
  } catch (error) {
    console.error('[Deploy API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

function addLog(
  deploymentId: string,
  message: string,
  level: 'info' | 'error' | 'warning' = 'info'
) {
  const state = deploymentStates._deployments.get(deploymentId);
  if (state) {
    state.logs.push({
      timestamp: new Date().toISOString(),
      message,
      level,
    });
  }
}

async function startDeployment(deploymentId: string) {
  const state = deploymentStates._deployments.get(deploymentId);
  if (!state) return;

  try {
    // Stage 1: Validate credentials
    state.stage = 'validate';
    state.currentStep = 'Validating AWS credentials...';
    addLog(deploymentId, 'Starting AWS credential validation');

    const projectRoot = process.cwd();
    
    // Set AWS environment variables
    const env = {
      ...process.env,
      AWS_ACCESS_KEY_ID: state.credentials.accessKeyId,
      AWS_SECRET_ACCESS_KEY: state.credentials.secretAccessKey,
      AWS_DEFAULT_REGION: state.config.region,
    };

    // Verify credentials with sts get-caller-identity
    const stsCheck = spawnSync('aws', ['sts', 'get-caller-identity', '--output', 'json'], {
      env,
      cwd: projectRoot,
      encoding: 'utf-8',
    });

    if (stsCheck.status !== 0) {
      throw new Error(`AWS credential validation failed: ${stsCheck.stderr}`);
    }

    const callerInfo = JSON.parse(stsCheck.stdout);
    addLog(deploymentId, `Authenticated as: ${callerInfo.Arn}`);
    state.completedSteps.push('validate');

    // Stage 2: Build SAM application
    state.stage = 'build';
    state.currentStep = 'Building SAM application...';
    state.progress = 20;
    addLog(deploymentId, 'Starting SAM build');

    const buildResult = spawnSync('sam', ['build', '--use-container'], {
      env,
      cwd: projectRoot,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    if (buildResult.status !== 0) {
      addLog(deploymentId, buildResult.stderr || 'Build failed', 'error');
      throw new Error('SAM build failed');
    }

    addLog(deploymentId, 'Build completed successfully');
    state.completedSteps.push('build');

    // Stage 3: Package application
    state.stage = 'package';
    state.currentStep = 'Packaging application...';
    state.progress = 40;
    addLog(deploymentId, 'Starting SAM package');

    // Create S3 bucket for artifacts if needed
    let s3Bucket = state.config.s3Bucket;
    if (!s3Bucket) {
      s3Bucket = `sam-artifacts-${randomUUID().split('-')[0]}`;
      addLog(deploymentId, `Creating S3 bucket: ${s3Bucket}`);

      const createBucketCmd = spawnSync(
        'aws',
        ['s3', 'mb', `s3://${s3Bucket}`, `--region`, state.config.region],
        { env, cwd: projectRoot, encoding: 'utf-8' }
      );

      if (createBucketCmd.status !== 0) {
        addLog(deploymentId, `Note: S3 bucket may already exist`, 'warning');
      }
    }

    const packageResult = spawnSync(
      'sam',
      [
        'package',
        '--output-template-file',
        '.aws-sam/packaged.yaml',
        '--s3-bucket',
        s3Bucket,
        '--region',
        state.config.region,
      ],
      {
        env,
        cwd: projectRoot,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    if (packageResult.status !== 0) {
      addLog(deploymentId, packageResult.stderr || 'Package failed', 'error');
      throw new Error('SAM package failed');
    }

    addLog(deploymentId, 'Package completed successfully');
    state.completedSteps.push('package');

    // Stage 4: Deploy to CloudFormation
    state.stage = 'deploy';
    state.currentStep = 'Deploying to CloudFormation...';
    state.progress = 60;
    addLog(deploymentId, 'Starting CloudFormation deployment');

    const deployEnvVars = state.config.allowedHostnames.join(',') || '*';

    const deployResult = spawnSync(
      'sam',
      [
        'deploy',
        '--template-file',
        '.aws-sam/packaged.yaml',
        '--stack-name',
        state.config.stackName,
        '--region',
        state.config.region,
        '--capabilities',
        'CAPABILITY_IAM',
        '--no-confirm-changeset',
        '--parameter-overrides',
        `AllowedHostnames="${deployEnvVars}"`,
      ],
      {
        env,
        cwd: projectRoot,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 600000, // 10 minutes
      }
    );

    if (deployResult.status !== 0) {
      const errorMsg = deployResult.stderr || deployResult.stdout || 'Deployment failed';
      addLog(deploymentId, errorMsg, 'error');
      throw new Error('CloudFormation deployment failed');
    }

    addLog(deploymentId, 'CloudFormation deployment completed');
    state.completedSteps.push('deploy');

    // Stage 5: Retrieve outputs
    state.stage = 'outputs';
    state.currentStep = 'Retrieving stack outputs...';
    state.progress = 80;
    addLog(deploymentId, 'Fetching CloudFormation stack outputs');

    const describeResult = spawnSync(
      'aws',
      [
        'cloudformation',
        'describe-stacks',
        '--stack-name',
        state.config.stackName,
        '--region',
        state.config.region,
        '--output',
        'json',
      ],
      {
        env,
        cwd: projectRoot,
        encoding: 'utf-8',
      }
    );

    if (describeResult.status === 0) {
      const stackData = JSON.parse(describeResult.stdout);
      const outputs: Record<string, string> = {};

      if (stackData.Stacks && stackData.Stacks[0]?.Outputs) {
        stackData.Stacks[0].Outputs.forEach(
          (output: { OutputKey: string; OutputValue: string }) => {
            outputs[output.OutputKey] = output.OutputValue;
          }
        );
      }

      state.stackOutput = {
        ApiEndpoint: outputs.ApiEndpoint,
        LambdaFunctionName: outputs.LambdaFunctionName,
        LambdaRoleArn: outputs.LambdaRoleArn,
      };

      if (state.stackOutput.ApiEndpoint) {
        addLog(deploymentId, `API Endpoint: ${state.stackOutput.ApiEndpoint}`);
      }
    }

    state.completedSteps.push('outputs');
    state.status = 'completed';
    state.progress = 100;
    addLog(deploymentId, 'Deployment completed successfully!');
  } catch (error) {
    console.error(`[Deploy] Error in deployment ${deploymentId}:`, error);
    state.status = 'failed';
    state.error = error instanceof Error ? error.message : 'Deployment failed';
    addLog(
      deploymentId,
      state.error,
      'error'
    );
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
