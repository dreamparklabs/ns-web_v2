# Stripe ↔ Clerk ↔ Statsig Feature Mapping

This document maps your Stripe Product Catalog features to the application's feature gating system.

## Feature Mapping Table

| Stripe Lookup Key | Feature Name | Plan(s) | Statsig Gate | Category |
|-------------------|--------------|---------|--------------|----------|
| `1gb_of_file_storage` | 1GB of File Storage | Basic | `file_storage_enabled` | Storage |
| `2_unified_dashboards` | 2 Unified Dashboards | Basic | `dashboards_enabled` | Productivity |
| `smart_search` | Smart Search | Basic, Pro | `smart_search_enabled` | AI |
| `ai_powered_ocr` | AI-Powered OCR | Basic, Pro | `ai_ocr_enabled` | AI |
| `term_based_assignment_management` | Term-based Assignment Management | Basic, Pro | `assignment_management_enabled` | Productivity |
| `academic_progress_analytics_` | Academic Progress Analytics* | **Pro only** | `academic_analytics_enabled` | Analytics |
| `homework_help_` | Homework Help* | **Pro only** | `homework_help_enabled` | AI |
| `ai_powered_study_buddy_` | AI-Powered Study Buddy* | **Pro only** | `study_buddy_enabled` | AI |
| `calendar_sync_` | Calendar Sync* | **Pro only** | `calendar_sync_enabled` | Integrations |
| `unlimited_storage_share` | Unlimited Storage Share | **Pro only** | `storage_share_enabled` | Storage |
| `unlimited_file_storage` | Unlimited File Storage | **Pro only** | `unlimited_storage_enabled` | Storage |
| `unlimited_unified_dashboards` | Unlimited Unified Dashboards | **Pro only** | `unlimited_dashboards_enabled` | Productivity |

**Note:** Features marked with `*` in Stripe are Pro-only features.

---

## Plan Feature Breakdown

### Northstar Basic ($4.99/month)

**5 Features:**
1. ✅ 1GB of File Storage (limited)
2. ✅ 2 Unified Dashboards (limited)
3. ✅ Smart Search
4. ✅ AI-Powered OCR (100/month limit)
5. ✅ Term-based Assignment Management

**Usage Limits:**
- File Storage: **1GB**
- Dashboards: **2 dashboards**
- OCR: **100 operations/month**

### Northstar Pro ($14.99/month)

**All Basic features PLUS 7 Pro features:**

**Pro-Only Features:**
1. 🔒 Academic Progress Analytics
2. 🔒 Homework Help
3. 🔒 AI-Powered Study Buddy
4. 🔒 Calendar Sync
5. 🔒 Unlimited Storage Share
6. 🔒 Unlimited File Storage
7. 🔒 Unlimited Unified Dashboards

**Usage Limits:**
- File Storage: **Unlimited**
- Dashboards: **Unlimited**
- OCR: **Unlimited**

---

## Statsig Event Tracking

Each feature tracks 3 types of events:

### Event Types

1. **`{feature}_used`** - User successfully used the feature
2. **`{feature}_attempted`** - User tried to use feature but was blocked
3. **`upgraded_for_{feature}`** - User upgraded to access this feature

### Event Mapping Table

| Feature | Used Event | Attempted Event | Upgraded Event |
|---------|-----------|-----------------|----------------|
| 1GB Storage | `file_uploaded` | `file_storage_attempted` | `upgraded_for_storage` |
| 2 Dashboards | `dashboard_created` | `dashboard_limit_reached` | `upgraded_for_unlimited_dashboards` |
| Smart Search | `smart_search_performed` | `smart_search_attempted` | `upgraded_for_smart_search` |
| AI OCR | `ocr_used` | `ocr_limit_reached` | `upgraded_for_unlimited_ocr` |
| Assignment Mgmt | `assignment_created` | `assignment_management_attempted` | `upgraded_for_assignment_management` |
| Academic Analytics | `academic_analytics_viewed` | `academic_analytics_attempted` | `upgraded_for_academic_analytics` |
| Homework Help | `homework_help_used` | `homework_help_attempted` | `upgraded_for_homework_help` |
| Study Buddy | `study_buddy_used` | `study_buddy_attempted` | `upgraded_for_study_buddy` |
| Calendar Sync | `calendar_synced` | `calendar_sync_attempted` | `upgraded_for_calendar_sync` |
| Storage Share | `file_shared` | `share_attempted` | `upgraded_for_unlimited_sharing` |
| Unlimited Storage | `file_uploaded_unlimited` | `unlimited_storage_attempted` | `upgraded_for_unlimited_storage` |
| Unlimited Dashboards | `unlimited_dashboard_created` | `unlimited_dashboard_attempted` | `upgraded_for_unlimited_dashboards` |

