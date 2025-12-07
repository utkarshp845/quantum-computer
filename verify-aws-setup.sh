#!/bin/bash

# Quantum Entangler - AWS Setup Verification Script
# This script verifies all AWS resources are properly configured

set -e

# Configuration - UPDATE THESE VALUES
S3_BUCKET="quantumlens-pandeylabs-com"
CLOUDFRONT_DISTRIBUTION_ID="E8YG1H9JN5X2D"
DOMAIN_NAME="quantumlens.pandeylabs.com"
AWS_REGION="us-east-1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS="${GREEN}✅${NC}"
FAIL="${RED}❌${NC}"
WARN="${YELLOW}⚠️${NC}"
INFO="${BLUE}ℹ️${NC}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 AWS Setup Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${FAIL} AWS CLI not installed"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${FAIL} AWS credentials not configured"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${INFO} AWS Account ID: ${ACCOUNT_ID}"
echo ""

# Track issues
ISSUES=0

# 1. Check S3 Bucket
echo -e "${BLUE}📦 Checking S3 Bucket...${NC}"
if aws s3 ls "s3://${S3_BUCKET}" &> /dev/null; then
    echo -e "${PASS} S3 bucket exists: ${S3_BUCKET}"
    
    # Check bucket region
    BUCKET_REGION=$(aws s3api get-bucket-location --bucket ${S3_BUCKET} --query LocationConstraint --output text)
    if [ "$BUCKET_REGION" == "None" ] || [ "$BUCKET_REGION" == "us-east-1" ]; then
        echo -e "${PASS} Bucket region: us-east-1"
    else
        echo -e "${WARN} Bucket region: ${BUCKET_REGION} (expected us-east-1)"
    fi
    
    # Check if bucket has files
    FILE_COUNT=$(aws s3 ls "s3://${S3_BUCKET}/" --recursive | wc -l | tr -d ' ')
    if [ "$FILE_COUNT" -gt 0 ]; then
        echo -e "${PASS} Bucket contains ${FILE_COUNT} files"
    else
        echo -e "${WARN} Bucket is empty - run 'npm run deploy' to upload files"
        ISSUES=$((ISSUES + 1))
    fi
    
    # Check bucket policy
    BUCKET_POLICY=$(aws s3api get-bucket-policy --bucket ${S3_BUCKET} 2>/dev/null || echo "")
    if [ -z "$BUCKET_POLICY" ]; then
        echo -e "${WARN} No bucket policy found (may be using OAC/OAI)"
    else
        echo -e "${PASS} Bucket policy exists"
    fi
else
    echo -e "${FAIL} S3 bucket does not exist: ${S3_BUCKET}"
    echo -e "${INFO} Create it with: aws s3 mb s3://${S3_BUCKET} --region ${AWS_REGION}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 2. Check CloudFront Distribution
echo -e "${BLUE}☁️  Checking CloudFront Distribution...${NC}"
if aws cloudfront get-distribution --id ${CLOUDFRONT_DISTRIBUTION_ID} &> /dev/null; then
    echo -e "${PASS} CloudFront distribution exists: ${CLOUDFRONT_DISTRIBUTION_ID}"
    
    DIST_STATUS=$(aws cloudfront get-distribution --id ${CLOUDFRONT_DISTRIBUTION_ID} --query 'Distribution.Status' --output text)
    if [ "$DIST_STATUS" == "Deployed" ]; then
        echo -e "${PASS} Distribution status: Deployed"
    else
        echo -e "${WARN} Distribution status: ${DIST_STATUS}"
    fi
    
    # Get CloudFront domain
    CF_DOMAIN=$(aws cloudfront get-distribution --id ${CLOUDFRONT_DISTRIBUTION_ID} --query 'Distribution.DomainName' --output text)
    echo -e "${INFO} CloudFront domain: ${CF_DOMAIN}"
    
    # Check if S3 is the origin
    ORIGIN_DOMAIN=$(aws cloudfront get-distribution --id ${CLOUDFRONT_DISTRIBUTION_ID} --query 'Distribution.DistributionConfig.Origins.Items[0].DomainName' --output text)
    if [[ "$ORIGIN_DOMAIN" == *"${S3_BUCKET}"* ]]; then
        echo -e "${PASS} Origin points to S3 bucket"
    else
        echo -e "${WARN} Origin: ${ORIGIN_DOMAIN}"
    fi
    
    # Check custom domain
    ALIASES=$(aws cloudfront get-distribution --id ${CLOUDFRONT_DISTRIBUTION_ID} --query 'Distribution.DistributionConfig.Aliases.Items' --output text)
    if [[ "$ALIASES" == *"${DOMAIN_NAME}"* ]]; then
        echo -e "${PASS} Custom domain configured: ${DOMAIN_NAME}"
    else
        echo -e "${WARN} Custom domain not found in aliases"
        echo -e "${INFO} Current aliases: ${ALIASES}"
        ISSUES=$((ISSUES + 1))
    fi
    
    # Check SSL certificate
    CERT_ARN=$(aws cloudfront get-distribution --id ${CLOUDFRONT_DISTRIBUTION_ID} --query 'Distribution.DistributionConfig.ViewerCertificate.ACMCertificateArn' --output text)
    if [ "$CERT_ARN" != "None" ] && [ ! -z "$CERT_ARN" ]; then
        echo -e "${PASS} SSL certificate configured"
        
        # Check certificate status
        CERT_STATUS=$(aws acm describe-certificate --certificate-arn "$CERT_ARN" --region us-east-1 --query 'Certificate.Status' --output text 2>/dev/null || echo "Unknown")
        if [ "$CERT_STATUS" == "ISSUED" ]; then
            echo -e "${PASS} Certificate status: Issued"
        else
            echo -e "${WARN} Certificate status: ${CERT_STATUS}"
            ISSUES=$((ISSUES + 1))
        fi
    else
        echo -e "${FAIL} SSL certificate not configured"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${FAIL} CloudFront distribution does not exist: ${CLOUDFRONT_DISTRIBUTION_ID}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 3. Check Route 53
