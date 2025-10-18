# Statsig Setup Guide - Quick Reference

This guide walks you through setting up Statsig feature gates for all 12 features.

---

## Step 0: Configure Statsig API Key (CRITICAL!)

⚠️ **You must do this first or Statsig won't work!**

### Get Your Client API Key

1. Go to: https://console.statsig.com
2. Click **Settings** (gear icon) in the left sidebar
3. Click **API Keys** tab
4. Copy the **Client API Key** (starts with `client-`)

### Add to Your Environment Variables

1. Open or create `.env.local` in your project root
2. Add this line:
   ```bash
   VITE_STATSIG_CLIENT_KEY=client-your_actual_key_here
   ```
3. Replace `client-your_actual_key_here` with your actual key
4. Save the file

### Restart Your Dev Server

```bash
# Stop your dev server (Ctrl+C)
npm run dev
# Restart it
```

✅ **Verification:** Check browser console for: `🔍 Statsig Client Key Status: { hasKey: true }`

---

## Step 1: Access Statsig Console

1. Go to: https://console.statsig.com
2. Select your project: **Northstar**
3. Click **Feature Gates** in the left sidebar

---

## Step 2: Create Feature Gates (12 Total)

### Basic Plan Gates (5)

#### Gate 1: File Storage
```
Name: file_storage_enabled
Description: Controls access to 1GB file storage (Basic) / Unlimited (Pro)
Targeting Rules:
  - Rule 1: If user.plan is any of ["northstar_basic", "northstar_pro"] → Pass
  - Default: Fail
```

#### Gate 2: Dashboards
```
Name: dashboards_enabled
Description: Controls access to dashboards (2 for Basic, unlimited for Pro)
Targeting Rules:
  - Rule 1: If user.plan is any of ["northstar_basic", "northstar_pro"] → Pass
  - Default: Fail
```

#### Gate 3: Smart Search
```
Name: smart_search_enabled
Description: AI-powered semantic search across content
Targeting Rules:
  - Rule 1: If user.plan is any of ["northstar_basic", "northstar_pro"] → Pass
  - Default: Fail
```

#### Gate 4: AI OCR
```
Name: ai_ocr_enabled
Description: Extract text from images and PDFs (100/mo Basic, unlimited Pro)
Targeting Rules:
  - Rule 1: If user.plan is any of ["northstar_basic", "northstar_pro"] → Pass
  - Default: Fail
```

#### Gate 5: Assignment Management
```
Name: assignment_management_enabled
Description: Term-based assignment organization and tracking
Targeting Rules:
  - Rule 1: If user.plan is any of ["northstar_basic", "northstar_pro"] → Pass
  - Default: Fail
```

---

### Pro-Only Gates (7)

#### Gate 6: Academic Analytics
```
Name: academic_analytics_enabled
Description: Advanced analytics and performance insights (Pro only)
Targeting Rules:
  - Rule 1: If user.plan equals "northstar_pro" → Pass
  - Default: Fail
```

#### Gate 7: Homework Help
```
Name: homework_help_enabled
Description: AI-powered homework assistance (Pro only)
Targeting Rules:
  - Rule 1: If user.plan equals "northstar_pro" → Pass
  - Default: Fail
```

#### Gate 8: AI Study Buddy
```
Name: study_buddy_enabled
Description: Personal AI tutor for studying and exam prep (Pro only)
Targeting Rules:
  - Rule 1: If user.plan equals "northstar_pro" → Pass
  - Default: Fail
```

#### Gate 9: Calendar Sync
```
Name: calendar_sync_enabled
Description: Two-way calendar synchronization (Pro only)
Targeting Rules:
  - Rule 1: If user.plan equals "northstar_pro" → Pass
  - Default: Fail
```

#### Gate 10: Storage Share
```
Name: storage_share_enabled
Description: Unlimited file and folder sharing (Pro only)
Targeting Rules:
  - Rule 1: If user.plan equals "northstar_pro" → Pass
  - Default: Fail
```

#### Gate 11: Unlimited Storage
```
Name: unlimited_storage_enabled
Description: Unlimited file storage (Pro only)
Targeting Rules:
  - Rule 1: If user.plan equals "northstar_pro" → Pass
  - Default: Fail
```

