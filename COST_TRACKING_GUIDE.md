# Cost Tracking & Unit Economics Guide

## Overview

This system tracks all costs and revenue per user to give you complete visibility into unit economics. You can see exactly how much each user costs vs. how much they're paying, enabling data-driven decisions on pricing, features, and profitability.

## What's Tracked

### 💰 Costs
1. **AI Usage** - Token usage for Gemini, GPT, etc.
2. **API Calls** - D2L, Clerk, OCR, and other external APIs
3. **Storage** - Convex storage, S3, file storage
4. **Compute** - Convex functions, serverless costs (can be added)

### 💵 Revenue
1. **Subscriptions** - Monthly/annual recurring revenue
2. **One-time Payments** - Setup fees, one-time purchases
3. **Usage-based Billing** - Pay-per-use features

## Database Schema

The system uses 5 Convex tables:

### `aiUsageLogs`
Tracks every AI API call with token usage and calculated costs.
```typescript
{
  userId: Id<"users">,
  feature: "assignment-parser" | "ocr" | "email-parser" | ...,
  model: "gemini-pro" | "gpt-4" | ...,
  inputTokens: number,
  outputTokens: number,
  totalTokens: number,
  costUSD: number, // Automatically calculated
  timestamp: number,
  metadata?: any,
}
```

### `apiUsageLogs`
Tracks external API usage and costs.
```typescript
{
  userId: Id<"users">,
  service: "d2l" | "clerk" | "ocr" | ...,
  endpoint: string,
  requestCount: number,
  costUSD: number,
  timestamp: number,
  metadata?: any,
}
```

### `storageCostLogs`
Tracks storage costs over time.
```typescript
{
  userId: Id<"users">,
  storageType: "convex" | "s3" | ...,
  bytesStored: number,
  costUSD: number,
  timestamp: number,
}
```

### `revenueLog`
Tracks all revenue from users.
```typescript
{
  userId: Id<"users">,
  revenueType: "subscription" | "one-time" | "usage",
  amountUSD: number,
  description: string,
  billingPeriodStart?: number,
  billingPeriodEnd?: number,
  timestamp: number,
  metadata?: any,
}
```

### `userCostSummary`
Aggregated view of costs and revenue per user.
```typescript
{
  userId: Id<"users">,
  totalCostUSD: number,        // Sum of all costs
  aiCostUSD: number,           // AI-specific costs
  apiCostUSD: number,          // API-specific costs
  storageCostUSD: number,      // Storage costs
  totalRevenueUSD: number,     // Total revenue from user
  profitMarginUSD: number,     // revenue - cost
  lastUpdated: number,
}
```

## Usage Examples

### 1. Track AI Usage (Most Common)

```typescript
import { useCostTracking } from "~/hooks/useCostTracking";
import { useMutation } from "convex/react";
import { api } from "~/convex/_generated/api";

function AIFeatureComponent() {
  const { trackAICost } = useCostTracking();
  const parseAssignment = useMutation(api.aiParser.parseAssignmentFromText);

  const handleParse = async (text: string) => {
    // Make AI API call
    const result = await parseAssignment({
      text,
      model: "gemini-pro",
    });

    // Track the cost
    await trackAICost(
      currentUser._id,
      "assignment-parser",     // feature
      "gemini-pro",            // model
      500,                     // input tokens
      200,                     // output tokens
      {
        assignmentCount: result.assignments.length,
        textLength: text.length,
      }
    );

    return result;
  };

  return <button onClick={() => handleParse(text)}>Parse</button>;
}
```

### 2. Track API Calls

```typescript
const { trackAPICost } = useCostTracking();

// Example: D2L API call
const syncFromD2L = async () => {
  const result = await d2lAPI.sync();

  // Track the cost
  // D2L API costs approximately $0.01 per 100 requests
  const costPerRequest = 0.0001;
  await trackAPICost(
    userId,
    "d2l",                           // service
    "/api/courses",                  // endpoint
    result.requestCount,             // number of requests
    result.requestCount * costPerRequest,  // total cost
    {
      itemsSynced: result.itemCount,
      syncType: "automatic",
    }
  );
};
```

