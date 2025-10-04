import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// D2L API Configuration
const D2L_API_BASE = process.env.D2L_API_BASE_URL || "https://your-institution.brightspace.com";
const D2L_APP_ID = process.env.D2L_APP_ID;
const D2L_APP_KEY = process.env.D2L_APP_KEY;

// D2L API Client
class D2LClient {
  private baseUrl: string;
  private appId: string;
  private appKey: string;
  private userId: string;
  private userKey: string;

  constructor(baseUrl: string, appId: string, appKey: string, userId: string, userKey: string) {
    this.baseUrl = baseUrl;
    this.appId = appId;
    this.appKey = appKey;
    this.userId = userId;
    this.userKey = userKey;
  }

  // Generate D2L authentication signature using Web Crypto API
  private async generateAuthSignature(method: string, path: string, timestamp: string): Promise<string> {
    // D2L uses a specific HMAC-SHA256 signature format
    // Using Web Crypto API instead of Node.js crypto
    const encoder = new TextEncoder();
    const message = `${method}&${encodeURIComponent(path.toLowerCase())}&${timestamp}`;
    
    // Import the key for HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.userKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Sign the message
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    
    // Convert to base64
    const signatureArray = new Uint8Array(signature);
    return btoa(String.fromCharCode(...signatureArray));
  }

  // Make authenticated request to D2L API
  async makeRequest(method: string, endpoint: string, data?: any) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = `/d2l/api${endpoint}`;
    const signature = await this.generateAuthSignature(method, path, timestamp);
    
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `D2L_SIGNATURE ${this.appId}:${signature}:${this.userId}:${timestamp}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`D2L API Error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('D2L API Request failed:', error);
      throw error;
    }
  }

  // Get user's enrolled courses
  async getEnrolledCourses() {
    return await this.makeRequest('GET', '/lp/1.0/enrollments/myenrollments/');
  }

  // Get course details
  async getCourseDetails(orgUnitId: string) {
    return await this.makeRequest('GET', `/lp/1.0/courses/${orgUnitId}`);
  }

  // Get course assignments (dropboxes)
  async getCourseAssignments(orgUnitId: string) {
    return await this.makeRequest('GET', `/le/1.0/${orgUnitId}/dropbox/folders/`);
  }

  // Get course quizzes
  async getCourseQuizzes(orgUnitId: string) {
    return await this.makeRequest('GET', `/le/1.0/${orgUnitId}/quizzes/`);
  }

  // Get discussion forums
  async getDiscussionForums(orgUnitId: string) {
    return await this.makeRequest('GET', `/le/1.0/${orgUnitId}/discussions/forums/`);
  }

  // Get course news/announcements
  async getCourseNews(orgUnitId: string) {
    return await this.makeRequest('GET', `/le/1.0/${orgUnitId}/news/`);
  }

  // Get course content modules
  async getCourseContent(orgUnitId: string) {
    return await this.makeRequest('GET', `/le/1.0/${orgUnitId}/content/root/`);
  }

  // Get calendar events
  async getCalendarEvents(orgUnitIds: string[], startDate: string, endDate: string) {
    const orgUnitParam = orgUnitIds.join(',');
    return await this.makeRequest('GET', `/le/1.0/calendar/events/?orgUnitIdsCSV=${orgUnitParam}&startDateTime=${startDate}&endDateTime=${endDate}`);
  }
}