#### Gate 12: Unlimited Dashboards
```
Name: unlimited_dashboards_enabled
Description: Create unlimited custom dashboards (Pro only)
Targeting Rules:
  - Rule 1: If user.plan equals "northstar_pro" → Pass
  - Default: Fail
```

---

## Step 3: Create Custom Metrics

### Metric 1: Feature Upgrade Conversion
```
Name: Feature Upgrade Conversion
Event: upgraded_for_*
Type: Conversion
Aggregation: Unique Users
Group By: featureId
Description: Tracks which features drive users to upgrade
```

### Metric 2: Feature Usage
```
Name: Feature Usage by Plan
Events: 
  - file_uploaded
  - dashboard_created
  - smart_search_performed
  - ocr_used
  - assignment_created
  - academic_analytics_viewed
  - homework_help_used
  - study_buddy_used
  - calendar_synced
  - file_shared
  - file_uploaded_unlimited
  - unlimited_dashboard_created
Type: Count
Aggregation: Event Count
Group By: featureId, plan
Description: Tracks feature usage across different plans
```

### Metric 3: Blocked Attempts
```
Name: Blocked Feature Attempts
Events:
  - file_storage_attempted
  - dashboard_limit_reached
  - smart_search_attempted
  - ocr_limit_reached
  - assignment_management_attempted
  - academic_analytics_attempted
  - homework_help_attempted
  - study_buddy_attempted
  - calendar_sync_attempted
  - share_attempted
  - unlimited_storage_attempted
  - unlimited_dashboard_attempted
Type: Count
Aggregation: Event Count
Group By: featureId, plan, reason
Description: Tracks when users try to access locked features
```

### Metric 4: Storage Usage
```
Name: Storage Usage
Event: file_uploaded
Type: Sum
Field to Sum: metadata.fileSize
Aggregation: Sum
Group By: plan
Description: Total storage used by plan
```

### Metric 5: OCR Usage
```
Name: OCR Operations
Event: ocr_used
Type: Count
Aggregation: Event Count
Group By: plan, userId
Description: OCR operations per user per plan
```

---

## Step 4: Create Dashboards

### Dashboard 1: Feature Health

**Metrics to Include:**
- Feature Usage by Plan (last 30 days)
- Active Users per Feature
- Feature Adoption Rate
- Top 5 Most Used Features

**Charts:**
```
1. Line Chart: "Feature Usage Over Time"
   - Metric: Feature Usage
   - X-axis: Date
   - Y-axis: Count
   - Group by: featureId

2. Bar Chart: "Feature Usage by Plan"
   - Metric: Feature Usage
   - X-axis: featureId
   - Y-axis: Count
   - Split by: plan

3. Table: "Feature Adoption"
   - Columns: Feature Name, Total Users, Active Users, Adoption %
```

### Dashboard 2: Monetization

**Metrics to Include:**
- Upgrade Conversion Rate
- Top Features Driving Upgrades
- Blocked Attempts by Feature
- Conversion Funnel

**Charts:**
```
1. Funnel Chart: "Upgrade Conversion Funnel"
   - Step 1: Blocked Attempt
   - Step 2: Viewed Upgrade Modal
   - Step 3: Clicked Upgrade
   - Step 4: Completed Upgrade

2. Bar Chart: "Features Driving Upgrades"
   - Metric: Feature Upgrade Conversion
   - X-axis: featureId
   - Y-axis: Upgrade count
   - Sort: Descending

3. Line Chart: "Blocked Attempts Over Time"
   - Metric: Blocked Feature Attempts
   - X-axis: Date
   - Y-axis: Count
   - Group by: featureId
```

### Dashboard 3: Plan Analysis

**Metrics to Include:**
- Feature Utilization by Plan
- Pro Feature Adoption
- Basic → Pro Upgrade Triggers
- Churn Risk by Feature Usage

**Charts:**
```
1. Heatmap: "Feature Usage by Plan"
   - X-axis: featureId
   - Y-axis: plan
   - Color: Usage count

2. Bar Chart: "Pro Feature Adoption"
   - Only Pro features
   - X-axis: featureId
   - Y-axis: % of Pro users who used feature

3. Table: "Upgrade Triggers"
   - Columns: Feature, Attempts, Upgrades, Conversion Rate
   - Sort by: Conversion Rate
```

---

## Step 5: Set Up Alerts (Optional)

