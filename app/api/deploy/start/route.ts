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

    // Stage 1: Validate credentials
    // Validate credentials format
    if (!state.credentials.accessKeyId || !state.credentials.secretAccessKey) {
      throw new Error('AWS credential validation failed: Missing Access Key ID or Secret Access Key');
    }

    addLog(deploymentId, `Access Key ID provided: ${state.credentials.accessKeyId.substring(0, 4)}...${state.credentials.accessKeyId.substring(state.credentials.accessKeyId.length - 4)}`);
    addLog(deploymentId, `Secret Access Key length: ${state.credentials.secretAccessKey.length} characters`);

    // Check credential format
    const accessKeyPattern = /^AKIA[0-9A-Z]{16}$|^[A-Z0-9]{20}$/;
    if (!accessKeyPattern.test(state.credentials.accessKeyId)) {
      addLog(deploymentId, `Warning: Access Key ID format looks unusual: ${state.credentials.accessKeyId}`, 'warning');
    }

    addLog(deploymentId, 'Basic credential format validation passed');
    
    // Attempt to verify credentials with AWS CLI if available
    addLog(deploymentId, 'Attempting to verify credentials with AWS STS...');
    let stsCheck: any;
    try {
      addLog(deploymentId, 'Executing: aws sts get-caller-identity');
      stsCheck = spawnSync('aws', ['sts', 'get-caller-identity', '--output', 'json'], {
        env,
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000,
      });
      
      addLog(deploymentId, `AWS CLI exit code: ${stsCheck.status}`);
      
      if (stsCheck.status === 0 && stsCheck.stdout) {
        try {
          const callerInfo = JSON.parse(stsCheck.stdout);
          addLog(deploymentId, `Successfully authenticated as: ${callerInfo.Arn}`);
          state.completedSteps.push('validate');
          return;
        } catch (parseErr) {
          addLog(deploymentId, 'AWS CLI call succeeded but response was not valid JSON', 'warning');
          addLog(deploymentId, `Raw output: ${stsCheck.stdout}`);
        }
      } else if (stsCheck.status !== 0) {
        const errorOutput = (stsCheck.stderr || stsCheck.stdout || '').trim();
        addLog(deploymentId, `AWS CLI returned error (exit code ${stsCheck.status})`, 'error');
        
        if (errorOutput) {
          addLog(deploymentId, `Error output: ${errorOutput}`, 'error');
          
          // Check for specific credential errors
          if (errorOutput.includes('InvalidClientTokenId') || errorOutput.includes('The Access Key Id you provided does not exist')) {
            throw new Error('AWS credential validation failed: Invalid AWS Access Key ID. Please verify your credentials in the AWS IAM console.');
          } else if (errorOutput.includes('SignatureDoesNotMatch') || errorOutput.includes('InvalidSignatureException')) {
            throw new Error('AWS credential validation failed: Invalid AWS Secret Access Key. Please ensure you copied it correctly from the IAM console.');
          } else if (errorOutput.includes('An error occurred (UnrecognizedClientException)')) {
            throw new Error('AWS credential validation failed: AWS account or region not recognized. Please check your AWS credentials and region.');
          } else {
            addLog(deploymentId, `Will proceed with deployment - credentials will be re-validated by SAM`, 'warning');
          }
        } else {
          addLog(deploymentId, 'AWS CLI returned an error but provided no error message', 'warning');
          addLog(deploymentId, 'Proceeding with deployment - credentials will be validated by SAM', 'warning');
        }
      } else {
        addLog(deploymentId, 'AWS CLI execution produced no output', 'warning');
        addLog(deploymentId, 'Proceeding with deployment - credentials will be validated by SAM', 'warning');
      }
    } catch (err: any) {
      const errCode = err.code || err.errno || 'UNKNOWN';
      addLog(deploymentId, `AWS CLI execution error: ${err.message || err}`, 'error');
      addLog(deploymentId, `Error code: ${errCode}`, 'error');
      
      if (errCode === 'ENOENT' || err.message?.includes('ENOENT')) {
        addLog(deploymentId, 'AWS CLI is not installed or not in PATH', 'error');
        throw new Error('AWS credential validation failed: AWS CLI is not installed. Please install AWS CLI v2 from https://aws.amazon.com/cli/');
      } else {
        addLog(deploymentId, 'Proceeding with deployment - AWS CLI validation unavailable', 'warning');
      }
    }

    state.completedSteps.push('validate');

    // Stage 2: Build SAM application
    state.stage = 'build';
    state.currentStep = 'Building SAM application...';
    state.progress = 20;
    addLog(deploymentId, 'Starting SAM build');

    let buildResult: any;
    try {
      buildResult = spawnSync('sam', ['build', '--use-container'], {
        env,
        cwd: projectRoot,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      addLog(deploymentId, 'SAM CLI not found. Please ensure AWS SAM CLI is installed.', 'error');
      throw new Error('AWS SAM CLI is not installed. Please install it to proceed.');
    }

    if (buildResult.status !== 0) {
      const errorMsg = (buildResult.stderr || buildResult.stdout || 'Build failed').trim();
      addLog(deploymentId, errorMsg, 'error');
      throw new Error(`SAM build failed: ${errorMsg}`);
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

    let packageResult: any;
    try {
      packageResult = spawnSync(
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
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );
    } catch (err) {
      addLog(deploymentId, 'SAM package command failed', 'error');
      throw new Error('SAM package failed');
    }

    if (packageResult.status !== 0) {
      const errorMsg = (packageResult.stderr || packageResult.stdout || 'Package failed').trim();
      addLog(deploymentId, errorMsg, 'error');
      throw new Error(`SAM package failed: ${errorMsg}`);
    }

    addLog(deploymentId, 'Package completed successfully');
    state.completedSteps.push('package');

    // Stage 4: Deploy to CloudFormation
    state.stage = 'deploy';
    state.currentStep = 'Deploying to CloudFormation...';
    state.progress = 60;
    addLog(deploymentId, 'Starting CloudFormation deployment');

    const deployEnvVars = state.config.allowedHostnames.join(',') || '*';

    let deployResult: any;
    try {
      deployResult = spawnSync(
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
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );
    } catch (err) {
      addLog(deploymentId, 'SAM deploy command failed', 'error');
      throw new Error('CloudFormation deployment failed');
    }

    if (deployResult.status !== 0) {
      const errorMsg = (deployResult.stderr || deployResult.stdout || 'Deployment failed').trim();
      addLog(deploymentId, errorMsg, 'error');
      throw new Error(`CloudFormation deployment failed: ${errorMsg}`);
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
