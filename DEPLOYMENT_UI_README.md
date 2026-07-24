# AWS Lambda Deployment Web Interface

> 🚀 Deploy your serverless screenshot service to AWS Lambda with a beautiful, intuitive web interface instead of wrestling with CLI commands.

## Overview

This project now includes a **complete web-based deployment interface** that makes deploying to AWS Lambda simple, visual, and monitored. No CLI knowledge required.

## Features at a Glance

- ✅ **Two-Step Wizard** - Credentials + Configuration in a clean form
- ✅ **Real-Time Monitoring** - Watch deployment progress with live logs
- ✅ **Visual Stepper** - See which stage you're on and what's completed
- ✅ **Security First** - Credentials never stored, validated on server
- ✅ **Error Handling** - Detailed logs and recovery options
- ✅ **One-Click Copy** - Copy your API endpoint with a single click
- ✅ **Complete Documentation** - User guides, technical docs, troubleshooting

## Quick Start

### Access the Deployment Interface

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000/deploy`
3. Or click **"Open Deployment Wizard"** from the main page

### Deploy in 5 Minutes

1. Enter AWS credentials (Access Key ID and Secret Access Key)
2. Click "Continue to Configuration"
3. Select region, set stack name, add allowed hostnames (optional)
4. Click "Start Deployment"
5. Monitor real-time progress and copy your API endpoint

### What You Get

- ✅ Lambda function running your screenshot service
- ✅ API Gateway endpoint for HTTP requests
- ✅ CloudFormation stack for infrastructure
- ✅ Live API ready to use immediately
- ✅ Deployment summary and logs

## File Structure

```
├── app/
│   ├── deploy/
│   │   ├── page.tsx              # Main deployment page
│   │   └── success/
│   │       └── page.tsx          # Success confirmation
│   ├── api/deploy/
│   │   ├── start/route.ts        # Start deployment
│   │   ├── status/[id]/route.ts  # Poll status
│   │   └── cancel/[id]/route.ts  # Cancel deployment
│   ├── page.tsx                  # Updated main page
│   └── layout.tsx                # Updated with Toaster
├── components/deploy/
│   ├── setup-form.tsx            # Credentials & config form
│   ├── deployment-monitor.tsx    # Real-time monitor
│   ├── deployment-stepper.tsx    # Progress stepper
│   └── log-viewer.tsx            # Live logs
├── DEPLOYMENT_UI.md              # Complete feature documentation
├── DEPLOYMENT_UI_SUMMARY.md      # Technical implementation overview
├── DEPLOYMENT_UI_USER_GUIDE.md   # Step-by-step user guide
└── DEPLOYMENT_UI_README.md       # This file
```

## Documentation

Start with any of these based on your needs:

### For Users
📖 **[DEPLOYMENT_UI_USER_GUIDE.md](./DEPLOYMENT_UI_USER_GUIDE.md)**
- Step-by-step deployment instructions
- What each field means
- Troubleshooting guide
- FAQ and security practices
- How to use your API endpoint after deployment

### For Developers
🔧 **[DEPLOYMENT_UI_SUMMARY.md](./DEPLOYMENT_UI_SUMMARY.md)**
- Technical architecture overview
- Component descriptions
- API documentation
- Implementation details
- Future enhancement ideas
- How to extend the system

### Complete Feature Reference
📚 **[DEPLOYMENT_UI.md](./DEPLOYMENT_UI.md)**
- All features explained in detail
- API reference with examples
- Deployment process breakdown
- Monitoring and troubleshooting guide
- Security considerations
- Advanced usage examples

## Key Components

### Setup Form (`components/deploy/setup-form.tsx`)
- Two-tab interface for credentials and configuration
- Real-time input validation
- Clear error messages
- Security notices

### Deployment Monitor (`components/deploy/deployment-monitor.tsx`)
- Polls status every 1 second
- Shows progress percentage
- Displays current stage
- Shows all outputs on completion
- Cancel button for running deployments
- Download summary option

### Deployment Stepper (`components/deploy/deployment-stepper.tsx`)
Five stages with visual progress:
1. Validating Credentials
2. Building SAM Application
3. Packaging Application
4. Deploying to CloudFormation
5. Retrieving Outputs

### Log Viewer (`components/deploy/log-viewer.tsx`)
- Real-time log streaming
- Color-coded by severity
- Auto-scroll to latest
- Copy to clipboard
- Expandable/collapsible

## User Journey

```
┌─────────────────────────┐
│   Main Page (/)         │
│ [Open Deployment]       │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Deployment Setup      │
│   (/deploy)             │
├─────────────────────────┤
│ Step 1: Credentials     │
│ - Access Key ID         │
│ - Secret Access Key     │
├─────────────────────────┤
│ Step 2: Configuration   │
│ - Region selection      │
│ - Stack name            │
│ - Allowed hostnames     │
│ - S3 bucket (optional)  │
└────────────┬────────────┘
             │
        [Start Deployment]
             │
             ▼
┌─────────────────────────┐
│ Deployment Monitor      │
│ (Real-time updates)     │
├─────────────────────────┤
│ ✓ Validating Credentials│
│ ⏳ Building SAM          │
│ ⏸ Packaging             │
│ ⏸ Deploying             │
│ ⏸ Retrieving Outputs    │
├─────────────────────────┤
│ Live Logs (streaming)   │
│ Progress: 45%           │
└────────────┬────────────┘
             │
      [Deployment Complete]
             │
             ▼
