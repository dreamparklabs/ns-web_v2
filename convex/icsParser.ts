import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ICS Calendar Feed Parser for D2L Assignment Extraction
// This module parses .ics calendar feeds exported from D2L to extract assignment data

interface ICSEvent {
  uid: string;
  summary: string;
  description?: string;
  dtstart: string;
  dtend?: string;
  location?: string;
  categories?: string[];
  url?: string;
  organizer?: string;
  created?: string;
  lastModified?: string;
}

interface ParsedAssignmentData {
  title: string;
  description?: string;
  dueDate?: number;
  courseName?: string;
  courseCode?: string;
  assignmentType?: string;
  location?: string;
  instructor?: string;
  maxPoints?: number;
  pointsEarned?: number;
  status?: string;
}

// Parse ICS content and extract events
function parseICSContent(icsContent: string): ICSEvent[] {
  const events: ICSEvent[] = [];
  const lines = icsContent.split(/\r?\n/);
  let currentEvent: Partial<ICSEvent> | null = null;
  let currentProperty = '';
  let currentValue = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Handle line folding (lines starting with space or tab)
    while (i + 1 < lines.length && /^[ \t]/.test(lines[i + 1])) {
      i++;
      line += lines[i].substring(1);
    }

    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.uid && currentEvent.summary && currentEvent.dtstart) {
        events.push(currentEvent as ICSEvent);
      }
      currentEvent = null;
    } else if (currentEvent && line.includes(':')) {
      const colonIndex = line.indexOf(':');
      const property = line.substring(0, colonIndex).toUpperCase();
      const value = line.substring(colonIndex + 1);

      // Handle property parameters (e.g., DTSTART;TZID=America/Chicago:20231201T235900)
      const [propertyName] = property.split(';');

      switch (propertyName) {
        case 'UID':
          currentEvent.uid = value;
          break;
        case 'SUMMARY':
          currentEvent.summary = decodeICSValue(value);
          break;
        case 'DESCRIPTION':
          currentEvent.description = decodeICSValue(value);
          break;
        case 'DTSTART':
          currentEvent.dtstart = value;
          break;
        case 'DTEND':
          currentEvent.dtend = value;
          break;
        case 'LOCATION':
          currentEvent.location = decodeICSValue(value);
          break;
        case 'CATEGORIES':
          currentEvent.categories = value.split(',').map(cat => decodeICSValue(cat.trim()));
          break;
        case 'URL':
          currentEvent.url = value;
          break;
        case 'ORGANIZER':
          // Extract email from ORGANIZER field (e.g., ORGANIZER:mailto:instructor@school.edu)
          const emailMatch = value.match(/mailto:([^;]+)/);
          if (emailMatch) {
            currentEvent.organizer = emailMatch[1];
          }
          break;
        case 'CREATED':
          currentEvent.created = value;
          break;
        case 'LAST-MODIFIED':
          currentEvent.lastModified = value;
          break;
      }
    }
  }

  return events;
}

