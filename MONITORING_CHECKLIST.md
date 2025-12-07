# Monitoring Setup Checklist

Use this checklist to set up monitoring for Quantum Lens.

## ✅ Pre-Setup Verification

- [ ] Application is deployed and working
- [ ] All tests passing (44/44)
- [ ] Build successful
- [ ] Site accessible at https://quantumlens.pandeylabs.com

## 📊 Step 1: Sentry (Error Tracking)

- [ ] Create Sentry account at https://sentry.io/signup/
- [ ] Create new project (JavaScript → React)
- [ ] Copy DSN
- [ ] Install: `npm install @sentry/react`
- [ ] Add Sentry.init() to index.tsx
- [ ] Update errorTracker.ts to use Sentry
- [ ] Test error tracking (trigger a test error)
- [ ] Verify errors appear in Sentry dashboard
- [ ] Set up email alerts in Sentry
- [ ] Deploy: `npm run deploy`

**Time: 5 minutes**

## 📈 Step 2: Google Analytics (Usage Tracking)

- [ ] Create Google Analytics account at https://analytics.google.com/
- [ ] Create GA4 property
- [ ] Copy Measurement ID (G-XXXXXXXXXX)
- [ ] Add GA script to index.html
- [ ] Update analytics.ts to use gtag
- [ ] Test analytics (create a node, check GA realtime)
- [ ] Verify events appear in GA dashboard
- [ ] Deploy: `npm run deploy`

**Time: 3 minutes**

## ☁️ Step 3: CloudWatch (AWS Monitoring)

- [ ] Go to AWS Console → CloudWatch
- [ ] Create dashboard: "Quantum Lens"
- [ ] Add CloudFront metrics (4xxErrorRate, 5xxErrorRate, Requests)
- [ ] Add S3 metrics (NumberOfObjects)
- [ ] Create alarm for high error rate
- [ ] Create SNS topic for alerts
- [ ] Subscribe email to SNS topic
- [ ] Test alarm (verify email received)
- [ ] Set up cost budget alert

**Time: 2 minutes**

## 🔔 Step 4: Alerts Configuration

- [ ] Sentry: Configure alert rules (new issues, error spikes)
- [ ] CloudWatch: Set up email/SMS alerts
- [ ] OpenRouter: Monitor API usage dashboard
- [ ] AWS: Set up billing alerts

**Time: 5 minutes**

## 📋 Step 5: Verification

- [ ] Trigger test error → Verify Sentry receives it
- [ ] Use app → Verify GA tracks events
- [ ] Check CloudWatch → Verify metrics appear
- [ ] Test alerts → Verify notifications work
- [ ] Review dashboards → All data visible

**Time: 5 minutes**

## 📊 Step 6: Regular Monitoring

### Daily
- [ ] Check Sentry for new errors
- [ ] Review GA realtime users
- [ ] Check CloudWatch alarms

### Weekly
- [ ] Review error trends in Sentry
- [ ] Analyze user behavior in GA
- [ ] Review CloudWatch metrics
- [ ] Check API costs in OpenRouter

### Monthly
- [ ] Review error patterns
- [ ] Analyze feature usage
- [ ] Optimize based on metrics
- [ ] Review costs and optimize

---

## 🎯 Success Criteria

✅ Errors are tracked in Sentry
✅ User actions tracked in GA
✅ CloudWatch shows metrics
✅ Alerts are configured
✅ Dashboards are set up
✅ Regular monitoring schedule established

---

**Total Setup Time: ~20 minutes**
**Ongoing: 5-10 minutes/week for review**

