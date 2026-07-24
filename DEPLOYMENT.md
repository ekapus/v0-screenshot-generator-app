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

## Quick Start

### Option 1: Using the Automated Script

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

This script will:
1. Check prerequisites
2. Install dependencies
3. Build the SAM application
4. Deploy to AWS
5. Display the API endpoint

### Option 2: Manual Deployment

#### 1. Install Dependencies

```bash
cd lambda
npm install
cd ..
```

#### 2. Build SAM Application

```bash
sam build
```

#### 3. Deploy to AWS (First Time - Guided)

```bash
sam deploy --guided
```

When prompted, enter:
- **Stack Name**: `screenshot-generator`
- **Region**: Your preferred AWS region (e.g., `us-east-1`)
- **S3 Bucket**: Create new SAM CLI managed bucket
- **Capabilities**: Accept IAM role creation
- **AllowedHostnames**: Comma-separated list (e.g., `localhost,example.com`)

#### 4. Subsequent Deployments

```bash
sam deploy
```

## Chromium Lambda Layer

The Lambda function requires Chromium to run. There are two approaches:

### Approach 1: Use Pre-built Layer (Recommended)

The template already references a chromium layer. Update the layer ARN in `template.yaml`:

```yaml
Layers:
  - arn:aws:lambda:REGION:ACCOUNT_ID:layer:chromium-layer:VERSION
```

### Approach 2: Create Your Own Layer

```bash
chmod +x scripts/create-chromium-layer.sh
./scripts/create-chromium-layer.sh
```

This creates and uploads a Chromium layer to your AWS account.

## Testing

### Local Testing

```bash
# Start local API
sam local start-api

# In another terminal, test the endpoint
curl "http://localhost:3000/screenshot?url=https://example.com&width=1800&height=945" -o screenshot.png
```

### Test Deployed Function

After deployment, you'll see the API endpoint:

```bash
# Replace with your actual endpoint
API_ENDPOINT="https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/screenshot"

# Test with URL
curl "$API_ENDPOINT?url=https://example.com&width=1800&height=945" -o screenshot.png

# Test with custom dimensions
curl "$API_ENDPOINT?url=https://google.com&width=1920&height=1080" -o google.png
```

## API Usage

### Endpoint

```
GET /screenshot
```

### Query Parameters

| Parameter | Type | Required | Default | Range |
|-----------|------|----------|---------|-------|
| `url` | string | Yes | - | Valid URL |
| `width` | integer | No | 1800 | 320-3840 |
| `height` | integer | No | 945 | 240-2160 |
| `allowedHost` | string | No | true | "true" or "false" |

### Examples

```bash
# Basic screenshot
curl "API_ENDPOINT?url=https://example.com"

# Custom dimensions
curl "API_ENDPOINT?url=https://example.com&width=1920&height=1080"

# Bypass hostname check
curl "API_ENDPOINT?url=https://example.com&allowedHost=false"
```

### Response

**Success (200)**
- Content-Type: `image/png`
- Body: PNG image (base64 in JSON API responses)

**Error (400)**
```json
{ "error": "URL parameter is required" }
```

**Error (403)**
```json
{ "error": "Screenshots not allowed for this hostname" }
```

**Error (500)**
```json
{ "error": "Failed to capture screenshot" }
```

## Environment Configuration

### Update Allowed Hostnames

Edit `samconfig.toml`:

```toml
[default.deploy.parameters]
parameter_overrides = "AllowedHostnames=\"domain1.com,domain2.com,yourdomain.com\""
```

Then redeploy:

```bash
sam deploy
```

## Monitoring & Logs

### View Recent Logs

```bash
sam logs -n ScreenshotFunction --stack-name screenshot-generator
```

### Tail Logs in Real-time

```bash
sam logs -n ScreenshotFunction --stack-name screenshot-generator --tail
```

### View CloudWatch Metrics

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=screenshot-generator \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average,Maximum
```

## Stack Management

### View Stack Outputs

```bash
./scripts/deploy.sh outputs
```

Or manually:

```bash
aws cloudformation describe-stacks \
  --stack-name screenshot-generator \
  --query 'Stacks[0].Outputs'
