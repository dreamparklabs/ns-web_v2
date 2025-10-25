import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Update user's subscription information in Convex
 * This should be called after Stripe subscription changes are synced to Clerk
 */
export const updateUserSubscription = mutation({
  args: {
    clerkUserId: v.string(),
    subscriptionPlan: v.union(v.string(), v.null()),
    subscriptionStatus: v.string(),
    subscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    accountStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      throw new Error(`User not found for Clerk ID: ${args.clerkUserId}`);
    }

    // Build update object with only defined values
    const updateData: any = {
      subscriptionPlan: args.subscriptionPlan || 'free_user', // Default to free_user instead of null
      subscriptionStatus: args.subscriptionStatus,
      updatedAt: Date.now(),
    };

    if (args.subscriptionId !== undefined) {
      updateData.subscriptionId = args.subscriptionId;
    }
    if (args.stripeCustomerId !== undefined) {
      updateData.stripeCustomerId = args.stripeCustomerId;
    }
    if (args.currentPeriodEnd !== undefined) {
      updateData.currentPeriodEnd = args.currentPeriodEnd;
    }
    if (args.cancelAtPeriodEnd !== undefined) {
      updateData.cancelAtPeriodEnd = args.cancelAtPeriodEnd;
    }
    if (args.accountStatus !== undefined) {
      updateData.accountStatus = args.accountStatus;
    }

    // Update subscription fields
    await ctx.db.patch(user._id, updateData);

    console.log(`✅ Updated subscription for user ${args.clerkUserId}:`, {
      plan: args.subscriptionPlan,
      status: args.subscriptionStatus,
      accountStatus: args.accountStatus,
    });

    return {
      success: true,
      userId: user._id,
      subscriptionPlan: args.subscriptionPlan,
      accountStatus: args.accountStatus,
    };
  },
});

/**
 * Get user's subscription information from Convex
 */
export const getUserSubscription = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      return null;
    }

    return {
      plan: user.subscriptionPlan || 'free_user',
      status: user.subscriptionStatus || 'active',
      subscriptionId: user.subscriptionId,
      stripeCustomerId: user.stripeCustomerId,
      currentPeriodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd || false,
      isSubscribed: user.subscriptionPlan && user.subscriptionPlan !== 'free_user' && user.subscriptionStatus === 'active',
    };
  },
});

/**
 * Check if user has access to a specific plan
 */
export const userHasPlan = query({
  args: {
    clerkUserId: v.string(),
    planName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      return false;
    }

    return user.subscriptionPlan === args.planName && user.subscriptionStatus === 'active';
  },
});