### 3. Track Storage Costs

```typescript
const { trackStorageCost } = useCostTracking();

// Example: File upload
const handleFileUpload = async (file: File) => {
  const result = await uploadFile(file);

  // Convex storage: $0.25 per GB-month
  // Approximate monthly cost for this file
  const gbStored = file.size / (1024 ** 3);
  const monthlyCost = gbStored * 0.25;

  await trackStorageCost(
    userId,
    "convex",              // storage type
    file.size,             // bytes stored
    monthlyCost,           // cost USD
  );
};
```

### 4. Track Revenue

```typescript
const { trackRevenue } = useCostTracking();

// Example: Monthly subscription payment
const handleSubscriptionPayment = async (payment: Payment) => {
  await trackRevenue(
    userId,
    "subscription",                    // revenue type
    9.99,                              // amount USD
    "Monthly Pro Subscription",        // description
    Date.now(),                        // billing period start
    Date.now() + (30 * 24 * 60 * 60 * 1000), // billing period end (30 days)
    {
      plan: "pro",
      paymentMethod: "card",
      stripePaymentId: payment.id,
    }
  );
};

// Example: One-time payment
const handleOneTimePayment = async () => {
  await trackRevenue(
    userId,
    "one-time",
    49.99,
    "Lifetime Access Purchase",
    undefined,  // no billing period
    undefined,
    { feature: "lifetime-access" }
  );
};
```

## Pricing Configuration

Update AI model costs in `convex/userCosts.ts`:

```typescript
const AI_COSTS = {
  "gemini-pro": {
    input: 0.50,   // $0.50 per 1M input tokens
    output: 1.50,  // $1.50 per 1M output tokens
  },
  "gemini-1.5-pro": {
    input: 3.50,
    output: 10.50,
  },
  "gemini-1.5-flash": {
    input: 0.075,
    output: 0.30,
  },
  "gpt-4": {
    input: 30.00,
    output: 60.00,
  },
  "gpt-3.5-turbo": {
    input: 0.50,
    output: 1.50,
  },
};
```

## Querying Cost Data

### Get Single User Cost Summary

```typescript
import { useQuery } from "convex/react";
import { api } from "~/convex/_generated/api";

function UserCostSummary({ userId }) {
  const summary = useQuery(api.userCosts.getUserCostSummary, { userId });

  if (!summary) return <div>Loading...</div>;

  return (
    <div>
      <h3>Cost Summary</h3>
      <p>Total Cost: ${summary.totalCostUSD.toFixed(2)}</p>
      <p>Total Revenue: ${summary.totalRevenueUSD.toFixed(2)}</p>
      <p>Profit: ${summary.profitMarginUSD.toFixed(2)}</p>

      <h4>Cost Breakdown:</h4>
      <ul>
        <li>AI: ${summary.aiCostUSD.toFixed(2)}</li>
        <li>API: ${summary.apiCostUSD.toFixed(2)}</li>
        <li>Storage: ${summary.storageCostUSD.toFixed(2)}</li>
      </ul>
    </div>
  );
}
```

### Get Detailed Cost Breakdown

```typescript
const breakdown = useQuery(api.userCosts.getUserCostBreakdown, {
  userId,
  startDate: Date.now() - (30 * 24 * 60 * 60 * 1000), // Last 30 days
  endDate: Date.now(),
});

// Returns:
{
  summary: {
    totalCost: 12.50,
    totalRevenue: 29.99,
    profit: 17.49,
    profitMargin: 58.3, // percentage
  },
  costs: {
    ai: {
      total: 8.20,
      byFeature: {
        "assignment-parser": 5.00,
        "ocr": 2.20,
        "email-parser": 1.00,
      },
      logs: [...], // Full AI usage logs
    },
    api: {
      total: 3.30,
      byService: {
        "d2l": 2.50,
        "ocr": 0.80,
      },
      logs: [...], // Full API logs
    },
    storage: {
      total: 1.00,
      logs: [...], // Storage logs
    },
  },
  revenue: {
    total: 29.99,
    logs: [...], // Revenue logs
  },
}
```

