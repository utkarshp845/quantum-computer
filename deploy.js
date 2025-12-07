#!/usr/bin/env node

/**
 * Quantum Entangler - AWS S3 Deployment Script (Node.js)
 * Usage: node deploy.js [--invalidate]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  S3_BUCKET: 'quantumlens-pandeylabs-com',  // Your S3 bucket name
  CLOUDFRONT_DISTRIBUTION_ID: '',  // Your CloudFront distribution ID (optional)
  AWS_REGION: 'us-east-1',  // Your AWS region
};

// Colors for output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf8',
      ...options 
    });
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'yellow');
    process.exit(1);
  }
}

function checkAwsCli() {
  try {
    execSync('aws --version', { stdio: 'pipe' });
  } catch (error) {
    log('⚠️  AWS CLI not found. Please install: https://aws.amazon.com/cli/', 'yellow');
    process.exit(1);
  }
}

function checkAwsCredentials() {
  try {
    execSync('aws sts get-caller-identity', { stdio: 'pipe' });
  } catch (error) {
    log('⚠️  AWS credentials not configured.', 'yellow');
    log('Please configure AWS credentials:', 'yellow');
    log('  aws configure', 'yellow');
    log('  OR', 'yellow');
    log('  export AWS_ACCESS_KEY_ID=your-key', 'yellow');
    log('  export AWS_SECRET_ACCESS_KEY=your-secret', 'yellow');
    process.exit(1);
  }
}

function build() {
  log('📦 Step 1: Building application...', 'blue');
  exec('npm run build');
  
  if (!fs.existsSync('dist')) {
    log('❌ Build failed: dist directory not found', 'yellow');
    process.exit(1);
  }
  
  log('✅ Build complete!', 'green');
}

function uploadToS3() {
  log(`☁️  Step 2: Uploading to S3 bucket: ${CONFIG.S3_BUCKET}`, 'blue');
  
  // Upload static assets with long cache
  exec(`aws s3 sync dist/ s3://${CONFIG.S3_BUCKET}/ \
    --region ${CONFIG.AWS_REGION} \
    --delete \
    --exact-timestamps \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" \
    --exclude "service-worker.js"`);
  
  // Upload HTML files with no cache
  exec(`aws s3 sync dist/ s3://${CONFIG.S3_BUCKET}/ \
    --region ${CONFIG.AWS_REGION} \
    --delete \
    --exact-timestamps \
    --cache-control "public, max-age=0, must-revalidate" \
    --include "*.html" \
    --include "service-worker.js"`);
  
  log('✅ Upload complete!', 'green');
}

function invalidateCloudFront() {
  if (!CONFIG.CLOUDFRONT_DISTRIBUTION_ID) {
    log('⚠️  CloudFront distribution ID not set. Skipping cache invalidation.', 'yellow');
    log('   Set CLOUDFRONT_DISTRIBUTION_ID in deploy.js to enable cache invalidation', 'yellow');
    return;
  }
  
  log('🔄 Step 3: Invalidating CloudFront cache...', 'blue');
  
  try {
    const output = execSync(
      `aws cloudfront create-invalidation \
        --distribution-id ${CONFIG.CLOUDFRONT_DISTRIBUTION_ID} \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text`,
      { encoding: 'utf8' }
    );
    
    const invalidationId = output.trim();
    log(`✅ Cache invalidation created: ${invalidationId}`, 'green');
    log('⏳ Cache invalidation takes 1-5 minutes to complete', 'yellow');
  } catch (error) {
    log(`⚠️  Cache invalidation failed: ${error.message}`, 'yellow');
  }
}

// Main deployment flow
function main() {
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('🚀 Quantum Entangler - AWS Deployment', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  console.log('');
  
  checkAwsCli();
  checkAwsCredentials();
  build();
  console.log('');
  uploadToS3();
  console.log('');
  invalidateCloudFront();
  console.log('');
  
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'green');
  log('✅ Deployment complete!', 'green');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'green');
  console.log('');
  log('Your application should be live at:', 'green');
  log('  https://quantumlens.pandeylabs.com', 'green');
  console.log('');
}

main();

