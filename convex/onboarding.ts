import { query } from "./_generated/server";

// Get all ethnicities for onboarding
export const getEthnicities = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("ethnicities").collect();
  },
});

// Get all schools for onboarding
export const getSchools = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("schools").collect();
  },
});

// Get all major categories for onboarding
export const getMajorCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("majorCategories").collect();
  },
});


