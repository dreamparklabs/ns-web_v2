import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Auto-Sync Manager for ICS and Email Integration
// This module handles automatic background syncing of ICS feeds and email processing

interface SyncSchedule {
  frequency: 'hourly' | 'daily' | 'weekly';
  nextRunAt: number;
  lastRunAt?: number;
}

// Calculate next run time based on frequency
function calculateNextRun(frequency: string, lastRun?: number): number {
  const now = Date.now();
  const baseTime = lastRun || now;
  
  switch (frequency) {
    case 'hourly':
      return baseTime + (60 * 60 * 1000); // 1 hour
    case 'daily':
      return baseTime + (24 * 60 * 60 * 1000); // 24 hours
    case 'weekly':
      return baseTime + (7 * 24 * 60 * 60 * 1000); // 7 days
    default:
      return baseTime + (24 * 60 * 60 * 1000); // Default to daily
  }
}

// Get all active integrations that need syncing
export const getIntegrationsToSync = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get ICS feeds that need syncing
    const icsFeeds = await ctx.db
      .query("icsFeeds")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const icsToSync = icsFeeds.filter(feed => {
      if (!feed.lastSyncAt) return true; // Never synced
      const nextSync = calculateNextRun(feed.syncFrequency || 'daily', feed.lastSyncAt);
      return now >= nextSync;
    });
    
    // Get email integrations that need syncing
    const emailIntegrations = await ctx.db
      .query("emailIntegrations")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const emailToSync = emailIntegrations.filter(integration => {
      if (!integration.lastSyncAt) return true; // Never synced
      const nextSync = calculateNextRun(integration.syncFrequency || 'hourly', integration.lastSyncAt);
      return now >= nextSync;
    });
    
    return {
      icsFeeds: icsToSync,
      emailIntegrations: emailToSync,
      totalPending: icsToSync.length + emailToSync.length,
    };
  },
});

// Create sync jobs for pending integrations
export const createSyncJobs = mutation({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.runQuery(internal.autoSync.getIntegrationsToSync);
    const jobsCreated = [];
    
    // Create ICS sync jobs
    for (const feed of pending.icsFeeds) {
      // Check if there's already a pending job for this feed
      const existingJob = await ctx.db
        .query("syncJobs")
        .filter((q) => 
          q.and(
            q.eq(q.field("jobType"), "ics_sync"),
            q.eq(q.field("sourceId"), feed._id),
            q.eq(q.field("status"), "pending")
          )
        )
        .first();
      
      if (!existingJob) {
        const jobId = await ctx.db.insert("syncJobs", {
          userId: feed.userId,
          jobType: 'ics_sync',
          sourceId: feed._id,
          status: 'pending',
          createdAt: Date.now(),
        });
        
        jobsCreated.push({ type: 'ics', feedId: feed._id, jobId });
      }
    }
    
    // Create email sync jobs
    for (const integration of pending.emailIntegrations) {
      const existingJob = await ctx.db
        .query("syncJobs")
        .filter((q) => 
          q.and(
            q.eq(q.field("jobType"), "email_sync"),
            q.eq(q.field("sourceId"), integration._id),
            q.eq(q.field("status"), "pending")
          )
        )
        .first();
      
      if (!existingJob) {
        const jobId = await ctx.db.insert("syncJobs", {
          userId: integration.userId,
          jobType: 'email_sync',
          sourceId: integration._id,
          status: 'pending',
          createdAt: Date.now(),
        });
        
        jobsCreated.push({ type: 'email', integrationId: integration._id, jobId });
      }
    }
    
    console.log(`📋 Created ${jobsCreated.length} sync jobs`);
    return {
      jobsCreated: jobsCreated.length,
      jobs: jobsCreated,
    };
  },
});

