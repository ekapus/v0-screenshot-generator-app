# AWS Lambda Deployment Web Interface - User Guide

## Quick Start

### Prerequisites

Before you begin, you'll need:
1. An AWS account with appropriate permissions
2. AWS Access Key ID and Secret Access Key
3. Permission to create Lambda functions, API Gateway, and CloudFormation stacks

### Step-by-Step Deployment

#### 1. Access the Deployment Wizard

Navigate to `/deploy` or click **"Open Deployment Wizard"** from the main screenshot tester page.

You'll see the deployment interface with two steps:
- **Step 1: AWS Credentials** (Current)
- **Step 2: Configuration** (Disabled until credentials are entered)

#### 2. Enter AWS Credentials

**Field: AWS Access Key ID**
- Format: Starts with `AKIA` followed by 16 alphanumeric characters
- Example: `AKIA5BNXZQKB3EXAMPLE`
- Get this from: AWS IAM Console → Users → Security Credentials

**Field: AWS Secret Access Key**
- Keep this secure - you can only see it once when created
- Use the **Show** button to toggle visibility
- Example: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
- Get this from: AWS IAM Console → Users → Security Credentials

**Important Security Notice:**
Your credentials are used only to start the deployment and are **never stored** on our servers.

#### 3. Click "Continue to Configuration"

This button will be enabled once both credentials are entered and validated.

#### 4. Configure Deployment Settings

**Field: AWS Region** (Required)
Choose from:
- **US East (N. Virginia)** - `us-east-1` - Best for US East Coast
- **US West (Oregon)** - `us-west-2` - Best for US West Coast
- **Europe (Ireland)** - `eu-west-1` - Best for Europe
- **Asia Pacific (Singapore)** - `ap-southeast-1` - Best for Asia

*Tip: Select a region close to your users for lower latency*

**Field: CloudFormation Stack Name** (Required)
- Name for your infrastructure stack
- Format: Lowercase letters, numbers, and hyphens
- Example: `screenshot-service` or `my-app-screenshots`
- Must be unique within your AWS account
- Changing this creates a new deployment instead of updating the current one

**Field: Allowed Hostnames** (Optional)
- Restrict which domains can request screenshots
- Format: Comma-separated list
- Example: `example.com, app.example.com`
- Leave empty to allow requests from any domain
- *Recommended: Set to your domain for security*

**Field: S3 Bucket for Artifacts** (Optional)
- Bucket for storing SAM deployment artifacts
- Format: Valid S3 bucket name
- Leave empty to create a bucket automatically
- Must exist if you provide a name

#### 5. Click "Start Deployment"

The deployment will begin and you'll be taken to the **Deployment Monitor**.

---

## Deployment Monitor

Once deployment starts, you'll see the real-time monitoring interface.

### Components

#### Progress Header
- **Deployment ID**: Unique identifier for this deployment
- **Status Icon**: Green checkmark (success), red alert (failure), spinner (in progress)
- **Current Step**: Description of the current operation
- **Progress Percentage**: Visual bar showing overall progress

#### Deployment Stepper
Visual representation of the 5 deployment stages:

1. **✓ Validating Credentials** (Completed)
   - Verifies your AWS credentials are valid
   - Checks IAM permissions
   - Takes ~10 seconds

2. **⏳ Building SAM Application** (In Progress)
   - Builds your Lambda function
   - Creates artifacts
   - Takes ~30-60 seconds

3. **⏸ Packaging Application**
   - Prepares application for deployment
   - Creates S3 bucket if needed
   - Uploads artifacts
   - Takes ~20-30 seconds

4. **⏸ Deploying to CloudFormation**
   - Creates/updates AWS infrastructure
   - Sets up Lambda function
   - Creates API Gateway endpoint
   - Takes ~2-5 minutes (longest stage)

5. **⏸ Retrieving Outputs**
   - Gets API endpoint URL
   - Retrieves function details
   - Takes ~5 seconds

