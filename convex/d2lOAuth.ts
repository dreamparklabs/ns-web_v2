import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// D2L OAuth 2.0 Configuration
const D2L_CLIENT_ID = process.env.D2L_CLIENT_ID;
const D2L_CLIENT_SECRET = process.env.D2L_CLIENT_SECRET;
const D2L_REDIRECT_URI = process.env.D2L_REDIRECT_URI || "http://localhost:5173/auth/d2l/callback";

// Store D2L OAuth state and school URL
export const initializeD2LOAuth = mutation({
  args: {
    clerkUserId: v.string(),
    schoolUrl: v.string(), // e.g., "https://myschool.brightspace.com"
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Generate a random state parameter for security
    const state = generateRandomState();
    
    // Find the user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Store OAuth state and school URL temporarily
    await ctx.db.patch(user._id, {
      d2lBaseUrl: args.schoolUrl,
      d2lOAuthState: state,
      d2lOAuthInitiatedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Construct D2L OAuth authorization URL
    const authUrl = new URL(`${args.schoolUrl}/d2l/oauth/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', D2L_CLIENT_ID || 'your_client_id');
    authUrl.searchParams.set('redirect_uri', D2L_REDIRECT_URI);
    authUrl.searchParams.set('scope', 'core:*:* enrollment:*:* content:*:* grades:*:* calendar:*:* news:*:* discussions:*:*');
    authUrl.searchParams.set('state', state);

    return {
      authUrl: authUrl.toString(),
      state,
    };
  },
});

// Handle OAuth callback and exchange code for tokens
export const handleD2LOAuthCallback = mutation({
  args: {
    clerkUserId: v.string(),
    code: v.string(),
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find the user and verify state
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.d2lOAuthState !== args.state) {
      throw new Error("Invalid OAuth state parameter");
    }

    // Check if OAuth was initiated recently (within 10 minutes)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    if (!user.d2lOAuthInitiatedAt || user.d2lOAuthInitiatedAt < tenMinutesAgo) {
      throw new Error("OAuth session expired");
    }

    try {
      // Exchange authorization code for access token
      const tokenResponse = await fetch(`${user.d2lBaseUrl}/d2l/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: D2L_CLIENT_ID || 'your_client_id',
          client_secret: D2L_CLIENT_SECRET || 'your_client_secret',
          redirect_uri: D2L_REDIRECT_URI,
          code: args.code,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();

      // Get user information from D2L
      const userResponse = await fetch(`${user.d2lBaseUrl}/d2l/api/lp/1.0/users/whoami`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error(`Failed to get user info: ${userResponse.status}`);
      }

      const d2lUser = await userResponse.json();

      // Store OAuth tokens and user info
      await ctx.db.patch(user._id, {
        d2lAccessToken: tokenData.access_token,
        d2lRefreshToken: tokenData.refresh_token,
        d2lTokenExpiresAt: Date.now() + (tokenData.expires_in * 1000),
        d2lUserId: d2lUser.Identifier.toString(),
        d2lUserName: d2lUser.DisplayName,
        d2lSyncEnabled: true,
        d2lLastSyncAt: Date.now(),
        // Clear OAuth state
        d2lOAuthState: undefined,
        d2lOAuthInitiatedAt: undefined,
        updatedAt: Date.now(),
      });

      return {
        success: true,
        user: {
          id: d2lUser.Identifier,
          name: d2lUser.DisplayName,
          email: d2lUser.EmailAddress,
        },
      };
    } catch (error) {
      console.error('D2L OAuth callback error:', error);
      throw new Error(`OAuth callback failed: ${error.message}`);
    }
  },
});

// Refresh D2L access token
export const refreshD2LToken = mutation({
  args: {
    clerkUserId: v.string(),
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

    if (!user || !user.d2lRefreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const tokenResponse = await fetch(`${user.d2lBaseUrl}/d2l/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: D2L_CLIENT_ID || 'your_client_id',
          client_secret: D2L_CLIENT_SECRET || 'your_client_secret',
          refresh_token: user.d2lRefreshToken,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token refresh failed: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();

      // Update stored tokens
      await ctx.db.patch(user._id, {
        d2lAccessToken: tokenData.access_token,
        d2lRefreshToken: tokenData.refresh_token || user.d2lRefreshToken,
        d2lTokenExpiresAt: Date.now() + (tokenData.expires_in * 1000),
        updatedAt: Date.now(),
      });

      return { success: true };
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  },
});

// D2L OAuth API Client
export class D2LOAuthClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  // Make authenticated request to D2L API using OAuth token
  async makeRequest(endpoint: string, method: string = 'GET', data?: any) {
    const url = `${this.baseUrl}/d2l/api${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      
      if (response.status === 401) {
        throw new Error('REFRESH_TOKEN_NEEDED');
      }

      if (!response.ok) {
        throw new Error(`D2L API Error: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text();
    } catch (error) {
      console.error('D2L API Request failed:', error);
      throw error;
    }
  }

  // Get user's enrolled courses
  async getEnrolledCourses() {
    return await this.makeRequest('/lp/1.0/enrollments/myenrollments/');
  }

  // Get course details
  async getCourseDetails(orgUnitId: string) {
    return await this.makeRequest(`/lp/1.0/courses/${orgUnitId}`);
  }

  // Get course assignments (dropboxes)
  async getCourseAssignments(orgUnitId: string) {
    return await this.makeRequest(`/le/1.0/${orgUnitId}/dropbox/folders/`);
  }

  // Get course quizzes
  async getCourseQuizzes(orgUnitId: string) {
    return await this.makeRequest(`/le/1.0/${orgUnitId}/quizzes/`);
  }

  // Get discussion forums
  async getDiscussionForums(orgUnitId: string) {
    return await this.makeRequest(`/le/1.0/${orgUnitId}/discussions/forums/`);
  }

  // Get course news/announcements
  async getCourseNews(orgUnitId: string) {
    return await this.makeRequest(`/le/1.0/${orgUnitId}/news/`);
  }

  // Get course content modules
  async getCourseContent(orgUnitId: string) {
    return await this.makeRequest(`/le/1.0/${orgUnitId}/content/root/`);
  }

  // Get calendar events
  async getCalendarEvents(orgUnitIds: string[], startDate: string, endDate: string) {
    const orgUnitParam = orgUnitIds.join(',');
    return await this.makeRequest(`/le/1.0/calendar/events/?orgUnitIdsCSV=${orgUnitParam}&startDateTime=${startDate}&endDateTime=${endDate}`);
  }
}

// Sync courses using OAuth
export const syncD2LCoursesOAuth = mutation({
  args: {
    clerkUserId: v.string(),
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

    if (!user || !user.d2lAccessToken || !user.d2lBaseUrl) {
      throw new Error("D2L OAuth not configured");
    }

    // Check if token is expired
    if (user.d2lTokenExpiresAt && user.d2lTokenExpiresAt < Date.now()) {
      throw new Error("REFRESH_TOKEN_NEEDED");
    }

    const d2lClient = new D2LOAuthClient(user.d2lBaseUrl, user.d2lAccessToken);

    try {
      const enrollments = await d2lClient.getEnrolledCourses();
      const syncedCourses = [];

      for (const enrollment of enrollments.Items || []) {
        if (enrollment.Access.IsActive) {
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
            const courseId = await ctx.db.insert("courses", {
              userId: user._id,
              title: courseDetails.Name,
              code: courseDetails.Code,
              instructor: courseDetails.Description || "TBD",
              creditHours: 3, // Default
              termId: user.currentActiveTerm,
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

      // Update last sync time
      await ctx.db.patch(user._id, {
        d2lLastSyncAt: Date.now(),
        updatedAt: Date.now(),
      });

      return {
        success: true,
        syncedCourses,
        totalSynced: syncedCourses.length,
      };
    } catch (error) {
      console.error('D2L course sync failed:', error);
      if (error.message === 'REFRESH_TOKEN_NEEDED') {
        throw new Error('REFRESH_TOKEN_NEEDED');
      }
      throw new Error(`Course sync failed: ${error.message}`);
    }
  },
});

// Get D2L OAuth status
export const getD2LOAuthStatus = query({
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

    const isTokenExpired = user.d2lTokenExpiresAt ? user.d2lTokenExpiresAt < Date.now() : true;

    return {
      isConfigured: !!(user.d2lAccessToken && user.d2lBaseUrl),
      isConnected: !!(user.d2lAccessToken && !isTokenExpired),
      needsRefresh: !!(user.d2lAccessToken && isTokenExpired && user.d2lRefreshToken),
      baseUrl: user.d2lBaseUrl,
      userName: user.d2lUserName,
      lastSyncAt: user.d2lLastSyncAt,
      tokenExpiresAt: user.d2lTokenExpiresAt,
    };
  },
});

// Disconnect D2L OAuth
export const disconnectD2LOAuth = mutation({
  args: {
    clerkUserId: v.string(),
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

    // Clear all D2L OAuth data
    await ctx.db.patch(user._id, {
      d2lAccessToken: undefined,
      d2lRefreshToken: undefined,
      d2lTokenExpiresAt: undefined,
      d2lUserId: undefined,
      d2lUserName: undefined,
      d2lSyncEnabled: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Helper function to generate random state parameter
function generateRandomState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
