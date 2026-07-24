# AWS Deployment Wizard - Architecture & Design

## Overview

The deployment wizard is a web interface that helps users deploy an AWS Lambda screenshot service without needing to run CLI commands. The key insight is that **the wizard runs in a Vercel serverless environment, which does not have AWS CLI or SAM CLI pre-installed**.

## Original Problem

The initial approach attempted to execute AWS CLI and SAM CLI commands directly in the Vercel backend:

```typescript
// ❌ This fails because AWS CLI and SAM CLI aren't in Vercel
const stsCheck = spawnSync('aws', ['sts', 'get-caller-identity', ...]);
const buildResult = spawnSync('sam', ['build', ...]);
```

This caused the "AWS credential validation failed: Unknown error" because:
1. `spawnSync` couldn't find the `aws` command
2. The error was being silently swallowed
3. Users got confusing "undefined" error messages

## Solution: Local Script Generation

Instead of executing commands in Vercel, the wizard now **generates a complete deployment script** that users run locally on their own machines where AWS CLI and SAM CLI ARE installed.

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: User enters AWS credentials in browser               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Vercel receives credentials                           │
│  - Validates format (Access Key ID, Secret Key length)        │
│  - Does NOT store credentials                                 │
│  - Generates bash script with embedded config                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Browser displays download button                       │
│  - Script contains all user configuration                      │
│  - Ready to run locally                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: User downloads script to local machine                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: User sets AWS credentials locally                      │
│  export AWS_ACCESS_KEY_ID=<key>                              │
│  export AWS_SECRET_ACCESS_KEY=<secret>                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: User runs script locally                              │
│  ./deploy.sh                                                  │
│  - Verifies AWS credentials with sts get-caller-identity      │
│  - Builds Lambda with: sam build                              │
│  - Deploys with: sam deploy                                   │
│  - Displays CloudFormation outputs                            │
└─────────────────────────────────────────────────────────────────┘
```

## Key Benefits

### 1. **Eliminates Tooling Dependency**
- Vercel doesn't need AWS CLI or SAM CLI installed
- Works in any serverless environment
- No system dependencies in the backend

### 2. **Better Security**
- Credentials never stored on Vercel servers
- User controls where credentials are used
- Credentials only loaded when user runs script locally

### 3. **Better User Experience**
- Download and run at your own pace
- See real-time terminal output during deployment
- Easy to debug if something goes wrong
- Can customize the script if needed

### 4. **Transparent Process**
- Users can see exactly what the deployment script does
- Can verify AWS commands before running
- Easy to audit for security

## Implementation Details

### Backend: Script Generation (`/api/deploy/start`)

```typescript
function generateDeploymentScript(state: DeploymentState): string {
  return `#!/bin/bash
set -e

# AWS Lambda Screenshot Service - Deployment Script
echo "AWS Lambda Screenshot Service Deployment"

# Check for required tools
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI not found"
    exit 1
fi

if ! command -v sam &> /dev/null; then
    echo "ERROR: SAM CLI not found"
    exit 1
fi

# Verify credentials
aws sts get-caller-identity > /dev/null 2>&1 || exit 1

# Build
sam build

# Deploy
sam deploy \
  --stack-name ${stackName} \
  --region ${region} \
  --capabilities CAPABILITY_IAM

echo "✓ Deployment completed!"`;
}
```

### Frontend: Download & Copy

The success page provides two options:
1. **Download**: Save script as `deploy.sh`
2. **Copy**: Paste into terminal or editor

### Validation

Still performs format validation in Vercel:
- Access Key ID format check
- Secret Key length check
- Region and stack name validation

But full credential verification happens locally when the script runs.

## Script Contents

The generated bash script includes:
- All user configuration (region, stack name, hostnames)
- AWS CLI credential verification
- SAM build process
- SAM deploy with CloudFormation
- Output retrieval and display
- Error handling and helpful messages

## Error Handling

If something goes wrong during local deployment:
- User sees actual AWS error messages
- Can retry with adjusted credentials
- Can check AWS CloudFormation console for details
- Can run the script again without re-downloading

## Deployment Stages (3 Total)

1. **Validate** - Check credential format
2. **Generate** - Create deployment script
3. **Complete** - Ready for download

Much simpler than the original 5-stage approach that tried to execute everything in Vercel.

## Security Considerations

### What's NOT in the Script
- AWS Access Key ID (user sets via environment variable)
- AWS Secret Access Key (user sets via environment variable)
- Any authentication tokens

### What's In the Script
- Configuration: region, stack name, hostname restrictions
- AWS CLI commands to execute
- Basic error checking

### Best Practices

1. **Don't commit the script to version control** - It contains your config
2. **Delete the script after deployment** - No longer needed
3. **Rotate credentials after deployment** - AWS best practice
4. **Store credentials securely** - Use AWS credential files, not environment variables permanently

## Future Enhancements

1. **GitHub Integration** - Auto-commit configuration to repo
2. **CloudFormation Templates** - Export as CloudFormation template
3. **Terraform Export** - Generate Terraform code
4. **Scheduled Deployments** - Queue script execution
5. **Deployment History** - Track previous deployments

## Comparison: Before & After

### Before (Failed)
- Attempted AWS CLI execution in Vercel
- "Unknown error" when AWS CLI not available
- Users confused about what went wrong
- Required all tools to be installed in Vercel

### After (Current)
- Generates bash script
- Users run locally where tools exist
- Clear error messages if something fails
- Works regardless of Vercel's installed tools
- Users have full control and visibility

## Conclusion

By generating a script instead of executing commands in Vercel, we:
- Provide a better user experience
- Eliminate tooling dependencies
- Improve security
- Make deployment transparent and auditable

Users don't need to be CLI experts - they just download and run the script!
