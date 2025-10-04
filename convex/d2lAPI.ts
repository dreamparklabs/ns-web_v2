import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// D2L API configuration
const D2L_API_VERSION = "1.0";

// Store D2L API credentials and tokens
export const storeD2LCredentials = mutation({
  args: {
    clerkUserId: v.string(),
    institutionUrl: v.string(),
    clientId: v.string(),
    clientSecret: v.string(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Find existing D2L config or create new one
    const existing = await ctx.db
      .query("d2lConfigurations")
      .withIndex("by_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        institutionUrl: args.institutionUrl,
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        tokenExpiresAt: args.tokenExpiresAt,
        updatedAt: Date.now(),
      });
    } else {
      return await ctx.db.insert("d2lConfigurations", {
        clerkUserId: args.clerkUserId,
        institutionUrl: args.institutionUrl,
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        tokenExpiresAt: args.tokenExpiresAt,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Get D2L configuration for user
export const getD2LConfiguration = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const config = await ctx.db
      .query("d2lConfigurations")
      .withIndex("by_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!config) return null;

    // Don't return sensitive data to client
    return {
      _id: config._id,
      institutionUrl: config.institutionUrl,
      clientId: config.clientId,
      hasAccessToken: !!config.accessToken,
      hasRefreshToken: !!config.refreshToken,
      tokenExpiresAt: config.tokenExpiresAt,
      isTokenExpired: config.tokenExpiresAt ? Date.now() > config.tokenExpiresAt : true,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  },
});

// Refresh D2L access token
export const refreshD2LToken = action({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    // Get current config
    const config = await ctx.runQuery(api.d2lAPI.getD2LConfiguration, {
      clerkUserId: args.clerkUserId,
    });

    if (!config || !config.hasRefreshToken) {
      throw new Error("No refresh token available");
    }

    // Get full config with secrets (server-side only)
    const fullConfig = await ctx.runQuery(api.d2lAPI.getD2LConfigurationFull, {
      clerkUserId: args.clerkUserId,
    });

    if (!fullConfig) {
      throw new Error("D2L configuration not found");
    }

    try {
      // Refresh token with D2L API
      const response = await fetch(`${fullConfig.institutionUrl}/d2l/auth/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: fullConfig.clientId,
          client_secret: fullConfig.clientSecret,
          refresh_token: fullConfig.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }

      const tokenData = await response.json();

      // Update stored tokens
      await ctx.runMutation(api.d2lAPI.storeD2LCredentials, {
        clerkUserId: args.clerkUserId,
        institutionUrl: fullConfig.institutionUrl,
        clientId: fullConfig.clientId,
        clientSecret: fullConfig.clientSecret,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || fullConfig.refreshToken,
        tokenExpiresAt: Date.now() + (tokenData.expires_in * 1000),
      });

      return {
        success: true,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
      };
    } catch (error) {
      console.error("D2L token refresh failed:", error);
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  },
});

// Internal query to get full config (server-side only)
export const getD2LConfigurationFull = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("d2lConfigurations")
      .withIndex("by_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
  },
});

// Make authenticated D2L API request
export const makeD2LAPIRequest = action({
  args: {
    clerkUserId: v.string(),
    endpoint: v.string(),
    method: v.optional(v.string()),
    body: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get or refresh access token
    const config = await ctx.runQuery(api.d2lAPI.getD2LConfiguration, {
      clerkUserId: args.clerkUserId,
    });

    if (!config) {
      throw new Error("D2L API not configured");
    }

    // Refresh token if expired
    if (config.isTokenExpired && config.hasRefreshToken) {
      await ctx.runAction(api.d2lAPI.refreshD2LToken, {
        clerkUserId: args.clerkUserId,
      });
    }

    // Get fresh config with access token
    const fullConfig = await ctx.runQuery(api.d2lAPI.getD2LConfigurationFull, {
      clerkUserId: args.clerkUserId,
    });

    if (!fullConfig?.accessToken) {
      throw new Error("No valid access token available");
    }

    // Make API request
    const url = `${fullConfig.institutionUrl}/d2l/api/lp/${D2L_API_VERSION}${args.endpoint}`;
    const response = await fetch(url, {
      method: args.method || 'GET',
      headers: {
        'Authorization': `Bearer ${fullConfig.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: args.body ? JSON.stringify(args.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`D2L API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  },
});

// Sync assignments from D2L API
export const syncAssignmentsFromD2L = action({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    try {
      // Get user's courses
      const courses = await ctx.runAction(api.d2lAPI.makeD2LAPIRequest, {
        clerkUserId: args.clerkUserId,
        endpoint: '/enrollments/myenrollments/',
      });

      const allAssignments = [];
      const allGrades = [];

      // Process each course
      for (const enrollment of courses.Items || []) {
        const orgUnitId = enrollment.OrgUnit.Id;
        const courseName = enrollment.OrgUnit.Name;

        try {
          // Get assignments (dropbox folders)
          const assignments = await ctx.runAction(api.d2lAPI.makeD2LAPIRequest, {
            clerkUserId: args.clerkUserId,
            endpoint: `/dropbox/orgunits/${orgUnitId}/folders/`,
          });

          // Get grades
          const grades = await ctx.runAction(api.d2lAPI.makeD2LAPIRequest, {
            clerkUserId: args.clerkUserId,
            endpoint: `/grades/orgunits/${orgUnitId}/current/final/values/`,
          });

          // Process assignments
          for (const assignment of assignments || []) {
            allAssignments.push({
              id: `d2l_${orgUnitId}_${assignment.Id}`,
              name: assignment.Name,
              description: assignment.Instructions?.Text || '',
              dueDate: assignment.DueDate,
              type: 'assignment',
              courseOrgUnitId: orgUnitId,
              courseName: courseName,
              maxPoints: assignment.TotalPoints,
              submissionStatus: 'not_submitted', // Will be updated with submission data
            });
          }

          // Process grades
          for (const grade of grades || []) {
            if (grade.GradeValue) {
              allGrades.push({
                itemName: grade.GradeObjectName,
                pointsEarned: grade.GradeValue.PointsNumerator,
                maxPoints: grade.GradeValue.PointsDenominator,
                courseOrgUnitId: orgUnitId,
                courseName: courseName,
              });
            }
          }
        } catch (courseError) {
          console.error(`Failed to sync course ${orgUnitId}:`, courseError);
          // Continue with other courses
        }
      }

      // Store assignments in database using existing function
      const syncResult = await ctx.runMutation(api.d2lScraper.processScrapedAssignmentsWithMatching, {
        clerkUserId: args.clerkUserId,
        assignmentsData: allAssignments,
      });

      return {
        success: true,
        assignmentsCount: allAssignments.length,
        gradesCount: allGrades.length,
        coursesProcessed: courses.Items?.length || 0,
        syncResult,
      };
    } catch (error) {
      console.error("D2L API sync failed:", error);
      throw new Error(`D2L sync failed: ${error.message}`);
    }
  },
});

// Get D2L user info (WhoAmI)
export const getD2LUserInfo = action({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const userInfo = await ctx.runAction(api.d2lAPI.makeD2LAPIRequest, {
      clerkUserId: args.clerkUserId,
      endpoint: '/users/whoami',
    });

    return userInfo;
  },
});

// Test D2L API connection
export const testD2LConnection = action({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    try {
      const userInfo = await ctx.runAction(api.d2lAPI.getD2LUserInfo, {
        clerkUserId: args.clerkUserId,
      });

      return {
        success: true,
        userInfo: {
          identifier: userInfo.Identifier,
          firstName: userInfo.FirstName,
          lastName: userInfo.LastName,
          uniqueName: userInfo.UniqueName,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

