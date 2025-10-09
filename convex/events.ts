import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get events for the current week
export const getWeekEvents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user) {
      return [];
    }

    // Get current week's start and end
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7); // Next Sunday
    endOfWeek.setHours(0, 0, 0, 0);

    // Get events for this week
    const events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    const weekEvents = events.filter(event => 
      event.startTime >= startOfWeek.getTime() && 
      event.startTime < endOfWeek.getTime()
    );

    // Also get course schedules as recurring events
    const courses = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    // Convert course schedules to events for this week
    const courseEvents = courses.map(course => ({
      _id: course._id + "_schedule" as any,
      title: course.title,
      startTime: startOfWeek.getTime() + (10 * 60 * 60 * 1000), // 10 AM as example
      endTime: startOfWeek.getTime() + (11 * 60 * 60 * 1000), // 11 AM as example
      color: "#3B82F6", // Default blue since color isn't in schema
      type: "class" as const,
      courseCode: course.code
    }));

    return [...weekEvents.map(event => ({
      _id: event._id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      color: "#8B5CF6", // Default purple
      type: event.type as "class" | "assignment" | "event",
      courseCode: undefined
    })), ...courseEvents];
  },
});

// Get events for a specific month
export const getEventsForMonth = query({
  args: { 
    year: v.number(),
    month: v.number() // 0-based (0 = January, 11 = December)
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user) {
      return [];
    }

    // Get month's start and end
    const startOfMonth = new Date(args.year, args.month, 1);
    const endOfMonth = new Date(args.year, args.month + 1, 1);

    // Get events for this month
    const events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    const monthEvents = events.filter(event => 
      event.startTime >= startOfMonth.getTime() && 
      event.startTime < endOfMonth.getTime()
    );

    // Also get assignments due this month
    const assignments = await ctx.db
      .query("assignments")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    const monthAssignments = assignments.filter(assignment => 
      assignment.dueAt >= startOfMonth.getTime() && 
      assignment.dueAt < endOfMonth.getTime()
    );

    // Convert assignments to events
    const assignmentEvents = await Promise.all(
      monthAssignments.map(async (assignment) => {
        const course = await ctx.db.get(assignment.courseId);
        return {
          _id: assignment._id + "_event" as any,
          title: assignment.title,
          startTime: assignment.dueAt,
          endTime: assignment.dueAt + (60 * 60 * 1000), // 1 hour duration
          color: "#EF4444", // Red for assignments
          type: "assignment" as const,
          courseCode: course?.code
        };
      })
    );

    return [...monthEvents.map(event => ({
      _id: event._id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      color: event.color,
      type: event.type as "class" | "assignment" | "event",
      courseCode: undefined
    })), ...assignmentEvents];
  },
});

// Create a new event
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    type: v.string(),
    location: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db.insert("events", {
      userId: user._id,
      ...args
    });
  },
});

// Get a single event by ID
export const getEvent = query({
  args: {
    eventId: v.id("events")
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const event = await ctx.db.get(args.eventId);
    
    if (!event || event.userId !== user._id) {
      throw new Error("Event not found");
    }

    return event;
  },
});