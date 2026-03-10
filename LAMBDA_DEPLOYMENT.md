# AWS Lambda Screenshot Generator Deployment

This project contains an AWS Lambda function that captures screenshots of web pages and returns them as PNG images. Perfect for generating dynamic OG images.

## Architecture

- **Lambda Function**: Uses Playwright + Chromium to capture screenshots
- **API Gateway**: Exposes the Lambda function as an HTTP endpoint
- **AWS SAM**: Infrastructure-as-code for easy deployment
- **Next.js Frontend**: Testing interface to validate the Lambda endpoint

## Prerequisites

1. AWS Account with appropriate IAM permissions
2. AWS SAM CLI installed: `pip install aws-sam-cli`
3. AWS CLI configured with credentials: `aws configure`
4. Node.js 20.x or later

## Quick Start

### 1. Build the Lambda Function

```bash
sam build
```

This creates an optimized build with the Chromium layer.

### 2. Deploy

```bash
sam deploy --guided
```

Follow the prompts:
- **Stack Name**: `screenshot-generator` (or your preferred name)
- **Region**: `us-east-1` (or your preferred region)
- **Confirm changes before deploy**: `y`
- **Allow SAM CLI IAM role creation**: `y`
- **Save parameters**: `y`

### 3. Get the API Endpoint

After deployment, the CloudFormation stack outputs will show the API endpoint URL. Copy this URL.

```bash
aws cloudformation describe-stacks --stack-name screenshot-generator --query 'Stacks[0].Outputs'
```

## Testing

### Using the Next.js Frontend

1. Start the Next.js development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Paste your Lambda API endpoint URL and test with any webpage

### Using curl

```bash
curl "https://your-api-gateway-url/screenshot?url=https://example.com&width=1800&height=945" -o screenshot.png
```

## Usage in Your Application

### In Next.js Metadata

```typescript
export const metadata = {
  openGraph: {
    images: [{
      url: 'https://your-api-gateway-url/screenshot?url=https://example.com&width=1200&height=630',
      width: 1200,
      height: 630,
    }],
  },
};
```

### Query Parameters

- `url` (required): The webpage URL to screenshot
- `width` (optional): Screenshot width in pixels (default: 1800, max: 3840)
- `height` (optional): Screenshot height in pixels (default: 945, max: 2160)

## Performance Notes

- **Cold start**: ~15-30 seconds (Lambda initializes Chromium)
- **Warm start**: ~3-5 seconds per request
- **Memory**: 3008 MB (required for Chromium)
- **Timeout**: 60 seconds

## Optimization Tips

1. **Caching**: Add cache headers to your requests to avoid repeated captures
2. **Reuse endpoints**: The Lambda function caches the browser between invocations for faster subsequent requests
3. **Monitor**: Check CloudWatch logs for performance insights

## Costs

- Lambda: ~$0.20 per 1 million requests (free tier: 1 million requests/month)
- API Gateway: ~$3.50 per million API calls (free tier: 1 million calls/month)
- Data transfer: Standard AWS rates apply

## Troubleshooting

### "Browser instance failed"
- Lambda may have insufficient memory
- Increase MemorySize in template.yaml to 3008 MB (minimum recommended)

### "Navigation timeout"
- The webpage took too long to load
- Try increasing the timeout in lambda/screenshot.js
- Check if the URL is valid and accessible from AWS

### "Chromium executable not found"
- The Lambda layer wasn't attached properly
- Redeploy using `sam deploy`

## Cleanup

To delete the stack and stop incurring charges:

```bash
aws cloudformation delete-stack --stack-name screenshot-generator
```

## Architecture Diagram

```
┌─────────────────────┐
│   Your Application  │
└──────────┬──────────┘
           │
      HTTP │ Request
           │ (url, width, height)
           ▼
┌─────────────────────────┐
│   API Gateway (HTTP)    │
└──────────┬──────────────┘
           │
           ▼
┌──────────────────────────────────┐
│   AWS Lambda Function            │
│  (Node.js 20.x)                  │
│  - Playwright                    │
│  - Chromium Layer                │
│  - Screenshot capture            │
└──────────┬───────────────────────┘
           │
      PNG │ Image
           │ (Base64)
           ▼
┌─────────────────────┐
│ Your Application    │
│ (Display OG Image)  │
└─────────────────────┘
```

## Support

For issues with:
- Lambda/AWS infrastructure: Check CloudWatch Logs
- Playwright: See [Playwright docs](https://playwright.dev)
- SAM: See [AWS SAM docs](https://aws.amazon.com/serverless/sam/)