┌─────────────────────────┐
│  Success Page           │
│  (/deploy/success)      │
├─────────────────────────┤
│ ✅ Deployment Complete  │
│                         │
│ API Endpoint: [URL]     │
│ Function: [name]        │
│ Role: [ARN]             │
│                         │
│ [Copy] [Download]       │
│ [Go to Tester]          │
└─────────────────────────┘
```

## API Routes

### POST /api/deploy/start
Initiate deployment with credentials and configuration.

**Request:**
```json
{
  "accessKeyId": "AKIA...",
  "secretAccessKey": "...",
  "region": "us-east-1",
  "stackName": "screenshot-service",
  "allowedHostnames": ["example.com"],
  "s3Bucket": "optional-bucket"
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
  "deploymentId": "uuid",
  "status": "running|completed|failed",
  "stage": "validate|build|package|deploy|outputs",
  "progress": 0-100,
  "currentStep": "...",
  "completedSteps": ["validate"],
  "logs": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "message": "...",
      "level": "info"
    }
  ],
  "stackOutput": {
    "ApiEndpoint": "https://...",
    "LambdaFunctionName": "...",
    "LambdaRoleArn": "arn:aws:iam::..."
  }
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

## Deployment Process

The deployment follows these 5 stages:

1. **Validate** (~10s)
   - Verifies AWS credentials with `aws sts get-caller-identity`
   - Checks IAM permissions

2. **Build** (~30-60s)
   - Runs `sam build --use-container`
   - Builds Lambda function
   - Creates deployment artifacts

3. **Package** (~20-30s)
   - Runs `sam package`
   - Creates or uses S3 bucket
   - Uploads artifacts

4. **Deploy** (~2-5m)
   - Runs `sam deploy`
   - Creates CloudFormation stack
   - Sets up Lambda and API Gateway
   - Longest stage - watch the logs!

5. **Outputs** (~5s)
   - Retrieves stack outputs
   - Gets API endpoint URL
   - Shows deployment complete

## Screenshots

### Deployment Setup
The two-step form for credentials and configuration:
- Security notices explaining credential handling
- Input validation with error messages
- Tab-based step progression

### Deployment Monitor
Real-time progress tracking:
- Visual stepper showing 5 stages
- Live logs with timestamps
- Progress percentage
- Cancel button
- Download summary option

### Success Page
Deployment completion confirmation:
- API endpoint with copy button
- Lambda function name
- IAM role information
- Next steps guidance

## Technology Stack

### Frontend
- React 19.2 with TypeScript
- Tailwind CSS for styling
- shadcn/ui components
- Sonner for notifications
- Lucide React for icons

### Backend
- Next.js 16 API routes
- Node.js child_process for AWS CLI
- In-memory state management
- Real-time status polling

### AWS Integration
- AWS CLI for all operations
- SAM for deployment
- CloudFormation for infrastructure
- IAM for authentication

## Security

- ✅ Credentials never stored or logged
- ✅ Server-side validation of all inputs
- ✅ AWS IAM authentication required
- ✅ Hostname validation to prevent unauthorized screenshots
- ✅ No sensitive data in client-side code
- ✅ Environment-based configuration

## Monitoring

After deployment, monitor your service:

**CloudWatch Logs:**
- View Lambda execution logs
- See request/response details
- Monitor error rates

**CloudFormation:**
- View stack events
- Check resource status
- Modify template

**API Gateway:**
- Monitor API metrics
- Check request rates
- View error codes

## Troubleshooting

### Credentials rejected?
- Verify Access Key format (starts with AKIA)
- Check Secret Access Key is complete
- Ensure credentials aren't expired

### Build failed?
- Ensure Docker is installed
- Check internet connection
- See logs for specific error

### Deployment failed?
- Check CloudFormation events
- Verify unique stack name
- See logs for specific error

### Can't reach API?
- Verify endpoint URL from success page
- Check hostname restrictions
- Wait 1-2 minutes for warmup
- View Lambda logs

**See [DEPLOYMENT_UI_USER_GUIDE.md](./DEPLOYMENT_UI_USER_GUIDE.md) for detailed troubleshooting.**

## What's Different from CLI?

| Aspect | CLI (`sam deploy`) | Web Interface |
|--------|-----|-----|
| Learning curve | Steep (learn AWS CLI) | Gentle (visual form) |
| Monitoring | View logs manually | Real-time live updates |
| Progress visibility | Read CLI output | Visual stepper + logs |
| Error handling | Cryptic error codes | Detailed error messages |
| Time to deploy | 5-10 minutes | 5-10 minutes |
| Credentials | In ~/.aws/credentials | Never stored |
| Repeatability | Remember all flags | Reuse same wizard |

## Next Steps

1. ✅ Start dev server: `npm run dev`
2. ✅ Navigate to `/deploy`
3. ✅ Enter AWS credentials
4. ✅ Configure deployment
5. ✅ Watch real-time progress
6. ✅ Copy API endpoint
7. ✅ Test with screenshot tester
8. ✅ Integrate into your app

## Support & Resources

- 📖 User Guide: [DEPLOYMENT_UI_USER_GUIDE.md](./DEPLOYMENT_UI_USER_GUIDE.md)
- 🔧 Technical Docs: [DEPLOYMENT_UI_SUMMARY.md](./DEPLOYMENT_UI_SUMMARY.md)
- 📚 Feature Reference: [DEPLOYMENT_UI.md](./DEPLOYMENT_UI.md)
- 🚀 Original README: [DEPLOYMENT.md](./DEPLOYMENT.md)

## Feedback

This is a production-ready deployment interface designed to make AWS Lambda deployment accessible to everyone. For questions or suggestions, refer to the documentation or check the implementation in the source files.

---

**Happy deploying!** 🎉

Your AWS Lambda screenshot service is just a few clicks away. The web interface makes deployment visual, monitored, and stress-free.