### Alert 1: High Blocked Attempt Rate
```
Name: High Feature Block Rate
Condition: When "Blocked Feature Attempts" > 100 in last 1 hour
Notification: Email + Slack
Action: Review feature pricing/messaging
```

### Alert 2: Low Pro Feature Adoption
```
Name: Low Pro Feature Usage
Condition: When any Pro feature has < 10% adoption after 7 days
Notification: Email
Action: Review feature onboarding
```

### Alert 3: Upgrade Conversion Drop
```
Name: Conversion Rate Drop
Condition: When "Feature Upgrade Conversion" drops > 20% week-over-week
Notification: Email + Slack
Action: Review upgrade flow
```

---

## Step 6: Test Your Setup

### Test 1: Verify Gates Work

**Basic User Test:**
```tsx
// In browser console (as Basic user)
const { checkAccess } = useFeatureGate();

// Should PASS
console.log(checkAccess('1gb_of_file_storage')); // hasAccess: true
console.log(checkAccess('smart_search')); // hasAccess: true

// Should FAIL
console.log(checkAccess('ai_powered_study_buddy')); // hasAccess: false
```

**Pro User Test:**
```tsx
// In browser console (as Pro user)
const { checkAccess } = useFeatureGate();

// Should PASS
console.log(checkAccess('ai_powered_study_buddy')); // hasAccess: true
console.log(checkAccess('unlimited_file_storage')); // hasAccess: true
```

### Test 2: Verify Events Track

**Track a Usage Event:**
```tsx
const { trackUsage } = useFeatureGate();
trackUsage('smart_search', { query: 'test' });

// Check Statsig Console → Metrics Explorer
// Event: smart_search_performed should appear
```

**Track a Blocked Attempt:**
```tsx
// As Basic user, try Pro feature
const { hasAccess, trackUsage } = useFeatureGate();
if (!hasAccess('ai_powered_study_buddy')) {
  trackUsage('ai_powered_study_buddy'); // Tracks attempt
}

// Check Statsig Console → Metrics Explorer
// Event: study_buddy_attempted should appear
```

### Test 3: Verify Conversion Tracking

**Simulate Upgrade:**
```tsx
const { trackUpgrade } = useFeatureGate();
trackUpgrade('ai_powered_study_buddy', 'northstar_basic', 'northstar_pro');

// Check Statsig Console → Metrics Explorer
// Event: upgraded_for_study_buddy should appear
```

---

## Quick Setup Script (Copy-Paste)

For rapid setup in Statsig Console:

```javascript
// Feature Gate Template (adjust for each gate)
{
  "name": "GATE_NAME",
  "description": "DESCRIPTION",
  "rules": [
    {
      "name": "Plan Check",
      "condition": {
        "field": "user.plan",
        "operator": "in",
        "value": ["northstar_basic", "northstar_pro"] // or just ["northstar_pro"] for Pro-only
      },
      "action": "pass"
    }
  ],
  "defaultAction": "fail"
}
```

---

## Troubleshooting

### Issue: Gate always returns false

**Check:**
1. Is gate enabled in Statsig Console?
2. Is `user.plan` being passed to Statsig client?
3. Is targeting rule condition correct?
4. Check browser console for Statsig errors

### Issue: Events not appearing

**Check:**
1. Is Statsig client initialized in `app/root.tsx`?
2. Is `trackUsage()` being called correctly?
3. Event name matches exactly in Statsig Console?
4. Wait 1-2 minutes for events to appear (not instant)

### Issue: Metrics show wrong data

**Check:**
1. Metric aggregation type (Count vs Sum vs Unique)
2. Event names in metric configuration
3. Time range selection
4. Group by fields

---

## Next Steps

1. ✅ Create all 12 feature gates
2. ✅ Create 5 custom metrics
3. ✅ Create 3 dashboards
4. ✅ Test with Basic and Pro accounts
5. ✅ Set up alerts (optional)
6. ✅ Monitor for 1 week and adjust

---

## Resources

- **Statsig Docs**: https://docs.statsig.com/
- **Feature Gates Guide**: https://docs.statsig.com/gates/create
- **Custom Metrics**: https://docs.statsig.com/metrics/create
- **Your Console**: https://console.statsig.com

---

## Support

If you need help:
1. Check Statsig documentation
2. Review `FEATURE_GATING_GUIDE.md`
3. Test in browser console with `useFeatureGate()`
4. Check Network tab for Statsig API calls

Happy tracking! 📊