#### Deployment Logs

Real-time logs from the deployment process:
- **[Timestamp]** - When the event occurred
- **[LEVEL]** - info (green), warning (yellow), or error (red)
- **Message** - Description of what happened

**Log Controls:**
- **Show/Hide**: Click to expand/collapse logs
- **Auto-scroll**: Toggle to automatically scroll to latest entries
- **Copy**: Save all logs to clipboard for sharing

#### Details Tab

Useful information about your deployment:
- Deployment status
- Current stage
- AWS region
- Progress percentage

### What to Do During Deployment

✅ **Monitor the progress** - Watch the stepper move through stages
✅ **Check the logs** - Look for any warnings or errors
✅ **Wait for completion** - Don't close the page

❌ **Don't submit again** - Only one deployment per wizard session
❌ **Don't modify AWS resources** - Let CloudFormation do its work
❌ **Don't close the browser** - Page refresh won't stop the deployment but shows status

### If Deployment Fails

**See an error in logs?**

1. **Click "Download Summary"** to save deployment logs
2. **Note the error message** from the logs
3. **Click "Deploy Another Service"** to retry with different settings
4. **Common errors:**
   - "Credential validation failed" → Check AWS credentials
   - "Stack already exists" → Use a different stack name
   - "Permission denied" → Check IAM permissions

---

## Success Page

When deployment completes successfully, you'll see the **Deployment Complete** page.

### What You See

#### API Endpoint
- Your Lambda screenshot service URL
- Format: `https://xxxxx.execute-api.region.amazonaws.com/prod/screenshot`
- **Click the copy button** to save it to clipboard

#### Lambda Function Name
- Internal AWS resource name
- Useful for viewing logs in CloudWatch

#### Next Steps
1. **Check your email** for AWS CloudFormation stack confirmation
2. **Copy the API Endpoint** from this page
3. **Test the endpoint** using the Screenshot Tester
4. **Integrate** into your applications

### Using Your API Endpoint

#### Direct URL Usage
```
https://YOUR_ENDPOINT?url=https://example.com&width=1800&height=945
```

#### cURL Example
```bash
curl "https://YOUR_ENDPOINT?url=https://example.com&width=1800&height=945" \
  -o screenshot.png
```

#### JavaScript/Fetch
```javascript
const response = await fetch('https://YOUR_ENDPOINT?url=https://example.com');
const blob = await response.blob();
const img = new Image();
img.src = URL.createObjectURL(blob);
```

#### Next.js Open Graph
```typescript
export const metadata = {
  openGraph: {
    images: [{
      url: 'https://YOUR_ENDPOINT?url=https://example.com&width=1200&height=630',
      width: 1200,
      height: 630,
    }],
  },
};
```

### Test Your Endpoint

1. Go back to the main page `/`
2. Paste your API endpoint into **"Lambda API Endpoint URL"**
3. Enter a page URL to screenshot (e.g., `https://example.com`)
4. Click **"Capture Screenshot"**
5. See the screenshot preview appear

---

## Troubleshooting

### "Credential validation failed"

**What this means:** AWS rejected your credentials

**How to fix:**
- ✅ Double-check your Access Key ID (starts with `AKIA`)
- ✅ Double-check your Secret Access Key (long string)
- ✅ Make sure credentials aren't expired or revoked
- ✅ Try creating new credentials in AWS IAM Console

### "SAM build failed"

**What this means:** Building the Lambda function failed

**How to fix:**
- ✅ Ensure Docker is installed and running (`docker ps`)
- ✅ Check internet connection (downloads dependencies)
- ✅ See logs for specific error
- ✅ Try deployment again

### "CloudFormation deployment failed"

**What this means:** Creating AWS infrastructure failed

**How to fix:**
- ✅ Use a unique stack name (not used before)
- ✅ Check account limits (Lambda, API Gateway)
- ✅ Verify region supports Lambda
- ✅ See logs for specific CloudFormation error