// Process pending sync jobs
export const processSyncJobs = action({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 10;
    
    // Get pending jobs
    const pendingJobs = await ctx.runQuery(internal.autoSync.getPendingSyncJobs, {
      limit: batchSize,
    });
    
    if (pendingJobs.length === 0) {
      return { processed: 0, errors: [] };
    }
    
    const results = {
      processed: 0,
      errors: [] as string[],
    };
    
    // Process each job
    for (const job of pendingJobs) {
      try {
        // Mark job as running
        await ctx.runMutation(internal.autoSync.updateJobStatus, {
          jobId: job._id,
          status: 'running',
          startedAt: Date.now(),
        });
        
        let jobResult;
        
        if (job.jobType === 'ics_sync') {
          // Process ICS sync
          jobResult = await ctx.runAction(internal.icsParser.syncICSFeedAction, {
            feedId: job.sourceId,
          });
        } else if (job.jobType === 'email_sync') {
          // Email sync would need to be implemented with email provider APIs
          // For now, we'll mark as completed with a placeholder
          jobResult = {
            itemsProcessed: 0,
            assignmentsCreated: 0,
            assignmentsUpdated: 0,
            duplicatesFound: 0,
            errors: ['Email sync not yet implemented'],
          };
        }
        
        // Mark job as completed
        await ctx.runMutation(internal.autoSync.updateJobStatus, {
          jobId: job._id,
          status: 'completed',
          completedAt: Date.now(),
          result: jobResult,
        });
        
        // Trigger assignment processing for new sources
        if (jobResult && (jobResult.assignmentsCreated > 0 || jobResult.assignmentsUpdated > 0)) {
          await ctx.runMutation(internal.assignmentMaster.processAssignmentSources, {
            clerkUserId: job.user?.clerkUserId || '',
            batchSize: 20,
          });
        }
        
        results.processed++;
        console.log(`✅ Completed ${job.jobType} job for user ${job.userId}`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Job ${job._id}: ${errorMessage}`);
        
        // Mark job as failed
        await ctx.runMutation(internal.autoSync.updateJobStatus, {
          jobId: job._id,
          status: 'failed',
          completedAt: Date.now(),
          error: errorMessage,
        });
        
        console.error(`❌ Failed ${job.jobType} job for user ${job.userId}:`, error);
      }
    }
    
    return results;
  },
});

// Get pending sync jobs
export const getPendingSyncJobs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("syncJobs")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("asc") // Process oldest first
      .take(args.limit || 50);
    
    // Get user information for each job
    const jobsWithUsers = await Promise.all(
      jobs.map(async (job) => {
        const user = await ctx.db.get(job.userId);
        return {
          ...job,
          user: user ? {
            clerkUserId: user.clerkUserId,
            email: user.email,
            firstName: user.firstName,
          } : null,
        };
      })
    );
    
    return jobsWithUsers;
  },
});

export const getAllSyncJobs = query({
  args: {
    clerkUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();
    
    if (!user) {
      return [];
    }
    
    const jobs = await ctx.db
      .query("syncJobs")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .take(limit);
    
    return jobs;
  },
});

// Update sync job status
export const updateJobStatus = mutation({
  args: {
    jobId: v.id("syncJobs"),
    status: v.string(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    progress: v.optional(v.number()),
    error: v.optional(v.string()),
    result: v.optional(v.object({
      itemsProcessed: v.number(),
      assignmentsCreated: v.number(),
      assignmentsUpdated: v.number(),
      duplicatesFound: v.number(),
      errors: v.array(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      status: args.status,
    };
    
    if (args.startedAt !== undefined) updateData.startedAt = args.startedAt;
    if (args.completedAt !== undefined) updateData.completedAt = args.completedAt;
    if (args.progress !== undefined) updateData.progress = args.progress;
    if (args.error !== undefined) updateData.error = args.error;
    if (args.result !== undefined) updateData.result = args.result;
    
    await ctx.db.patch(args.jobId, updateData);
    return { success: true };
  },
});

// Clean up old completed jobs (keep last 100 per user)
export const cleanupOldJobs = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let deletedCount = 0;
    
    for (const user of users) {
      const completedJobs = await ctx.db
        .query("syncJobs")
        .filter((q) => 
          q.and(
            q.eq(q.field("userId"), user._id),
            q.or(
              q.eq(q.field("status"), "completed"),
              q.eq(q.field("status"), "failed")
            )
          )
        )
        .order("desc")
        .collect();
      
      // Keep only the latest 100 jobs per user
      const jobsToDelete = completedJobs.slice(100);
      
      for (const job of jobsToDelete) {
        await ctx.db.delete(job._id);
        deletedCount++;
      }
    }
    
    console.log(`🧹 Cleaned up ${deletedCount} old sync jobs`);
    return { deleted: deletedCount };
  },
});

// Get sync job history for a user
export const getUserSyncHistory = query({
  args: {
    clerkUserId: v.string(),
    limit: v.optional(v.number()),
    jobType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();
    
    if (!user) {
      return [];
    }
    
    let query = ctx.db
      .query("syncJobs")
      .filter((q) => q.eq(q.field("userId"), user._id));
    
    if (args.jobType) {
      query = query.filter((q) => q.eq(q.field("jobType"), args.jobType));
    }
    
    const jobs = await query
      .order("desc")
      .take(args.limit || 50);
    
    // Get source information for each job
    const jobsWithSources = await Promise.all(
      jobs.map(async (job) => {
        let source = null;
        
        if (job.jobType === 'ics_sync' && job.sourceId) {
          const icsSource = await ctx.db.get(job.sourceId as any);
          if (icsSource) {
            source = {
              type: 'ics',
              name: (icsSource as any).feedName,
              url: (icsSource as any).feedUrl,
            };
          }
        } else if (job.jobType === 'email_sync' && job.sourceId) {
          const emailSource = await ctx.db.get(job.sourceId as any);
          if (emailSource) {
            source = {
              type: 'email',
              provider: (emailSource as any).emailProvider,
            };
          }
        }
        
        return {
          ...job,
          source,
          duration: job.startedAt && job.completedAt ? 
            job.completedAt - job.startedAt : null,
        };
      })
    );
    
    return jobsWithSources;
  },
});

// Trigger manual sync for specific integration
export const triggerManualSync = mutation({
  args: {
    clerkUserId: v.string(),
    integrationType: v.union(v.literal("ics"), v.literal("email")),
    integrationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Verify the integration belongs to the user
    let integration;
    if (args.integrationType === 'ics') {
      integration = await ctx.db.get(args.integrationId as any);
      if (!integration || (integration as any).userId !== user._id) {
        throw new Error("ICS feed not found or not authorized");
      }
    } else if (args.integrationType === 'email') {
      integration = await ctx.db.get(args.integrationId as any);
      if (!integration || (integration as any).userId !== user._id) {
        throw new Error("Email integration not found or not authorized");
      }
    }
    
    // Create immediate sync job
    const jobId = await ctx.db.insert("syncJobs", {
      userId: user._id,
      jobType: args.integrationType === 'ics' ? 'ics_sync' : 'email_sync',
      sourceId: args.integrationId,
      status: 'pending',
      createdAt: Date.now(),
    });
    
    console.log(`🔄 Created manual sync job for ${args.integrationType} integration`);
    
    // Trigger immediate processing of the job
    try {
      await ctx.scheduler.runAfter(500, internal.autoSync.processSyncJobs, { batchSize: 1 });
    } catch (error) {
      console.warn('Failed to schedule immediate job processing:', error);
    }
    
    return { jobId, success: true };
  },
});

// Get sync statistics for dashboard
export const getSyncStats = query({
  args: {
    clerkUserId: v.string(),
    timeframe: v.optional(v.union(
      v.literal("24h"),
      v.literal("7d"),
      v.literal("30d")
    )),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();
    
    if (!user) {
      return null;
    }
    
    const timeframe = args.timeframe || "7d";
    const now = Date.now();
    let startTime: number;
    
    switch (timeframe) {
      case "24h":
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case "7d":
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = now - (7 * 24 * 60 * 60 * 1000);
    }
    
    // Get jobs in timeframe
    const jobs = await ctx.db
      .query("syncJobs")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), user._id),
          q.gte(q.field("createdAt"), startTime)
        )
      )
      .collect();
    
    const stats = {
      totalJobs: jobs.length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      pending: jobs.filter(j => j.status === 'pending').length,
      running: jobs.filter(j => j.status === 'running').length,
      byType: {} as Record<string, { total: number; completed: number; failed: number }>,
      totalItemsProcessed: 0,
      totalAssignmentsCreated: 0,
      totalAssignmentsUpdated: 0,
      averageDuration: 0,
      successRate: 0,
    };
    
    // Calculate by job type
    for (const job of jobs) {
      if (!stats.byType[job.jobType]) {
        stats.byType[job.jobType] = { total: 0, completed: 0, failed: 0 };
      }
      stats.byType[job.jobType].total++;
      if (job.status === 'completed') {
        stats.byType[job.jobType].completed++;
      } else if (job.status === 'failed') {
        stats.byType[job.jobType].failed++;
      }
      
      // Aggregate results
      if (job.result) {
        stats.totalItemsProcessed += job.result.itemsProcessed;
        stats.totalAssignmentsCreated += job.result.assignmentsCreated;
        stats.totalAssignmentsUpdated += job.result.assignmentsUpdated;
      }
    }
    
    // Calculate average duration and success rate
    const completedJobs = jobs.filter(j => j.status === 'completed' && j.startedAt && j.completedAt);
    if (completedJobs.length > 0) {
      const totalDuration = completedJobs.reduce((sum, job) => 
        sum + (job.completedAt! - job.startedAt!), 0);
      stats.averageDuration = Math.round(totalDuration / completedJobs.length / 1000); // in seconds
    }
    
    if (jobs.length > 0) {
      stats.successRate = Math.round((stats.completed / jobs.length) * 100);
    }
    
    return stats;
  },
});

// Debug function to check what's in the ICS feed
export const debugICSFeed = action({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('🔍 Debugging ICS feed content for user:', args.clerkUserId);
    
    try {
      // Get user
      const user = await ctx.runQuery(internal.users.getUserByClerkId, { clerkUserId: args.clerkUserId });
      if (!user) {
        return { error: "User not found" };
      }
      
      // Get ICS feeds for user
      const icsFeeds = await ctx.runQuery(internal.icsParser.getUserICSFeeds, { clerkUserId: args.clerkUserId });
      
      if (icsFeeds.length === 0) {
        return { error: "No ICS feeds found" };
      }
      
      const results = [];
      
      for (const feed of icsFeeds) {
        console.log(`🔍 Checking feed: ${feed.feedName}`);
        
        // Fetch ICS content
        const response = await fetch(feed.feedUrl);
        if (!response.ok) {
          results.push({
            feedName: feed.feedName,
            error: `Failed to fetch: ${response.statusText}`
          });
          continue;
        }
        
        const icsContent = await response.text();
        console.log(`📄 ICS content length: ${icsContent.length} characters`);
        
        // Parse events manually (simplified version for debugging)
        const events = [];
        const lines = icsContent.split('\n');
        let currentEvent = null;
        
        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine === 'BEGIN:VEVENT') {
            currentEvent = {};
          } else if (cleanLine === 'END:VEVENT' && currentEvent) {
            events.push(currentEvent);
            currentEvent = null;
          } else if (currentEvent && cleanLine.includes(':')) {
            const [key, ...valueParts] = cleanLine.split(':');
            const value = valueParts.join(':');
            if (key === 'SUMMARY') currentEvent.summary = value;
            if (key === 'LOCATION') currentEvent.location = value;
            if (key === 'DTSTART') currentEvent.dtstart = value;
            if (key === 'UID') currentEvent.uid = value;
          }
        }
        
        console.log(`📅 Found ${events.length} total events`);
        
        // Filter events to current/future dates and analyze
        const now = new Date();
        const currentYear = now.getFullYear();
        const recentEvents = events.filter(event => {
          if (!event.dtstart) return false;
          const eventDate = new Date(event.dtstart.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z'));
          return eventDate.getFullYear() >= currentYear - 1; // Events from last year onwards
        });
        
        console.log(`📅 Found ${recentEvents.length} recent/future events out of ${events.length} total`);
        
        // Analyze recent events (limit to 15 for debugging)
        const eventAnalysis = [];
        for (const event of recentEvents.slice(0, 15)) {
          if (!event.summary) continue;
          
          const summary = event.summary.toLowerCase();
          const location = (event.location || '').toLowerCase();
          
          // Enhanced assignment detection for SIU patterns
          const hasAssignmentKeywords = /lab\s*\d+|quiz\s*\d+|exam|assignment|due|homework|project|course\s*eval/i.test(summary);
          const hasLocationKeywords = /system\s*administration|itec|fall\s*\d{4}/i.test(location);
          const hasDuePattern = /due|availability\s*ends|available/i.test(summary);
          const hasExcludeKeywords = /kickoff|film|speaker|lunch|meeting|break|zumba|cybersecurity\s*day/i.test(summary + ' ' + location);
          
          let confidence = 15;
          if (hasAssignmentKeywords && !hasExcludeKeywords) confidence += 40;
          if (hasLocationKeywords) confidence += 30;
          if (hasDuePattern) confidence += 20;
          
          const isAssignment = confidence >= 50;
          eventAnalysis.push({
            summary: event.summary,
            location: event.location || 'No location',
            dtstart: event.dtstart,
            isAssignment: isAssignment,
            confidence: confidence,
            assignmentType: isAssignment ? 'detected' : 'none',
            hasAssignmentKeywords,
            hasLocationKeywords,
            hasDuePattern,
          });
          
          console.log(`📝 Event: "${event.summary}" - Assignment: ${isAssignment} (${confidence}% confidence) - Location: "${event.location || 'none'}"`);
        }
        
        results.push({
          feedName: feed.feedName,
          totalEvents: events.length,
          eventSample: eventAnalysis,
        });
      }
      
      return { results };
      
    } catch (error) {
      console.error('❌ Debug failed:', error);
      return { error: error.message };
    }
  },
});

// Manual test function to debug sync process
export const testSyncProcess = action({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('🧪 Testing sync process for user:', args.clerkUserId);
    
    try {
      // Get user
      const user = await ctx.runQuery(internal.users.getUserByClerkId, { clerkUserId: args.clerkUserId });
      if (!user) {
        return { error: "User not found" };
      }
      
      // Get all jobs for this user (not just pending)
      const allJobs = await ctx.runQuery(internal.autoSync.getAllSyncJobs, { 
        clerkUserId: args.clerkUserId,
        limit: 20 
      });
      const recentJobs = allJobs.filter(job => 
        Date.now() - job.createdAt < 60000 // Last minute
      );
      
      console.log(`📋 Found ${recentJobs.length} recent jobs for user`);
      
      // Get pending jobs
      const pendingJobs = await ctx.runQuery(internal.autoSync.getPendingSyncJobs, { limit: 10 });
      const userPendingJobs = pendingJobs.filter(job => job.userId === user._id);
      
      console.log(`📋 Found ${userPendingJobs.length} pending jobs for user`);
      
      if (userPendingJobs.length === 0 && recentJobs.length === 0) {
        return { message: "No recent jobs found" };
      }
      
      // If there are pending jobs, process them
      if (userPendingJobs.length > 0) {
        const processResult = await ctx.runAction(internal.autoSync.processSyncJobs, {
          batchSize: userPendingJobs.length,
        });
        
        console.log(`✅ Test sync completed: ${processResult.processed} jobs processed, ${processResult.errors.length} errors`);
        
        return {
          pendingJobs: userPendingJobs.length,
          processed: processResult.processed,
          errors: processResult.errors,
          recentJobs: recentJobs.map(job => ({
            status: job.status,
            jobType: job.jobType,
            createdAt: new Date(job.createdAt).toLocaleTimeString(),
            error: job.error,
          })),
        };
      } else {
        // No pending jobs, but show recent job status
        return {
          pendingJobs: 0,
          processed: 0,
          errors: [],
          message: "No pending jobs, but found recent jobs",
          recentJobs: recentJobs.map(job => ({
            status: job.status,
            jobType: job.jobType,
            createdAt: new Date(job.createdAt).toLocaleTimeString(),
            error: job.error,
            result: job.result,
          })),
        };
      }
      
    } catch (error) {
      console.error('❌ Test sync failed:', error);
      return { error: error.message };
    }
  },
});

// Schedule automatic sync jobs (called by cron or scheduler)
export const scheduleAutoSync = action({
  args: {},
  handler: async (ctx) => {
    console.log('🕒 Running scheduled auto-sync...');
    
    // Create sync jobs for pending integrations
    const jobsResult = await ctx.runMutation(internal.autoSync.createSyncJobs);
    
    if (jobsResult.jobsCreated > 0) {
      // Process the newly created jobs
      const processResult = await ctx.runAction(internal.autoSync.processSyncJobs, {
        batchSize: 20,
      });
      
      console.log(`📊 Scheduled sync completed: ${processResult.processed} jobs processed, ${processResult.errors.length} errors`);
      
      // Clean up old jobs periodically
      if (Math.random() < 0.1) { // 10% chance to run cleanup
        await ctx.runMutation(internal.autoSync.cleanupOldJobs);
      }
      
      return {
        jobsCreated: jobsResult.jobsCreated,
        jobsProcessed: processResult.processed,
        errors: processResult.errors,
      };
    }
    
    return {
      jobsCreated: 0,
      jobsProcessed: 0,
      errors: [],
    };
  },
});
