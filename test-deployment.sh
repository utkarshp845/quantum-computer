#!/bin/bash

# Comprehensive Deployment Testing Script

set -e

CLOUDFRONT_DISTRIBUTION_ID="E8YG1H9JN5X2D"
DOMAIN_NAME="quantumlens.pandeylabs.com"
S3_BUCKET="quantumlens-pandeylabs-com"

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
echo -e "${BLUE}🧪 Comprehensive Deployment Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ISSUES=0

# 1. Check CloudFront Status
echo -e "${BLUE}1. CloudFront Distribution${NC}"
CF_STATUS=$(aws cloudfront get-distribution --id ${CLOUDFRONT_DISTRIBUTION_ID} --query 'Distribution.Status' --output text)
if [ "$CF_STATUS" == "Deployed" ]; then
    echo -e "${PASS} Status: Deployed"
else
    echo -e "${WARN} Status: ${CF_STATUS} (may take 15-20 minutes)"
    if [ "$CF_STATUS" != "InProgress" ]; then
        ISSUES=$((ISSUES + 1))
    fi
fi

CF_DOMAIN=$(aws cloudfront get-distribution --id ${CLOUDFRONT_DISTRIBUTION_ID} --query 'Distribution.DomainName' --output text)
echo -e "${INFO} Domain: ${CF_DOMAIN}"

CF_ALIASES=$(aws cloudfront get-distribution --id ${CLOUDFRONT_DISTRIBUTION_ID} --query 'Distribution.DistributionConfig.Aliases.Items' --output text)
if [[ "$CF_ALIASES" == *"${DOMAIN_NAME}"* ]]; then
    echo -e "${PASS} Custom domain configured: ${DOMAIN_NAME}"
else
    echo -e "${FAIL} Custom domain not configured"
    ISSUES=$((ISSUES + 1))
fi

CF_CERT=$(aws cloudfront get-distribution --id ${CLOUDFRONT_DISTRIBUTION_ID} --query 'Distribution.DistributionConfig.ViewerCertificate.ACMCertificateArn' --output text)
if [ "$CF_CERT" != "None" ] && [ ! -z "$CF_CERT" ]; then
    echo -e "${PASS} SSL certificate configured"
else
    echo -e "${FAIL} SSL certificate not configured"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 2. Check DNS
echo -e "${BLUE}2. DNS Configuration${NC}"
ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='pandeylabs.com.'].Id" --output text | head -1 | cut -d'/' -f3)
if [ ! -z "$ZONE_ID" ]; then
    DNS_RECORD=$(aws route53 list-resource-record-sets --hosted-zone-id ${ZONE_ID} --query "ResourceRecordSets[?Name=='${DOMAIN_NAME}.']" --output json)
    if [ "$DNS_RECORD" != "[]" ]; then
        echo -e "${PASS} DNS record exists"
        DNS_TYPE=$(echo $DNS_RECORD | jq -r '.[0].Type')
        echo -e "${INFO} Record type: ${DNS_TYPE}"
    else
        echo -e "${FAIL} DNS record not found"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${WARN} Route 53 hosted zone not found (may be using GoDaddy)"
fi
echo ""

# 3. Test CloudFront Domain
echo -e "${BLUE}3. Testing CloudFront Domain${NC}"
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${CF_DOMAIN}" --max-time 10 || echo "000")
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${PASS} CloudFront domain accessible: https://${CF_DOMAIN}"
    else
        echo -e "${WARN} CloudFront returned HTTP ${HTTP_CODE}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${INFO} curl not available - skipping"
fi
echo ""

# 4. Test Custom Domain
echo -e "${BLUE}4. Testing Custom Domain${NC}"
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN_NAME}" --max-time 10 || echo "000")
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${PASS} Custom domain accessible: https://${DOMAIN_NAME}"
    elif [ "$HTTP_CODE" == "000" ]; then
        echo -e "${WARN} DNS not propagated yet (wait 1-5 minutes)"
        echo -e "${INFO} Try: dig ${DOMAIN_NAME}"
    else
        echo -e "${WARN} Custom domain returned HTTP ${HTTP_CODE}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${INFO} curl not available - skipping"
fi
echo ""

# 5. Check S3 Files
echo -e "${BLUE}5. S3 Bucket${NC}"
FILE_COUNT=$(aws s3 ls "s3://${S3_BUCKET}/" --recursive 2>/dev/null | wc -l | tr -d ' ')
if [ "$FILE_COUNT" -gt 0 ]; then
    echo -e "${PASS} ${FILE_COUNT} files in S3 bucket"
else
    echo -e "${FAIL} S3 bucket is empty"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 6. Test SSL Certificate
echo -e "${BLUE}6. SSL Certificate${NC}"
if command -v openssl &> /dev/null && [ "$HTTP_CODE" == "200" ]; then
    CERT_INFO=$(echo | openssl s_client -servername ${DOMAIN_NAME} -connect ${DOMAIN_NAME}:443 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null || echo "")
    if [ ! -z "$CERT_INFO" ]; then
        echo -e "${PASS} SSL certificate is valid"
        echo "$CERT_INFO" | grep "subject=" | sed 's/^/   /'
    else
        echo -e "${WARN} Could not verify SSL certificate"
    fi
else
    echo -e "${INFO} openssl not available - skipping SSL test"
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo -e "${GREEN}🎉 Your site should be live at: https://${DOMAIN_NAME}${NC}"
else
    echo -e "${YELLOW}⚠️  Found ${ISSUES} issue(s)${NC}"
    if [ "$CF_STATUS" == "InProgress" ]; then
        echo -e "${INFO} CloudFront is still deploying (15-20 minutes)"
    fi
    if [ "$HTTP_CODE" == "000" ]; then
        echo -e "${INFO} DNS may still be propagating (1-5 minutes)"
    fi
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

exit $ISSUES

