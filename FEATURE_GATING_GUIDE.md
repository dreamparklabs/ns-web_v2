## Feature Gating System - Complete Guide

This guide explains how to use the unified feature gating system that integrates **Stripe**, **Clerk Billing**, and **Statsig** for comprehensive feature management, analytics, and monetization.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Usage Examples](#usage-examples)
5. [Statsig Setup](#statsig-setup)
6. [Monitoring & Analytics](#monitoring--analytics)
7. [Best Practices](#best-practices)

---

## Overview

### What This System Does

- **Feature Access Control**: Determine if users can access features based on their subscription plan
- **Feature Flags**: Enable/disable features dynamically without code changes (via Statsig)
- **Usage Tracking**: Monitor which features are used, attempted, and driving upgrades
- **Upgrade Prompts**: Show contextual upgrade messages when users try locked features
- **A/B Testing**: Test different feature configurations with Statsig experiments

### Three-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Stripe (Payment Processing)                        │
│ - Handles actual billing                                     │
│ - Stores subscription data                                   │
│ - Manages payment methods                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Clerk (Authentication & Plan Management)           │
│ - Stores subscription in user metadata                       │
│ - Provides auth context                                      │
│ - Fast plan checks                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Statsig (Feature Flags & Analytics)                │
│ - Dynamic feature toggles                                    │
│ - A/B testing                                                │
│ - Usage analytics                                            │
│ - Conversion tracking                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Core Files

1. **`app/config/features.ts`**
   - Single source of truth for all features
   - Defines feature metadata, plans, limits, and Statsig integration
   
2. **`app/hooks/useFeatureGate.ts`**
   - React hook for checking feature access
   - Tracks usage via Statsig
   - Provides upgrade information

3. **`app/components/FeatureUpgradePrompt.tsx`**
   - UI components for showing upgrade prompts
   - Handles conversion tracking

### Feature Configuration Schema

```typescript
interface FeatureConfig {
  // Identification
  id: FeatureId;
  name: string;
  description: string;
  category: 'core' | 'productivity' | 'ai' | 'analytics' | 'integrations' | 'premium';
  
  // Access Control (Clerk/Stripe)
  plans: PlanId[];
  requiresUpgrade: boolean;
  
  // Statsig Integration
  statsigGate?: string;
  statsigEvents: {
    used: string;
    attempted: string;
    upgraded: string;
  };
  
  // Usage Limits
  hasUsageLimits: boolean;
  limits?: {
    basic?: number | 'unlimited';
    pro?: number | 'unlimited';
  };
  usageMetric?: 'count' | 'storage' | 'tokens' | 'api_calls';
  
  // UI/UX
  icon?: string;
  upgradeMessage?: string;
  learnMoreUrl?: string;
}
```

---

## Configuration

### Step 1: Define a New Feature

Edit `app/config/features.ts`:

```typescript
export const FEATURES: Record<FeatureId, FeatureConfig> = {
  // ... existing features ...
  
  my_new_feature: {
    id: 'my_new_feature',
    name: 'My Amazing Feature',
    description: 'This feature does something amazing',
    category: 'productivity',
    
    // Access Control
    plans: ['northstar_pro'], // Only Pro users
    requiresUpgrade: true,
    
    // Statsig Integration
    statsigGate: 'my_new_feature_enabled', // Optional gate name
    statsigEvents: {
      used: 'my_feature_used',
      attempted: 'my_feature_attempted',
      upgraded: 'upgraded_for_my_feature',
    },
    
    // Usage Limits
    hasUsageLimits: true,
    limits: {
      basic: 10,
      pro: 'unlimited',
    },
    usageMetric: 'count',
    
    // UI/UX
    icon: 'star',
    upgradeMessage: 'Upgrade to Pro to unlock My Amazing Feature',
    learnMoreUrl: '/features/my-amazing-feature',
  },
};
```

### Step 2: Add TypeScript Type

Add your feature ID to the `FeatureId` union type:

```typescript
export type FeatureId =
  | 'ai_ocr'
  | 'smart_search'
  // ... existing features ...
  | 'my_new_feature'; // Add here
```

### Step 3: Configure Stripe Product Features

In your Stripe Dashboard:
1. Go to Products → Northstar Pro
2. Add feature metadata:
   ```
   features: ["my_new_feature", "ai_study_buddy", ...]
   ```

### Step 4: Create Statsig Feature Gate

In Statsig Dashboard:
1. Go to Feature Gates
2. Click "Create Gate"
3. Name: `my_new_feature_enabled`
4. Add targeting rules (if needed)
5. Enable for production

---

## Usage Examples

### Example 1: Simple Feature Check

```tsx
import { useFeatureGate } from '../hooks/useFeatureGate';

function MyComponent() {
  const { hasAccess, trackUsage } = useFeatureGate();
  
  if (!hasAccess('my_new_feature')) {
    return <div>This feature is not available on your plan</div>;
  }
  
  const handleClick = () => {
    // Track usage when feature is actually used
    trackUsage('my_new_feature');
    
    // Do the feature action
    console.log('Feature used!');
  };
  
  return <button onClick={handleClick}>Use Feature</button>;
}
```

### Example 2: Using the `useFeature` Hook

```tsx
import { useFeature } from '../hooks/useFeatureGate';

function AIStudyBuddy() {
  const { hasAccess, trackUsage, upgradeInfo } = useFeature('ai_study_buddy');
  
  if (!hasAccess) {
    return (
      <div>
        <h3>{upgradeInfo?.featureName} is locked</h3>
        <p>{upgradeInfo?.upgradeMessage}</p>
        {/* Show upgrade button */}
      </div>
    );
  }
  
  const handleAskQuestion = (question: string) => {
    trackUsage({ question, timestamp: Date.now() });
    // Process the question...
  };
  
  return <div>{/* AI Study Buddy UI */}</div>;
}
```

### Example 3: Feature Gate Component

```tsx
import { FeatureGate } from '../hooks/useFeatureGate';
import { FeatureUpgradeBanner } from '../components/FeatureUpgradePrompt';

function Analytics() {
  return (
    <FeatureGate
      feature="academic_analytics"
      fallback={<FeatureUpgradeBanner featureId="academic_analytics" />}
    >
      <div>
        {/* Advanced analytics UI - only shown to Pro users */}
        <h2>Academic Analytics</h2>
        {/* ... */}
      </div>
    </FeatureGate>
  );
}
```

### Example 4: Showing Upgrade Modal

```tsx
import { useState } from 'react';
import { useFeatureGate } from '../hooks/useFeatureGate';
import FeatureUpgradePrompt from '../components/FeatureUpgradePrompt';

function FileUpload() {
  const { hasAccess, trackUsage } = useFeatureGate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const handleUploadLargeFile = () => {
    if (!hasAccess('unlimited_storage')) {
      // Track the attempt
      trackUsage('unlimited_storage', { action: 'upload_blocked' });
      
      // Show upgrade modal
      setShowUpgradeModal(true);
      return;
    }
    
    // Track successful usage
    trackUsage('unlimited_storage', { action: 'large_file_uploaded' });
    
    // Proceed with upload...
  };
  
  return (
    <>
      <button onClick={handleUploadLargeFile}>Upload Large File</button>
      
      <FeatureUpgradePrompt
        featureId="unlimited_storage"
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
}
```

### Example 5: Track Upgrade Conversions

```tsx
import { useFeatureGate } from '../hooks/useFeatureGate';
import { useClerkBilling } from '../hooks/useClerkBilling';

function UpgradeButton({ featureId }: { featureId: FeatureId }) {
  const { trackUpgrade } = useFeatureGate();
  const { getCurrentPlan, subscribeToPlan } = useClerkBilling();
  
  const handleUpgrade = async () => {
    const currentPlan = getCurrentPlan()?.plan;
    
    try {
      await subscribeToPlan('northstar_pro');
      
      // Track successful upgrade
      trackUpgrade(featureId, currentPlan || 'none', 'northstar_pro');
    } catch (error) {
      console.error('Upgrade failed:', error);
    }
  };
  
  return <button onClick={handleUpgrade}>Upgrade to Pro</button>;
}
```

---

## Statsig Setup

### 1. Create Feature Gates

For each feature in `features.ts` that has a `statsigGate`:

1. Go to Statsig Console → Feature Gates
2. Click "Create Gate"
3. Name it exactly as specified in `statsigGate` (e.g., `ai_study_buddy_enabled`)
4. Add description and targeting rules
5. Enable for your environments

### 2. Create Events

For each feature, you'll track 3 events:
- `{feature}_used` - When feature is successfully used
- `{feature}_attempted` - When user tries but is blocked
- `upgraded_for_{feature}` - When user upgrades to access this feature

These are automatically tracked by `useFeatureGate` hook.

### 3. Set Up Metrics

In Statsig Console → Metrics:

**Conversion Metrics:**
- Name: "Feature Upgrade Conversion"
- Event: `upgraded_for_*`
- Metric Type: Conversion
- Group by: `featureId`

**Usage Metrics:**
- Name: "Feature Usage"
- Event: `*_used`
- Metric Type: Count
- Group by: `featureId`, `plan`

### 4. Create Experiments (Optional)

Test different feature configurations:

```typescript
// Example: Test if showing a feature teaser increases upgrades
const { getExperiment } = useStatsig();
const experiment = getExperiment('feature_teaser_test');

if (experiment.get('show_teaser', false)) {
  // Show feature teaser to Basic users
  return <FeatureTeaser featureId="ai_study_buddy" />;
}
```

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Feature Usage by Plan**
   - Which features are used most on each plan?
   - Are Pro features driving value?

2. **Upgrade Conversion Rate**
   - How many users who attempt a locked feature actually upgrade?
   - Which features drive the most upgrades?

3. **Feature Adoption**
   - What % of eligible users actually use each feature?
   - Are there features that need better discovery?

4. **Blocked Attempts**
   - How many users are being blocked from features?
   - Is this creating upgrade friction or frustration?

### Statsig Dashboards

**Dashboard 1: Feature Health**
- Feature usage counts
- Active users per feature
- Feature adoption rates
- Crash rates per feature

**Dashboard 2: Monetization**
- Upgrade conversion funnel
- Features driving upgrades
- Revenue per feature
- Churn by feature usage

**Dashboard 3: Plan Analysis**
- Feature usage by plan
- Plan utilization
- Cross-sell opportunities

### Example Queries

**Most Valuable Features (Driving Upgrades):**
```sql
SELECT featureId, COUNT(*) as upgrade_count
FROM events
WHERE event_name LIKE 'upgraded_for_%'
GROUP BY featureId
ORDER BY upgrade_count DESC
```

**Feature Usage by Plan:**
```sql
SELECT featureId, plan, COUNT(*) as usage_count
FROM events
WHERE event_name LIKE '%_used'
GROUP BY featureId, plan
```

**Conversion Rate:**
```sql
SELECT 
  featureId,
  COUNT(*) FILTER (WHERE event_name LIKE '%_attempted') as attempts,
  COUNT(*) FILTER (WHERE event_name LIKE 'upgraded_for_%') as upgrades,
  (upgrades / attempts * 100) as conversion_rate
FROM events
GROUP BY featureId
```

---

## Best Practices

### 1. Feature Naming

**DO:**
- Use clear, descriptive names: `ai_study_buddy`, `unlimited_storage`
- Be consistent across Stripe, Clerk, and Statsig
- Use snake_case for IDs

**DON'T:**
- Use generic names: `feature1`, `premium_feature`
- Mix naming conventions
- Use abbreviations that aren't obvious

### 2. Event Tracking

**DO:**
- Track usage at the point of actual feature use, not just access
- Include relevant metadata (e.g., file size, query length)
- Track both successful usage and blocked attempts

**DON'T:**
- Track on every render
- Include PII in event metadata
- Forget to track upgrade conversions

### 3. Upgrade Messages

**DO:**
- Be specific about what the feature does
- Show clear value proposition
- Make it easy to upgrade (1-click)

**DON'T:**
- Use generic "upgrade now" messages
- Block access without explaining why
- Make users hunt for upgrade info

### 4. Feature Gates

**DO:**
- Use Statsig gates for gradual rollouts
- Test new features with a small % of users first
- Have a kill switch for every major feature

**DON'T:**
- Enable features globally without testing
- Forget to update gate status in production
- Use feature flags as permanent configuration

### 5. A/B Testing

**DO:**
- Test one variable at a time
- Run tests long enough for statistical significance
- Document experiment hypotheses

**DON'T:**
- Change multiple things at once
- Stop experiments early
- Ignore negative results

### 6. Usage Limits

**DO:**
- Set reasonable limits that provide value
- Warn users before hitting limits
- Make it easy to upgrade when limits are reached

**DON'T:**
- Set artificially low limits to force upgrades
- Surprise users with hard limits
- Block access without warning

---

## Troubleshooting

### Feature not accessible despite correct plan

**Check:**
1. User plan in Clerk metadata (`user.publicMetadata.subscription.plan`)
2. Feature `plans` array in `features.ts`
3. Statsig gate status (if configured)
4. Account status (`accountStatus !== 'suspended'`)

### Events not appearing in Statsig

**Check:**
1. Statsig client initialized in `app/root.tsx`
2. User ID being passed correctly
3. Event names match exactly
4. `trackUsage()` being called

### Upgrade not working

**Check:**
1. Stripe checkout session creation
2. Webhook receiving subscription updates
3. Clerk metadata being updated
4. User reloading after subscription change

---

## Example: Adding a New Feature End-to-End

Let's add a "PDF Annotation" feature:

### 1. Define Feature (`app/config/features.ts`)

```typescript
pdf_annotation: {
  id: 'pdf_annotation',
  name: 'PDF Annotation',
  description: 'Annotate PDFs with highlights, notes, and drawings',
  category: 'productivity',
  plans: ['northstar_pro'],
  requiresUpgrade: true,
  statsigGate: 'pdf_annotation_enabled',
  statsigEvents: {
    used: 'pdf_annotated',
    attempted: 'pdf_annotation_attempted',
    upgraded: 'upgraded_for_pdf_annotation',
  },
  hasUsageLimits: false,
  icon: 'edit',
  upgradeMessage: 'Upgrade to Pro to annotate PDFs',
  learnMoreUrl: '/features/pdf-annotation',
},
```

### 2. Add TypeScript Type

```typescript
export type FeatureId =
  | 'ai_ocr'
  // ... other features ...
  | 'pdf_annotation';
```

### 3. Create Statsig Gate

1. Go to Statsig → Feature Gates
2. Create gate: `pdf_annotation_enabled`
3. Enable for Pro users

### 4. Update Stripe Product

Add to Northstar Pro features metadata:
```
features: ["pdf_annotation", ...]
```

### 5. Implement in Code

```tsx
import { useFeature } from '../hooks/useFeatureGate';
import FeatureUpgradePrompt from '../components/FeatureUpgradePrompt';

function PDFViewer({ pdfUrl }: { pdfUrl: string }) {
  const { hasAccess, trackUsage } = useFeature('pdf_annotation');
  const [showUpgrade, setShowUpgrade] = useState(false);
  
  const handleAnnotate = () => {
    if (!hasAccess) {
      setShowUpgrade(true);
      return;
    }
    
    trackUsage({ action: 'annotation_started' });
    // Open annotation tool...
  };
  
  return (
    <>
      <div>
        <PDFRenderer url={pdfUrl} />
        <button onClick={handleAnnotate}>
          Annotate {!hasAccess && '🔒'}
        </button>
      </div>
      
      <FeatureUpgradePrompt
        featureId="pdf_annotation"
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
      />
    </>
  );
}
```

### 6. Monitor Results

Check in Statsig:
- How many users attempted PDF annotation?
- What's the upgrade conversion rate?
- Are Pro users actually using it?

---

## Summary

This feature gating system gives you:

✅ **Centralized Configuration** - One place to define all features
✅ **Flexible Access Control** - Plan-based + feature flags
✅ **Comprehensive Analytics** - Track usage, attempts, upgrades
✅ **Great UX** - Clear upgrade prompts and messaging
✅ **Easy A/B Testing** - Test features before full rollout
✅ **Revenue Optimization** - Track which features drive upgrades

Start by using the system for your most valuable Pro features, then expand to all features over time!


