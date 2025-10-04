import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Track all costs associated with users to calculate unit economics
 */

// Cost per 1M tokens for different AI models (update these based on your actual costs)
const AI_COSTS = {
  "gemini-pro": {
    input: 0.50,  // $0.50 per 1M input tokens
    output: 1.50, // $1.50 per 1M output tokens
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

// Log AI usage and cost
export const logAIUsage = mutation({
  args: {
    userId: v.id("users"),
    feature: v.string(), // "assignment-parser", "ocr", "email-parser", etc.
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Calculate cost
    const modelCost = AI_COSTS[args.model] || AI_COSTS["gemini-pro"];
    const inputCost = (args.inputTokens / 1_000_000) * modelCost.input;
    const outputCost = (args.outputTokens / 1_000_000) * modelCost.output;
    const totalCost = inputCost + outputCost;

    // Log the usage
    const usageId = await ctx.db.insert("aiUsageLogs", {
      userId: args.userId,
      feature: args.feature,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens: args.inputTokens + args.outputTokens,
      costUSD: totalCost,
      timestamp: Date.now(),
      metadata: args.metadata,
    });

    // Update user's total cost
    await updateUserTotalCost(ctx, args.userId);

    return { usageId, cost: totalCost };
  },
});

// Log API usage and cost
export const logAPIUsage = mutation({
  args: {
    userId: v.id("users"),
    service: v.string(), // "d2l", "clerk", "ocr", etc.
    endpoint: v.string(),
    requestCount: v.number(),
    costUSD: v.number(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const usageId = await ctx.db.insert("apiUsageLogs", {
      userId: args.userId,
      service: args.service,
      endpoint: args.endpoint,
      requestCount: args.requestCount,
      costUSD: args.costUSD,
      timestamp: Date.now(),
      metadata: args.metadata,
    });

    await updateUserTotalCost(ctx, args.userId);

    return { usageId, cost: args.costUSD };
  },
});

// Log storage costs
export const logStorageCost = mutation({
  args: {
    userId: v.id("users"),
    storageType: v.string(), // "convex", "s3", etc.
    bytesStored: v.number(),
    costUSD: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const usageId = await ctx.db.insert("storageCostLogs", {
      userId: args.userId,
      storageType: args.storageType,
      bytesStored: args.bytesStored,
      costUSD: args.costUSD,
      timestamp: Date.now(),
    });

    await updateUserTotalCost(ctx, args.userId);

    return { usageId, cost: args.costUSD };
  },
});

// Log revenue (subscriptions, payments, etc.)
export const logRevenue = mutation({
  args: {
    userId: v.id("users"),
    revenueType: v.string(), // "subscription", "one-time", "usage"
    amountUSD: v.number(),
    description: v.string(),
    billingPeriodStart: v.optional(v.number()),
    billingPeriodEnd: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const revenueId = await ctx.db.insert("revenueLog", {
      userId: args.userId,
      revenueType: args.revenueType,
      amountUSD: args.amountUSD,
      description: args.description,
      billingPeriodStart: args.billingPeriodStart,
      billingPeriodEnd: args.billingPeriodEnd,
      timestamp: Date.now(),
      metadata: args.metadata,
    });

    await updateUserTotalRevenue(ctx, args.userId);

    return { revenueId, amount: args.amountUSD };
  },
});

// Helper function to update user's total cost
async function updateUserTotalCost(ctx: any, userId: any) {
  // Get all cost logs for the user
  const aiCosts = await ctx.db
    .query("aiUsageLogs")
    .filter((q: any) => q.eq(q.field("userId"), userId))
    .collect();

  const apiCosts = await ctx.db
    .query("apiUsageLogs")
    .filter((q: any) => q.eq(q.field("userId"), userId))
    .collect();

  const storageCosts = await ctx.db
    .query("storageCostLogs")
    .filter((q: any) => q.eq(q.field("userId"), userId))
    .collect();

  const totalAICost = aiCosts.reduce((sum: number, log: any) => sum + log.costUSD, 0);
  const totalAPICost = apiCosts.reduce((sum: number, log: any) => sum + log.costUSD, 0);
  const totalStorageCost = storageCosts.reduce((sum: number, log: any) => sum + log.costUSD, 0);

  const totalCost = totalAICost + totalAPICost + totalStorageCost;

  // Update or create user cost summary
  const existingSummary = await ctx.db
    .query("userCostSummary")
    .filter((q: any) => q.eq(q.field("userId"), userId))
    .first();

  if (existingSummary) {
    await ctx.db.patch(existingSummary._id, {
      totalCostUSD: totalCost,
      aiCostUSD: totalAICost,
      apiCostUSD: totalAPICost,
      storageCostUSD: totalStorageCost,
      lastUpdated: Date.now(),
    });
  } else {
    await ctx.db.insert("userCostSummary", {
      userId,
      totalCostUSD: totalCost,
      aiCostUSD: totalAICost,
      apiCostUSD: totalAPICost,
      storageCostUSD: totalStorageCost,
      totalRevenueUSD: 0,
      profitMarginUSD: -totalCost,
      lastUpdated: Date.now(),
    });
  }
}

// Helper function to update user's total revenue
async function updateUserTotalRevenue(ctx: any, userId: any) {
  const revenueEntries = await ctx.db
    .query("revenueLog")
    .filter((q: any) => q.eq(q.field("userId"), userId))
    .collect();

  const totalRevenue = revenueEntries.reduce((sum: number, log: any) => sum + log.amountUSD, 0);

  const existingSummary = await ctx.db
    .query("userCostSummary")
    .filter((q: any) => q.eq(q.field("userId"), userId))
    .first();

  const totalCost = existingSummary?.totalCostUSD || 0;

  if (existingSummary) {
    await ctx.db.patch(existingSummary._id, {
      totalRevenueUSD: totalRevenue,
      profitMarginUSD: totalRevenue - totalCost,
      lastUpdated: Date.now(),
    });
  } else {
    await ctx.db.insert("userCostSummary", {
      userId,
      totalCostUSD: 0,
      aiCostUSD: 0,
      apiCostUSD: 0,
      storageCostUSD: 0,
      totalRevenueUSD: totalRevenue,
      profitMarginUSD: totalRevenue,
      lastUpdated: Date.now(),
    });
  }
}

// Get user cost summary
export const getUserCostSummary = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("userCostSummary")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
  },
});

