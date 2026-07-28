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

# Skip dependency checks (set to "true" if you already have AWS CLI and SAM CLI installed)
# Set to "true" to skip checking/installing AWS CLI and SAM CLI
# Set to "false" or leave empty to check and install dependencies automatically
SKIP_DEPENDENCY_CHECK="false"

# ============================================================================
# DEPLOYMENT SCRIPT - DO NOT MODIFY BELOW THIS LINE
# ============================================================================

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
if [ "$SKIP_DEPENDENCY_CHECK" = "true" ]; then
    echo "Skipping dependency checks (SKIP_DEPENDENCY_CHECK=true)"
    echo ""
else
    echo "Checking prerequisites..."
    echo ""
    echo "Note: First run may take 5-10 minutes if tools need to be installed."
    echo "This is normal - dependencies are being compiled. Please be patient."
    echo ""
fi

# Check and install AWS CLI
if [ "$SKIP_DEPENDENCY_CHECK" != "true" ] && ! command -v aws &> /dev/null; then
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

if [ "$SKIP_DEPENDENCY_CHECK" != "true" ]; then
    if ! command -v aws &> /dev/null; then
        echo "ERROR: Failed to install AWS CLI"
        exit 1
    fi
    echo "✓ AWS CLI found: $(aws --version)"
else
    # Just verify AWS CLI exists when skipping dependency check
    if ! command -v aws &> /dev/null; then
        echo "ERROR: AWS CLI is not installed"
        echo "Please install AWS CLI from: https://aws.amazon.com/cli/"
        exit 1
    fi
fi
echo ""

# Check and install AWS SAM CLI
if [ "$SKIP_DEPENDENCY_CHECK" != "true" ] && ! command -v sam &> /dev/null; then
    echo "AWS SAM CLI not found. Installing (this may take 3-5 minutes, please be patient)..."
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - try Homebrew first, fall back to pipx
        if command -v brew &> /dev/null; then
            echo "Installing via Homebrew..."
            if brew tap aws/tap && brew install aws-sam-cli 2>/dev/null; then
                echo "Successfully installed via Homebrew"
            else
                echo "Homebrew installation failed, trying pipx instead..."
                # Install pipx if not available
                if ! command -v pipx &> /dev/null; then
                    echo "Installing pipx..."
                    brew install pipx
                fi
                # Use pipx to install SAM CLI (works with Python's externally-managed-environment)
                # Use --pip-args to ensure all dependencies are installed
                pipx install --pip-args="--no-cache-dir" aws-sam-cli
            fi
        else
            echo "Homebrew not found, installing via pipx..."
            # Install pipx first
            if ! command -v pipx &> /dev/null; then
                echo "Installing pipx..."
                # Try to install pipx via pip with --break-system-packages or virtual env
                python3 -m pip install --user pipx 2>/dev/null || {
                    echo "Creating virtual environment for pipx..."
                    python3 -m venv "$HOME/.venv-pipx"
                    source "$HOME/.venv-pipx/bin/activate"
                    pip install pipx
                }
            fi
            # Use pipx to install SAM CLI
            # Use --pip-args to ensure all dependencies are installed
            pipx install --pip-args="--no-cache-dir" aws-sam-cli
        fi
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
        
        # SAM may be installed to ~/.local/bin on Linux/macOS, add to PATH
        export PATH="$HOME/.local/bin:/root/.local/bin:/home/*/local/bin:$PATH"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        # Windows
        echo "For Windows, please download the AWS SAM CLI installer from: https://aws.amazon.com/serverless/sam/"
        exit 1
    fi
    
    # Refresh command cache after installation
    hash -r
fi

if ! command -v sam &> /dev/null; then
    echo "WARNING: SAM CLI not found in PATH after installation"
    echo "Attempting to locate sam binary..."
    
    # Try to find sam in common locations
    SAM_FOUND=0
    for SAM_PATH in "$HOME/.local/bin/sam" "$HOME/.venv-pipx/bin/sam" "/root/.local/bin/sam" "/usr/local/bin/sam" "/opt/homebrew/bin/sam"; do
        if [ -f "$SAM_PATH" ]; then
            export PATH="$(dirname "$SAM_PATH"):$PATH"
            SAM_FOUND=1
            break
        fi
    done
    
    if [ $SAM_FOUND -eq 0 ]; then
        echo "ERROR: Failed to install or locate AWS SAM CLI"
        echo "Please install manually from: https://aws.amazon.com/serverless/sam/"
        exit 1
    fi
    
    hash -r
fi

if [ "$SKIP_DEPENDENCY_CHECK" != "true" ]; then
    echo "✓ SAM CLI found: $(sam --version)"
else
    # Just verify SAM CLI exists when skipping dependency check
    if ! command -v sam &> /dev/null; then
        echo "ERROR: AWS SAM CLI is not installed"
        echo "Please install SAM CLI from: https://aws.amazon.com/serverless/sam/"
        exit 1
    fi
    echo "✓ SAM CLI found: $(sam --version)"
fi
echo ""

# Check for Docker (required by SAM)
if [ "$SKIP_DEPENDENCY_CHECK" != "true" ] && ! command -v docker &> /dev/null; then
    echo "WARNING: Docker is not installed but is required by SAM CLI for local builds"
    echo "Please install Docker from: https://www.docker.com/products/docker-desktop"
    echo "Continuing anyway - deployment may fail if Docker is needed..."
    echo ""
fi

echo ""

# Verify credentials
echo "Verifying AWS credentials..."

# Test credentials (STS is global, don't use --region flag)
CALLER_OUTPUT=$(aws sts get-caller-identity --output json 2>&1)
CALLER_STATUS=$?

if [ $CALLER_STATUS -ne 0 ]; then
    echo "ERROR: AWS credentials are invalid or expired"
    echo ""
    echo "Credentials configured:"
    echo "  AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID:0:4}...${AWS_ACCESS_KEY_ID: -4}"
    echo "  AWS_REGION: $AWS_REGION"
    echo ""
    echo "AWS Error response:"
    echo "$CALLER_OUTPUT"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check that AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are correct"
    echo "  2. Verify the keys have not expired"
    echo "  3. Ensure the IAM user has permissions for: CloudFormation, Lambda, API Gateway, S3, IAM"
    echo "  4. Try running: aws sts get-caller-identity"
    exit 1
fi

# Parse Account ID
ACCOUNT_ID=$(echo "$CALLER_OUTPUT" | grep -o '"Account": "[^"]*"' | cut -d'"' -f4)

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
S3_CHECK=$(aws s3 ls "s3://$S3_BUCKET" 2>&1)
S3_STATUS=$?

if [ $S3_STATUS -eq 0 ]; then
    echo "✓ S3 bucket already exists: $S3_BUCKET"
elif echo "$S3_CHECK" | grep -q 'NoSuchBucket'; then
    echo "Creating S3 bucket: $S3_BUCKET"
    if [ "$AWS_REGION" = "us-east-1" ]; then
        aws s3 mb "s3://$S3_BUCKET"
    else
        aws s3 mb "s3://$S3_BUCKET" --region "$AWS_REGION"
    fi
    echo "✓ S3 bucket created"
else
    echo "ERROR: Could not verify S3 bucket"
    echo "Response: $S3_CHECK"
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