### "API endpoint not responding"

**What this means:** Created successfully but can't reach it

**How to fix:**
- ✅ Verify endpoint URL from success page
- ✅ Check hostname restrictions match your domain
- ✅ Wait 1-2 minutes for Lambda warmup
- ✅ Check CloudWatch logs for Lambda errors

### "Can't get to the deployment page"

**What this means:** The `/deploy` route isn't loading

**How to fix:**
- ✅ Verify dev server is running (`npm run dev`)
- ✅ Check the URL is exactly `/deploy`
- ✅ Clear browser cache and reload
- ✅ Try in a different browser

---

## Advanced Usage

### Multiple Deployments

You can run multiple deployments:
- Use different stack names for each
- Deploy to different regions for geographic distribution
- Each creates a separate API endpoint

**Example deployments:**
- `screenshot-service-us` → US East region
- `screenshot-service-eu` → EU region
- `screenshot-service-prod` → Production stack
- `screenshot-service-staging` → Staging stack

### Updating a Deployment

To update an existing deployment:
1. Go back to `/deploy`
2. Use the **same stack name** as before
3. New configuration updates the CloudFormation stack
4. API endpoint URL stays the same
5. No downtime during updates

### Security Best Practices

1. **Hostname Restrictions**
   - Set allowed hostnames to your domain
   - Prevents unauthorized screenshot requests
   - Can update by redeploying with same stack name

2. **AWS Credentials**
   - Create dedicated IAM user for deployments
   - Use minimal required permissions
   - Rotate credentials regularly
   - Never commit credentials to version control

3. **API Monitoring**
   - Monitor Lambda invocations in CloudWatch
   - Set up alerts for errors
   - Use request logging
   - Track API costs

### Monitoring After Deployment

**In AWS Console:**
1. Go to CloudFormation
2. Find your stack by name
3. Click **"Events"** tab to see deployment history
4. Click **"Outputs"** tab to see API endpoint
5. Go to Lambda to view function logs

**View Lambda Logs:**
1. AWS Console → Lambda → Functions
2. Find your function by name (in outputs)
3. Click **"Monitor"** tab
4. See invocation metrics and errors
5. Click **"Logs"** to view execution details

---

## FAQ

**Q: How long does deployment take?**
A: Typically 3-5 minutes, depending on AWS region and system load

**Q: Can I deploy multiple screenshots services?**
A: Yes, use different stack names for each

**Q: How much will this cost?**
A: Lambda is free for first 1M invocations/month, then $0.20/1M. API Gateway costs ~$3.50 per million requests

**Q: Can I cancel a running deployment?**
A: Yes, click "Cancel Deployment" button during monitoring

**Q: How do I delete my deployment?**
A: Go to AWS CloudFormation console, find your stack, click Delete

**Q: Can I use hostnames?**
A: Yes, set "Allowed Hostnames" during configuration

**Q: What image sizes are supported?**
A: Width: 320-3840px, Height: 240-2160px

**Q: Can I change the region after deployment?**
A: No, create a new stack in the desired region

---

## Getting Help

If you encounter issues:

1. **Check the logs** - Most errors are explained in deployment logs
2. **Download summary** - Save logs for later reference
3. **Review AWS Console** - Check CloudFormation events for details
4. **Try again** - Most transient errors resolve on retry
5. **Contact support** - Include deployment summary in your request

---

## What's Next?

After successful deployment:

1. ✅ Test your endpoint with the Screenshot Tester
2. ✅ Integrate endpoint into your application
3. ✅ Set up hostname restrictions for security
4. ✅ Monitor Lambda logs in CloudWatch
5. ✅ Consider enabling CloudWatch alarms
6. ✅ Plan for scaling if needed

Congratulations on deploying your AWS Lambda screenshot service! 🎉
