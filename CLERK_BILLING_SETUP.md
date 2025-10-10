# Clerk Billing Setup Guide

This guide will help you set up Clerk billing integration for your application.

## Overview

Clerk billing allows you to manage subscriptions and payments directly within your Clerk-powered application. This integration provides:

- Subscription management
- Payment processing via Stripe
- Feature gating based on subscription tiers
- Usage tracking and limits
- Revenue tracking integration

## Prerequisites

1. **Clerk Account**: You need an active Clerk account with an application set up
2. **Stripe Account**: Clerk billing uses Stripe for payment processing
3. **Environment Variables**: Ensure your Clerk keys are configured

## Step 1: Enable Billing in Clerk Dashboard

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **Billing** in the sidebar
4. Click **Enable Billing**
5. Connect your Stripe account when prompted

## Step 2: Create Subscription Plans

In the Clerk Dashboard billing section:

1. Click **Create Plan**
2. Set up your pricing tiers:

### Example Plans:

**Free Plan**
- Price: $0/month
- Features:
  - 10k AI tokens/month
  - 100MB storage
  - Basic features

**Basic Plan**
- Price: $9.99/month
- Features:
  - 100k AI tokens/month
  - 1GB storage
  - Advanced analytics
  - API sync

**Pro Plan**
- Price: $29.99/month
- Features:
  - 1M AI tokens/month
  - 10GB storage
  - Priority support
  - Custom integrations

**Enterprise Plan**
- Price: $99.99/month
- Features:
  - Unlimited tokens
  - Unlimited storage
  - Custom integrations
  - Dedicated support

3. Save each plan with a unique plan ID (e.g., "free", "basic", "pro", "enterprise")

## Step 3: Configure Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Clerk Configuration
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk Billing Webhook
CLERK_WEBHOOK_SECRET=whsec_...

# Stripe Configuration (if using direct Stripe integration)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

## Step 4: Set Up Webhook Endpoint

1. In your Clerk Dashboard, go to **Webhooks**
2. Click **Add Endpoint**
3. Set the endpoint URL to: `https://yourdomain.com/api/webhooks/clerk-billing`
4. Select these events:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.deleted`
   - `subscription.activated`
   - `subscription.canceled`
   - `subscription.past_due`
   - `subscription.unpaid`
   - `subscription.trial_started`
   - `subscription.trial_ended`
   - `payment.succeeded`
   - `payment.failed`

## Step 5: Test the Integration

### 1. Test Subscription Creation

```typescript
import { useBilling } from './hooks/useBilling';

function TestComponent() {
  const { subscribeToPlan } = useBilling();

  const handleSubscribe = async () => {
    try {
      await subscribeToPlan('basic');
      console.log('Subscription created successfully');
    } catch (error) {
      console.error('Subscription failed:', error);
    }
  };

  return <button onClick={handleSubscribe}>Subscribe to Basic</button>;
}
```

### 2. Test Feature Gating

```typescript
import { FeatureGate } from './components/FeatureGate';

function MyFeature() {
  return (
    <FeatureGate feature="ai-parsing">
      <div>This feature is only available with sufficient usage limits</div>
    </FeatureGate>
  );
}
```

### 3. Test Usage Dashboard

Navigate to `/billing` to see the usage dashboard and pricing table.

## Step 6: Customize Plan Limits

Edit the plan limits in `/app/hooks/useBilling.ts`:

```typescript
const PLAN_LIMITS = {
  free: {
    aiUsageLimit: 10000, // 10k tokens per month
    storageLimit: 100 * 1024 * 1024, // 100MB
    price: 0,
    name: 'Free',
  },
  basic: {
    aiUsageLimit: 100000, // 100k tokens per month
    storageLimit: 1024 * 1024 * 1024, // 1GB
    price: 9.99,
    name: 'Basic',
  },
  // ... other plans
};
```

## Step 7: Integrate with Existing Cost Tracking

The billing system integrates with your existing cost tracking system. Revenue from subscriptions is automatically tracked in your `revenueLog` table.

### Track AI Usage Costs

```typescript
import { useCostTracking } from './hooks/useCostTracking';

