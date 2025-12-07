# AWS Deployment Guide

Complete guide for deploying Quantum Lens to AWS using S3, CloudFront, Route 53, and ACM.

## Prerequisites

1. **AWS Account** - Sign up at https://aws.amazon.com
2. **AWS CLI** - Install from https://aws.amazon.com/cli/
3. **Domain** - You own a domain (e.g., `pandeylabs.com`)
4. **AWS Credentials** - Configured via `aws configure` or environment variables

## Method 1: Using Deployment Script (Recommended)

### Option A: Bash Script

1. **Make script executable:**
   ```bash
   chmod +x deploy.sh
   ```

2. **Edit configuration in `deploy.sh`:**
   ```bash
   S3_BUCKET="quantumlens-pandeylabs-com"  # Your bucket name
   CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"  # Optional: Your CloudFront ID
   AWS_REGION="us-east-1"
   ```

3. **Run deployment:**
   ```bash
   ./deploy.sh
   ```

### Option B: Node.js Script

1. **Edit configuration in `deploy.js`:**
   ```javascript
   const CONFIG = {
     S3_BUCKET: 'quantumlens-pandeylabs-com',
     CLOUDFRONT_DISTRIBUTION_ID: 'E1234567890ABC',  // Optional
     AWS_REGION: 'us-east-1',
   };
   ```

2. **Run deployment:**
   ```bash
   node deploy.js
   ```

## Method 2: Manual Upload via AWS Console

1. **Build your application:**
   ```bash
   npm run build
   ```

2. **Go to AWS S3 Console:**
   - Navigate to https://s3.console.aws.amazon.com
   - Select your bucket: `quantumlens-pandeylabs-com`

3. **Upload files:**
   - Click "Upload"
   - Click "Add files" or drag and drop
   - Select all files from the `dist/` folder
   - Click "Upload"

4. **Set permissions:**
   - After upload, select all files
   - Click "Actions" → "Make public" (if using S3 website hosting)
   - OR use bucket policy (recommended for CloudFront)

## Method 3: AWS CLI Commands (Manual)

### Step 1: Build
```bash
npm run build
```

### Step 2: Upload to S3
```bash
# Upload all files with appropriate cache headers
aws s3 sync dist/ s3://quantumlens-pandeylabs-com/ \
  --region us-east-1 \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html"

# Upload HTML files with no cache (for SPA routing)
aws s3 sync dist/ s3://quantumlens-pandeylabs-com/ \
  --region us-east-1 \
  --cache-control "public, max-age=0, must-revalidate" \
  --include "*.html"
```

### Step 3: Invalidate CloudFront Cache (if using CloudFront)
```bash
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

## Complete AWS Setup

### Step 1: Create S3 Bucket

```bash
aws s3 mb s3://quantumlens-pandeylabs-com --region us-east-1
```

### Step 2: Configure S3 Bucket Policy

Create a bucket policy that allows CloudFront Origin Access Control (OAC) to read files:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::quantumlens-pandeylabs-com/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

### Step 3: Create CloudFront Distribution

1. Go to CloudFront Console
2. Create distribution
3. Origin: Your S3 bucket
4. Viewer protocol: Redirect HTTP to HTTPS
5. Default root object: `index.html`
6. Custom error responses:
   - 403 → `/index.html` (200)
   - 404 → `/index.html` (200)

### Step 4: Request ACM Certificate

```bash
aws acm request-certificate \
  --domain-name "*.pandeylabs.com" \
  --validation-method DNS \
  --region us-east-1
```

Add the DNS validation records to Route 53 or your DNS provider.

### Step 5: Configure CloudFront with Custom Domain

1. Update CloudFront distribution
2. Add alternate domain name: `quantumlens.pandeylabs.com`
3. Select your ACM certificate
4. SSL support method: SNI-only

### Step 6: Create Route 53 DNS Record

```bash
# Create A record (alias) pointing to CloudFront
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID \
  --change-batch file://dns-record.json
```

DNS record JSON:
```json
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "quantumlens.pandeylabs.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "YOUR-CLOUDFRONT-DOMAIN.cloudfront.net",
        "EvaluateTargetHealth": false
      }
    }
  }]
}
```

### Step 7: Deploy Your Application

```bash
npm run deploy
```

This will:
1. Build your application
2. Upload to S3
3. Invalidate CloudFront cache

### Step 8: Verify Deployment

```bash
npm run verify
```

Or test manually:
```bash
npm run test:deploy
```

## Verification & Testing

### Verify AWS Resources

```bash
npm run verify
```

This checks:
- ✅ S3 bucket and files
- ✅ CloudFront distribution
- ✅ SSL certificate
- ✅ DNS configuration
- ✅ Website accessibility

### Test Deployment

```bash
npm run test:deploy
```

### Monitor CloudFront Status

```bash
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID --query 'Distribution.Status'
```

Wait for status: `Deployed` (takes 15-20 minutes after updates)

## Configuration

### AWS Credentials Setup

**Option A: AWS Configure (Recommended)**
```bash
aws configure
```
Enter:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Default output format: `json`

**Option B: Environment Variables**
```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

**Option C: IAM Role (for EC2/ECS)**
If deploying from AWS infrastructure, use IAM roles instead of credentials.

## Cache Headers Explained

The deployment scripts set different cache headers:

- **Static assets** (JS, CSS, images): `max-age=31536000` (1 year)
  - These files are hashed by Vite, so they can be cached forever
  - When you update, new filenames are generated

- **HTML files**: `max-age=0, must-revalidate`
  - HTML must always be fresh for SPA routing to work
  - CloudFront will check for updates on every request

## Troubleshooting

### Error: "Access Denied"
- Check IAM permissions for S3 bucket access
- Verify bucket policy allows your IAM user/role
- Ensure bucket name is correct

### Error: "Bucket not found"
- Verify bucket name matches exactly (case-sensitive)
- Check AWS region is correct
- Ensure bucket exists in your AWS account

### Files not updating
- Invalidate CloudFront cache: `aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"`
- Check cache headers are set correctly
- Verify files were actually uploaded (check S3 console)

### Build fails
- Run `npm install` first
- Check Node.js version (requires Node 18+)
- Verify all dependencies are installed

## Next Steps

After uploading:
1. Verify files in S3 console
2. Test CloudFront distribution (if configured)
3. Check DNS is pointing to CloudFront
4. Test the live site: https://quantumlens.pandeylabs.com

## Cost Optimization Tips

- Use `--delete` flag to remove old files (saves storage costs)
- Enable S3 lifecycle policies to archive old versions
- Use CloudFront caching to reduce S3 requests
- Monitor usage in AWS Cost Explorer

