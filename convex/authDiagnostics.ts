import { query, mutation } from "./_generated/server";

// Diagnostic query to check authentication status
export const checkAuth = query({
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      
      if (!identity) {
        return {
          authenticated: false,
          message: "No identity found",
        };
      }

      return {
        authenticated: true,
        subject: identity.subject,
        issuer: identity.issuer,
        tokenIdentifier: identity.tokenIdentifier,
        message: "Authentication successful",
      };
    } catch (error) {
      return {
        authenticated: false,
        error: error.message,
        message: "Authentication check failed",
      };
    }
  },
});

// Diagnostic mutation to test write operations
export const testMutation = mutation({
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      
      if (!identity) {
        return {
          success: false,
          message: "Not authenticated",
        };
      }

      return {
        success: true,
        subject: identity.subject,
        issuer: identity.issuer,
        message: "Mutation authentication successful",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Mutation authentication failed",
      };
    }
  },
});

