import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// LTI Integration for Universal D2L Access
// This allows Northstar to work at ANY D2L institution without individual API credentials

// Store LTI session data
export const createLTISession = mutation({
  args: {
    ltiUserId: v.string(),
    ltiCourseId: v.string(),
    institutionUrl: v.string(),
    userEmail: v.string(),
    courseName: v.string(),
    userRole: v.string(),
    consumerKey: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Create or update LTI session
    const existing = await ctx.db
      .query("ltiSessions")
      .withIndex("by_lti_user_course", (q) => 
        q.eq("ltiUserId", args.ltiUserId).eq("ltiCourseId", args.ltiCourseId)
      )
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        institutionUrl: args.institutionUrl,
        userEmail: args.userEmail,
        courseName: args.courseName,
        userRole: args.userRole,
        sessionToken: args.sessionToken,
        lastAccessed: Date.now(),
      });
    } else {
      return await ctx.db.insert("ltiSessions", {
        ltiUserId: args.ltiUserId,
        ltiCourseId: args.ltiCourseId,
        institutionUrl: args.institutionUrl,
        userEmail: args.userEmail,
        courseName: args.courseName,
        userRole: args.userRole,
        consumerKey: args.consumerKey,
        sessionToken: args.sessionToken,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
      });
    }
  },
});

// Get LTI session data
export const getLTISession = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("ltiSessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) return null;

    // Update last accessed
    await ctx.db.patch(session._id, { lastAccessed: Date.now() });

    return session;
  },
});

// Sync data from D2L using LTI context
export const syncLTIData = action({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    // Get LTI session
    const session = await ctx.runQuery(api.ltiIntegration.getLTISession, {
      sessionToken: args.sessionToken,
    });

    if (!session) {
      throw new Error("Invalid LTI session");
    }

    try {
      // Use LTI context to access D2L data
      const d2lApiBase = `${session.institutionUrl}/d2l/api/lp/1.9`;
      
      // Get course assignments using LTI context
      const assignmentsResponse = await fetch(
        `${d2lApiBase}/dropbox/orgunits/${session.ltiCourseId}/folders/`,
        {
          headers: {
            'Authorization': `Bearer ${session.sessionToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!assignmentsResponse.ok) {
        throw new Error(`Failed to fetch assignments: ${assignmentsResponse.statusText}`);
      }

      const assignments = await assignmentsResponse.json();

      // Get grades using LTI context
      const gradesResponse = await fetch(
        `${d2lApiBase}/grades/orgunits/${session.ltiCourseId}/current/final/values/`,
        {
          headers: {
            'Authorization': `Bearer ${session.sessionToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      let grades = [];
      if (gradesResponse.ok) {
        grades = await gradesResponse.json();
      }

      // Find or create Northstar user based on LTI data
      const northstarUser = await ctx.runMutation(api.ltiIntegration.findOrCreateNorthstarUser, {
        ltiUserId: session.ltiUserId,
        userEmail: session.userEmail,
        institutionUrl: session.institutionUrl,
      });

      // Process and store assignments
      const processedAssignments = assignments.map((assignment: any) => ({
        id: `lti_${session.ltiCourseId}_${assignment.Id}`,
        name: assignment.Name,
        description: assignment.Instructions?.Text || '',
        dueDate: assignment.DueDate,
        type: 'assignment',
        courseOrgUnitId: session.ltiCourseId,
        courseName: session.courseName,
        maxPoints: assignment.TotalPoints,
        submissionStatus: 'not_submitted', // Will be updated with submission data
      }));

      // Sync to Northstar database
      const syncResult = await ctx.runMutation(api.d2lScraper.processScrapedAssignmentsWithMatching, {
        clerkUserId: northstarUser.clerkUserId,
        assignmentsData: processedAssignments,
      });

      return {
        success: true,
        assignmentsCount: processedAssignments.length,
        gradesCount: grades.length,
        syncResult,
      };

    } catch (error) {
      console.error("LTI data sync failed:", error);
      throw new Error(`LTI sync failed: ${error.message}`);
    }
  },
});

// Find or create Northstar user from LTI data
export const findOrCreateNorthstarUser = mutation({
  args: {
    ltiUserId: v.string(),
    userEmail: v.string(),
    institutionUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Try to find existing user by email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userEmail))
      .first();

    if (existingUser) {
      // Update LTI mapping
      await ctx.db.insert("ltiUserMappings", {
        ltiUserId: args.ltiUserId,
        northstarUserId: existingUser._id,
        institutionUrl: args.institutionUrl,
        userEmail: args.userEmail,
        createdAt: Date.now(),
      });

      return {
        clerkUserId: existingUser.clerkUserId,
        northstarUserId: existingUser._id,
      };
    }

    // Create new user (this would typically integrate with Clerk)
    // For LTI, we might create a simplified user account
    const newUser = await ctx.db.insert("users", {
      email: args.userEmail,
      clerkUserId: `lti_${args.ltiUserId}`, // Temporary LTI-based ID
      firstName: '', // Will be populated from LTI data
      lastName: '',
      createdAt: Date.now(),
      isLTIUser: true,
    });

    // Create LTI mapping
    await ctx.db.insert("ltiUserMappings", {
      ltiUserId: args.ltiUserId,
      northstarUserId: newUser,
      institutionUrl: args.institutionUrl,
      userEmail: args.userEmail,
      createdAt: Date.now(),
    });

    return {
      clerkUserId: `lti_${args.ltiUserId}`,
      northstarUserId: newUser,
    };
  },
});

// Get LTI dashboard data
export const getLTIDashboardData = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(api.ltiIntegration.getLTISession, {
      sessionToken: args.sessionToken,
    });

    if (!session) return null;

    // Get user's Northstar data
    const userMapping = await ctx.db
      .query("ltiUserMappings")
      .withIndex("by_lti_user", (q) => q.eq("ltiUserId", session.ltiUserId))
      .first();

    if (!userMapping) return null;

    // Get assignments for this course
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_user", (q) => q.eq("userId", userMapping.northstarUserId))
      .collect();

    // Filter assignments for this specific course
    const courseAssignments = assignments.filter(
      (assignment) => assignment.d2lSourceId === session.ltiCourseId
    );

    return {
      session,
      assignments: courseAssignments,
      courseName: session.courseName,
      userRole: session.userRole,
    };
  },
});

