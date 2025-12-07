# Quick Monitoring Guide - How to Track Your Application

This guide shows you exactly how to monitor Quantum Lens in production.

## 🎯 What You Can Monitor

### Built-in Monitoring (Already Active)
- ✅ **Error Tracking** - All errors are logged automatically
- ✅ **Analytics** - User actions are tracked
- ✅ **Health Checks** - API connectivity monitored
- ✅ **Circuit Breaker** - Prevents API abuse

### External Services (Optional but Recommended)
- 📊 **Sentry** - Real-time error tracking with alerts
- 📈 **Google Analytics** - User behavior and usage stats
- ☁️ **CloudWatch** - AWS infrastructure monitoring

---

## 🚀 Quick Start: Set Up Monitoring in 10 Minutes

### Step 1: Set Up Sentry (Error Tracking) - 5 minutes

**Why Sentry?**
- Get instant alerts when errors occur
- See full error stack traces
- Track error frequency and impact
- Free tier: 5,000 events/month

**Setup:**

1. **Create Sentry Account**
   ```bash
   # Go to: https://sentry.io/signup/
   # Sign up (free)
   ```

2. **Create a Project**
   - Project Type: **JavaScript**
   - Framework: **React**
   - Get your **DSN** (looks like: `https://xxx@xxx.ingest.sentry.io/xxx`)

3. **Install Sentry**
   ```bash
   npm install @sentry/react
   ```

4. **Add to `index.tsx`** (at the top, before React imports):
   ```typescript
   import * as Sentry from "@sentry/react";

   Sentry.init({
     dsn: "YOUR_SENTRY_DSN_HERE",
     environment: import.meta.env.PROD ? "production" : "development",
     tracesSampleRate: 0.1, // 10% of transactions
     beforeSend(event) {
       // Don't send errors in development
       if (import.meta.env.DEV) return null;
       return event;
     },
   });
   ```

5. **Update `utils/errorTracker.ts`**:
   ```typescript
   import * as Sentry from "@sentry/react";

   private async sendToTrackingService(error: ErrorContext) {
     Sentry.captureException(new Error(error.message), {
       extra: error,
       tags: {
         component: 'errorTracker',
       },
     });
   }
   ```

6. **Deploy**
   ```bash
   npm run deploy
   ```

**What You'll See:**
- Real-time error dashboard
- Error alerts via email/Slack
- Stack traces with context
- Error frequency graphs

---

### Step 2: Set Up Google Analytics (Usage Tracking) - 3 minutes

**Why Google Analytics?**
- Track user behavior
- See which features are popular
- Monitor user sessions
- Free and privacy-friendly

**Setup:**

1. **Create GA4 Property**
   ```bash
   # Go to: https://analytics.google.com/
   # Create account → Create property → Get Measurement ID
   # Format: G-XXXXXXXXXX
   ```

2. **Add to `index.html`** (in the `<head>` section, before closing `</head>`):
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

