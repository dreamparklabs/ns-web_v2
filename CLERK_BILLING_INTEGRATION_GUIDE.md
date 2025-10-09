# Clerk Billing Integration Guide

This guide explains how to integrate Clerk billing into your application using the official [Clerk Billing documentation](https://clerk.com/docs/nextjs/guides/billing/for-b2c).

## 🚀 Overview

Clerk billing provides a complete solution for managing subscriptions and payments in your B2C SaaS application. It integrates with Stripe for payment processing and provides built-in components for pricing tables and feature gating.

## 📋 Prerequisites

- Clerk account with billing enabled
- Stripe account (or use Clerk's development gateway for testing)
- React Router application with Clerk authentication

## 🔧 Setup Steps

### 1. Enable Billing in Clerk Dashboard

1. Navigate to **Billing Settings** in your Clerk Dashboard
2. Enable billing for your application
3. Choose payment gateway:
   - **Clerk development gateway**: For testing (uses shared Stripe test account)
   - **Your Stripe account**: For production (requires Stripe setup)

### 2. Create Plans and Features

#### Create Plans
1. Go to **Plans** page in Clerk Dashboard
2. Select **Plans for Users** tab
3. Click **Add Plan** and create:
   - **Free Plan**: $0/month with basic features
   - **Student Pro Plan**: $9.99/month with premium features

#### Add Features
1. In each plan, add features like:
   - `basic_dashboard`
   - `assignment_tracking`
   - `calendar_integration`
   - `grade_analytics` (Student Pro only)
   - `ai_recommendations` (Student Pro only)
   - `unlimited_storage` (Student Pro only)
   - `unlimited_terms` (Student Pro only)

### 3. Install Dependencies

```bash
npm install @clerk/clerk-react
```

### 4. Configure Environment Variables

Add to your `.env.local`:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk Billing (if using custom Stripe)
CLERK_STRIPE_PUBLISHABLE_KEY=pk_test_...
CLERK_STRIPE_SECRET_KEY=sk_test_...
```

### 5. Update Your Application

#### Add Billing Context Provider

```tsx
// app/contexts/BillingContext.tsx
import React, { createContext, useContext } from 'react';
import { useClerkBilling } from '../hooks/useClerkBilling';

const BillingContext = createContext<any>(null);

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const billing = useClerkBilling();
  return (
    <BillingContext.Provider value={billing}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within BillingProvider');
  }
  return context;
}
```

#### Update Root Layout

```tsx
// app/root.tsx
import { BillingProvider } from './contexts/BillingContext';

export default function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <PostHogProvider>
          <ThemeProvider>
            <NotificationProvider>
              <BillingProvider>
                <Outlet />
              </BillingProvider>
            </NotificationProvider>
          </ThemeProvider>
        </PostHogProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

## 🎯 Usage Examples

### 1. Using the PricingTable Component

```tsx
import { PricingTable } from '@clerk/nextjs';

export default function PricingPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem' }}>
      <PricingTable />
    </div>
  );
}
```

### 2. Protecting Content with has() Method

```tsx
import { auth } from '@clerk/nextjs/server';

export default async function PremiumContentPage() {
  const { has } = await auth();
  
  const hasPremiumAccess = has({ feature: 'grade_analytics' });
  
  if (!hasPremiumAccess) {
    return <h1>Only Student Pro subscribers can access this content.</h1>;
  }
  
  return <h1>Premium Grade Analytics</h1>;
}
```

### 3. Using the Protect Component

```tsx
import { Protect } from '@clerk/nextjs';

export default function ProtectedContentPage() {
  return (
    <Protect
      feature="ai_recommendations"
      fallback={<p>AI recommendations are available with Student Pro.</p>}
    >
      <h1>AI-Powered Recommendations</h1>
      <p>This content is only visible to Student Pro subscribers.</p>
    </Protect>
  );
}
```

### 4. Checking Plan Access

```tsx
import { useClerkBilling } from '../hooks/useClerkBilling';

function MyComponent() {
  const { hasPlan, hasFeature } = useClerkBilling();
  
  const isStudentPro = hasPlan('student_pro');
  const canAccessAnalytics = hasFeature('grade_analytics');
  
  return (
    <div>
      {isStudentPro && <PremiumFeature />}
      {canAccessAnalytics && <AnalyticsDashboard />}
    </div>
  );
}
```

## 🔄 Webhook Integration

### 1. Create Webhook Endpoint

```tsx
// app/routes/api.webhooks.clerk-billing.tsx
import { Webhook } from 'svix';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET');
  }
  
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');
  
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing required headers', { status: 400 });
  }
  
  const payload = await request.text();
  const body = JSON.parse(payload);
  
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;
  
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', { status: 400 });
  }
  
  const { type, data } = evt;
  
  switch (type) {
    case 'billing.subscription.created':
      console.log('Subscription created:', data);
      break;
    case 'billing.subscription.updated':
      console.log('Subscription updated:', data);
      break;
    case 'billing.subscription.cancelled':
      console.log('Subscription cancelled:', data);
      break;
    default:
      console.log('Unknown webhook type:', type);
  }
  
  return new Response('Webhook received', { status: 200 });
}
```

### 2. Configure Webhook in Clerk Dashboard

1. Go to **Webhooks** in Clerk Dashboard
2. Click **Add Endpoint**
3. Set URL to: `https://yourdomain.com/api/webhooks/clerk-billing`
4. Select events:
   - `billing.subscription.created`
   - `billing.subscription.updated`
   - `billing.subscription.cancelled`
5. Copy the webhook secret and add to `.env.local`:
   ```env
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

## 🎨 Customization

### Custom Pricing Table

```tsx
import { PricingTable } from '@clerk/nextjs';

export default function CustomPricingPage() {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-gray-600">
          Select the plan that best fits your academic needs
        </p>
      </div>
      
      <PricingTable />
      
      <div className="mt-12 text-center text-gray-500">
        <p>All plans include 14-day free trial • Cancel anytime</p>
      </div>
    </div>
  );
}
```

### Feature-Specific Protection

```tsx
// Create reusable components for specific features
export function ProtectGradeAnalytics({ children }: { children: React.ReactNode }) {
  return (
    <Protect 
      feature="grade_analytics" 
      fallback={<UpgradePrompt feature="Grade Analytics" />}
    >
      {children}
    </Protect>
  );
}

