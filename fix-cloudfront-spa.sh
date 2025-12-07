#!/bin/bash

# Fix CloudFront SPA Routing for Mobile

set -e

CLOUDFRONT_DISTRIBUTION_ID="E8YG1H9JN5X2D"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Fixing CloudFront SPA Routing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get current config
echo "📥 Fetching current CloudFront configuration..."
aws cloudfront get-distribution-config --id ${CLOUDFRONT_DISTRIBUTION_ID} > /tmp/cf-current.json

ETAG=$(cat /tmp/cf-current.json | jq -r '.ETag')
echo "✅ Current ETag: ${ETAG}"

# Update configuration - ensure custom error responses are correct
echo "✏️  Updating custom error responses..."
cat /tmp/cf-current.json | jq '.DistributionConfig | 
  .CustomErrorResponses.Quantity = 2 |
  .CustomErrorResponses.Items = [
    {
      "ErrorCode": 403,
      "ResponsePagePath": "/index.html",
      "ResponseCode": "200",
      "ErrorCachingMinTTL": 300
    },
    {
      "ErrorCode": 404,
      "ResponsePagePath": "/index.html",
      "ResponseCode": "200",
      "ErrorCachingMinTTL": 300
    }
  ] |
  .DefaultRootObject = "index.html"' > /tmp/cf-updated.json

# Update distribution
echo "🚀 Updating CloudFront distribution..."
aws cloudfront update-distribution \
  --id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --distribution-config file:///tmp/cf-updated.json \
  --if-match ${ETAG} > /tmp/cf-update-result.json

echo "✅ CloudFront distribution update initiated!"
echo ""
echo "⏳ CloudFront updates take 15-20 minutes to deploy"
echo "   After deployment, custom error responses will work"
echo ""

# Invalidate cache
echo "🔄 Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "✅ Cache invalidation created: ${INVALIDATION_ID}"
echo ""

# Clean up
rm -f /tmp/cf-current.json /tmp/cf-updated.json /tmp/cf-update-result.json

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Fix Applied!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "The issue is that CloudFront custom error responses need to be"
echo "re-applied. This update will ensure 404/403 errors return index.html"
echo ""
echo "Wait 15-20 minutes for CloudFront to deploy, then test again."

