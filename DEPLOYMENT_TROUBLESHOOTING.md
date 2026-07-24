# AWS Lambda Deployment Troubleshooting Guide

## Common Errors and Solutions

### "AWS credential validation failed: undefined"

**Cause:** The error message is not being properly captured, usually indicating that AWS CLI is not installed or not accessible.

**Solution:**
1. **Install AWS CLI v2:**
   ```bash
   # macOS
   curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
   sudo installer -pkg AWSCLIV2.pkg -target /

   # Linux
   curl "https://awscli.amazonaws.com/awscliv2.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install

   # Windows
   # Download from https://awscli.amazonaws.com/AWSCLIV2.msi
   ```

2. **Verify installation:**
   ```bash
   aws --version
   aws configure --profile myprofile
   ```

3. **Ensure AWS CLI is in PATH:**
   ```bash
   which aws  # macOS/Linux
   where aws  # Windows
   ```

### "AWS credential validation failed: Invalid AWS Access Key format"

**Cause:** The Access Key ID doesn't follow AWS format (should start with "AKIA").

**Solution:**
1. Go to AWS IAM Console
2. Click on your user → Security Credentials
3. Create a new Access Key
4. Copy the full Access Key ID (format: AKIA followed by 16 alphanumeric characters)
5. Paste into the form

### "AWS credential validation failed: InvalidClientTokenId"

**Cause:** The AWS Access Key ID is invalid or doesn't exist.

**Solution:**
1. Double-check the Access Key ID for typos
2. Log into AWS IAM Console and verify the key exists and is active
3. Create a new Access Key if the current one is inactive
4. Ensure you're using the correct AWS account

### "AWS credential validation failed: SignatureDoesNotMatch"

**Cause:** The AWS Secret Access Key is incorrect.

**Solution:**
1. AWS only displays the Secret Access Key once when created
2. If you've lost it, delete the access key and create a new one
3. Make sure there are no extra spaces or characters when copying the key
4. Try copying again carefully

### "AWS SAM CLI is not installed"

**Cause:** AWS SAM CLI is required but not installed.

**Solution:**
```bash
# Install using pip
pip install aws-sam-cli

# Or use Homebrew (macOS)
brew tap aws/tap
brew install aws-sam-cli

# Verify installation
sam --version
```

### "SAM build failed" or build-related errors

**Cause:** Usually indicates Docker is not running or not installed (SAM build uses containers).

**Solution:**
1. Install Docker from https://docker.com
2. Start Docker Desktop or docker daemon
3. Run the deployment again

**Alternative:** Build without Docker
```bash
# Modify the deployment by removing --use-container flag
sam build
```

### "CloudFormation deployment failed" or "IAM Permission denied"

**Cause:** AWS IAM user doesn't have required permissions.

**Solution:**

Create an IAM policy with these permissions for your user:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "lambda:*",
        "apigateway:*",
        "iam:PassRole",
        "iam:GetRole",
        "s3:*"
      ],
      "Resource": "*"
    }
  ]
}
```

Steps:
1. Go to AWS IAM Console
2. Select your user → Add permissions → Attach policies
3. Create inline policy with the above JSON
4. Retry the deployment

### "S3 bucket already exists" error

**Cause:** The auto-generated S3 bucket name conflicts with an existing bucket.

**Solution:**
1. In the Configuration step, specify a custom S3 bucket name
2. Make sure the bucket name is globally unique
3. Ensure you have permissions to create/access that bucket

### "Stack already exists with different template"

**Cause:** You're trying to deploy with the same stack name but different configuration.

**Solution:**
1. **Option 1:** Use a different stack name in the Configuration step
2. **Option 2:** Delete the existing stack in CloudFormation console and retry
3. **Option 3:** Update the existing stack (not supported in UI currently)

### "Cannot connect to AWS" or "connection refused"

**Cause:** Network connectivity issue or AWS endpoint unreachable.

**Solution:**
1. Check your internet connection
2. Verify you can reach AWS:
   ```bash
   ping aws.amazon.com
   ```
3. Check if your firewall/proxy blocks AWS connections
4. Try a different AWS region
5. Verify AWS credentials are correct for your account

### Deployment hangs or takes too long

**Cause:** Build process is waiting for Docker or network operations are slow.

**Solution:**
1. Check logs in the "Deployment Logs" tab for details
2. Docker image pulls on first build can take 2-5 minutes - be patient
3. If truly stuck (>15 minutes), click "Cancel Deployment"
4. Check your network speed and Docker configuration

### "Template format error" or YAML parsing errors

**Cause:** The SAM template is malformed or has issues.

**Solution:**
1. Check the CloudFormation stack events in AWS Console for details
2. Look at the logs for the specific line causing issues
3. Ensure `template.yaml` hasn't been corrupted
4. Try deleting `.aws-sam` directory and retry

## Checking Prerequisites

### Verify All Tools Are Installed

```bash
# Check AWS CLI
aws --version

