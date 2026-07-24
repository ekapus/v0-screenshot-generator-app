#!/bin/bash

# Screenshot Generator - AWS Lambda Deployment Script
# This script automates the SAM deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
STACK_NAME="screenshot-generator"
REGION="${AWS_REGION:-us-east-1}"
CAPABILITIES="CAPABILITY_NAMED_IAM"

# Functions
print_header() {
  echo -e "\n${GREEN}========================================${NC}"
  echo -e "${GREEN}$1${NC}"
  echo -e "${GREEN}========================================${NC}\n"
}

print_error() {
  echo -e "${RED}✗ Error: $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
  print_header "Checking Prerequisites"

  if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed"
    echo "Install from: https://aws.amazon.com/cli/"
    exit 1
  fi
  print_success "AWS CLI found"

  if ! command -v sam &> /dev/null; then
    print_error "AWS SAM CLI is not installed"
    echo "Install from: https://aws.amazon.com/serverless/sam/"
    exit 1
  fi
  print_success "AWS SAM CLI found"

  if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
  fi
  print_success "Node.js found"
}

# Install dependencies
install_dependencies() {
  print_header "Installing Dependencies"
  
  if [ -d "lambda" ]; then
    cd lambda
    if [ ! -d "node_modules" ]; then
      npm install
      print_success "Lambda dependencies installed"
    else
      print_info "Lambda dependencies already installed"
    fi
    cd ..
  fi
}

# Build SAM application
build_app() {
  print_header "Building SAM Application"
  
  sam build
  print_success "Build complete"
}

# Deploy application
deploy_app() {
  print_header "Deploying to AWS"

  read -p "Enter allowed hostnames (comma-separated, e.g., 'localhost,example.com'): " HOSTNAMES
  HOSTNAMES=${HOSTNAMES:-"localhost,example.com"}

  sam deploy \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --capabilities "$CAPABILITIES" \
    --parameter-overrides AllowedHostnames="$HOSTNAMES" \
    --no-confirm-changeset

  print_success "Deployment complete!"
}

# Get stack outputs
get_outputs() {
  print_header "Deployment Outputs"

  OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs' \
    --output text)

  if [ ! -z "$OUTPUTS" ]; then
    echo "$OUTPUTS"
  else
    print_error "Could not retrieve stack outputs"
  fi
}

# Main script
main() {
  echo -e "${GREEN}"
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║  Screenshot Generator - AWS Lambda Deployment Tool  ║"
  echo "╚══════════════════════════════════════════════════════╝"
  echo -e "${NC}"

  # Parse command line arguments
  COMMAND="${1:-deploy}"

  case "$COMMAND" in
    deploy)
      check_prerequisites
      install_dependencies
      build_app
      deploy_app
      get_outputs
      ;;
    build)
      install_dependencies
      build_app
      ;;
    outputs)
      get_outputs
      ;;
    logs)
      print_header "Function Logs"
      sam logs -n ScreenshotFunction --stack-name "$STACK_NAME" --tail
      ;;
    delete)
      read -p "Are you sure you want to delete the stack? (yes/no): " CONFIRM
      if [ "$CONFIRM" = "yes" ]; then
        print_info "Deleting stack..."
        aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION"
        aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" --region "$REGION"
        print_success "Stack deleted"
      else
        print_info "Cancelled"
      fi
      ;;
    *)
      echo "Usage: $0 {deploy|build|outputs|logs|delete}"
      echo ""
      echo "Commands:"
      echo "  deploy   - Build and deploy to AWS (default)"
      echo "  build    - Build the application"
      echo "  outputs  - Show deployment outputs"
      echo "  logs     - View function logs"
      echo "  delete   - Delete the AWS stack"
      exit 1
      ;;
  esac
}

main "$@"