---

## Statsig Feature Gates to Create

You need to create these 12 feature gates in Statsig Console:

### Basic Plan Gates
1. ✅ `file_storage_enabled`
2. ✅ `dashboards_enabled`
3. ✅ `smart_search_enabled`
4. ✅ `ai_ocr_enabled`
5. ✅ `assignment_management_enabled`

### Pro Plan Gates
6. 🔒 `academic_analytics_enabled`
7. 🔒 `homework_help_enabled`
8. 🔒 `study_buddy_enabled`
9. 🔒 `calendar_sync_enabled`
10. 🔒 `storage_share_enabled`
11. 🔒 `unlimited_storage_enabled`
12. 🔒 `unlimited_dashboards_enabled`

### Quick Setup Script

Copy this for each gate in Statsig:

```
Gate Name: {gate_name_from_above}
Description: Controls access to {feature_name}
Targeting Rules:
  - If user.plan === "northstar_pro" → Pass
  - If user.plan === "northstar_basic" → Pass (for Basic features only)
  - Else → Fail
```

---

## Usage Examples

### Example 1: Check File Storage

```tsx
import { useFeature } from '../hooks/useFeatureGate';

function FileUpload() {
  const { hasAccess, trackUsage } = useFeature('1gb_of_file_storage');
  
  const handleUpload = (file: File) => {
    if (!hasAccess) {
      alert('Upgrade to continue uploading');
      return;
    }
    
    trackUsage({ fileSize: file.size });
    // Upload file...
  };
  
  return <button onClick={handleUpload}>Upload</button>;
}
```

### Example 2: Show AI Study Buddy (Pro Only)

```tsx
import { FeatureGate } from '../hooks/useFeatureGate';
import { FeatureUpgradeBanner } from '../components/FeatureUpgradePrompt';

function Dashboard() {
  return (
    <FeatureGate
      feature="ai_powered_study_buddy"
      fallback={<FeatureUpgradeBanner featureId="ai_powered_study_buddy" compact />}
    >
      <AIStudyBuddy />
    </FeatureGate>
  );
}
```

### Example 3: Check Dashboard Limit

```tsx
import { useFeature } from '../hooks/useFeatureGate';

function DashboardList() {
  const { hasAccess, getFeature } = useFeatureGate();
  const basicFeature = getFeature('2_unified_dashboards');
  const proFeature = getFeature('unlimited_unified_dashboards');
  
  const canCreateDashboard = 
    hasAccess('unlimited_unified_dashboards') || // Pro has unlimited
    (hasAccess('2_unified_dashboards') && dashboardCount < 2); // Basic has 2
  
  return (
    <div>
      <p>Dashboards: {dashboardCount} / {hasAccess('unlimited_unified_dashboards') ? '∞' : '2'}</p>
      <button disabled={!canCreateDashboard}>Create Dashboard</button>
    </div>
  );
}
```

---

## Clerk Metadata Structure

When a user subscribes, their Clerk metadata should look like this:

```json
{
  "publicMetadata": {
    "subscription": {
      "plan": "northstar_pro",
      "status": "active",
      "subscriptionId": "sub_xxx",
      "stripeCustomerId": "cus_xxx",
      "currentPeriodEnd": 1234567890000,
      "cancelAtPeriodEnd": false,
      "accountStatus": "active",
      "features": [
        "1gb_of_file_storage",
        "2_unified_dashboards",
        "smart_search",
        "ai_powered_ocr",
        "term_based_assignment_management",
        "academic_progress_analytics_",
        "homework_help_",
        "ai_powered_study_buddy_",
        "calendar_sync_",
        "unlimited_storage_share",
        "unlimited_file_storage",
        "unlimited_unified_dashboards"
      ]
    }
  }
}
```

---

## How Feature Gating Works

### 1. User tries to access a feature

```tsx
const { hasAccess } = useFeatureGate();
if (hasAccess('ai_powered_study_buddy')) {
  // User can access
}
```

### 2. System checks access (3 layers)

```
┌─────────────────────────────────────┐
│ Check 1: Account Status             │
│ Is account suspended?                │
│ ❌ Suspended → Block                │
│ ✅ Active → Continue                 │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Check 2: Plan Access (Clerk)        │
│ Does user's plan include feature?   │
│ ❌ Not in plan → Block (show upgrade)│
│ ✅ In plan → Continue                │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Check 3: Feature Flag (Statsig)     │
│ Is feature gate enabled?             │
│ ❌ Disabled → Block                  │
│ ✅ Enabled → Allow Access            │
└─────────────────────────────────────┘
              ↓
         ✅ ACCESS GRANTED
```

### 3. Track the event in Statsig

```tsx
trackUsage('ai_powered_study_buddy', {
  action: 'question_asked',
  timestamp: Date.now()
});
```

---

## Testing Checklist

### Basic Plan Testing
- [ ] Can upload files up to 1GB
- [ ] Blocked when trying to upload beyond 1GB
- [ ] Can create 2 dashboards
- [ ] Blocked when trying to create 3rd dashboard
- [ ] Can use Smart Search
- [ ] Can use AI OCR (up to 100 times)
- [ ] Can use Assignment Management
- [ ] **BLOCKED** from AI Study Buddy (shows upgrade prompt)
- [ ] **BLOCKED** from Academic Analytics (shows upgrade prompt)
- [ ] **BLOCKED** from Homework Help (shows upgrade prompt)

### Pro Plan Testing
- [ ] Can upload unlimited files
- [ ] Can create unlimited dashboards
- [ ] Can use Smart Search
- [ ] Can use AI OCR unlimited times
- [ ] Can use Assignment Management
- [ ] ✅ Can access AI Study Buddy
- [ ] ✅ Can access Academic Analytics
- [ ] ✅ Can access Homework Help
- [ ] ✅ Can access Calendar Sync
- [ ] ✅ Can share unlimited files
- [ ] ✅ Has unlimited storage
- [ ] ✅ Has unlimited dashboards

### Event Tracking Testing
- [ ] Verify `*_used` events appear in Statsig when features are used
- [ ] Verify `*_attempted` events appear when blocked users try features
- [ ] Verify `upgraded_for_*` events appear when users upgrade

---

## Migration Notes

If you have existing users, you may need to:

1. **Update existing Clerk metadata** to include feature arrays
2. **Sync existing Stripe subscriptions** with new feature metadata
3. **Create Statsig gates** for all features before rollout
4. **Test with real user accounts** before going live

---

## Quick Start Checklist

- [x] ✅ Features defined in `app/config/features.ts`
- [ ] Create 12 Statsig feature gates
- [ ] Update Stripe product metadata (if needed)
- [ ] Implement feature gates in components
- [ ] Test Basic plan access
- [ ] Test Pro plan access
- [ ] Verify Statsig event tracking
- [ ] Set up Statsig dashboards for monitoring

---

## Support

For questions about:
- **Feature configuration**: Edit `app/config/features.ts`
- **Statsig setup**: See `FEATURE_GATING_GUIDE.md` → Statsig Setup
- **Implementation**: See `app/components/examples/FeatureGatingExample.tsx`
- **Stripe integration**: This document (you are here!)