```

### Update Stack

```bash
sam deploy --parameter-overrides AllowedHostnames="new-domain.com"
```

### Delete Stack

```bash
# Using script
./scripts/deploy.sh delete

# Or manually
aws cloudformation delete-stack --stack-name screenshot-generator
aws cloudformation wait stack-delete-complete --stack-name screenshot-generator
```

## Frontend Integration

Update your Next.js frontend (`app/page.tsx`) to call the Lambda endpoint:

```typescript
const SCREENSHOT_API = 'https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/screenshot';

async function captureScreenshot(url: string) {
  try {
    const response = await fetch(
      `${SCREENSHOT_API}?url=${encodeURIComponent(url)}&width=1800&height=945`
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to capture screenshot');
    }
    
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    throw error;
  }
}
```

## Performance Tuning

### Memory Settings

In `template.yaml`, adjust `MemorySize` under Globals:

```yaml
Globals:
  Function:
    MemorySize: 1024  # 128 MB to 10,240 MB
```

Higher memory = faster CPU = lower cold start time.

### Timeout Settings

```yaml
Globals:
  Function:
    Timeout: 60  # Seconds (max 900)
```

### Cold Start Optimization

- Increase memory to reduce CPU constraint
- Browser is cached across invocations
- Consider pre-warming with scheduled events

## Troubleshooting

### "Chromium browser not found"

The Lambda layer with Chromium is not attached or found. Solutions:

1. Check layer ARN in `template.yaml`
2. Verify layer exists in your region
3. Create layer using `./scripts/create-chromium-layer.sh`

### "Navigation timeout"

Increase timeout in `template.yaml`:

```yaml
Globals:
  Function:
    Timeout: 120  # Increase from 60 to 120 seconds
```

### "Memory limit exceeded"

Increase memory in `template.yaml`:

```yaml
Globals:
  Function:
    MemorySize: 3008  # Increase from 1024 to 3008 MB
```

### "Too many open files"

Chromium is opening too many browser instances. The handler caches browser instances across invocations. If this persists, add cleanup:

```javascript
// In screenshot.js
context.callbackWaitsForEmptyEventLoop = false;
```

### CORS Issues

API Gateway CORS is enabled for all origins by default. To restrict:

1. Update `template.yaml` RestApi properties
2. Add specific allowed origins

### "Access Denied" on Deployment

Ensure your AWS IAM user has permissions:
- `cloudformation:*`
- `lambda:*`
- `apigateway:*`
- `iam:*`
- `logs:*`
- `s3:*`

## Cost Estimation

### AWS Pricing (as of 2024)

- **Lambda**: $0.0000002 per millisecond
- **API Gateway**: $3.50 per million requests
- **CloudWatch Logs**: $0.50 per GB ingested

### Example Scenario

1000 screenshots/month, 5 seconds average:

- **Lambda**: 1000 × 5000ms × $0.0000002 = $1.00
- **API Gateway**: 1000 × $3.50 / 1,000,000 = $0.0035
- **Logs**: ~100 MB × $0.50 / 1024 = $0.05

**Total: ~$1.05/month**

## Cleanup

Remove all AWS resources:

```bash
# Delete CloudFormation stack
./scripts/deploy.sh delete

# Or manually
aws cloudformation delete-stack --stack-name screenshot-generator

# Delete S3 bucket (if created)
aws s3 rb s3://your-bucket-name --force

# Delete Lambda layer (if created)
aws lambda delete-layer-version \
  --layer-name chromium-layer \
  --version-number 1
```

## Next Steps

1. ✅ Deploy Lambda function
2. ✅ Test API endpoint
3. Update your Next.js frontend with API endpoint
4. Set up monitoring alerts in CloudWatch
5. Consider implementing request throttling via API Gateway usage plans
6. Add API authentication (API Keys or AWS IAM)

## References

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [Playwright Documentation](https://playwright.dev/)
