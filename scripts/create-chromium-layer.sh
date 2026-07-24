#!/bin/bash

# Create AWS Lambda Layer with Chromium for Screenshot Generator
# This script builds a Lambda Layer containing Chromium binary

set -e

echo "Creating Chromium Lambda Layer..."

# Create directory structure
mkdir -p layer/nodejs/node_modules
mkdir -p layer/opt/chromium

cd layer

# Download prebuilt Chromium for Lambda
echo "Downloading Chromium for Lambda..."
# Using a prebuilt Chromium binary optimized for Lambda
CHROMIUM_URL="https://github.com/sparticuz/chromium/releases/download/v124.0.0/chromium-v124.0.0-layer.zip"

if ! curl -L -o chromium.zip "$CHROMIUM_URL" 2>/dev/null; then
  echo "Error: Could not download Chromium. Trying alternative source..."
  # Alternative: Use @sparticuz/chromium package
  cd nodejs
  npm install @sparticuz/chromium
  cd ..
fi

# Extract Chromium binary if zip was downloaded
if [ -f chromium.zip ]; then
  unzip -q chromium.zip -d opt/chromium
  rm chromium.zip
fi

# Zip the layer
echo "Creating layer package..."
zip -r -q ../chromium-layer.zip .

cd ..

# Create layer in AWS Lambda
echo "Uploading layer to AWS Lambda..."

LAYER_VERSION=$(aws lambda publish-layer-version \
  --layer-name chromium-layer \
  --zip-file fileb://chromium-layer.zip \
  --compatible-runtimes nodejs18.x nodejs20.x \
  --query 'Version' \
  --output text)

echo "✓ Layer created successfully!"
echo "Layer ARN: arn:aws:lambda:$(aws configure get region):$(aws sts get-caller-identity --query Account --output text):layer:chromium-layer:$LAYER_VERSION"

# Cleanup
rm -rf layer chromium-layer.zip

echo ""
echo "Next steps:"
echo "1. Update template.yaml with the layer ARN"
echo "2. Deploy with: sam deploy"
