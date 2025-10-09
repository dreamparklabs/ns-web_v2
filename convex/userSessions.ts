import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";

// Track a new user session when they log in
export const trackSession = mutation({
  args: {
    clerkUserId: v.string(),
    sessionId: v.string(),
    deviceInfo: v.object({
      browserName: v.optional(v.string()),
      browserVersion: v.optional(v.string()),
      deviceType: v.optional(v.string()),
      osName: v.optional(v.string()),
      osVersion: v.optional(v.string()),
      deviceVendor: v.optional(v.string()),
      deviceModel: v.optional(v.string()),
      ipAddress: v.optional(v.string()),
      city: v.optional(v.string()),
      country: v.optional(v.string()),
      region: v.optional(v.string()),
      timezone: v.optional(v.string()),
      isp: v.optional(v.string()),
      screenResolution: v.optional(v.string()),
      language: v.optional(v.string()),
      platform: v.optional(v.string()),
      userAgent: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // First, get the Convex user ID from the Clerk user ID
    const convexUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
    
    if (!convexUser) {
      throw new Error("User not found");
    }
    
    // Check if session already exists
    const existingSession = await ctx.db
      .query("userSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (existingSession) {
      // Update existing session
      await ctx.db.patch(existingSession._id, {
        ...args.deviceInfo,
        lastActiveAt: now,
        isActive: true,
        updatedAt: now,
      });
      return existingSession._id;
    } else {
      // Create new session record
      return await ctx.db.insert("userSessions", {
        userId: convexUser._id,
        sessionId: args.sessionId,
        ...args.deviceInfo,
        loginAt: now,
        lastActiveAt: now,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Update session activity timestamp
export const updateSessionActivity = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("userSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (session) {
      await ctx.db.patch(session._id, {
        lastActiveAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Mark session as inactive (when user logs out)
export const deactivateSession = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("userSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (session) {
      await ctx.db.patch(session._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }
  },
});

// Remove session from database and archive it to recurring sessions (when user signs out)
export const removeSession = mutation({
  args: {
    sessionId: v.string(),
    endReason: v.optional(v.union(
      v.literal("manual_signout"),
      v.literal("timeout"),
      v.literal("cleanup"),
      v.literal("bulk_signout")
    )),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("userSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (session) {
      const now = Date.now();
      const sessionDuration = now - session.loginAt;
      
      // Archive session to recurring sessions table
      await ctx.db.insert("recurringUserSessions", {
        userId: session.userId,
        sessionId: session.sessionId,
        browserName: session.browserName,
        browserVersion: session.browserVersion,
        deviceType: session.deviceType,
        osName: session.osName,
        osVersion: session.osVersion,
        deviceVendor: session.deviceVendor,
        deviceModel: session.deviceModel,
        ipAddress: session.ipAddress,
        city: session.city,
        country: session.country,
        region: session.region,
        timezone: session.timezone,
        isp: session.isp,
        screenResolution: session.screenResolution,
        language: session.language,
        platform: session.platform,
        userAgent: session.userAgent,
        customLabel: session.customLabel,
        loginAt: session.loginAt,
        logoutAt: now,
        lastActiveAt: session.lastActiveAt,
        sessionDuration: sessionDuration,
        endReason: args.endReason || "manual_signout",
        createdAt: now,
      });
      
      // Remove from active sessions
      await ctx.db.delete(session._id);
      
      return { archived: true, sessionDuration };
    }
    
    return { archived: false };
  },
});

// Get all active sessions for a user
export const getUserActiveSessions = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // First, get the Convex user ID from the Clerk user ID
    const convexUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
    
    if (!convexUser) {
      return [];
    }
    
    return await ctx.db
      .query("userSessions")
      .withIndex("by_user_active", (q) => 
        q.eq("userId", convexUser._id).eq("isActive", true)
      )
      .collect();
  },
});

// Update custom device label
export const updateDeviceLabel = mutation({
  args: {
    sessionId: v.string(),
    customLabel: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("userSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (session) {
      await ctx.db.patch(session._id, {
        customLabel: args.customLabel,
        updatedAt: Date.now(),
      });
    }
  },
});

// Clean up old inactive sessions (run periodically) - archives them first
export const cleanupInactiveSessions = mutation({
  args: {
    olderThanDays: v.optional(v.number()), // Default 30 days
  },
  handler: async (ctx, args) => {
    const daysOld = args.olderThanDays || 30;
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const now = Date.now();
    
    const inactiveSessions = await ctx.db
      .query("userSessions")
      .withIndex("by_active", (q) => q.eq("isActive", false))
      .filter((q) => q.lt(q.field("lastActiveAt"), cutoffTime))
      .collect();
    
    let archived = 0;
    for (const session of inactiveSessions) {
      const sessionDuration = session.lastActiveAt - session.loginAt;
      
      // Archive session to recurring sessions table before deleting
      await ctx.db.insert("recurringUserSessions", {
        userId: session.userId,
        sessionId: session.sessionId,
        browserName: session.browserName,
        browserVersion: session.browserVersion,
        deviceType: session.deviceType,
        osName: session.osName,
        osVersion: session.osVersion,
        deviceVendor: session.deviceVendor,
        deviceModel: session.deviceModel,
        ipAddress: session.ipAddress,
        city: session.city,
        country: session.country,
        region: session.region,
        timezone: session.timezone,
        isp: session.isp,
        screenResolution: session.screenResolution,
        language: session.language,
        platform: session.platform,
        userAgent: session.userAgent,
        customLabel: session.customLabel,
        loginAt: session.loginAt,
        logoutAt: session.lastActiveAt, // Use lastActiveAt as logout time for inactive sessions
        lastActiveAt: session.lastActiveAt,
        sessionDuration: sessionDuration,
        endReason: "cleanup",
        createdAt: now,
      });
      
      await ctx.db.delete(session._id);
      archived++;
    }
    
    return { cleaned: inactiveSessions.length, archived };
  },
});

// Bulk remove sessions (for user sign out from multiple devices)
export const bulkRemoveSessions = mutation({
  args: {
    sessionIds: v.array(v.string()),
    endReason: v.optional(v.union(
      v.literal("manual_signout"),
      v.literal("timeout"),
      v.literal("cleanup"),
      v.literal("bulk_signout")
    )),
  },
  handler: async (ctx, args) => {
    const results = [];
    const now = Date.now();
    
    for (const sessionId of args.sessionIds) {
      const session = await ctx.db
        .query("userSessions")
        .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
        .first();
      
      if (session) {
        const sessionDuration = now - session.loginAt;
        
        // Archive session to recurring sessions table
        await ctx.db.insert("recurringUserSessions", {
          userId: session.userId,
          sessionId: session.sessionId,
          browserName: session.browserName,
          browserVersion: session.browserVersion,
          deviceType: session.deviceType,
          osName: session.osName,
          osVersion: session.osVersion,
          deviceVendor: session.deviceVendor,
          deviceModel: session.deviceModel,
          ipAddress: session.ipAddress,
          city: session.city,
          country: session.country,
          region: session.region,
          timezone: session.timezone,
          isp: session.isp,
          screenResolution: session.screenResolution,
          language: session.language,
          platform: session.platform,
          userAgent: session.userAgent,
          customLabel: session.customLabel,
          loginAt: session.loginAt,
          logoutAt: now,
          lastActiveAt: session.lastActiveAt,
          sessionDuration: sessionDuration,
          endReason: args.endReason || "bulk_signout",
          createdAt: now,
        });
        
        await ctx.db.delete(session._id);
        results.push({ sessionId, success: true, archived: true, sessionDuration });
      } else {
        results.push({ sessionId, success: false, error: "Session not found" });
      }
    }
    
    return results;
  },
});

// Query functions for recurring sessions

// Get all recurring sessions for a user (with pagination)
export const getUserRecurringSessions = query({
  args: {
    clerkUserId: v.string(),
    limit: v.optional(v.number()), // Default 50
    startDate: v.optional(v.number()), // Filter by logout date
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    // First, get the Convex user ID from the Clerk user ID
    const convexUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
    
    if (!convexUser) {
      return [];
    }
    
    let query = ctx.db
      .query("recurringUserSessions")
      .withIndex("by_user_logout", (q) => q.eq("userId", convexUser._id));
    
    if (args.startDate && args.endDate) {
      query = query.filter((q) => 
        q.gte(q.field("logoutAt"), args.startDate!) && 
        q.lte(q.field("logoutAt"), args.endDate!)
      );
    } else if (args.startDate) {
      query = query.filter((q) => q.gte(q.field("logoutAt"), args.startDate!));
    } else if (args.endDate) {
      query = query.filter((q) => q.lte(q.field("logoutAt"), args.endDate!));
    }
    
    return await query
      .order("desc") // Most recent first
      .take(limit);
  },
});

// Get session statistics for a user
export const getUserSessionStats = query({
  args: {
    clerkUserId: v.string(),
    daysBack: v.optional(v.number()), // Default 30 days
  },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack || 30;
    const cutoffTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
    
    // First, get the Convex user ID from the Clerk user ID
    const convexUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
    
    if (!convexUser) {
      return {
        activeSessions: 0,
        totalRecurringSessions: 0,
        totalDuration: 0,
        averageDuration: 0,
        deviceTypes: {},
        endReasons: {},
        periodDays: daysBack,
      };
    }
    
    // Get active sessions count
    const activeSessions = await ctx.db
      .query("userSessions")
      .withIndex("by_user_active", (q) => 
        q.eq("userId", convexUser._id).eq("isActive", true)
      )
      .collect();
    
    // Get recent recurring sessions
    const recentSessions = await ctx.db
      .query("recurringUserSessions")
      .withIndex("by_user_logout", (q) => q.eq("userId", convexUser._id))
      .filter((q) => q.gte(q.field("logoutAt"), cutoffTime))
      .collect();
    
    // Calculate statistics
    const totalSessions = recentSessions.length;
    const totalDuration = recentSessions.reduce((sum, session) => sum + session.sessionDuration, 0);
    const averageDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    
    // Group by device type
    const deviceTypes = recentSessions.reduce((acc, session) => {
      const deviceType = session.deviceType || "Unknown";
      acc[deviceType] = (acc[deviceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Group by end reason
    const endReasons = recentSessions.reduce((acc, session) => {
      acc[session.endReason] = (acc[session.endReason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      activeSessions: activeSessions.length,
      totalRecurringSessions: totalSessions,
      totalDuration,
      averageDuration,
      deviceTypes,
      endReasons,
      periodDays: daysBack,
    };
  },
});

// Clean up old recurring sessions (for data retention)
export const cleanupOldRecurringSessions = mutation({
  args: {
    olderThanDays: v.optional(v.number()), // Default 365 days (1 year)
  },
  handler: async (ctx, args) => {
    const daysOld = args.olderThanDays || 365;
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    const oldSessions = await ctx.db
      .query("recurringUserSessions")
      .withIndex("by_logout_date", (q) => q.lt("logoutAt", cutoffTime))
      .collect();
    
    for (const session of oldSessions) {
      await ctx.db.delete(session._id);
    }
    
    return { deleted: oldSessions.length };
  },
});

// Revoke Clerk session server-side (requires Clerk API key)
export const revokeClerkSession = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      console.log('Attempting to revoke Clerk session server-side:', args.sessionId);
      
      // Get the Clerk secret key from environment variables
      const clerkSecretKey = process.env.CLERK_SECRET_KEY;
      
      if (!clerkSecretKey) {
        console.error('CLERK_SECRET_KEY not found in environment variables');
        return { success: false, error: 'Clerk secret key not configured' };
      }
      
      // Make the actual Clerk API call to revoke the session
      const response = await fetch(`https://api.clerk.com/v1/sessions/${args.sessionId}/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clerkSecretKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Clerk API error: ${response.status} ${response.statusText}`, errorText);
        return { 
          success: false, 
          error: `Clerk API error: ${response.status} ${response.statusText}`,
          details: errorText
        };
      }
      
      const result = await response.json();
      console.log('Successfully revoked Clerk session:', args.sessionId, result);
      
      return { 
        success: true, 
        message: 'Session successfully revoked via Clerk API',
        sessionId: args.sessionId,
        clerkResponse: result
      };
      
    } catch (error) {
      console.error('Failed to revoke Clerk session server-side:', error);
      return { success: false, error: error.message };
    }
  },
});
