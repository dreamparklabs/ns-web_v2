# Complete Analytics & Monitoring Setup Guide

This guide covers all analytics, monitoring, and feedback tools integrated into Northstar.

## 🎯 Overview

The following services are integrated:
- ✅ **PostHog** - Product analytics, session recordings, feature flags
- ✅ **PostHog LLM Analytics** - AI/LLM usage tracking
- ✅ **Google Tag Manager** - Tag management and tracking
- ✅ **Google Analytics 4** - Web analytics
- ✅ **Vercel Analytics** - Web vitals and performance
- ✅ **Sentry** - Error tracking and monitoring
- ✅ **Canny** - User feedback and feature requests

---

## 📋 Environment Variables

### Required for Development

Add these to your `.env.local` file:

```bash
# PostHog Analytics (Required)
VITE_PUBLIC_POSTHOG_KEY=phc_your_project_key_here
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# PostHog Server-Side (for LLM tracking in Convex)
POSTHOG_API_KEY=phc_your_project_key_here
POSTHOG_HOST=https://us.i.posthog.com

# Google Tag Manager (Optional)
VITE_GTM_ID=GTM-XXXXXXX

# Google Analytics 4 (Optional)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Sentry Error Tracking (Configured!)
VITE_SENTRY_DSN=https://2aa77dfb0c728fb2f3234f3b74e79bb5@o4510134148202496.ingest.us.sentry.io/4510134150496256

# Canny Feedback Widget (Optional)
VITE_CANNY_APP_ID=your_canny_app_id

# Gemini API (for AI parsing with LLM tracking)
GEMINI_API_KEY=your_gemini_api_key_here
```

### Required for Production (Vercel/Convex)

Set these in:
- **Vercel Dashboard** → Project Settings → Environment Variables
- **Convex Dashboard** → Project Settings → Environment Variables

---

## 🔧 Service Setup Instructions

### 1. PostHog (Product Analytics)

