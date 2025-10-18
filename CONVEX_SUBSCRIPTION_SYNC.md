# Convex Subscription Sync - Implementation Summary

## Overview
The billing system now properly syncs subscription data from Stripe → Clerk → Convex, ensuring the user's subscription information is stored in all three places for fast access and reliability.

## Data Flow

```
Stripe (Payment) → Clerk (User Metadata) → Convex (Database)
```

### 1. **Stripe** (Source of Truth for Billing)
- Handles actual payment processing
- Stores subscription details (plan, status, billing cycle)
- Price IDs: 
  - `price_1SIZnd85FHQX10MtedhBiK6G` → northstar_basic
  - `price_1SIa5i85FHQX10MtUTMDf3P3` → northstar_pro

### 2. **Clerk** (Authentication & User Metadata)
- Stores subscription in `user.publicMetadata.subscription`:
  ```typescript
  {
    plan: 'northstar_basic' | 'northstar_pro' | null,
    status: 'active' | 'canceled' | 'suspended',
    subscriptionId: 'sub_xxx',
    stripeCustomerId: 'cus_xxx',
    currentPeriodEnd: timestamp,
    cancelAtPeriodEnd: boolean,
    accountStatus: 'active' | 'suspended'
  }
  ```

### 3. **Convex** (Fast Database Access)
- Mirrors Clerk data in the `users` table:
  - `subscriptionPlan`
  - `subscriptionStatus`
  - `subscriptionId`
  - `stripeCustomerId`
  - `currentPeriodEnd`
  - `cancelAtPeriodEnd`
  - `accountStatus`

## Implementation Files

### Backend (API Routes)

#### `/app/routes/api.billing.sync-subscription.tsx`
- Fetches subscription data from Stripe
- Updates Clerk user metadata
- Returns subscription details for frontend to update Convex

**Key Features:**
- Fetches ALL subscriptions (not just active ones)
- Prioritizes active/trialing/past_due subscriptions
- Handles `null` date values gracefully
- Maps Stripe price IDs to plan names

### Frontend (Hooks)

#### `/app/hooks/useClerkBilling.ts`
- `syncSubscription()` function:
  1. Calls the sync API endpoint
  2. Reloads Clerk user data
  3. **Updates Convex database** with subscription details
  4. Includes `accountStatus` logic

**Key Code:**
```typescript
const accountStatus = (subscription.plan && subscription.plan !== 'free_user' && subscription.status === 'active') 
  ? 'active' 
  : 'suspended';

await updateUserSubscription({
  clerkUserId: user.id,
  subscriptionPlan: subscription.plan || null,
  subscriptionStatus: subscription.status || 'active',
  subscriptionId: subscription.subscriptionId,
  stripeCustomerId: subscription.stripeCustomerId,
  currentPeriodEnd: subscription.currentPeriodEnd,
  cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
  accountStatus: accountStatus,
});
```

### Convex Functions

#### `/convex/subscriptions.ts`

**`updateUserSubscription` mutation:**
- Finds user by `clerkUserId`
- Updates all subscription fields
- Supports `null` for `subscriptionPlan`
- Includes `accountStatus` field
- Returns success status

**`getUserSubscription` query:**
- Fetches user subscription from Convex
- Returns plan, status, and all billing details

**`userHasPlan` query:**
- Checks if user has a specific plan
- Returns boolean

### Schema

#### `/convex/schema.ts`
- `users` table includes all subscription fields
- Fields are optional to support users without subscriptions
- `accountStatus` field controls app access

## Automatic Sync Triggers

### 1. **On Successful Checkout**
When the user completes a Stripe checkout and returns to the app with `?checkout=success`:

**File:** `app/components/SettingsModal.tsx`
```typescript
useEffect(() => {
  const checkoutStatus = searchParams.get('checkout');
  if (checkoutStatus === 'success' && isOpen) {
    syncSubscription().then(() => {
      success('Subscription activated successfully!');
      if (user) {
        user.reload();
      }
    });
  }
}, [searchParams, isOpen, syncSubscription, success, user]);
```

### 2. **Manual Sync**
Users can manually trigger a sync by:
- Refreshing the page
- Opening Settings → Billing tab
- The sync button (if implemented)

### 3. **Stripe Webhooks (Future)**
For real-time updates, implement webhooks in:
`/app/routes/api.webhooks.stripe.tsx`

## Testing the Sync

### Manual Test via cURL:
```bash
curl -X POST http://localhost:5173/api/billing/sync-subscription \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_338DQFCFvYdvpfXqGunppiewTKh"}' | jq .
```

### Verify in Convex Dashboard:
1. Go to https://dashboard.convex.dev
2. Select "northstar-backend" project
3. Navigate to Data → users table
4. Find user with matching `clerkUserId`
5. Check subscription fields are populated

### Verify in Browser:
1. Open the app
2. Go to Settings → Billing
3. Check that plan shows "Northstar Basic" (or current plan)
4. Status should be "Active"
5. Usage bars should reflect the correct limits

## Troubleshooting

### Subscription not syncing?
1. **Check Browser Console** for Convex errors
2. **Check Terminal** for API route errors
3. **Verify Stripe Data** - ensure subscription exists
4. **Check Clerk Metadata** - ensure it's updated
5. **Test Convex Mutation** - call it manually from console

### Common Issues:

#### "User not found for Clerk ID"
- User hasn't been created in Convex yet
- Solution: Create user via `useUserSetup` hook

#### "Failed to update Convex (non-fatal)"
- Convex client not authenticated
- Solution: Check Clerk → Convex auth config

#### Data not appearing immediately
- User data needs to be reloaded
- Solution: Call `user.reload()` after sync

## Business Rules

### Account Status Logic:
```typescript
accountStatus = (plan !== null && plan !== 'free_user' && status === 'active')
  ? 'active'
  : 'suspended'
```

### No Free Tier:
- Users MUST have an active subscription (Basic or Pro)
- Canceled/expired subscriptions → account suspended
- No access to app features when suspended

### Upgrade/Downgrade:
- **Upgrade (Basic → Pro)**: Immediate access to Pro features
- **Downgrade (Pro → Basic)**: Shows warning about data loss
- All plan changes handled through Stripe checkout

## Future Improvements

1. **Real-time Webhooks**: Listen to Stripe events for instant updates
2. **Retry Logic**: Retry failed Convex updates
3. **Queue System**: Handle bulk subscription updates
4. **Admin Dashboard**: Manually sync subscriptions for support
5. **Audit Log**: Track all subscription changes

## Related Files
- `app/hooks/useClerkBilling.ts` - Main billing hook
- `app/routes/api.billing.sync-subscription.tsx` - Sync API endpoint
- `app/routes/api.billing.create-checkout.tsx` - Checkout creation
- `convex/subscriptions.ts` - Convex mutations/queries
- `convex/schema.ts` - Database schema
- `app/components/SettingsModal.tsx` - Billing UI
- `app/components/UsageStats.tsx` - Usage display

## Notes
- Convex update is **non-blocking** - if it fails, Clerk still has the data
- Always use Clerk metadata as source of truth in frontend
- Convex is used for faster queries and offline access
- Stripe webhooks should be the ultimate source of truth


