# AWS Lambda Deployment Web Interface

A comprehensive web-based interface for deploying and monitoring your AWS Lambda screenshot service. This replaces the need for manual CLI commands with an intuitive step-by-step wizard.

## Features

### 🎯 Two-Step Deployment Wizard

#### Step 1: AWS Credentials
- Securely input AWS Access Key ID and Secret Access Key
- Real-time validation of credential format
- Security notice: credentials are only used to initiate deployment and never stored
- Display required IAM permissions

#### Step 2: Configuration
- Select AWS region (us-east-1, us-west-2, eu-west-1, ap-southeast-1)
- Configure CloudFormation stack name
- Set allowed hostnames for screenshot requests (optional)
- Specify S3 bucket for SAM artifacts (optional)
- Full input validation before deployment

### 📊 Real-Time Deployment Monitoring

The deployment monitor provides live updates during the deployment process:

- **Progress Stepper**: Visual representation of deployment stages
  - Validating Credentials
  - Building SAM Application
  - Packaging Application
  - Deploying to CloudFormation
  - Retrieving Outputs

- **Real-Time Logs**: 
  - Live-streaming deployment logs with timestamps
  - Color-coded log levels (info, warning, error)
  - Auto-scroll to latest entries
  - Manual scroll with toggle
  - Copy logs to clipboard for sharing

- **Progress Tracking**:
  - Overall progress percentage
  - Current stage indicator
  - Completed steps milestone

### ✅ Deployment Success Page

Upon successful completion:
- Displays API endpoint URL
- Lambda function name
- IAM role ARN
- One-click copy functionality for the API endpoint
- Quick reference for next steps
- Links to AWS documentation

### 🚨 Error Handling

Comprehensive error handling throughout:
- Input validation before submission
- AWS credential format validation
- CloudFormation stack name validation
- Hostname format validation
- Real-time error messages and log capture
- Ability to cancel running deployments
- Error details in logs for debugging

## User Interface

### Routes

- `/deploy` - Main deployment setup and monitoring interface
- `/deploy/success` - Success page with deployment outputs
- `/` - Main screenshot tester page (includes link to deployment wizard)

### Components

```
├── components/deploy/
│   ├── setup-form.tsx           # Two-step form for credentials & config
│   ├── deployment-monitor.tsx   # Real-time deployment progress monitor
│   ├── deployment-stepper.tsx   # Visual stage progress indicator
│   └── log-viewer.tsx           # Live log viewer with filtering
├── app/deploy/
│   ├── page.tsx                 # Main deployment page
│   └── success/
│       └── page.tsx             # Success confirmation page
└── app/api/deploy/
    ├── start/route.ts           # Initiate deployment
    ├── status/[id]/route.ts     # Poll deployment status
    └── cancel/[id]/route.ts     # Cancel running deployment
```

## API Reference

### POST /api/deploy/start

Initiates a new AWS Lambda deployment.

**Request Body:**
```json
{
  "accessKeyId": "AKIA...",
  "secretAccessKey": "...",
  "region": "us-east-1",
  "stackName": "screenshot-service",
  "allowedHostnames": ["example.com", "app.example.com"],
  "s3Bucket": "optional-bucket-name"
}
```

**Response:**
```json
{
  "deploymentId": "uuid-here"
}
```

### GET /api/deploy/status/:id

Poll current deployment status and logs.

**Response:**
```json
{
  "deploymentId": "uuid-here",
  "status": "running|completed|failed",
  "stage": "validate|build|package|deploy|outputs",
  "progress": 0-100,
  "currentStep": "Validating credentials...",
  "completedSteps": ["validate"],
  "logs": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "message": "Starting deployment...",
      "level": "info"
    }
  ],
  "stackOutput": {
    "ApiEndpoint": "https://xxxxx.execute-api.region.amazonaws.com/prod/screenshot",
    "LambdaFunctionName": "screenshot-service-ScreenshotFunction-...",
    "LambdaRoleArn": "arn:aws:iam::..."
  },
  "error": null
}
```

### POST /api/deploy/cancel/:id

Cancel a running deployment.

**Response:**
```json
{
  "success": true
}
```

## How to Use

### Starting a Deployment

1. Navigate to `/deploy` or click "Open Deployment Wizard" from the main page
2. Enter your AWS credentials:
   - AWS Access Key ID (starts with `AKIA`)
   - AWS Secret Access Key