# Check AWS SAM CLI  
sam --version

# Check Docker
docker --version

# Check AWS credentials are configured
aws sts get-caller-identity
```

### Test AWS Credentials

```bash
# List your identity
aws sts get-caller-identity

# Check permissions
aws cloudformation describe-stacks

# Verify S3 access
aws s3 ls
```

## Getting More Help

### Enable Debug Logging

Download the deployment logs from the UI:
1. Wait for deployment to complete (or fail)
2. Click the "Download Summary" button
3. Review the logs for error messages

### Check AWS CloudFormation Console

1. Go to AWS CloudFormation Console
2. Find your stack name
3. Click "Events" tab to see detailed error messages
4. Check "Resources" tab to see what was created

### Check AWS Lambda Console

1. Go to AWS Lambda Console
2. Look for your function (named in stack outputs)
3. Check CloudWatch Logs for function execution errors

### Contact Support

If issues persist:
1. Download the deployment logs (click Download button)
2. Include the full error message and logs
3. Share your AWS region and approximate time of deployment
4. Contact support with this information

## Environment-Specific Issues

### macOS M1/M2 (Apple Silicon)

Add this to your shell profile (`.zshrc` or `.bash_profile`):
```bash
export DOCKER_DEFAULT_PLATFORM=linux/amd64
```

### Linux Systems

Ensure Docker daemon is running:
```bash
sudo systemctl start docker
```

Add your user to docker group (to avoid `sudo`):
```bash
sudo usermod -aG docker $USER
```

### Windows with WSL2

1. Install Docker Desktop with WSL2 backend
2. Restart Docker after configuration
3. Verify WSL2 integration is enabled

## Quick Fixes Checklist

- [ ] AWS CLI installed and v2+
- [ ] AWS SAM CLI installed  
- [ ] Docker installed and running
- [ ] AWS credentials are valid
- [ ] AWS IAM user has required permissions
- [ ] No existing stack with same name (unless updating)
- [ ] Internet connection is stable
- [ ] Firewall/VPN doesn't block AWS endpoints
- [ ] Enough disk space for Docker images (~2GB)

## Monitoring Deployment Progress

The UI shows real-time progress through 5 stages:

1. **Validating Credentials** (0-20%)
   - Verifying AWS credentials with STS
   - Check: Are credentials correct?

2. **Building SAM Application** (20-40%)
   - Docker builds the Lambda function
   - Takes 2-5 minutes on first run
   - Check: Is Docker running?

3. **Packaging Application** (40-60%)
   - SAM packages code to S3
   - Creates necessary S3 bucket
   - Check: Do you have S3 permissions?

4. **Deploying to CloudFormation** (60-80%)
   - Creates/updates CloudFormation stack
   - Sets up API Gateway, Lambda, IAM roles
   - Takes 2-5 minutes
   - Check: CloudFormation stack in AWS Console

5. **Retrieving Outputs** (80-100%)
   - Fetches API endpoint and function details
   - Completes deployment
   - Check: API endpoint is accessible

## Next Steps After Successful Deployment

1. Copy the API endpoint from the success page
2. Test the endpoint:
   ```bash
   curl "YOUR_API_ENDPOINT?url=https://example.com&width=1200&height=800"
   ```
3. Configure your application to use the endpoint
4. Monitor Lambda usage in CloudWatch
5. Set up cost alerts in AWS Billing
