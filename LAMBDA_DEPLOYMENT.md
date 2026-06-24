# AWS Lambda Screenshot Generator Deployment

This project contains a native AWS Lambda function that captures screenshots of web pages and returns them as PNG images. It's designed for serverless environments and perfect for generating dynamic OG images.

## Architecture

### Execution Model
- **Native Lambda**: Each invocation creates and destroys its own browser instance (proper serverless stateless model)
- **Lambda Layer**: Uses `@sparticuz/chromium` layer for precompiled Chromium binary
- **Playwright-core**: Lightweight browser automation library
- **API Gateway**: Exposes the Lambda function as an HTTP endpoint
- **AWS SAM**: Infrastructure-as-code for easy deployment and updates
- **CloudWatch**: Monitoring, alarms, and logging for production observability
- **Next.js Frontend**: Testing interface to validate the Lambda endpoint

## Prerequisites

1. AWS Account with appropriate IAM permissions
2. AWS SAM CLI installed: `pip install aws-sam-cli`
3. AWS CLI configured with credentials: `aws configure`
4. Node.js 20.x or later

## Quick Start

### 1. Prerequisites Check

```bash
# Verify AWS SAM CLI is installed
sam --version

# Verify AWS CLI is configured
aws sts get-caller-identity

# Verify Node.js version (should be 20.x)
node --version
```

### 2. Build the Lambda Function

```bash
sam build
```

This creates an optimized build with Node.js dependencies and prepares the Lambda layer configuration.

### 3. Deploy with Guided Setup

```bash
sam deploy --guided
```

Follow the interactive prompts:
- **Stack Name**: `screenshot-generator` (or your preferred name)
- **Region**: `us-east-1` (or your preferred region - must support Lambda)
- **Parameter FunctionTimeout**: `60` (reasonable for Chromium screenshot capture)
- **Parameter FunctionMemory**: `3008` (required for Chromium stability)
- **Parameter AllowedHosts**: `*` (allow all hosts for testing; restrict to specific domains in production)
- **Parameter EnvironmentStage**: `prod` (or `dev`/`staging`)
- **Confirm changes before deploy**: `y`
- **Allow SAM CLI IAM role creation**: `y`
- **Save parameters to samconfig.toml**: `y` (for faster future deployments)

The deployment will take 2-5 minutes as it creates the Lambda function, API Gateway, and CloudWatch resources.

### 4. Retrieve the API Endpoint

After successful deployment, view the CloudFormation stack outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name screenshot-generator \
  --query 'Stacks[0].Outputs' \
  --region us-east-1
