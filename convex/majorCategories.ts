import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("majorCategories").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    lc_name: v.string(),
    description: v.string(),
    commonMajors: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("majorCategories", args);
  },
});

export const deleteAll = mutation({
  handler: async (ctx) => {
    const all = await ctx.db.query("majorCategories").collect();
    for (const item of all) {
      await ctx.db.delete(item._id);
    }
  },
});