// Get detailed cost breakdown for a user
export const getUserCostBreakdown = query({
  args: {
    userId: v.id("users"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const start = args.startDate || 0;
    const end = args.endDate || Date.now();

    // Get all cost logs within date range
    const aiLogs = await ctx.db
      .query("aiUsageLogs")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.gte(q.field("timestamp"), start),
          q.lte(q.field("timestamp"), end)
        )
      )
      .collect();

    const apiLogs = await ctx.db
      .query("apiUsageLogs")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.gte(q.field("timestamp"), start),
          q.lte(q.field("timestamp"), end)
        )
      )
      .collect();

    const storageLogs = await ctx.db
      .query("storageCostLogs")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.gte(q.field("timestamp"), start),
          q.lte(q.field("timestamp"), end)
        )
      )
      .collect();

    const revenueLogs = await ctx.db
      .query("revenueLog")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.gte(q.field("timestamp"), start),
          q.lte(q.field("timestamp"), end)
        )
      )
      .collect();

    // Calculate totals
    const aiCost = aiLogs.reduce((sum, log) => sum + log.costUSD, 0);
    const apiCost = apiLogs.reduce((sum, log) => sum + log.costUSD, 0);
    const storageCost = storageLogs.reduce((sum, log) => sum + log.costUSD, 0);
    const revenue = revenueLogs.reduce((sum, log) => sum + log.amountUSD, 0);

    const totalCost = aiCost + apiCost + storageCost;
    const profit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Group AI costs by feature
    const aiCostsByFeature = aiLogs.reduce((acc, log) => {
      acc[log.feature] = (acc[log.feature] || 0) + log.costUSD;
      return acc;
    }, {} as Record<string, number>);

    // Group API costs by service
    const apiCostsByService = apiLogs.reduce((acc, log) => {
      acc[log.service] = (acc[log.service] || 0) + log.costUSD;
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: {
        totalCost,
        totalRevenue: revenue,
        profit,
        profitMargin,
      },
      costs: {
        ai: {
          total: aiCost,
          byFeature: aiCostsByFeature,
          logs: aiLogs,
        },
        api: {
          total: apiCost,
          byService: apiCostsByService,
          logs: apiLogs,
        },
        storage: {
          total: storageCost,
          logs: storageLogs,
        },
      },
      revenue: {
        total: revenue,
        logs: revenueLogs,
      },
    };
  },
});

// Get all users cost summary for admin dashboard
export const getAllUsersCostSummary = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // TODO: Add admin role check here
    // For now, anyone authenticated can access

    const summaries = await ctx.db.query("userCostSummary").collect();

    // Get user details for each summary
    const summariesWithUsers = await Promise.all(
      summaries.map(async (summary) => {
        const user = await ctx.db.get(summary.userId);
        return {
          ...summary,
          user: user ? {
            _id: user._id,
            clerkUserId: user.clerkUserId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          } : null,
        };
      })
    );

    // Calculate aggregate metrics
    const totalCost = summaries.reduce((sum, s) => sum + s.totalCostUSD, 0);
    const totalRevenue = summaries.reduce((sum, s) => sum + s.totalRevenueUSD, 0);
    const totalProfit = totalRevenue - totalCost;
    const avgCostPerUser = totalCost / summaries.length || 0;
    const avgRevenuePerUser = totalRevenue / summaries.length || 0;

    return {
      users: summariesWithUsers.sort((a, b) => b.profitMarginUSD - a.profitMarginUSD),
      aggregates: {
        totalUsers: summaries.length,
        totalCost,
        totalRevenue,
        totalProfit,
        avgCostPerUser,
        avgRevenuePerUser,
        profitableUsers: summaries.filter(s => s.profitMarginUSD > 0).length,
        unprofitableUsers: summaries.filter(s => s.profitMarginUSD <= 0).length,
      },
    };
  },
});