// Decode ICS escaped values
function decodeICSValue(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

// Convert ICS date to JavaScript timestamp
function parseICSDate(icsDate: string): number {
  // Handle different ICS date formats
  // YYYYMMDDTHHMMSSZ (UTC)
  // YYYYMMDDTHHMMSS (local)
  // YYYYMMDD (all day)
  
  if (icsDate.length === 8) {
    // All day event (YYYYMMDD)
    const year = parseInt(icsDate.substr(0, 4));
    const month = parseInt(icsDate.substr(4, 2)) - 1; // Month is 0-based
    const day = parseInt(icsDate.substr(6, 2));
    return new Date(year, month, day, 23, 59, 59).getTime(); // Set to end of day for due dates
  } else if (icsDate.length >= 15) {
    // Date with time
    const year = parseInt(icsDate.substr(0, 4));
    const month = parseInt(icsDate.substr(4, 2)) - 1;
    const day = parseInt(icsDate.substr(6, 2));
    const hour = parseInt(icsDate.substr(9, 2));
    const minute = parseInt(icsDate.substr(11, 2));
    const second = parseInt(icsDate.substr(13, 2));
    
    const date = new Date(year, month, day, hour, minute, second);
    
    // Handle UTC dates (ending with Z)
    if (icsDate.endsWith('Z')) {
      return date.getTime();
    } else {
      return date.getTime();
    }
  }
  
  return Date.now();
}

// Enhanced assignment detection for SIU D2L ICS format
function analyzeEventForAssignment(event: ICSEvent): { isAssignment: boolean; confidence: number; data: ParsedAssignmentData } {
  const summary = event.summary.toLowerCase();
  const description = (event.description || '').toLowerCase();
  const location = (event.location || '').toLowerCase();
  const combined = `${summary} ${description} ${location}`;
  
  // Enhanced assignment detection for SIU patterns
  const assignmentKeywords = [
    'assignment', 'homework', 'hw', 'essay', 'paper', 'project', 'lab', 'quiz', 'test', 'exam',
    'due', 'submit', 'submission', 'turn in', 'upload', 'dropbox', 'discussion', 'forum',
    'midterm', 'final', 'presentation', 'report', 'case study', 'analysis', 'review',
    'course eval', 'evaluation' // SIU specific
  ];
  
  const excludeKeywords = [
    'class', 'lecture', 'meeting', 'office hours', 'break', 'holiday', 'no class',
    'cancelled', 'canceled', 'reminder', 'announcement', 'event', 'seminar',
    'kickoff', 'film', 'speaker', 'contest', 'lunch' // Exclude SIU events
  ];
  
  // Calculate assignment probability
  let assignmentScore = 0;
  let excludeScore = 0;
  
  // High confidence patterns for SIU D2L format
  if (/lab\s+\d+\s+-\s+(due|available|availability\s+ends)/i.test(summary)) {
    assignmentScore += 5; // Very high confidence for SIU lab format
  }
  if (/quiz\s+\d+\s+-\s+(due|available|availability\s+ends)/i.test(summary)) {
    assignmentScore += 5; // Very high confidence for SIU quiz format
  }
  if (/course\s+eval\s+-\s+due/i.test(summary)) {
    assignmentScore += 5; // Course evaluations are assignments
  }
  
  // Check for assignment keywords
  assignmentKeywords.forEach(keyword => {
    if (combined.includes(keyword)) {
      assignmentScore += keyword === 'assignment' ? 3 : keyword === 'due' ? 3 : keyword === 'lab' ? 2 : keyword === 'quiz' ? 2 : 1;
    }
  });
  
  // Check for exclude keywords
  excludeKeywords.forEach(keyword => {
    if (combined.includes(keyword)) {
      excludeScore += 2;
    }
  });
  
  // Additional scoring based on patterns
  if (/due\s*(date|by|on)?\s*:?/i.test(combined)) assignmentScore += 2;
  if (/submit|submission|turn\s*in/i.test(combined)) assignmentScore += 2;
  if (/points?\s*:\s*\d+/i.test(combined)) assignmentScore += 1;
  if (/availability\s+ends/i.test(combined)) assignmentScore += 2; // SIU specific
  
  // Bonus for course location format (indicates academic assignment)
  if (/fall\s+\d{4}\s+.+\s+\([A-Z]{2,4}-\d{3}-\d{3}\)/i.test(location)) {
    assignmentScore += 3;
  }
  
  // Calculate confidence (0-100)
  const confidence = Math.min(100, Math.max(0, (assignmentScore - excludeScore) * 12));
  const isAssignment = confidence >= 25; // Lower threshold for SIU format
  
  // Extract assignment data
  const data: ParsedAssignmentData = {
    title: event.summary,
    description: event.description,
    dueDate: parseICSDate(event.dtstart),
  };
  
  // Enhanced course extraction for SIU format
  // Extract from location first (SIU format: "Fall 2025 System Administration (ITEC-235-001)")
  if (event.location) {
    const siuLocationMatch = event.location.match(/(Fall|Spring|Summer)\s+\d{4}\s+([^(]+)\s+\(([A-Z]{2,4}-\d{3}-\d{3})\)/i);
    if (siuLocationMatch) {
      data.courseName = siuLocationMatch[2].trim();
      data.courseCode = siuLocationMatch[3]; // Course code is in the parentheses
      // Clean up assignment title by removing course prefix if present
      data.title = event.summary.replace(/^[A-Z]{2,4}[-\s]*\d{3}[-\s]*\d{3}\s*[-–—:]\s*/i, '').trim();
    } else {
      // Fallback to generic location parsing
      const locationCourseMatch = event.location.match(/([A-Z]{2,4}[-\s]*\d{3,4}[A-Z]?)/);
      if (locationCourseMatch) {
        data.courseCode = locationCourseMatch[1];
      }
    }
  }
  
  // Extract course from summary if not found in location
  if (!data.courseCode) {
    const courseMatch = event.summary.match(/^([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\s*[-–—:]\s*/);
    if (courseMatch) {
      data.courseCode = courseMatch[1];
      data.title = event.summary.replace(courseMatch[0], '').trim();
    }
  }
  
  if (event.categories && event.categories.length > 0) {
    data.courseName = event.categories[0];
  }
  
  // Determine assignment type
  if (/quiz/i.test(combined)) data.assignmentType = 'quiz';
  else if (/exam|test|midterm|final/i.test(combined)) data.assignmentType = 'exam';
  else if (/lab/i.test(combined)) data.assignmentType = 'lab';
  else if (/project/i.test(combined)) data.assignmentType = 'project';
  else if (/discussion|forum/i.test(combined)) data.assignmentType = 'discussion';
  else if (/homework|hw/i.test(combined)) data.assignmentType = 'homework';
  else data.assignmentType = 'assignment';
  
  // Extract points if mentioned
  const pointsMatch = description.match(/(\d+)\s*points?/i);
  if (pointsMatch) {
    data.maxPoints = parseInt(pointsMatch[1]);
  }
  
  // Extract instructor from organizer
  if (event.organizer) {
    data.instructor = event.organizer;
  }
  
  return { isAssignment, confidence, data };
}

// Add ICS feed for a user
export const addICSFeed = mutation({
  args: {
    clerkUserId: v.string(),
    feedUrl: v.string(),
    feedName: v.string(),
    courseId: v.optional(v.id("courses")),
    assignmentKeywords: v.optional(v.array(v.string())),
    excludeKeywords: v.optional(v.array(v.string())),
    autoCreateCourses: v.optional(v.boolean()),
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

    // Validate URL format
    try {
      new URL(args.feedUrl);
    } catch {
      throw new Error("Invalid feed URL");
    }

    const feedId = await ctx.db.insert("icsFeeds", {
      userId: user._id,
      feedUrl: args.feedUrl,
      feedName: args.feedName,
      courseId: args.courseId,
      isActive: true,
      syncFrequency: 'daily',
      assignmentKeywords: args.assignmentKeywords || [],
      excludeKeywords: args.excludeKeywords || [],
      autoCreateCourses: args.autoCreateCourses || false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create background sync job for immediate processing
    await ctx.db.insert("syncJobs", {
      userId: user._id,
      jobType: 'ics_sync',
      sourceId: feedId,
      status: 'pending',
      createdAt: Date.now(),
    });

    console.log(`✅ ICS feed added: ${args.feedName}. Starting immediate sync...`);
    
    // Trigger immediate sync action AND job processing
    try {
      await ctx.scheduler.runAfter(0, internal.icsParser.syncICSFeedAction, { feedId });
      // Also trigger job processing to handle the sync job
      await ctx.scheduler.runAfter(1000, internal.autoSync.processSyncJobs, { batchSize: 5 });
      return { feedId, message: "Feed added and sync started immediately." };
    } catch (error) {
      console.error('Failed to schedule immediate sync:', error);
      return { feedId, message: "Feed added. Sync will begin shortly.", error: error.message };
    }
  },
});

// Get ICS feeds for a user
export const getUserICSFeeds = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return [];
    }

    const feeds = await ctx.db
      .query("icsFeeds")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    // Get course information for feeds linked to courses
    const feedsWithCourses = await Promise.all(
      feeds.map(async (feed) => {
        let course = null;
        if (feed.courseId) {
          course = await ctx.db.get(feed.courseId);
        }
        return {
          ...feed,
          course: course ? { code: course.code, title: course.title } : null,
        };
      })
    );

    return feedsWithCourses;
  },
});

// Internal action for syncing ICS feed (can use fetch)
export const syncICSFeedAction = action({
  args: {
    feedId: v.id("icsFeeds"),
  },
  handler: async (ctx, args) => {
    // Actions need to use runQuery/runMutation to access database
    const feed = await ctx.runQuery(internal.icsParser.getICSFeedById, { feedId: args.feedId });
    if (!feed) {
      throw new Error("Feed not found");
    }

    try {
      // Update feed sync status
      await ctx.runMutation(internal.icsParser.updateICSFeedStatus, {
        feedId: args.feedId,
        status: 'pending',
        updatedAt: Date.now(),
      });

      // Fetch ICS content
      const response = await fetch(feed.feedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch ICS feed: ${response.statusText}`);
      }

      const icsContent = await response.text();
      
      // Parse ICS events
      const events = parseICSContent(icsContent);
      console.log(`📅 Parsed ${events.length} events from ICS feed: ${feed.feedName}`);

      const results = {
        itemsProcessed: events.length,
        assignmentsCreated: 0,
        assignmentsUpdated: 0,
        duplicatesFound: 0,
        errors: [] as string[],
      };

      // Process each event for assignment detection
      for (const event of events) {
        try {
          const analysis = analyzeEventForAssignment(event);
          
          if (analysis.isAssignment && analysis.confidence >= 30) {
            // Check if this assignment source already exists
            const existingSource = await ctx.runQuery(internal.icsParser.findAssignmentSource, {
              sourceType: "ics",
              sourceId: event.uid,
            });

            if (existingSource) {
              // Update existing source
              await ctx.runMutation(internal.icsParser.updateAssignmentSource, {
                sourceId: existingSource._id,
                rawData: JSON.stringify(event),
                parsedData: analysis.data,
                confidence: analysis.confidence,
              });
              results.assignmentsUpdated++;
            } else {
              // Create new assignment source
              await ctx.runMutation(internal.icsParser.createAssignmentSource, {
                userId: feed.userId,
                sourceType: 'ics',
                sourceId: event.uid,
                sourceUrl: feed.feedUrl,
                rawData: JSON.stringify(event),
                parsedData: analysis.data,
                confidence: analysis.confidence,
              });
              results.assignmentsCreated++;
            }
          }
        } catch (error) {
          results.errors.push(`Error processing event ${event.uid}: ${error}`);
        }
      }

      // Update feed sync status
      await ctx.runMutation(internal.icsParser.updateICSFeedStatus, {
        feedId: args.feedId,
        status: 'success',
        updatedAt: Date.now(),
      });

      console.log(`✅ ICS sync completed: ${results.assignmentsCreated} created, ${results.assignmentsUpdated} updated`);
      return results;

    } catch (error) {
      console.error('ICS sync failed:', error);
      
      await ctx.runMutation(internal.icsParser.updateICSFeedStatus, {
        feedId: args.feedId,
        status: 'error',
        updatedAt: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

// Helper query for actions to get ICS feed
export const getICSFeedById = query({
  args: {
    feedId: v.id("icsFeeds"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.feedId);
  },
});

// Helper mutation for actions to update ICS feed status
export const updateICSFeedStatus = mutation({
  args: {
    feedId: v.id("icsFeeds"),
    status: v.string(),
    updatedAt: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      lastSyncStatus: args.status,
      lastSyncAt: Date.now(),
      updatedAt: args.updatedAt,
    };
    
    if (args.error) {
      updateData.lastSyncError = args.error;
    } else {
      updateData.lastSyncError = undefined; // Clear previous errors on success
    }
    
    await ctx.db.patch(args.feedId, updateData);
    return { success: true };
  },
});

// Helper query to find existing assignment source
export const findAssignmentSource = query({
  args: {
    sourceType: v.string(),
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assignmentSources")
      .filter((q) =>
        q.and(
          q.eq(q.field("sourceType"), args.sourceType),
          q.eq(q.field("sourceId"), args.sourceId)
        )
      )
      .first();
  },
});

// Helper mutation to create assignment source
export const createAssignmentSource = mutation({
  args: {
    userId: v.id("users"),
    sourceType: v.string(),
    sourceId: v.string(),
    sourceUrl: v.string(),
    rawData: v.string(),
    parsedData: v.any(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("assignmentSources", {
      userId: args.userId,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      sourceUrl: args.sourceUrl,
      rawData: args.rawData,
      parsedData: args.parsedData,
      confidence: args.confidence,
      isProcessed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Helper mutation to update assignment source
export const updateAssignmentSource = mutation({
  args: {
    sourceId: v.id("assignmentSources"),
    rawData: v.string(),
    parsedData: v.any(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sourceId, {
      rawData: args.rawData,
      parsedData: args.parsedData,
      confidence: args.confidence,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Wrapper mutation to trigger ICS sync from UI
export const syncICSFeed = mutation({
  args: {
    feedId: v.id("icsFeeds"),
  },
  handler: async (ctx, args) => {
    // Schedule the sync action to run immediately
    await ctx.scheduler.runAfter(0, internal.icsParser.syncICSFeedAction, { feedId: args.feedId });
    return { success: true, message: "Sync started" };
  },
});

// Toggle ICS feed active status
export const toggleICSFeed = mutation({
  args: {
    feedId: v.id("icsFeeds"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const feed = await ctx.db.get(args.feedId);
    if (!feed) {
      throw new Error("Feed not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user || feed.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.feedId, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete ICS feed
export const deleteICSFeed = mutation({
  args: {
    feedId: v.id("icsFeeds"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const feed = await ctx.db.get(args.feedId);
    if (!feed) {
      throw new Error("Feed not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user || feed.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.feedId);
    return { success: true };
  },
});