### Get All Users Cost Summary (Admin)

```typescript
const allUsers = useQuery(api.userCosts.getAllUsersCostSummary);

// Returns:
{
  users: [
    {
      userId: "...",
      totalCostUSD: 12.50,
      totalRevenueUSD: 29.99,
      profitMarginUSD: 17.49,
      user: {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      }
    },
    // ... more users sorted by profit margin
  ],
  aggregates: {
    totalUsers: 150,
    totalCost: 1875.50,
    totalRevenue: 4498.50,
    totalProfit: 2623.00,
    avgCostPerUser: 12.50,
    avgRevenuePerUser: 29.99,
    profitableUsers: 142,    // profit > 0
    unprofitableUsers: 8,    // profit <= 0
  },
}
```

## PostHog Integration

All cost data is automatically sent to PostHog as custom events and user properties.

### PostHog Events Created:

- `ai_usage` - Every AI API call with tokens and cost
- `api_call` - API calls with cost information
- `storage_cost_logged` - Storage cost events
- `revenue_logged` - Revenue events

### User Properties Updated:

```javascript
// Automatically set on user identification
{
  total_cost_usd: 12.50,
  total_revenue_usd: 29.99,
  profit_margin_usd: 17.49,
  ai_cost_usd: 8.20,
  api_cost_usd: 3.30,
  storage_cost_usd: 1.00,
  ltv: 29.99, // Lifetime value
  cac: 0, // Customer acquisition cost (if tracked)
}
```

## Creating Custom Dashboards

### In PostHog

1. **LTV vs CAC by Cohort**
   - Group users by signup date
   - Compare lifetime value vs acquisition cost
   - Identify most valuable cohorts

2. **Feature Cost Analysis**
   - Filter AI usage by feature
   - Sum costs per feature
   - Identify expensive features

3. **Profitability Over Time**
   - Line chart: revenue vs cost over time
   - Calculate profit margin percentage
   - Identify trends

4. **User Segmentation by Profitability**
   - Create cohorts based on profit margin
   - Analyze behavior differences
   - Target unprofitable users for upsells

### Example Queries

**Most Expensive Features:**
```
Event: ai_usage
Group by: feature
Aggregate: Sum of costUSD
Sort: Descending
```

**Users with Negative Margins:**
```
User property: profit_margin_usd < 0
Count: Total users
```

**Average AI Cost per User per Day:**
```
Event: ai_usage
Aggregate: Sum of costUSD / Unique users / Days
```

## Best Practices

1. **Track Everything** - Every AI call, API request, and storage operation should be tracked
2. **Real-time Tracking** - Track costs immediately when they occur, not in batch jobs
3. **Add Metadata** - Include context like feature names, user actions, etc.
4. **Monitor Alerts** - Set up alerts for users exceeding cost thresholds
5. **Optimize Expensive Features** - Use data to identify and optimize high-cost features
6. **Pricing Strategy** - Use cost data to inform pricing decisions
7. **User Communication** - Show users their usage to encourage upgrades

## Cost Optimization Strategies

### Based on Data:

1. **Identify High-Cost Users**
   ```typescript
   // Find users with cost > revenue
   const unprofitableUsers = allUsers.users.filter(
     u => u.profitMarginUSD < 0
   );
   ```

2. **Feature-Specific Limits**
   ```typescript
   // Implement usage limits for expensive features
   const userCost = await getUserCostSummary({ userId });
   if (userCost.aiCostUSD > 10) {
     // Suggest upgrade or limit AI features
   }
   ```

3. **Tiered Pricing**
   - Free tier: $0 cost/month
   - Basic tier: Up to $5 cost/month → $9.99/month revenue
   - Pro tier: Up to $20 cost/month → $29.99/month revenue
   - Enterprise: Unlimited → Custom pricing

