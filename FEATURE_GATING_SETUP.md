# Feature Gating System - Quick Start

## What Was Created

A comprehensive feature gating system that integrates:
- **Stripe** - Payment processing and subscription management
- **Clerk** - Authentication and plan storage
- **Statsig** - Feature flags, A/B testing, and analytics

## Files Created

1. **`app/config/features.ts`** - Feature configuration (single source of truth)
2. **`app/hooks/useFeatureGate.ts`** - React hooks for feature access
3. **`app/components/FeatureUpgradePrompt.tsx`** - UI components for upgrades
4. **`app/components/examples/FeatureGatingExample.tsx`** - 10 usage examples
5. **`FEATURE_GATING_GUIDE.md`** - Complete documentation

## Quick Start (5 Minutes)

### 1. Define Your Feature

Edit `app/config/features.ts`:

```typescript
my_feature: {
  id: 'my_feature',
  name: 'My Feature',
  description: 'What it does',
  category: 'productivity',
  plans: ['northstar_pro'], // Which plans get access
  requiresUpgrade: true,
  statsigGate: 'my_feature_enabled',
  statsigEvents: {
    used: 'my_feature_used',
    attempted: 'my_feature_attempted',
    upgraded: 'upgraded_for_my_feature',
  },
  hasUsageLimits: false,
  icon: 'star',
  upgradeMessage: 'Upgrade to Pro to unlock this feature',
},
```

### 2. Use in Your Component

```tsx
import { useFeature } from '../hooks/useFeatureGate';

function MyComponent() {
  const { hasAccess, trackUsage } = useFeature('my_feature');
  
  if (!hasAccess) {
    return <div>This feature requires Pro</div>;
  }
  
  const handleUse = () => {
    trackUsage(); // Automatically tracked in Statsig
    // Your feature logic...
  };
  
  return <button onClick={handleUse}>Use Feature</button>;
}
```

### 3. Create Statsig Feature Gate