// Store D2L user credentials
export const storeD2LCredentials = mutation({
  args: {
    clerkUserId: v.string(),
    d2lUserId: v.string(),
    d2lUserKey: v.string(),
    d2lBaseUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find the user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Store D2L credentials (you should encrypt these in production)
    await ctx.db.patch(user._id, {
      d2lUserId: args.d2lUserId,
      d2lUserKey: args.d2lUserKey,
      d2lBaseUrl: args.d2lBaseUrl,
      d2lSyncEnabled: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Sync courses from D2L
export const syncD2LCourses = mutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user with D2L credentials
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user || !user.d2lUserId || !user.d2lUserKey) {
      throw new Error("D2L credentials not found");
    }

    if (!D2L_APP_ID || !D2L_APP_KEY) {
      throw new Error("D2L app credentials not configured");
    }

    const d2lClient = new D2LClient(
      user.d2lBaseUrl || D2L_API_BASE,
      D2L_APP_ID,
      D2L_APP_KEY,
      user.d2lUserId,
      user.d2lUserKey
    );

    try {
      // Get enrolled courses from D2L
      const enrollments = await d2lClient.getEnrolledCourses();
      const syncedCourses = [];

      for (const enrollment of enrollments.Items || []) {
        if (enrollment.Access.IsActive) {
          // Get detailed course information
          const courseDetails = await d2lClient.getCourseDetails(enrollment.OrgUnit.Id);
          
          // Check if course already exists
          const existingCourse = await ctx.db
            .query("courses")
            .filter((q) => 
              q.and(
                q.eq(q.field("userId"), user._id),
                q.eq(q.field("d2lOrgUnitId"), enrollment.OrgUnit.Id.toString())
              )
            )
            .first();

          if (!existingCourse) {
            // Create new course
            const courseId = await ctx.db.insert("courses", {
              userId: user._id,
              title: courseDetails.Name,
              code: courseDetails.Code,
              instructor: courseDetails.Description || "TBD", // You might need to get instructor separately
              creditHours: 3, // Default - you might need to get this from course properties
              termId: user.currentActiveTerm, // Associate with current term
              d2lOrgUnitId: enrollment.OrgUnit.Id.toString(),
              d2lSyncEnabled: true,
              lc_title: courseDetails.Name.toLowerCase(),
              lc_code: courseDetails.Code.toLowerCase(),
            });

            syncedCourses.push({
              courseId,
              title: courseDetails.Name,
              code: courseDetails.Code,
            });
          }
        }
      }

      return {
        success: true,
        syncedCourses,
        totalSynced: syncedCourses.length,
      };
    } catch (error) {
      console.error('D2L course sync failed:', error);
      throw new Error(`D2L sync failed: ${error.message}`);
    }
  },
});

// Sync assignments from D2L
export const syncD2LAssignments = mutation({
  args: {
    clerkUserId: v.string(),
    courseId: v.optional(v.id("courses")), // Optional - sync specific course or all courses
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user with D2L credentials
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user || !user.d2lUserId || !user.d2lUserKey) {
      throw new Error("D2L credentials not found");
    }

    const d2lClient = new D2LClient(
      user.d2lBaseUrl || D2L_API_BASE,
      D2L_APP_ID!,
      D2L_APP_KEY!,
      user.d2lUserId,
      user.d2lUserKey
    );

    try {
      // Get courses to sync
      let coursesToSync;
      if (args.courseId) {
        coursesToSync = [await ctx.db.get(args.courseId)];
      } else {
        coursesToSync = await ctx.db
          .query("courses")
          .filter((q) => 
            q.and(
              q.eq(q.field("userId"), user._id),
              q.eq(q.field("d2lSyncEnabled"), true)
            )
          )
          .collect();
      }

      const syncedAssignments = [];

      for (const course of coursesToSync) {
        if (!course?.d2lOrgUnitId) continue;

        // Sync Dropbox assignments
        const dropboxes = await d2lClient.getCourseAssignments(course.d2lOrgUnitId);
        for (const dropbox of dropboxes || []) {
          await syncAssignment(ctx, course._id, dropbox, 'assignment', user._id);
          syncedAssignments.push({
            title: dropbox.Name,
            type: 'assignment',
            course: course.title,
          });
        }

        // Sync Quizzes
        const quizzes = await d2lClient.getCourseQuizzes(course.d2lOrgUnitId);
        for (const quiz of quizzes || []) {
          await syncAssignment(ctx, course._id, quiz, 'quiz', user._id);
          syncedAssignments.push({
            title: quiz.Name,
            type: 'quiz',
            course: course.title,
          });
        }

        // Sync Discussion Forums
        const forums = await d2lClient.getDiscussionForums(course.d2lOrgUnitId);
        for (const forum of forums || []) {
          if (forum.IsGraded) {
            await syncAssignment(ctx, course._id, forum, 'discussion', user._id);
            syncedAssignments.push({
              title: forum.Name,
              type: 'discussion',
              course: course.title,
            });
          }
        }
      }

      return {
        success: true,
        syncedAssignments,
        totalSynced: syncedAssignments.length,
      };
    } catch (error) {
      console.error('D2L assignment sync failed:', error);
      throw new Error(`Assignment sync failed: ${error.message}`);
    }
  },
});

// Helper function to sync individual assignment
async function syncAssignment(ctx: any, courseId: any, d2lItem: any, type: string, userId: any) {
  // Check if assignment already exists
  const existingAssignment = await ctx.db
    .query("assignments")
    .filter((q) => 
      q.and(
        q.eq(q.field("courseId"), courseId),
        q.eq(q.field("d2lId"), d2lItem.Id?.toString())
      )
    )
    .first();

  if (existingAssignment) {
    // Prepare update data, respecting user modifications
    const updateData: any = {};
    const userModifiedFields = existingAssignment.userModifiedFields || [];

    // Only update fields that haven't been modified by the user
    if (!userModifiedFields.includes('title')) {
      updateData.title = d2lItem.Name;
      updateData.lc_title = d2lItem.Name.toLowerCase();
    }
    
    if (!userModifiedFields.includes('notes')) {
      updateData.notes = d2lItem.Description?.Text || d2lItem.Description;
    }
    
    if (!userModifiedFields.includes('dueAt')) {
      updateData.dueAt = d2lItem.DueDate ? new Date(d2lItem.DueDate).getTime() : Date.now() + 7 * 24 * 60 * 60 * 1000;
    }
    
    if (!userModifiedFields.includes('status')) {
      updateData.status = "todo";
    }

    // Only patch if there are fields to update
    if (Object.keys(updateData).length > 0) {
      await ctx.db.patch(existingAssignment._id, updateData);
      console.log(`📝 D2L sync updated assignment "${d2lItem.Name}" (preserved user-modified fields: ${userModifiedFields.join(', ')})`);
    } else {
      console.log(`⚠️  D2L sync skipped assignment "${d2lItem.Name}" - all fields are user-modified`);
    }
  } else {
    // Create new assignment
    await ctx.db.insert("assignments", {
      userId,
      courseId,
      title: d2lItem.Name,
      notes: d2lItem.Description?.Text || d2lItem.Description || "",
      dueAt: d2lItem.DueDate ? new Date(d2lItem.DueDate).getTime() : Date.now() + 7 * 24 * 60 * 60 * 1000,
      status: "todo",
      type: type,
      d2lId: d2lItem.Id?.toString(),
      d2lSyncEnabled: true,
      lc_title: d2lItem.Name.toLowerCase(),
    });
    console.log(`✅ D2L sync created new assignment "${d2lItem.Name}"`);
  }
}

// Get D2L sync status
export const getD2LSyncStatus = query({
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

    return {
      isConfigured: !!(user.d2lUserId && user.d2lUserKey),
      syncEnabled: user.d2lSyncEnabled || false,
      baseUrl: user.d2lBaseUrl,
      lastSyncAt: user.d2lLastSyncAt,
    };
  },
});
