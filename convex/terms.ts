import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new term for the user
export const createTerm = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const termId = await ctx.db.insert("terms", {
      userId: args.userId,
      name: args.name,
      lc_name: args.name.toLowerCase(),
      startDate: args.startDate,
      endDate: args.endDate,
      status: args.status,
    });

    // Update user's active term and increment terms created
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.patch(args.userId, {
        currentActiveTerm: termId,
        totalTermsCreated: user.totalTermsCreated + 1,
        updatedAt: Date.now(),
      });
    }

    return termId;
  },
});

// Get user's terms
export const getUserTerms = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const terms = await ctx.db
      .query("terms")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    
    // Sort terms in descending chronological order (newest first)
    return terms.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  },
});

// Get user's terms by Clerk ID (ALL terms, no filtering)
export const getUserTermsByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return [];
    }

    const terms = await ctx.db
      .query("terms")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();
    
    // Sort terms in descending chronological order (newest first)
    return terms.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  },
});

// Get user's accessible terms by Clerk ID (filtered by subscription plan)
// Basic plan: Only returns 2 oldest terms
// Pro plan: Returns all terms
export const getAccessibleUserTerms = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return { terms: [], plan: 'free', limit: 0, lockedCount: 0 };
    }

    const allTerms = await ctx.db
      .query("terms")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    // Sort terms by startDate (oldest first) to preserve the 2 oldest for Basic users
    const sortedTerms = allTerms.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    const subscriptionPlan = user.subscriptionPlan || 'free';
    const BASIC_TERM_LIMIT = 2;

    let accessibleTerms = sortedTerms;
    let lockedTerms: typeof sortedTerms = [];

    // Basic plan users only get access to their 2 oldest terms
    if (subscriptionPlan === 'northstar_basic' && sortedTerms.length > BASIC_TERM_LIMIT) {
      accessibleTerms = sortedTerms.slice(0, BASIC_TERM_LIMIT);
      lockedTerms = sortedTerms.slice(BASIC_TERM_LIMIT);
    }

    return {
      terms: accessibleTerms,
      lockedTerms: lockedTerms,
      plan: subscriptionPlan,
      limit: subscriptionPlan === 'northstar_basic' ? BASIC_TERM_LIMIT : -1, // -1 means unlimited
      lockedCount: lockedTerms.length,
      totalCount: sortedTerms.length,
    };
  },
});

// Create a new term for user by Clerk ID
export const createTermByClerkId = mutation({
  args: {
    clerkUserId: v.string(),
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user has exceeded term limit based on subscription plan
    const existingTerms = await ctx.db
      .query("terms")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    const subscriptionPlan = user.subscriptionPlan || 'free';
    const BASIC_TERM_LIMIT = 2;

    // Basic plan users can only create 2 terms
    if (subscriptionPlan === 'northstar_basic' && existingTerms.length >= BASIC_TERM_LIMIT) {
      throw new Error(`TERM_LIMIT_REACHED:You've reached the ${BASIC_TERM_LIMIT}-term limit for Basic plan. Upgrade to Pro for unlimited terms.`);
    }

    const termId = await ctx.db.insert("terms", {
      userId: user._id,
      name: args.name,
      lc_name: args.name.toLowerCase(),
      startDate: args.startDate,
      endDate: args.endDate,
      status: args.status,
    });

    // Update user's active term and increment terms created
    await ctx.db.patch(user._id, {
      currentActiveTerm: termId,
      totalTermsCreated: user.totalTermsCreated + 1,
      updatedAt: Date.now(),
    });

    return termId;
  },
});

// Get active term based on current date (for extension calls)
export const getActiveTermByDate = mutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get all terms for this user
    const userTerms = await ctx.db
      .query("terms")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    if (userTerms.length === 0) {
      return null;
    }

    // Find the term that contains today's date
    const today = new Date();
    const todayTime = today.getTime();

    let activeTermByDate = null;

    for (const term of userTerms) {
      const startDate = new Date(term.startDate).getTime();
      const endDate = new Date(term.endDate).getTime();
      
      if (todayTime >= startDate && todayTime <= endDate) {
        console.log(`📅 Found active term by date: ${term.name} (${term.startDate} - ${term.endDate})`);
        activeTermByDate = term;
        break;
      }
    }

    // If no term contains today's date, use the most recent term
    if (!activeTermByDate) {
      const sortedTerms = userTerms.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      activeTermByDate = sortedTerms[0];
      console.log(`📅 No term contains current date, using most recent: ${activeTermByDate.name}`);
    }

    return activeTermByDate;
  },
});

// Update user's current active term
export const updateUserActiveTerm = mutation({
  args: {
    clerkUserId: v.string(),
    termId: v.id("terms"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Update user's currentActiveTerm
    console.log(`🔄 Updating user's currentActiveTerm from ${user.currentActiveTerm} to ${args.termId}`);
    await ctx.db.patch(user._id, {
      currentActiveTerm: args.termId,
      updatedAt: Date.now(),
    });

    return { success: true, updatedTermId: args.termId };
  },
});