3. **Update `utils/analytics.ts`**:
   ```typescript
   private async sendToAnalyticsService(event: AnalyticsEvent) {
     // Send to Google Analytics
     if (typeof window !== 'undefined' && (window as any).gtag) {
       (window as any).gtag('event', event.event, event.properties);
     }
   }
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

**What You'll See:**
- Real-time user count
- Page views and sessions
- Custom events (node creation, API calls, etc.)
- User demographics and behavior

---

### Step 3: Set Up CloudWatch Alarms (AWS Monitoring) - 2 minutes

**Why CloudWatch?**
- Monitor AWS infrastructure
- Get alerts for high error rates
- Track CloudFront performance
- Monitor costs

**Setup:**

1. **Create CloudWatch Dashboard**
   ```bash
   # Go to: AWS Console → CloudWatch → Dashboards
   # Create dashboard: "Quantum Lens"
   ```

2. **Add Metrics:**
   - CloudFront → 4xxErrorRate
   - CloudFront → 5xxErrorRate
   - CloudFront → Requests
   - S3 → NumberOfObjects

3. **Create Alarms:**
   ```bash
   # Alarm 1: High Error Rate
   aws cloudwatch put-metric-alarm \
     --alarm-name quantumlens-high-errors \
     --alarm-description "Alert when error rate is high" \
     --metric-name 4xxErrorRate \
     --namespace AWS/CloudFront \
     --statistic Sum \
     --period 300 \
     --threshold 10 \
     --comparison-operator GreaterThanThreshold \
     --evaluation-periods 1
   ```

4. **Set Up SNS for Alerts:**
   ```bash
   # Create SNS topic
   aws sns create-topic --name quantumlens-alerts
   
   # Subscribe your email
   aws sns subscribe \
     --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:quantumlens-alerts \
     --protocol email \
     --notification-endpoint your-email@example.com
   ```

**What You'll See:**
- Real-time CloudFront metrics
- Error rate alerts
- Cost tracking
- Performance graphs

---

## 📊 What Gets Tracked Automatically

### Errors Tracked
- ✅ API call failures
- ✅ Network errors
- ✅ JavaScript runtime errors
- ✅ Unhandled promise rejections
- ✅ User-facing errors

### Analytics Tracked
- ✅ Node creation (by type)
- ✅ Gate applications (H, X, Y, Z)
- ✅ Entanglement creation
- ✅ Compute Reality calls (success/failure)
- ✅ API call duration and retry counts
- ✅ App load events

### Health Metrics
- ✅ API connectivity status
- ✅ localStorage availability
- ✅ Circuit breaker state
- ✅ Rate limit status

---

## 🔍 How to View Your Data

### Sentry Dashboard
1. Go to https://sentry.io/
2. Select your project
3. View:
   - **Issues** - All errors
   - **Performance** - Response times
   - **Releases** - Deployment tracking

### Google Analytics Dashboard
1. Go to https://analytics.google.com/
2. Select your property
3. View:
   - **Realtime** - Current users
   - **Events** - Custom events (node_created, compute_reality, etc.)
   - **Audience** - User demographics

### CloudWatch Dashboard
1. Go to AWS Console → CloudWatch
2. View:
   - **Dashboards** - Custom metrics
   - **Alarms** - Active alerts
   - **Logs** - Application logs (if configured)

---

## 🚨 Setting Up Alerts

### Sentry Alerts
1. Go to Sentry → Settings → Alerts
2. Create alert rules:
   - **New Issue** - Alert on any new error
   - **Error Spike** - Alert when errors increase
   - **High Volume** - Alert on error frequency

### CloudWatch Alarms
```bash
# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name quantumlens-errors \
  --metric-name 4xxErrorRate \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold

# Cost alarm
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json
```

---

## 💰 Cost Breakdown

### Free Tier
- **Sentry**: 5,000 events/month (free)
- **Google Analytics**: Unlimited (free)
- **CloudWatch**: 10 custom metrics (free)

### Paid (if you exceed free tier)
- **Sentry**: $26/month for 50K events
- **CloudWatch**: ~$0.50/month for additional metrics
- **Total**: ~$0.50-26/month depending on usage

---

## 📈 Key Metrics to Watch

### Critical Metrics
1. **Error Rate**: Should be < 1%
2. **API Success Rate**: Should be > 95%
3. **Average Response Time**: Should be < 3 seconds
4. **Daily Active Users**: Track growth

### Cost Metrics
1. **API Calls per Day**: Monitor usage
2. **Cost per User**: Track efficiency
3. **Monthly AWS Costs**: Budget tracking

---

## 🛠️ Troubleshooting

### Sentry Not Working?
- Check DSN is correct
- Verify Sentry.init() is called before React renders
- Check browser console for errors

### Google Analytics Not Working?
- Verify Measurement ID is correct
- Check gtag is loaded (Network tab)
- Use GA Debugger extension

### CloudWatch No Data?
- Wait 5-10 minutes for metrics to appear
- Check CloudFront distribution is active
- Verify metrics are enabled

---

## 🎯 Next Steps

1. **Set up Sentry** (5 min) - Get error alerts
2. **Set up Google Analytics** (3 min) - Track usage
3. **Set up CloudWatch** (2 min) - Monitor infrastructure
4. **Create alerts** - Get notified of issues
5. **Review weekly** - Check metrics and optimize

---

## 📞 Need Help?

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/react/
- **GA4 Docs**: https://developers.google.com/analytics/devguides/collection/ga4
- **CloudWatch Docs**: https://docs.aws.amazon.com/cloudwatch/

---

**Total Setup Time: ~10 minutes**
**Monthly Cost: $0 (free tier) to ~$26 (if needed)**

