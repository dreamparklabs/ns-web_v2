import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all courses for a user
export const getUserCourses = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return [];
    }

    const courses = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    // Get assignment counts for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const assignments = await ctx.db
          .query("assignments")
          .filter((q) => q.eq(q.field("courseId"), course._id))
          .collect();

        const completedAssignments = assignments.filter(a => a.status === "completed");
        const gradedAssignments = assignments.filter(a => a.grade !== undefined);

        // Calculate average grade
        const averageGrade = gradedAssignments.length > 0
          ? gradedAssignments.reduce((sum, a) => sum + (a.grade || 0), 0) / gradedAssignments.length
          : null;

        return {
          ...course,
          totalAssignments: assignments.length,
          completedAssignments: completedAssignments.length,
          averageGrade: averageGrade ? Math.round(averageGrade) : null,
          // Add computed fields for easier access
          courseCode: course.code,
          courseName: course.title
        };
      })
    );

    return coursesWithStats;
  },
});

// Get courses for a user, optionally filtered by term
export const getUserCoursesByTerm = query({
  args: {
    clerkUserId: v.string(),
    termId: v.optional(v.id("terms"))
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return [];
    }

    let courses = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    // Filter by term if provided
    if (args.termId) {
      courses = courses.filter(course => course.termId === args.termId);
    }

    // Get assignment counts for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const assignments = await ctx.db
          .query("assignments")
          .filter((q) => q.eq(q.field("courseId"), course._id))
          .collect();

        const completedAssignments = assignments.filter(a => a.status === "completed");
        const gradedAssignments = assignments.filter(a => a.grade !== undefined);

        // Calculate average grade
        const averageGrade = gradedAssignments.length > 0
          ? gradedAssignments.reduce((sum, a) => sum + (a.grade || 0), 0) / gradedAssignments.length
          : null;

        // Format meeting days and times
        const meetingTime = course.meetingStart && course.meetingEnd
          ? `${course.meetingStart}-${course.meetingEnd}`
          : null;

        const meetingSchedule = course.meetingDays && meetingTime
          ? `${course.meetingDays.join('')} ${meetingTime}`
          : null;

        return {
          ...course,
          totalAssignments: assignments.length,
          completedAssignments: completedAssignments.length,
          averageGrade: averageGrade ? Math.round(averageGrade) : null,
          meetingSchedule,
          // Add computed fields for easier access
          courseCode: course.code,
          courseName: course.title
        };
      })
    );

    return coursesWithStats;
  },
});

// Get a single course by ID with detailed information
export const getCourseById = query({
  args: {
    courseId: v.id("courses"),
    clerkUserId: v.string()
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return null;
    }

    const course = await ctx.db.get(args.courseId);

    if (!course || course.userId !== user._id) {
      return null;
    }

    // Get all assignments for this course
    const assignments = await ctx.db
      .query("assignments")
      .filter((q) => q.eq(q.field("courseId"), course._id))
      .collect();

    const completedAssignments = assignments.filter(a => a.status === "completed");
    const gradedAssignments = assignments.filter(a => a.grade !== undefined);
    const upcomingAssignments = assignments.filter(a =>
      a.status !== "completed" && a.dueAt && a.dueAt > Date.now()
    );
    const overdueAssignments = assignments.filter(a =>
      a.status !== "completed" && a.dueAt && a.dueAt < Date.now()
    );

    // Calculate average grade
    const averageGrade = gradedAssignments.length > 0
      ? gradedAssignments.reduce((sum, a) => sum + (a.grade || 0), 0) / gradedAssignments.length
      : null;

    // Format meeting schedule
    const meetingTime = course.meetingStart && course.meetingEnd
      ? `${course.meetingStart}-${course.meetingEnd}`
      : null;

    const meetingSchedule = course.meetingDays && meetingTime
      ? `${course.meetingDays.join('')} ${meetingTime}`
      : null;

    // Get term information
    const term = await ctx.db.get(course.termId);

    return {
      ...course,
      totalAssignments: assignments.length,
      completedAssignments: completedAssignments.length,
      upcomingAssignments: upcomingAssignments.length,
      overdueAssignments: overdueAssignments.length,
      averageGrade: averageGrade ? Math.round(averageGrade) : null,
      meetingSchedule,
      assignments: assignments.sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0)),
      term: term ? { name: term.name, _id: term._id } : null,
      // Add computed fields for easier access
      courseCode: course.code,
      courseName: course.title
    };
  },
});

// Create a new course
export const createCourse = mutation({
    args: {
    title: v.string(),
    code: v.string(),
    creditHours: v.number(),
    instructor: v.string(),
    deliveryFormat: v.optional(v.string()), // "in-person" or "virtual" - optional for backward compatibility
    deliveryMode: v.optional(v.string()), // "synchronous" or "asynchronous" (only for virtual)
    meetingDays: v.optional(v.array(v.string())),
    meetingStart: v.optional(v.string()),
    meetingEnd: v.optional(v.string()),
    room: v.optional(v.string()),
    building: v.optional(v.string()),
    termId: v.id("terms"),
    gradingScheme: v.optional(v.object({
      mode: v.optional(v.string()),
      categories: v.array(
        v.object({
          name: v.string(),
          weight: v.number(),
          count: v.number(),
          dropLowest: v.optional(v.number()),
        }),
      ),
    })),
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

    return await ctx.db.insert("courses", {
      userId: user._id,
      title: args.title,
      code: args.code,
      lc_code: args.code.toLowerCase(),
      lc_title: args.title.toLowerCase(),
      creditHours: args.creditHours,
      instructor: args.instructor,
      deliveryFormat: args.deliveryFormat || "in-person", // Default to in-person if not specified
      deliveryMode: args.deliveryMode,
      meetingDays: args.meetingDays,
      meetingStart: args.meetingStart,
      meetingEnd: args.meetingEnd,
      room: args.room,
      building: args.building,
      termId: args.termId,
      gradingScheme: args.gradingScheme
    });
  },
});

// Update an existing course
export const updateCourse = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.string(),
    code: v.string(),
    creditHours: v.number(),
    instructor: v.string(),
    deliveryFormat: v.optional(v.string()),
    deliveryMode: v.optional(v.string()),
    meetingDays: v.optional(v.array(v.string())),
    meetingStart: v.optional(v.string()),
    meetingEnd: v.optional(v.string()),
    room: v.optional(v.string()),
    building: v.optional(v.string()),
    termId: v.id("terms"),
    gradingScheme: v.optional(v.object({
      mode: v.optional(v.string()),
      categories: v.array(
        v.object({
          name: v.string(),
          weight: v.number(),
          count: v.number(),
          dropLowest: v.optional(v.number()),
        }),
      ),
    })),
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

    // Verify that the course belongs to the user
    const course = await ctx.db.get(args.courseId);
    if (!course || course.userId !== user._id) {
      throw new Error("Course not found or access denied");
    }

    await ctx.db.patch(args.courseId, {
      title: args.title,
      code: args.code,
      lc_code: args.code.toLowerCase(),
      lc_title: args.title.toLowerCase(),
      creditHours: args.creditHours,
      instructor: args.instructor,
      deliveryFormat: args.deliveryFormat || "in-person",
      deliveryMode: args.deliveryMode,
      meetingDays: args.meetingDays,
      meetingStart: args.meetingStart,
      meetingEnd: args.meetingEnd,
      room: args.room,
      building: args.building,
      termId: args.termId,
      gradingScheme: args.gradingScheme
    });
  },
});