3. Click "Continue to Configuration"
4. Configure deployment settings:
   - Select your preferred AWS region
   - Set a CloudFormation stack name (e.g., `screenshot-service`)
   - Optionally restrict to specific hostnames
   - Optionally specify an S3 bucket
5. Click "Start Deployment"

### Monitoring Deployment

The deployment monitor will show:
- Real-time progress through each stage
- Live logs with timestamps and severity levels
- Current operation and completed steps
- Overall progress percentage

### Using the Results

Once deployment completes:
1. Copy the API endpoint from the success page
2. Use it in your application to call the screenshot service
3. Test with the screenshot tester on the main page
4. Integrate with your application

## Technical Details

### Deployment Process

The deployment orchestration follows these stages:

1. **Validate** - Verify AWS credentials using `aws sts get-caller-identity`
2. **Build** - Run `sam build --use-container` to build the SAM application
3. **Package** - Run `sam package` to prepare the application for deployment
4. **Deploy** - Run `sam deploy` to create/update the CloudFormation stack
5. **Outputs** - Retrieve and display CloudFormation stack outputs

### State Management

- Deployment state is maintained in-memory (per server instance)
- Suitable for single-server deployments
- For production, consider using a persistent store (database, Redis)

### Security Considerations

- AWS credentials are never logged or stored
- Credentials are used only to initiate deployment
- All operations use AWS IAM authentication
- Environment variables configured at deployment time
- Hostname validation prevents cross-domain screenshot requests

### Logs

Logs are stored in memory and streamed to the client in real-time:
- Includes AWS CLI output and errors
- Timestamps for each log entry
- Severity levels (info, warning, error)
- Automatically cleaned up after 1 hour

## Troubleshooting

### Deployment Fails at Credential Validation

**Issue**: "AWS credential validation failed"

**Solution**:
- Verify Access Key ID format (should start with `AKIA`)
- Check Secret Access Key is complete and not truncated
- Ensure user has permissions for CloudFormation, Lambda, IAM, and API Gateway
- Verify credentials haven't been revoked

### Deployment Fails at Build Stage

**Issue**: "SAM build failed"

**Solution**:
- Ensure Docker is installed and running (SAM uses containers)
- Check internet connection (downloading dependencies)
- View logs for specific error message

### Deployment Fails at Deploy Stage

**Issue**: "CloudFormation deployment failed"

**Solution**:
- Check stack name doesn't conflict with existing stacks
- Verify AWS account has available resources
- Check CloudFormation service is available in your region
- View logs for specific CloudFormation error

### Can't Access API After Deployment

**Issue**: API endpoint not responding

**Solution**:
- Verify endpoint URL is correct (copy from success page)
- Check hostname restrictions if configured
- Verify Lambda function has Chromium layer attached
- Check Lambda execution logs in CloudWatch

## Monitoring Deployments

### View Deployment Logs

The log viewer shows all deployment output:
- Scroll through logs with auto-scroll toggle
- Color-coded by severity (green=info, yellow=warning, red=error)
- Click copy to save logs for debugging

### Check CloudFormation Stack

View detailed stack information in AWS Console:
1. Go to CloudFormation service
2. Find your stack by name (e.g., `screenshot-service`)
3. View Events, Outputs, and Resources tabs
4. Check CloudWatch Logs for Lambda execution logs

## Advanced Usage

### Custom Hostnames

Restrict screenshot requests to specific domains:
- Enter comma-separated hostnames (e.g., `example.com, app.example.com`)
- Requests from other domains will be rejected with 403 Forbidden
- Leave empty to allow all hostnames (less secure)

### Custom S3 Bucket

Specify a bucket for SAM artifacts:
- Must exist and be accessible by your AWS user
- Must be in the same region as the Lambda function
- If not specified, SAM creates one automatically
- Bucket is used only during deployment

### Redeploying

To update an existing deployment:
1. Return to `/deploy`
2. Use the same stack name as before
3. New configuration will update the CloudFormation stack
4. Lambda function and API endpoint URL remain the same

## Support

For issues or questions:
1. Check the logs for error details
2. Review AWS CloudFormation stack events
3. Consult AWS Lambda and SAM documentation
4. Check deployment prerequisites (Docker, AWS CLI, permissions)

## Next Steps

After deployment:
1. Test your screenshot service using the Screenshot Tester
2. Integrate the API endpoint into your applications
3. Monitor Lambda execution via CloudWatch
4. Set up alerts for failures or unusual activity
5. Consider implementing caching for frequently requested pages