echo -e "${BLUE}🌐 Checking Route 53 DNS...${NC}"
HOSTED_ZONE=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='pandeylabs.com.']" --output text)
if [ ! -z "$HOSTED_ZONE" ]; then
    ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='pandeylabs.com.'].Id" --output text | cut -d'/' -f3)
    echo -e "${PASS} Route 53 hosted zone found: ${ZONE_ID}"
    
    # Check for A record
    RECORD=$(aws route53 list-resource-record-sets --hosted-zone-id ${ZONE_ID} --query "ResourceRecordSets[?Name=='${DOMAIN_NAME}.']" --output json)
    if [ "$RECORD" != "[]" ]; then
        RECORD_TYPE=$(echo $RECORD | jq -r '.[0].Type')
        if [ "$RECORD_TYPE" == "A" ]; then
            ALIAS_TARGET=$(echo $RECORD | jq -r '.[0].AliasTarget.DNSName' 2>/dev/null || echo "")
            if [[ "$ALIAS_TARGET" == *"cloudfront"* ]]; then
                echo -e "${PASS} A record (alias) configured for ${DOMAIN_NAME}"
            else
                echo -e "${WARN} A record exists but may not point to CloudFront"
            fi
        else
            echo -e "${WARN} Record type: ${RECORD_TYPE} (expected A)"
        fi
    else
        echo -e "${FAIL} No DNS record found for ${DOMAIN_NAME}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${WARN} Route 53 hosted zone not found for pandeylabs.com"
    echo -e "${INFO} DNS may be managed by GoDaddy - check CNAME record there"
fi
echo ""

# 4. Check ACM Certificate
echo -e "${BLUE}🔒 Checking SSL Certificate...${NC}"
CERT_ARN=$(aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='${DOMAIN_NAME}'].CertificateArn" --output text)
if [ ! -z "$CERT_ARN" ]; then
    echo -e "${PASS} ACM certificate found for ${DOMAIN_NAME}"
    CERT_STATUS=$(aws acm describe-certificate --certificate-arn "$CERT_ARN" --region us-east-1 --query 'Certificate.Status' --output text)
    if [ "$CERT_STATUS" == "ISSUED" ]; then
        echo -e "${PASS} Certificate status: Issued"
    else
        echo -e "${WARN} Certificate status: ${CERT_STATUS}"
        if [ "$CERT_STATUS" == "PENDING_VALIDATION" ]; then
            echo -e "${INFO} Certificate is pending validation - check DNS records"
        fi
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${WARN} ACM certificate not found for ${DOMAIN_NAME}"
    echo -e "${INFO} Create one in ACM (us-east-1 region) and validate via DNS"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 5. Test Website
echo -e "${BLUE}🌍 Testing Website...${NC}"
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN_NAME}" --max-time 10 || echo "000")
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${PASS} Website is accessible: https://${DOMAIN_NAME}"
    elif [ "$HTTP_CODE" == "000" ]; then
        echo -e "${WARN} Could not connect to website (may be DNS propagation)"
    else
        echo -e "${WARN} Website returned HTTP ${HTTP_CODE}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${INFO} curl not available - skipping website test"
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Your deployment looks good.${NC}"
else
    echo -e "${YELLOW}⚠️  Found ${ISSUES} issue(s) that need attention.${NC}"
    echo -e "${INFO} Review the warnings above and fix any issues.${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

exit $ISSUES