function AIFeature() {
  const { trackAICost } = useCostTracking();
  const { canAccessFeature } = useBilling();

  const handleAIParsing = async () => {
    if (!canAccessFeature('ai-parsing')) {
      // Show upgrade prompt
      return;
    }

    // Make AI call
    const result = await parseWithAI();

    // Track the cost
    await trackAICost(
      userId,
      'assignment-parser',
      'gemini-pro',
      inputTokens,
      outputTokens
    );
  };
}
```

## Step 8: Add Feature Gates to Existing Components

### Example: Gating AI Features

```typescript
import { FeatureGate } from '../components/FeatureGate';

function AssignmentParser() {
  return (
    <FeatureGate feature="ai-parsing">
      <div className="ai-parser-interface">
        {/* AI parsing UI */}
      </div>
    </FeatureGate>
  );
}
```

### Example: Gating Advanced Analytics

```typescript
function AnalyticsDashboard() {
  return (
    <FeatureGate feature="advanced-analytics">
      <div className="advanced-analytics">
        {/* Advanced analytics UI */}
      </div>
    </FeatureGate>
  );
}
```

## Step 9: Handle Webhook Events

The webhook handler automatically processes subscription events. You can customize the handlers in `/app/routes/api.webhooks.clerk-billing.tsx`:

```typescript
async function handleSubscriptionCreated(data: any) {
  // Update user subscription status
  // Send welcome email
  // Enable premium features
}

async function handlePaymentSucceeded(data: any) {
  // Track revenue in analytics
  // Send payment confirmation
  // Update subscription status
}
```

## Step 10: Monitor and Analytics

### PostHog Integration

Billing events are automatically tracked in PostHog:

- `subscription_created`
- `subscription_canceled`
- `payment_succeeded`
- `payment_failed`

### Cost Tracking Integration

Revenue from subscriptions is tracked in your cost tracking system:

```typescript
// Automatically tracked when subscription is created
await trackRevenue(
  userId,
  'subscription',
  9.99,
  'Basic subscription',
  billingPeriodStart,
  billingPeriodEnd,
  { planId: 'basic', source: 'clerk-billing' }
);
```

## Testing in Development

### Test Cards

Use Stripe test cards for testing:

- **Success**: 4242424242424242
- **Decline**: 4000000000000002
- **Insufficient funds**: 4000000000009995

### Test Webhooks

Use Stripe CLI to test webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/clerk-billing
```

## Production Deployment

1. **Update Environment Variables**: Use production Clerk and Stripe keys
2. **Configure Webhook URL**: Point to your production domain
3. **Test Payments**: Use real payment methods in test mode first
4. **Monitor**: Set up monitoring for failed payments and webhook errors

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**
   - Check webhook URL is correct
   - Verify webhook secret matches
   - Check server logs for errors

2. **Subscription Status Not Updating**
   - Verify webhook events are being processed
   - Check user metadata is being updated
   - Ensure billing context is properly initialized

3. **Feature Gates Not Working**
   - Verify user is authenticated
   - Check subscription status in user metadata
   - Ensure billing hook is properly configured

### Debug Mode

Enable debug logging:

```typescript
// In your billing hook
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Billing state:', { currentPlan, subscriptionStatus, isSubscribed });
}
```

## Security Considerations

1. **Webhook Verification**: Always verify webhook signatures
2. **Environment Variables**: Keep secrets secure
3. **User Data**: Don't expose sensitive billing data to client
4. **Rate Limiting**: Implement rate limiting for subscription endpoints

## Next Steps

1. **Custom Pricing**: Implement custom pricing for enterprise customers
2. **Usage-based Billing**: Add usage-based pricing tiers
3. **Annual Plans**: Offer annual subscriptions with discounts
4. **Team Plans**: Implement organization-based billing
5. **Analytics**: Build detailed billing analytics dashboard

## Support

- **Clerk Documentation**: https://clerk.com/docs/guides/billing
- **Stripe Documentation**: https://stripe.com/docs
- **Webhook Testing**: Use Stripe CLI for local testing

## Example Implementation

See `/app/components/examples/FeatureGateExample.tsx` for a complete example of how to use the billing system in your components.