export function ProtectAIRecommendations({ children }: { children: React.ReactNode }) {
  return (
    <Protect 
      feature="ai_recommendations" 
      fallback={<UpgradePrompt feature="AI Recommendations" />}
    >
      {children}
    </Protect>
  );
}
```

## 📊 Analytics Integration

### Track Billing Events

```tsx
import { useAnalytics } from '../hooks/useAnalytics';

function BillingComponent() {
  const { track } = useAnalytics();
  
  const handleSubscription = async (planId: string) => {
    try {
      // Subscribe to plan via Clerk
      await subscribeToPlan(planId);
      
      // Track event
      track('subscription_created', {
        plan_id: planId,
        plan_name: planId === 'student_pro' ? 'Student Pro' : 'Free',
        revenue: planId === 'student_pro' ? 9.99 : 0,
      });
    } catch (error) {
      track('subscription_failed', {
        plan_id: planId,
        error: error.message,
      });
    }
  };
  
  return (
    // Your billing UI
  );
}
```

## 🔒 Security Considerations

1. **Webhook Verification**: Always verify webhook signatures
2. **Environment Variables**: Never expose secret keys in client-side code
3. **Feature Gating**: Always verify access on the server side
4. **Rate Limiting**: Implement rate limiting for billing operations

## 🧪 Testing

### Development Testing

1. Use Clerk's development gateway for testing
2. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
3. Test webhook endpoints using ngrok or similar tools

### Production Deployment

1. Switch to your Stripe account in Clerk Dashboard
2. Update environment variables with production keys
3. Configure production webhook endpoints
4. Test with real payment methods

## 📚 Additional Resources

- [Clerk Billing Documentation](https://clerk.com/docs/nextjs/guides/billing/for-b2c)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Webhook Testing](https://clerk.com/docs/webhooks/overview)
- [Clerk Dashboard](https://dashboard.clerk.com/)

## 🆘 Troubleshooting

### Common Issues

1. **Webhook not receiving events**: Check webhook URL and secret
2. **Feature gating not working**: Verify feature names match Clerk Dashboard
3. **Payment failures**: Check Stripe configuration and test cards
4. **Import errors**: Ensure @clerk/clerk-react is installed

### Debug Mode

```tsx
// Enable debug logging
import { ClerkProvider } from '@clerk/clerk-react';

<ClerkProvider 
  publishableKey={PUBLISHABLE_KEY}
  options={{
    debug: process.env.NODE_ENV === 'development'
  }}
>
  {/* Your app */}
</ClerkProvider>
```

## ✅ Checklist

- [ ] Billing enabled in Clerk Dashboard
- [ ] Plans and features created
- [ ] Environment variables configured
- [ ] Billing context provider added
- [ ] Pricing table implemented
- [ ] Feature gating implemented
- [ ] Webhook endpoint created
- [ ] Analytics tracking added
- [ ] Testing completed
- [ ] Production deployment ready

---

**Note**: This integration follows Clerk's official billing approach and is designed to work seamlessly with your existing Clerk authentication setup.