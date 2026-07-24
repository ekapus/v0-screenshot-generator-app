#!/bin/bash

################################################################################
# AWS Lambda Screenshot Service Deployment Script
# 
# INSTRUCTIONS:
# 1. Fill in the configuration variables below
# 2. Save this file
# 3. Run: chmod +x deploy-template.sh && ./deploy-template.sh
################################################################################

# ============================================================================
# CONFIGURATION - EDIT THESE VALUES
# ============================================================================

# AWS credentials
export AWS_ACCESS_KEY_ID="YOUR_AWS_ACCESS_KEY_ID_HERE"
export AWS_SECRET_ACCESS_KEY="YOUR_AWS_SECRET_ACCESS_KEY_HERE"

# AWS Region (e.g., us-east-1, us-west-2, eu-west-1)
AWS_REGION="us-east-1"

# CloudFormation Stack Name (lowercase, alphanumeric and hyphens only)
STACK_NAME="screenshot-lambda-service"

# Allowed hostnames for screenshot requests (comma-separated, no spaces)
# Examples: "localhost,example.com" or "api.example.com,app.example.com"
ALLOWED_HOSTNAMES="localhost,example.com"

# S3 Bucket for storing Lambda artifacts (leave empty to auto-generate)
# If you leave this empty, a unique bucket will be created
S3_BUCKET=""

# ============================================================================
# DEPLOYMENT SCRIPT - DO NOT MODIFY BELOW THIS LINE
# ============================================================================

set -e  # Exit on error

echo "==========================================="
echo "AWS Lambda Screenshot Service Deployment"
echo "==========================================="
echo ""

# Validate credentials
if [ "$AWS_ACCESS_KEY_ID" = "YOUR_AWS_ACCESS_KEY_ID_HERE" ]; then
    echo "ERROR: AWS_ACCESS_KEY_ID not configured"
    echo "Please edit this script and set your AWS credentials"
    exit 1
fi

if [ "$AWS_SECRET_ACCESS_KEY" = "YOUR_AWS_SECRET_ACCESS_KEY_HERE" ]; then
    echo "ERROR: AWS_SECRET_ACCESS_KEY not configured"
    echo "Please edit this script and set your AWS credentials"
    exit 1
fi

# Validate stack name
if [ -z "$STACK_NAME" ]; then
    echo "ERROR: STACK_NAME is empty"
    exit 1
fi

echo "Configuration:"
echo "  AWS Region: $AWS_REGION"
echo "  Stack Name: $STACK_NAME"
echo "  Allowed Hostnames: $ALLOWED_HOSTNAMES"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI is not installed"
    echo "Please install it from: https://aws.amazon.com/cli/"
    exit 1
fi

if ! command -v sam &> /dev/null; then
    echo "ERROR: AWS SAM CLI is not installed"
    echo "Please install it from: https://aws.amazon.com/serverless/sam/"
    exit 1
fi

echo "✓ AWS CLI found: $(aws --version)"
echo "✓ SAM CLI found: $(sam --version)"
echo ""

# Verify credentials
echo "Verifying AWS credentials..."
if ! aws sts get-caller-identity --region "$AWS_REGION" > /dev/null 2>&1; then
    echo "ERROR: AWS credentials are invalid or expired"
    echo "Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
    exit 1
fi
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region "$AWS_REGION")
echo "✓ Authenticated as AWS Account: $ACCOUNT_ID"
echo ""

# Get project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "Project Root: $PROJECT_ROOT"
echo ""

# Check for template.yaml
if [ ! -f "$PROJECT_ROOT/template.yaml" ]; then
    echo "ERROR: template.yaml not found in $PROJECT_ROOT"
    echo "Please run this script from the project directory"
    exit 1
fi

# Generate S3 bucket name if needed
if [ -z "$S3_BUCKET" ]; then
    S3_BUCKET="lambda-artifacts-${ACCOUNT_ID}-${AWS_REGION}"
    echo "Auto-generated S3 bucket: $S3_BUCKET"
fi

echo ""
echo "==========================================="
echo "Stage 1: Building SAM Application"
echo "==========================================="
cd "$PROJECT_ROOT"
sam build --use-container

echo ""
echo "✓ Build completed successfully"
echo ""

echo "==========================================="
echo "Stage 2: Creating S3 Bucket"
echo "==========================================="

# Check if bucket exists, if not create it
if aws s3 ls "s3://$S3_BUCKET" --region "$AWS_REGION" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "Creating S3 bucket: $S3_BUCKET"
    aws s3 mb "s3://$S3_BUCKET" --region "$AWS_REGION"
    echo "✓ S3 bucket created"
elif aws s3 ls "s3://$S3_BUCKET" --region "$AWS_REGION" > /dev/null 2>&1; then
    echo "✓ S3 bucket already exists: $S3_BUCKET"
else
    echo "ERROR: Could not verify S3 bucket"
    exit 1
fi

echo ""
echo "==========================================="
echo "Stage 3: Packaging Application"
echo "==========================================="

sam package \
    --template-file .aws-sam/build/template.yaml \
    --s3-bucket "$S3_BUCKET" \
    --output-template-file packaged.yaml \
    --region "$AWS_REGION"

echo "✓ Packaging completed"
echo ""

echo "==========================================="
echo "Stage 4: Deploying to CloudFormation"
echo "==========================================="

sam deploy \
    --template-file packaged.yaml \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --capabilities CAPABILITY_IAM \
    --no-confirm-changeset \
    --parameter-overrides \
        AllowedHostnames="$ALLOWED_HOSTNAMES"

echo ""
echo "✓ Deployment completed"
echo ""

echo "==========================================="
echo "Stage 5: Retrieving Deployment Outputs"
echo "==========================================="

OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs' \
    --output json)

echo ""
echo "Deployment Outputs:"
echo "===================="
echo "$OUTPUTS" | jq -r '.[] | "\(.OutputKey): \(.OutputValue)"'

# Extract API endpoint
API_ENDPOINT=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="APIEndpoint") | .OutputValue')

echo ""
echo "==========================================="
echo "Deployment Complete!"
echo "==========================================="
echo ""
echo "API Endpoint: $API_ENDPOINT"
echo ""
echo "Test your deployment with:"
echo "  curl \"$API_ENDPOINT?url=https://example.com&width=1800&height=945\""
echo ""
echo "Configuration saved. You can re-deploy with modifications by running:"
echo "  ./deploy-template.sh"
echo ""