```

Copy the `ApiEndpoint` or `ApiEndpointWithExample` value from the outputs. This is your screenshot service endpoint.

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

### Native Lambda Execution Model
This function uses a **stateless per-invocation model** where each request:
1. Creates a new browser instance (cold start: ~15-30s)
2. Captures the screenshot
3. Closes the browser and cleans up resources
4. Returns the image

There is **no persistent browser caching** between invocations - each request is isolated and self-contained.

### Performance Characteristics
- **Cold start** (first invocation in a container): ~15-30 seconds
- **Container reuse** (subsequent requests in same container): ~8-15 seconds
- **API Gateway timeout**: 29 seconds (Lambda timeout: 60 seconds)
- **Memory**: 3008 MB (required for stable Chromium operation)
- **Ephemeral storage**: 10 GB (for temporary files during screenshot capture)
- **CPU**: Scales with memory allocation

### Why This Model?
- **Reliability**: No state to corrupt or leak between requests
- **Scalability**: Each invocation is independent; concurrent requests use separate containers
- **Cost-effectiveness**: Pay only for execution time; containers cleaned up immediately
- **Observability**: Each request is isolated with clear logs and metrics

## Optimization Tips

1. **CloudFront CDN**: Cache screenshot responses for 1-24 hours depending on your use case
2. **Request batching**: Group related screenshot requests to maximize cold start amortization
3. **Domain allowlist**: Set `ALLOWED_HOSTS` to specific domains in production to restrict access
4. **Monitor CloudWatch**: Track cold starts, duration, and errors to optimize timeout/memory settings
5. **Cost optimization**: Set appropriate `FunctionMemory` - higher memory = faster execution but higher cost

## Configuration

### Environment Variables

The Lambda function is configured via environment variables in `template.yaml`:

| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOWED_HOSTS` | `*` | Comma-separated list of allowed hostnames. Use `*` for all (testing only). Set to specific domains in production (e.g., `example.com,myapp.com`). |
| `SCREENSHOT_TIMEOUT` | `30000` | Navigation and wait timeout in milliseconds (30 seconds recommended). |
| `MAX_SCREENSHOT_WIDTH` | `3840` | Maximum screenshot width in pixels. |
| `MAX_SCREENSHOT_HEIGHT` | `2160` | Maximum screenshot height in pixels. |
| `LOG_LEVEL` | `INFO` | CloudWatch log level (INFO, DEBUG, ERROR). |
| `NODE_OPTIONS` | `--max-old-space-size=2816` | Node.js memory settings (do not modify unless you know what you're doing). |

### Updating Configuration

To change any configuration:

```bash
# Edit template.yaml parameters or environment variables
# Then redeploy:
sam deploy
```

### Security Best Practices

1. **Restrict hostnames in production**: Set `ALLOWED_HOSTS` to only the domains you control
   ```bash
   sam deploy --parameter-overrides AllowedHosts="example.com,app.example.com"
   ```

2. **Monitor API Gateway logs**: Enable CloudWatch logging to track all requests

3. **Set API Gateway throttling**: Protect against abuse by limiting requests per second

4. **Use VPC endpoints** (optional): If calling internal services, deploy Lambda in a VPC

## Costs

- **Lambda**: ~$0.20 per 1 million invocations + $0.0000166667 per GB-second
  - 1000 screenshots × 20 seconds × 3.008 GB ≈ $0.10/day
  - Free tier: 1 million requests/month + 400,000 GB-seconds/month
- **API Gateway**: ~$3.50 per million API calls
  - Free tier: 1 million calls/month
- **CloudWatch**: Logs typically <$1/month for moderate usage
- **Data transfer**: Standard AWS egress rates (typically not significant)

## Troubleshooting

### Lambda Deployment Issues

#### "sam build" fails with dependency errors
```bash
# Clear the build cache and rebuild
rm -rf .aws-sam build/
sam build --use-container  # Builds in Docker for consistency
```

#### "sam deploy" permission denied
```bash
# Verify AWS credentials are configured
aws sts get-caller-identity

# Re-authenticate with AWS
aws configure
```

### Runtime Issues

#### "Failed to launch Chromium" or "Chromium executable not found"
- The `@sparticuz/chromium` layer may not have been attached
- Verify the layer ARN in `template.yaml` is correct for your region
- Current working ARN: `arn:aws:lambda:us-east-1:764366827900:layer:chromium-sv:5`
- Check [sparticuz chromium-aws](https://github.com/sparticuz/chromium-aws) for latest ARN by region

Solution:
```bash
# Redeploy to update layer reference
sam deploy
```

#### "Failed to capture screenshot" (but no other errors)
- URL may be invalid or inaccessible from AWS
- Check CloudWatch logs for detailed error message:
  ```bash
  aws logs tail /aws/lambda/screenshot-generator --follow
  ```

#### "Navigation timeout" 
- The webpage took longer than `SCREENSHOT_TIMEOUT` to load
- Increase timeout (max practical: 45s due to API Gateway timeout):
  ```bash
  sam deploy --parameter-overrides FunctionTimeout=90 ScreenshotTimeout=45000
  ```
- Check if the URL is valid and accessible from AWS Lambda VPC

#### "Hostname not allowed"
- URL hostname doesn't match `ALLOWED_HOSTS` configuration
- Update allowed hosts:
  ```bash
  sam deploy --parameter-overrides AllowedHosts="example.com,*.example.com"
  ```

### Monitoring and Debugging

#### View Lambda logs
```bash
# Stream logs in real-time
aws logs tail /aws/lambda/screenshot-generator --follow

# Get last 50 lines
aws logs tail /aws/lambda/screenshot-generator --max-items 50
```

#### Check Lambda metrics in CloudWatch
```bash
# View error rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=screenshot-generator \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

#### Enable X-Ray tracing (advanced)
```bash
# Edit template.yaml to add:
# TracingConfig:
#   Mode: Active
sam deploy
```

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