// Validate LTI launch request (would be called from API endpoint)
export const validateLTILaunch = action({
  args: {
    ltiData: v.any(), // LTI launch parameters
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    // In a real implementation, you would:
    // 1. Verify OAuth signature using shared secret
    // 2. Validate required LTI parameters
    // 3. Check consumer key is registered
    
    const requiredParams = [
      'lti_message_type',
      'lti_version', 
      'resource_link_id',
      'user_id',
      'context_id',
      'tool_consumer_instance_guid',
    ];

    for (const param of requiredParams) {
      if (!args.ltiData[param]) {
        throw new Error(`Missing required LTI parameter: ${param}`);
      }
    }

    // Verify signature (simplified - in production use proper OAuth signature verification)
    const isValidSignature = await verifyLTISignature(args.ltiData, args.signature);
    if (!isValidSignature) {
      throw new Error('Invalid LTI signature');
    }

    return {
      valid: true,
      userId: args.ltiData.user_id,
      courseId: args.ltiData.context_id,
      institutionUrl: args.ltiData.tool_consumer_instance_url,
      userEmail: args.ltiData.lis_person_contact_email_primary,
      courseName: args.ltiData.context_title,
      userRole: args.ltiData.roles,
    };
  },
});

// Helper function for signature verification (would be implemented properly)
async function verifyLTISignature(ltiData: any, signature: string): Promise<boolean> {
  // In production, implement proper OAuth 1.0a signature verification
  // This is a simplified placeholder
  return true; // For development
}

