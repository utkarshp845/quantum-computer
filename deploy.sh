#!/bin/bash

# Quantum Entangler - AWS S3 Deployment Script
# Usage: ./deploy.sh [--invalidate]

set -e  # Exit on error

# Configuration - UPDATE THESE VALUES
S3_BUCKET="quantumlens-pandeylabs-com"  # Your S3 bucket name
CLOUDFRONT_DISTRIBUTION_ID="E8YG1H9JN5X2D"  # Your CloudFront distribution ID (optional, for cache invalidation)
AWS_REGION="us-east-1"  # Your AWS region

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Quantum Entangler - AWS Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}⚠️  AWS CLI not found. Installing...${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${YELLOW}⚠️  AWS credentials not configured.${NC}"
    echo "Please configure AWS credentials:"
    echo "  aws configure"
    echo "  OR"
    echo "  export AWS_ACCESS_KEY_ID=your-key"
    echo "  export AWS_SECRET_ACCESS_KEY=your-secret"
    exit 1
fi

# Step 1: Build the application
echo -e "${BLUE}📦 Step 1: Building application...${NC}"
npm run build

if [ ! -d "dist" ]; then
    echo -e "${YELLOW}❌ Build failed: dist directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build complete!${NC}"
echo ""

# Step 2: Upload to S3
echo -e "${BLUE}☁️  Step 2: Uploading to S3 bucket: ${S3_BUCKET}${NC}"
aws s3 sync dist/ s3://${S3_BUCKET}/ \
    --region ${AWS_REGION} \
    --delete \
    --exact-timestamps \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" \
    --exclude "service-worker.js"

# Upload HTML files with different cache settings (no cache for HTML)
aws s3 sync dist/ s3://${S3_BUCKET}/ \
    --region ${AWS_REGION} \
    --delete \
    --exact-timestamps \
    --cache-control "public, max-age=0, must-revalidate" \
    --include "*.html" \
    --include "service-worker.js"

echo -e "${GREEN}✅ Upload complete!${NC}"
echo ""

# Step 3: Invalidate CloudFront cache (if distribution ID is provided)
if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo -e "${BLUE}🔄 Step 3: Invalidating CloudFront cache...${NC}"
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)
    
    echo -e "${GREEN}✅ Cache invalidation created: ${INVALIDATION_ID}${NC}"
    echo -e "${YELLOW}⏳ Cache invalidation takes 1-5 minutes to complete${NC}"
else
    echo -e "${YELLOW}⚠️  CloudFront distribution ID not set. Skipping cache invalidation.${NC}"
    echo "   Set CLOUDFRONT_DISTRIBUTION_ID in deploy.sh to enable cache invalidation"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Your application should be live at:"
echo "  https://quantumlens.pandeylabs.com"
echo ""

