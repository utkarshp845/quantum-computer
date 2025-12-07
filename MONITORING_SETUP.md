# Monitoring & Reliability Setup Guide

## Quick Start

The application now includes built-in error tracking, analytics, and health monitoring. Here's how to set up full monitoring:

## 1. Error Tracking (Sentry - Recommended)

### Setup Sentry

1. **Create Sentry account**: https://sentry.io/signup/
2. **Create a project** for Quantum Lens
3. **Get your DSN**

### Install Sentry

```bash
npm install @sentry/react
```

### Configure Sentry

Add to `index.tsx`:
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.PROD ? "production" : "development",
  tracesSampleRate: 0.1, // 10% of transactions
});
```

### Update Error Tracker

Modify `utils/errorTracker.ts` to send to Sentry:
```typescript
import * as Sentry from "@sentry/react";

private async sendToTrackingService(error: ErrorContext) {
  Sentry.captureException(new Error(error.message), {
    extra: error,
  });
}
```

## 2. Analytics (Google Analytics 4)

### Setup Google Analytics

1. **Create GA4 property**: https://analytics.google.com/
2. **Get Measurement ID** (G-XXXXXXXXXX)

### Add to index.html

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Update Analytics Utility

Modify `utils/analytics.ts`:
```typescript
private async sendToAnalyticsService(event: AnalyticsEvent) {
  if (typeof gtag !== 'undefined') {
    gtag('event', event.event, event.properties);
  }
}
```

## 3. CloudWatch Monitoring (AWS)

### Create CloudWatch Dashboard

1. Go to CloudWatch Console
2. Create dashboard for Quantum Lens
3. Add metrics:
   - CloudFront requests
   - CloudFront errors (4xx, 5xx)
   - S3 requests
   - API Gateway calls (if using)

### Set Up Alarms

**High Error Rate Alarm:**
- Metric: CloudFront 4xx errors
- Threshold: > 10 errors/minute
- Action: Send SNS notification

**High Cost Alarm:**
- Metric: OpenRouter API costs
- Threshold: > $10/day
- Action: Email alert

## 4. Cost Monitoring

### OpenRouter Dashboard

1. Monitor usage: https://openrouter.ai/activity
2. Set up alerts for:
   - Daily spend > $5
   - Unusual API usage
   - Rate limit hits

### AWS Cost Explorer

1. Set up budget alerts
2. Monitor S3 + CloudFront costs
3. Alert if monthly cost > $10

## 5. Health Check Endpoint

The app includes a health checker. To expose it:

### Option A: Add to S3 (Static)

Create `health.html`:
```html
<!DOCTYPE html>
<html>
<body>
  <script>
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        document.body.innerHTML = JSON.stringify(data, null, 2);
      });
  </script>
</body>
</html>
```

### Option B: API Gateway (Dynamic)

Create Lambda function to return health status:
```javascript
exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'healthy',
      timestamp: Date.now(),
    }),
  };
};
```

## 6. Performance Monitoring

### Web Vitals

Add to `index.tsx`:
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## 7. User Feedback System

### Add Feedback Button

Add to UI:
```typescript
const [showFeedback, setShowFeedback] = useState(false);

// Feedback form component
// Collect: rating, comment, user email (optional)
// Send to: Your backend or email service
```

## Monitoring Checklist

- [ ] Error tracking configured (Sentry or custom)
- [ ] Analytics set up (GA4 or custom)
- [ ] CloudWatch alarms configured
- [ ] Cost alerts set up
- [ ] Health check endpoint accessible
- [ ] Performance monitoring active
- [ ] Error logging working
- [ ] User feedback system (optional)

## Key Metrics to Monitor

1. **Error Rate**: < 1% of requests
2. **API Success Rate**: > 95%
3. **Average Response Time**: < 3 seconds
4. **Daily Active Users**: Track growth
5. **Cost per User**: Monitor efficiency
6. **Feature Usage**: Which features are popular?

## Alerts to Set Up

1. **Critical**: Error rate > 5%
2. **Warning**: API response time > 5s
3. **Info**: Daily cost > $5
4. **Warning**: Unusual traffic spike
5. **Critical**: Service down

## Cost Optimization Tips

1. **Use free tier models** when possible
2. **Cache AI responses** for similar queries
3. **Monitor and optimize** API usage
4. **Set rate limits** to prevent abuse
5. **Use CloudFront caching** effectively

