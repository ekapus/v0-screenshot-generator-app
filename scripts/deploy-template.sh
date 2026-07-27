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

# Check prerequisites and install if missing
echo "Checking prerequisites..."
echo ""
echo "Note: First run may take 5-10 minutes if tools need to be installed."
echo "This is normal - dependencies are being compiled. Please be patient."
echo ""

# Check and install AWS CLI
if ! command -v aws &> /dev/null; then
    echo "AWS CLI not found. Installing (this may take 2-3 minutes)..."
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - use Homebrew (fastest)
        if ! command -v brew &> /dev/null; then
            echo "Homebrew not found. Please install from: https://brew.sh"
            exit 1
        fi
        echo "Installing via Homebrew..."
        brew install awscli
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux - try bundled installer first (faster than pip)
        echo "Downloading AWS CLI bundled installer (faster than pip)..."
        TMPDIR=$(mktemp -d)
        cd "$TMPDIR" || exit 1
        
        # Detect architecture
        ARCH=$(uname -m)
        case "$ARCH" in
            x86_64) ARCH="x86_64" ;;
            aarch64) ARCH="aarch64" ;;
            *) ARCH="x86_64" ;; # fallback
        esac
        
        # Download bundled installer
        if curl -s -f "https://awscli.amazonaws.com/awscli-exe-linux-${ARCH}.zip" -o "awscliv2.zip"; then
            unzip -q awscliv2.zip
            sudo ./aws/install
            cd - > /dev/null
            rm -rf "$TMPDIR"
        else
            # Fallback to pip
            echo "Bundled installer not available, using pip (slower but will work)..."
            cd - > /dev/null
            rm -rf "$TMPDIR"
            if command -v apt-get &> /dev/null; then
                sudo apt-get update && sudo apt-get install -y python3-pip
            elif command -v yum &> /dev/null; then
                sudo yum install -y python3-pip
            fi
            sudo pip3 install --upgrade pip awscli
        fi
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        # Windows
        echo "For Windows, please download the AWS CLI installer from: https://aws.amazon.com/cli/"
        exit 1
    fi
fi

if ! command -v aws &> /dev/null; then
    echo "ERROR: Failed to install AWS CLI"
    exit 1
fi

echo "✓ AWS CLI found: $(aws --version)"
echo ""

# Check and install AWS SAM CLI
if ! command -v sam &> /dev/null; then
    echo "AWS SAM CLI not found. Installing (this may take 3-5 minutes, please be patient)..."
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - use Homebrew (fastest)
        if ! command -v brew &> /dev/null; then
            echo "Homebrew not found. Please install from: https://brew.sh"
            exit 1
        fi
        echo "Installing via Homebrew..."
        brew tap aws/tap
        brew install aws-sam-cli
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux - use pip with optimization flags
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y python3-pip
        elif command -v yum &> /dev/null; then
            sudo yum install -y python3-pip
        fi
        # Install with --no-cache-dir to reduce disk I/O (speeds up installation)
        echo "Installing via pip (this will compile packages, please wait)..."
        sudo pip3 install --upgrade pip --quiet
        sudo pip3 install --no-cache-dir --quiet aws-sam-cli
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        # Windows
        echo "For Windows, please download the AWS SAM CLI installer from: https://aws.amazon.com/serverless/sam/"
        exit 1
    fi
fi

if ! command -v sam &> /dev/null; then
    echo "ERROR: Failed to install AWS SAM CLI"
    exit 1
fi

echo "✓ SAM CLI found: $(sam --version)"
echo ""

# Check for Docker (required by SAM)
if ! command -v docker &> /dev/null; then
    echo "WARNING: Docker is not installed but is required by SAM CLI for local builds"
    echo "Please install Docker from: https://www.docker.com/products/docker-desktop"
    echo "Continuing anyway - deployment may fail if Docker is needed..."
    echo ""
fi

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