#### Setup:
1. Go to [PostHog](https://posthog.com) and create an account
2. Create a new project
3. Copy your **Project API Key** and **Host URL**
4. Add to `.env.local`:
   ```bash
   VITE_PUBLIC_POSTHOG_KEY=phc_...
   VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   
   # For server-side (Convex)
   POSTHOG_API_KEY=phc_...
   POSTHOG_HOST=https://us.i.posthog.com
   ```

#### Features Enabled:
- ✅ Autocapture (clicks, form submissions, page changes)
- ✅ Session recordings (with privacy masking)
- ✅ User identification
- ✅ Custom event tracking
- ✅ Page view tracking
- ✅ LLM/AI usage tracking

#### Verify:
```bash
npm run dev
# Open browser console and check for:
# "✅ PostHog: Successfully initialized and loaded!"
```

---

### 2. PostHog LLM Analytics

#### Setup:
Already configured! Your Gemini API calls are automatically tracked.

#### What's Tracked:
- Model used (e.g., `gemini-1.5-flash-latest`)
- Latency (response time)
- Token counts (input, output, total)
- Costs (automatically calculated)
- Input/output text (truncated for privacy)
- Trace IDs for debugging

#### View LLM Analytics:
1. Go to PostHog dashboard
2. Navigate to **LLM Analytics** → **Generations**
3. See all AI calls with costs, tokens, and performance

#### Cost Calculation:
Automatically calculates costs based on Gemini pricing:
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

---

### 3. Google Tag Manager

#### Setup:
1. Go to [Google Tag Manager](https://tagmanager.google.com)
2. Create a new container for your website
3. Copy your **Container ID** (GTM-XXXXXXX)
4. Add to `.env.local`:
   ```bash
   VITE_GTM_ID=GTM-XXXXXXX
   ```

#### Features:
- Centralized tag management
- Custom event tracking
- Integration with Google Analytics, Ads, etc.

---

### 4. Google Analytics 4

#### Option A: Via Google Tag Manager (Recommended)
1. Set up GTM first (see above)
2. In GTM, add a "Google Analytics: GA4 Configuration" tag
3. No additional env vars needed

#### Option B: Direct Implementation
1. Go to [Google Analytics](https://analytics.google.com)
2. Create a GA4 property
3. Copy your **Measurement ID** (G-XXXXXXXXXX)
4. Add to `.env.local`:
   ```bash
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

---

### 5. Vercel Analytics

#### Setup:
Automatically enabled! No configuration needed.

#### Features:
- ✅ Web Vitals (LCP, FID, CLS, TTFB, INP)
- ✅ Performance insights
- ✅ Real user monitoring

#### View Analytics:
1. Go to Vercel Dashboard
2. Select your project
3. Click **Analytics** tab

---

### 6. Sentry (Error Tracking)

#### Setup:
1. Go to [Sentry](https://sentry.io) and create an account
2. Create a new project (select "React")
3. Copy your **DSN**
4. Add to `.env.local`:
   ```bash
   VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   ```

#### Features Enabled:
- ✅ Error tracking
- ✅ Performance monitoring
- ✅ Session replays (with privacy)
- ✅ Source maps for debugging
- ✅ User context

#### Verify:
Errors are automatically captured and sent to Sentry.

---

### 7. Canny (User Feedback)

#### Setup:
1. Go to [Canny](https://canny.io) and create an account
2. Create a new board for your app
3. Get your **App ID** from Settings
4. Add to `.env.local`:
   ```bash
   VITE_CANNY_APP_ID=your_canny_app_id
   ```

#### Features:
- ✅ User feedback collection
- ✅ Feature requests
- ✅ Voting system
- ✅ Changelog
- ✅ Automatic user identification

#### Access Widget:
Canny widget will automatically appear in your app (usually bottom-right corner).

---

## 🚀 Deployment Setup

### Vercel Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

```bash
# PostHog
VITE_PUBLIC_POSTHOG_KEY=phc_...
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Google (Optional)
VITE_GTM_ID=GTM-XXXXXXX
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Sentry
VITE_SENTRY_DSN=https://...ingest.sentry.io/...

# Canny
VITE_CANNY_APP_ID=your_canny_app_id
```

### Convex Environment Variables

Set these in Convex Dashboard → Settings → Environment Variables:

```bash
# PostHog (Server-Side)
POSTHOG_API_KEY=phc_...
POSTHOG_HOST=https://us.i.posthog.com

# Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

---

## 📊 What Gets Tracked

### Automatic Tracking (PostHog):
- ✅ Page views
- ✅ Button clicks
- ✅ Form submissions
- ✅ Input changes
- ✅ Navigation patterns
- ✅ Session recordings

### Custom Events (PostHog):
- ✅ Convex mutations/queries
- ✅ API calls
- ✅ File operations
- ✅ Assignment operations
- ✅ Widget interactions
- ✅ Feature usage

### LLM/AI Tracking (PostHog):
- ✅ AI model calls (Gemini)
- ✅ Token usage (input/output)
- ✅ Latency
- ✅ Costs per call
- ✅ Success/error rates

### Cost Tracking (PostHog + Convex):
- ✅ Per-user AI costs
- ✅ Per-user API costs
- ✅ Storage costs
- ✅ Revenue tracking
- ✅ User profitability

### Error Tracking (Sentry):
- ✅ JavaScript errors
- ✅ Unhandled promise rejections
- ✅ Network errors
- ✅ Performance issues

---

## 🔒 Privacy & Compliance

### PostHog:
- Session recordings **mask all inputs by default** except those with `data-private="false"`
- Text elements with `data-private` attribute are masked
- IP addresses can be anonymized in PostHog settings

### Sentry:
- Session replays **mask all text and media**
- Sensitive data is automatically scrubbed
- IP addresses are anonymized

### GDPR Compliance:
All services support:
- ✅ User data export
- ✅ User data deletion
- ✅ Opt-out mechanisms
- ✅ Cookie consent (implement separately)

---

## 📈 Viewing Analytics

### PostHog Dashboard:
- **Trends**: User activity, page views, events
- **Funnels**: Conversion tracking
- **Retention**: User engagement
- **Session Recordings**: Watch user sessions
- **LLM Analytics**: AI usage and costs
- **Feature Flags**: A/B testing

### Google Analytics:
- **Realtime**: Current active users
- **Acquisition**: Traffic sources
- **Engagement**: Page views, time on site
- **Conversions**: Goal tracking

### Vercel Analytics:
- **Web Vitals**: Performance scores
- **Top Pages**: Most visited pages
- **Devices**: User devices and browsers

### Sentry:
- **Issues**: Errors and crashes
- **Performance**: Slow transactions
- **Releases**: Track deployments

---

## 🧪 Testing

### Test PostHog:
```javascript
// In browser console:
window.posthog.capture('test_event', { test: true })
```

### Test Sentry:
```javascript
// In browser console:
throw new Error("Test Sentry error tracking");
```

### Test LLM Tracking:
Trigger any D2L sync that uses AI parsing - it will automatically be tracked in PostHog LLM Analytics.

---

## 📞 Support

### PostHog:
- Docs: https://posthog.com/docs
- Community: https://posthog.com/slack

### Sentry:
- Docs: https://docs.sentry.io
- Support: https://sentry.io/support

### Vercel:
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support

### Canny:
- Docs: https://developers.canny.io
- Support: support@canny.io

---

## ✅ Quick Checklist

Before going live, ensure:

- [ ] PostHog keys added to `.env.local` and Vercel
- [ ] PostHog API key added to Convex for LLM tracking
- [ ] Sentry DSN added to `.env.local` and Vercel
- [ ] GTM/GA configured (optional)
- [ ] Canny App ID added (optional)
- [ ] Tested all analytics in dev environment
- [ ] Verified events appearing in PostHog
- [ ] Verified errors appearing in Sentry
- [ ] Session recordings working in PostHog
- [ ] LLM tracking working for Gemini calls

---

## 🎉 You're All Set!

Your app now has comprehensive analytics, error tracking, and user feedback capabilities!