1. Go to [Statsig Console](https://console.statsig.com)
2. Navigate to "Feature Gates"
3. Click "Create New Gate"
4. Name: `my_feature_enabled`
5. Enable for production

**Done!** Your feature is now gated and tracked.

---

## Usage Patterns

### Pattern 1: Simple Show/Hide

```tsx
const { hasAccess } = useFeatureGate();

if (hasAccess('ai_study_buddy')) {
  return <AIStudyBuddy />;
}
```

### Pattern 2: Show Upgrade Prompt

```tsx
import { FeatureGate } from '../hooks/useFeatureGate';
import { FeatureUpgradeBanner } from '../components/FeatureUpgradePrompt';

<FeatureGate
  feature="ai_study_buddy"
  fallback={<FeatureUpgradeBanner featureId="ai_study_buddy" />}
>
  <AIStudyBuddy />
</FeatureGate>
```

### Pattern 3: Modal on Access Attempt

```tsx
const [showUpgrade, setShowUpgrade] = useState(false);
const { hasAccess, trackUsage } = useFeatureGate();

const handleClick = () => {
  if (!hasAccess('premium_feature')) {
    trackUsage('premium_feature');
    setShowUpgrade(true);
    return;
  }
  // Use feature...
};

return (
  <>
    <button onClick={handleClick}>Use Feature</button>
    <FeatureUpgradePrompt
      featureId="premium_feature"
      isOpen={showUpgrade}
      onClose={() => setShowUpgrade(false)}
    />
  </>
);
```

---

## Pre-Configured Features

The system comes with 20+ pre-configured features:

### Core Features (Basic + Pro)
- ✅ `ai_ocr` - AI-powered OCR
- ✅ `smart_search` - Semantic search
- ✅ `assignment_tracking` - Track assignments
- ✅ `calendar_integration` - Calendar sync
- ✅ `file_storage` - File storage (1GB Basic, unlimited Pro)

### Basic Plan Features
- ✅ `unified_dashboards` - Multiple dashboards
- ✅ `basic_analytics` - Basic insights
- ✅ `email_notifications` - Email alerts
- ✅ `mobile_app` - Mobile access
- ✅ `chrome_extension` - Browser extension
- ✅ `d2l_integration` - D2L Brightspace sync

### Pro-Only Features
- 🔒 `ai_study_buddy` - AI tutor
- 🔒 `academic_analytics` - Advanced analytics
- 🔒 `grade_analytics` - Grade predictions
- 🔒 `ai_recommendations` - AI recommendations
- 🔒 `calendar_sync` - Advanced calendar sync
- 🔒 `homework_help` - AI homework help
- 🔒 `unlimited_storage` - Unlimited storage
- 🔒 `unlimited_ai` - Unlimited AI usage
- 🔒 `priority_support` - Priority support
- 🔒 `custom_integrations` - Custom integrations

---

## Statsig Dashboard Setup

### 1. Create Feature Gates

For each feature with a `statsigGate` in `features.ts`:

1. Go to Statsig Console → Feature Gates
2. Create gate with the exact name from `statsigGate`
3. Add targeting rules (optional)
4. Enable for your environments

### 2. Create Custom Metrics

**Upgrade Conversion Metric:**
```
Name: Feature Upgrade Conversion
Event: upgraded_for_*
Type: Conversion
Group By: featureId
```

**Feature Usage Metric:**
```
Name: Feature Usage
Event: *_used
Type: Count
Group By: featureId, plan
```

**Blocked Attempts Metric:**
```
Name: Blocked Feature Attempts
Event: *_attempted
Type: Count
Group By: featureId, plan, reason
```

### 3. Create Dashboards

**Dashboard 1: Feature Health**
- Feature usage over time
- Active users per feature
- Feature adoption rates

**Dashboard 2: Monetization**
- Upgrade conversion funnel
- Features driving upgrades
- Revenue per feature

**Dashboard 3: Plan Analysis**
- Feature usage by plan
- Plan utilization
- Upgrade opportunities

---

## Key Metrics to Track

### Conversion Funnel
```
Users on Basic Plan
  ↓
Attempted Pro Feature (tracked via *_attempted)
  ↓
Viewed Upgrade Modal
  ↓
Clicked Upgrade Button
  ↓
Completed Upgrade (tracked via upgraded_for_*)
```

### Feature ROI
```
Feature Upgrade Conversion Rate = 
  (Users who upgraded for feature) / (Users who attempted feature)
```

### Feature Adoption
```
Feature Adoption Rate = 
  (Users who used feature) / (Users with access to feature)
```

---

## Example: Adding AI Chat Feature

### Step 1: Add to `features.ts`

```typescript
// Add to FeatureId type
export type FeatureId = 
  // ... existing
  | 'ai_chat';

// Add to FEATURES object
export const FEATURES: Record<FeatureId, FeatureConfig> = {
  // ... existing features ...
  
  ai_chat: {
    id: 'ai_chat',
    name: 'AI Chat',
    description: 'Chat with an AI assistant about your coursework',
    category: 'ai',
    plans: ['northstar_pro'],
    requiresUpgrade: true,
    statsigGate: 'ai_chat_enabled',
    statsigEvents: {
      used: 'ai_chat_message_sent',
      attempted: 'ai_chat_attempted',
      upgraded: 'upgraded_for_ai_chat',
    },
    hasUsageLimits: true,
    limits: {
      basic: 0,
      pro: 'unlimited',
    },
    usageMetric: 'count',
    icon: 'message-circle',
    upgradeMessage: 'Upgrade to Pro for unlimited AI chat',
    learnMoreUrl: '/features/ai-chat',
  },
};
```

### Step 2: Create Statsig Gate

1. Go to Statsig Console
2. Create gate: `ai_chat_enabled`
3. Enable for 100% of Pro users

### Step 3: Implement in Code

```tsx
import { useFeature } from '../hooks/useFeatureGate';
import FeatureUpgradePrompt from '../components/FeatureUpgradePrompt';

function AIChatButton() {
  const { hasAccess, trackUsage } = useFeature('ai_chat');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  
  const handleOpenChat = () => {
    if (!hasAccess) {
      trackUsage(); // Track attempt
      setShowUpgrade(true);
      return;
    }
    
    trackUsage({ action: 'chat_opened' });
    setChatOpen(true);
  };
  
  return (
    <>
      <button onClick={handleOpenChat}>
        💬 AI Chat {!hasAccess && '🔒'}
      </button>
      
      {chatOpen && <AIChatModal />}
      
      <FeatureUpgradePrompt
        featureId="ai_chat"
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
      />
    </>
  );
}
```

### Step 4: Monitor Results

Check in Statsig after 1 week:
- How many Basic users attempted AI chat?
- What's the upgrade conversion rate?
- Are Pro users actually using it?
- Should we adjust pricing or features?

---

## Stripe Configuration

### 1. Add Feature to Products

In Stripe Dashboard:

**Northstar Pro Product:**
```json
{
  "metadata": {
    "features": [
      "ai_study_buddy",
      "academic_analytics",
      "ai_chat",
      "unlimited_storage",
      "unlimited_ai"
    ]
  }
}
```

### 2. Feature-Based Pricing (Optional)

You can also create add-on products for individual features:

```
Product: AI Chat Add-on
Price: $2.99/month
Metadata: feature=ai_chat
```

---

## Testing

### Test Feature Access

```tsx
// Test 1: Basic user shouldn't see Pro feature
const { hasAccess } = useFeatureGate();
console.assert(!hasAccess('ai_study_buddy'), 'Basic user should not have access');

// Test 2: Pro user should see Pro feature
// (upgrade to Pro first)
console.assert(hasAccess('ai_study_buddy'), 'Pro user should have access');

// Test 3: Track usage
trackUsage('ai_study_buddy', { test: true });
// Check Statsig console for event
```

### Test Statsig Gates

```tsx
// Disable a feature gate in Statsig
// Verify it's blocked even for Pro users
const { hasAccess, checkAccess } = useFeatureGate();
const access = checkAccess('ai_study_buddy');
console.log(access.reason); // Should be 'feature_flag'
```

---

## Troubleshooting

### Feature shows as locked even on Pro plan

**Check:**
1. User's plan: `getCurrentPlan()?.plan` should be `'northstar_pro'`
2. Feature's `plans` array includes the user's plan
3. Statsig gate (if configured) is enabled
4. Account status is not `'suspended'`

### Events not appearing in Statsig

**Check:**
1. Statsig initialized in `app/root.tsx`
2. `trackUsage()` is being called
3. Event names match exactly
4. Statsig client has user ID

### Wrong upgrade prompt showing

**Check:**
1. `upgradeMessage` in feature config
2. `getUpgradeInfo()` returns correct feature
3. Component using correct `featureId`

---

## Next Steps

1. **Review Pre-Configured Features** - Edit `app/config/features.ts` to match your needs
2. **Set Up Statsig Gates** - Create feature gates for all features with `statsigGate`
3. **Implement in Your Components** - Use patterns from `FeatureGatingExample.tsx`
4. **Monitor Analytics** - Set up Statsig dashboards to track usage and conversions
5. **A/B Test Features** - Experiment with different feature configurations

---

## Resources

- **Full Guide:** `FEATURE_GATING_GUIDE.md`
- **Examples:** `app/components/examples/FeatureGatingExample.tsx`
- **Statsig Docs:** https://docs.statsig.com/
- **Clerk Billing:** https://clerk.com/docs/guides/development/custom-flows/billing

---

## Support

If you have questions:
1. Check the examples in `FeatureGatingExample.tsx`
2. Read the full guide in `FEATURE_GATING_GUIDE.md`
3. Review Statsig documentation
4. Check console logs for detailed error messages

Happy feature gating! 🚀


