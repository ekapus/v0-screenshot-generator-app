# AWS Lambda Deployment Guide

This guide covers deploying the screenshot generator as a serverless AWS Lambda function using AWS SAM (Serverless Application Model).

## Prerequisites

1. **AWS Account** - Sign up at https://aws.amazon.com
2. **AWS CLI** - Install from https://aws.amazon.com/cli/
3. **AWS SAM CLI** - Install from https://aws.amazon.com/serverless/sam/
4. **Node.js 18+** - For local testing

### Setup AWS Credentials

```bash
aws configure
```

Enter your AWS Access Key ID and Secret Access Key when prompted.

## Local Development & Testing

### 1. Install Dependencies

```bash
cd lambda
npm install
cd ..
```

### 2. Build the SAM Application

```bash
sam build
```

This creates a `.aws-sam` directory with the built application.

### 3. Run Locally

```bash
sam local start-api
```

The API will be available at `http://localhost:3000`

### 4. Test Locally

```bash
# Test the screenshot endpoint
curl "http://localhost:3000/screenshot?url=https://example.com&width=1800&height=945"

# Save screenshot to file
curl "http://localhost:3000/screenshot?url=https://example.com" -o screenshot.png
```

## Deployment to AWS

### 1. Create S3 Bucket for Artifacts (First Time Only)

```bash
aws s3 mb s3://screenshot-generator-artifacts-$(date +%s) --region us-east-1
```

Save the bucket name, you'll need it for deployment.

### 2. Deploy with SAM

```bash
# Guided deployment (recommended for first time)
sam deploy --guided

# Subsequent deployments (after guided)
sam deploy
```

During guided deployment, you'll be prompted for:
- **Stack Name**: `screenshot-generator`
- **Region**: `us-east-1` (or your preferred region)
- **S3 Bucket**: Use the bucket you created above
- **Capabilities**: Accept IAM role creation (CAPABILITY_NAMED_IAM)
- **AllowedHostnames**: Comma-separated list of allowed domains (e.g., `localhost,example.com,yourdomain.com`)

### 3. Get API Endpoint

After deployment completes, the output will show:

```
Outputs:
  ScreenshotApiEndpoint
    Description: API Gateway endpoint URL for screenshot function
    Value: https://xxxxxxx.execute-api.us-east-1.amazonaws.com/prod/screenshot
```

### 4. Test Deployed Function

```bash
# Replace with your actual API endpoint
curl "https://xxxxxxx.execute-api.us-east-1.amazonaws.com/prod/screenshot?url=https://example.com&width=1800&height=945" -o screenshot.png
```

## Connect Frontend to Lambda

Update your Next.js frontend (`app/page.tsx`) to call your Lambda endpoint:

```typescript
const API_ENDPOINT = 'https://your-api-id.execute-api.region.amazonaws.com/prod/screenshot';

// Example usage
const response = await fetch(`${API_ENDPOINT}?url=${encodeURIComponent(url)}&width=1800&height=945`);
const blob = await response.blob();
```

## Managing the Deployment

### View Logs

```bash
# View recent logs
sam logs -n ScreenshotFunction --stack-name screenshot-generator

# Tail logs in real-time
sam logs -n ScreenshotFunction --stack-name screenshot-generator --tail
```

### View Stack Resources

```bash
aws cloudformation describe-stack-resources --stack-name screenshot-generator
```

### Update AllowedHostnames

Edit `samconfig.toml` and update the `parameter_overrides` line, then redeploy:

```bash
sam deploy
```

Or via CLI:

```bash
sam deploy --parameter-overrides AllowedHostnames="domain1.com,domain2.com"
```

### Delete Stack

```bash
# Delete all resources
aws cloudformation delete-stack --stack-name screenshot-generator

# Monitor deletion
aws cloudformation wait stack-delete-complete --stack-name screenshot-generator
```

## Important Notes

### Memory & Timeout

- **Memory**: Set to 1024 MB (can be adjusted in `template.yaml`)
- **Timeout**: Set to 60 seconds (sufficient for most screenshots)
- Adjust these based on your needs

### Cold Starts

Lambda may take longer on the first invocation. Browser instances are cached across invocations.

### Regional Availability

Deploy in regions that support Lambda:
- `us-east-1` (N. Virginia)
- `us-west-2` (Oregon)
- `eu-west-1` (Ireland)
- See https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/

### Cost

Typical AWS Lambda pricing (as of 2024):
- **Compute**: $0.0000002 per millisecond
- **Storage**: $0.000016667 per GB-hour for temporary storage
- **API Gateway**: $3.50 per million requests

Example: 1000 screenshots/month at 5 seconds each = ~$1-2

## Troubleshooting

### "Chromium browser not found"

Lambda doesn't include Chromium by default. Use a Lambda Layer:

```bash
# Create Lambda Layer with Chromium
./scripts/create-chromium-layer.sh
```

Then add to `template.yaml`:
```yaml
Layers:
  - !Sub 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:layer:chromium:1'
```

### "Navigation timeout"

Increase the timeout in `template.yaml` Globals section.

### "Memory limit exceeded"

Increase MemorySize in `template.yaml` (max 10,240 MB).

## Environment Variables

Configure via `samconfig.toml` or `template.yaml`:

- `ALLOWED_HOSTNAMES` - Comma-separated list of allowed domains
- `NODE_ENV` - Set to `production`

## Next Steps

1. Deploy the Lambda function
2. Update your Next.js frontend with the API endpoint
3. Test end-to-end
4. Set up monitoring/alarms in CloudWatch
5. Consider implementing request throttling via API Gateway usage plans