4. **Usage-based Add-ons**
   - Charge $0.10 per AI analysis after monthly limit
   - Charge $0.05 per D2L sync operation
   - Charge $1.00 per GB storage over limit

## Monitoring & Alerts

### Create Alerts For:

1. **User Exceeds Cost Threshold**
   ```typescript
   if (summary.totalCostUSD > 50) {
     // Send alert to admin
     // Consider account review
   }
   ```

2. **Negative Margin Alert**
   ```typescript
   if (summary.profitMarginUSD < -10) {
     // Alert: User losing money
     // Consider limiting features or encouraging upgrade
   }
   ```

3. **High AI Usage Spike**
   ```typescript
   if (todayAICost > avgDailyAICost * 3) {
     // Unusual activity detected
     // Check for abuse or bugs
   }
   ```

## Privacy & Compliance

- ✅ All cost data is aggregated and anonymized for reporting
- ✅ Individual user data requires authentication
- ✅ GDPR compliant - users can request data deletion
- ✅ No sensitive personal information stored in cost logs
- ✅ Costs are internal metrics, not shared with users (unless you choose to)

## Example: Complete Integration

```typescript
import { useCostTracking } from "~/hooks/useCostTracking";
import { useQuery, useMutation } from "convex/react";
import { api } from "~/convex/_generated/api";

function AIFeatureWithCostTracking() {
  const { trackAICost } = useCostTracking();
  const parseAssignment = useMutation(api.aiParser.parseAssignmentFromText);
  const costSummary = useQuery(api.userCosts.getUserCostSummary, {
    userId: currentUser._id
  });

  // Check if user has exceeded cost limits
  const hasExceededLimit = costSummary?.totalCostUSD > 10; // $10 limit for free tier

  const handleParse = async (text: string) => {
    if (hasExceededLimit) {
      // Show upgrade modal
      return showUpgradeModal();
    }

    try {
      // Make AI call
      const result = await parseAssignment({ text, model: "gemini-flash" });

      // Track cost
      await trackAICost(
        currentUser._id,
        "assignment-parser",
        "gemini-1.5-flash",
        estimateInputTokens(text),
        result.outputTokens,
        {
          assignmentCount: result.assignments.length,
          success: true,
        }
      );

      return result;
    } catch (error) {
      // Track failed attempt (still costs money!)
      await trackAICost(
        currentUser._id,
        "assignment-parser",
        "gemini-1.5-flash",
        estimateInputTokens(text),
        0, // No output on error
        {
          success: false,
          error: error.message,
        }
      );

      throw error;
    }
  };

  return (
    <div>
      {costSummary && (
        <div className="cost-indicator">
          Usage: ${costSummary.totalCostUSD.toFixed(2)} / $10.00
          {hasExceededLimit && <UpgradeButton />}
        </div>
      )}
      <button onClick={() => handleParse(text)}>
        Parse Assignment
      </button>
    </div>
  );
}
```

## Troubleshooting

### Costs Not Being Tracked

1. Check authentication is working
2. Verify user ID is correct
3. Check Convex logs for errors
4. Ensure schema is deployed

### Costs Seem Incorrect

1. Verify model pricing in `AI_COSTS`
2. Check token counting logic
3. Review cost calculation formulas
4. Compare with actual API bills

### PostHog Not Showing Cost Data

1. Verify PostHog is initialized
2. Check custom event creation
3. Review PostHog project ingestion

## Support & Resources

- **Convex Dashboard**: Monitor database usage and costs
- **PostHog Dashboard**: Analyze user behavior and costs
- **Stripe Dashboard**: Track actual revenue
- **Cost Tracking Tables**: Review raw data in Convex

## Future Enhancements

- [ ] Automated cost alerts via email/Slack
- [ ] Cost forecasting based on usage trends
- [ ] Automated pricing tier recommendations
- [ ] Cost optimization suggestions
- [ ] Integration with Stripe for revenue tracking
- [ ] ROI calculator per feature
- [ ] Cost budgets per user/team


