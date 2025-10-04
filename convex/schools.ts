import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("schools").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    lc_name: v.string(),
    city: v.string(),
    state: v.string(),
    type: v.string(),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("schools", args);
  },
});

export const deleteAll = mutation({
  handler: async (ctx) => {
    const all = await ctx.db.query("schools").collect();
    for (const item of all) {
      await ctx.db.delete(item._id);
    }
  },
});

