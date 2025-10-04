import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper function to calculate assignment status based on due date and completion
function calculateAssignmentStatus(assignment: any): string {
  const now = Date.now();

  if (assignment.status === "completed") {
    return "completed";
  }

  if (assignment.dueAt < now) {
    return "overdue";
  }

  return "todo";
}

// Function to update overdue assignments in the database
async function updateOverdueAssignments(ctx: any, userId: any) {
  const now = Date.now();

  // Find all assignments that should be overdue but aren't marked as such
  const assignments = await ctx.db
    .query("assignments")
    .filter((q) => q.eq(q.field("userId"), userId))
    .collect();

  const assignmentsToUpdate = assignments.filter(assignment =>
    assignment.status !== "completed" &&
    assignment.status !== "overdue" &&
    assignment.dueAt < now
  );

  // Update each assignment that should be overdue
  for (const assignment of assignmentsToUpdate) {
    await ctx.db.patch(assignment._id, {
      status: "overdue"
    });
  }

  return assignmentsToUpdate.length;
}

// Mutation to update overdue assignments
export const updateOverdueAssignmentStatuses = mutation({
  args: {},
  handler: async (ctx) => {
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

    return await updateOverdueAssignments(ctx, user._id);
  },
});

// Get all assignments for a user
export const getUserAssignments = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    // First get the user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return [];
    }

    // Get all assignments for the user
    const assignments = await ctx.db
      .query("assignments")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    // Get course information for each assignment
    const assignmentsWithCourses = await Promise.all(
      assignments.map(async (assignment) => {
        const course = await ctx.db.get(assignment.courseId);
        return {
          ...assignment,
          // Use the actual database status
          courseCode: course?.code,
          courseName: course?.title,
          courseColor: "#3B82F6" // Default blue since color isn't in the schema
        };
      })
    );

    return assignmentsWithCourses.sort((a, b) => a.dueAt - b.dueAt);
  },
});

// Get upcoming deadlines (next 7 days)
export const getUpcomingDeadlines = query({
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

    const now = Date.now();
    const oneWeekFromNow = now + (7 * 24 * 60 * 60 * 1000);

    const assignments = await ctx.db
      .query("assignments")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    const upcomingAssignments = assignments
      .filter(assignment =>
        assignment.dueAt >= now &&
        assignment.dueAt <= oneWeekFromNow &&
        assignment.status !== "completed"
      )
      .sort((a, b) => a.dueAt - b.dueAt);

    // Get course information
    const assignmentsWithCourses = await Promise.all(
      upcomingAssignments.map(async (assignment) => {
        const course = await ctx.db.get(assignment.courseId);
        return {
          ...assignment,
          // Use the actual database status
          courseCode: course?.code,
          courseName: course?.title
        };
      })
    );

    return assignmentsWithCourses;
  },
});

// Get recent grades (assignments with grades)
export const getRecentGrades = query({
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

    const assignments = await ctx.db
      .query("assignments")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    const gradedAssignments = assignments
      .filter(assignment => assignment.pointsEarned !== undefined)
      .sort((a, b) => b.dueAt - a.dueAt) // Most recent first
      .slice(0, 5); // Get last 5 graded assignments

    // Get course information
    const assignmentsWithCourses = await Promise.all(
      gradedAssignments.map(async (assignment) => {
        const course = await ctx.db.get(assignment.courseId);
        return {
          _id: assignment._id,
          title: assignment.title,
          pointsEarned: assignment.pointsEarned,
          maxPoints: assignment.maxPoints,
          grade: assignment.grade, // This is now the calculated percentage
          courseCode: course?.code,
          dueAt: assignment.dueAt,
          status: assignment.status
        };
      })
    );

    return assignmentsWithCourses;
  },
});

// Search assignments, courses, and files
export const searchContent = query({
  args: {
    clerkUserId: v.string(),
    query: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return { assignments: [], courses: [], files: [] };
    }

    const searchQuery = args.query.toLowerCase().trim();
    const limit = args.limit || 10;

    if (!searchQuery) {
      return { assignments: [], courses: [], files: [] };
    }

    // Search assignments
    const assignments = await ctx.db
      .query("assignments")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    const matchingAssignments = assignments
      .filter(assignment =>
        assignment.title.toLowerCase().includes(searchQuery) ||
        assignment.lc_title.includes(searchQuery) ||
        assignment.notes?.toLowerCase().includes(searchQuery) ||
        assignment.type?.toLowerCase().includes(searchQuery)
      )
      .slice(0, limit);

    // Get course info for matching assignments
    const assignmentsWithCourses = await Promise.all(
      matchingAssignments.map(async (assignment) => {
        const course = await ctx.db.get(assignment.courseId);
        return {
          ...assignment,
          courseCode: course?.code,
          courseName: course?.title,
        };
      })
    );

    // Search courses
    const courses = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    const matchingCourses = courses
      .filter(course =>
        course.title.toLowerCase().includes(searchQuery) ||
        course.lc_title.includes(searchQuery) ||
        course.code.toLowerCase().includes(searchQuery) ||
        course.lc_code.includes(searchQuery) ||
        course.instructor.toLowerCase().includes(searchQuery)
      )
      .slice(0, limit);

        // Search files by OCR text and filename
        const files = await ctx.db
          .query("files")
          .filter((q) => q.eq(q.field("userId"), user._id))
          .collect();

        const matchingFiles = files
          .filter(file => {
            const searchInFileName = file.originalFileName.toLowerCase().includes(searchQuery);
            const searchInOCRText = file.ocrText?.toLowerCase().includes(searchQuery) || false;
            const searchInDescription = file.description?.toLowerCase().includes(searchQuery) || false;

            return searchInFileName || searchInOCRText || searchInDescription;
          })
          .slice(0, limit);

        // Get additional info for matching files
        const filesWithInfo = await Promise.all(
          matchingFiles.map(async (file) => {
            let assignmentInfo = null;
            let courseInfo = null;

            if (file.assignmentId) {
              const assignment = await ctx.db.get(file.assignmentId);
              if (assignment) {
                const course = await ctx.db.get(assignment.courseId);
                assignmentInfo = {
                  title: assignment.title,
                  courseCode: course?.code,
                };
              }
            } else if (file.courseId) {
              const course = await ctx.db.get(file.courseId);
              if (course) {
                courseInfo = {
                  code: course.code,
                  name: course.title,
                };
              }
            }

            return {
              ...file,
              assignmentInfo,
              courseInfo,
            };
          })
        );

        return {
          assignments: assignmentsWithCourses.sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0)),
          courses: matchingCourses,
          files: filesWithInfo
        };
  },
});

// Create a new assignment
export const createAssignment = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    dueDate: v.number(),
    maxPoints: v.optional(v.number())
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

    return await ctx.db.insert("assignments", {
      userId: user._id,
      courseId: args.courseId,
      title: args.title,
      lc_title: args.title.toLowerCase(),
      notes: args.description,
      type: args.type,
      dueAt: args.dueDate, // Map dueDate to dueAt to match schema
      status: "todo",
      pointsEarned: undefined,
      maxPoints: args.maxPoints,
      grade: undefined // This will be calculated when pointsEarned is added
    });
  },
});

// Update assignment status
export const updateAssignmentStatus = mutation({
  args: {
    assignmentId: v.id("assignments"),
    status: v.string(),
    pointsEarned: v.optional(v.number()),
    maxPoints: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Verify the assignment belongs to the user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user || assignment.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const updateData: any = {
      status: args.status
    };

    if (args.pointsEarned !== undefined) updateData.pointsEarned = args.pointsEarned;
    if (args.maxPoints !== undefined) updateData.maxPoints = args.maxPoints;

    // Calculate grade percentage if both pointsEarned and maxPoints are available
    const finalPointsEarned = args.pointsEarned !== undefined ? args.pointsEarned : assignment.pointsEarned;
    const finalMaxPoints = args.maxPoints !== undefined ? args.maxPoints : assignment.maxPoints;

    if (finalPointsEarned !== undefined && finalMaxPoints !== undefined && finalMaxPoints > 0) {
      updateData.grade = (finalPointsEarned / finalMaxPoints) * 100;
    }

    return await ctx.db.patch(args.assignmentId, updateData);
  },
});

// Update/Edit assignment
export const updateAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    maxPoints: v.optional(v.number()),
    pointsEarned: v.optional(v.number()),
    status: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Verify the assignment belongs to the user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user || assignment.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const updateData: any = {};
    const modifiedFields: string[] = [];

    if (args.title !== undefined) {
      updateData.title = args.title;
      updateData.lc_title = args.title.toLowerCase();
      modifiedFields.push('title');
    }
    if (args.description !== undefined) {
      updateData.notes = args.description;
      modifiedFields.push('notes');
    }
    if (args.type !== undefined) {
      updateData.type = args.type;
      modifiedFields.push('type');
    }
    if (args.dueDate !== undefined) {
      updateData.dueAt = args.dueDate;
      modifiedFields.push('dueAt');
    }
    if (args.maxPoints !== undefined) {
      updateData.maxPoints = args.maxPoints;
      modifiedFields.push('maxPoints');
    }
    if (args.pointsEarned !== undefined) {
      updateData.pointsEarned = args.pointsEarned;
      modifiedFields.push('pointsEarned');
    }
    if (args.status !== undefined) {
      updateData.status = args.status;
      modifiedFields.push('status');
    }

    // Track user modifications
    if (modifiedFields.length > 0) {
      updateData.userModifiedAt = Date.now();
      // Merge with existing user-modified fields
      const existingModifiedFields = assignment.userModifiedFields || [];
      const allModifiedFields = Array.from(new Set([...existingModifiedFields, ...modifiedFields]));
      updateData.userModifiedFields = allModifiedFields;
    }

    // Calculate grade percentage if both pointsEarned and maxPoints are available
    const finalPointsEarned = args.pointsEarned !== undefined ? args.pointsEarned : assignment.pointsEarned;
    const finalMaxPoints = args.maxPoints !== undefined ? args.maxPoints : assignment.maxPoints;

    if (finalPointsEarned !== undefined && finalMaxPoints !== undefined && finalMaxPoints > 0) {
      updateData.grade = (finalPointsEarned / finalMaxPoints) * 100;
    } else if (args.pointsEarned === undefined && args.maxPoints === undefined) {
      // Don't update grade if neither pointsEarned nor maxPoints are being updated
    } else {
      // Clear grade if either pointsEarned or maxPoints is being cleared or set to invalid value
      updateData.grade = undefined;
    }

    return await ctx.db.patch(args.assignmentId, updateData);
  },
});

// Delete assignment
export const deleteAssignment = mutation({
  args: {
    assignmentId: v.id("assignments")
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Verify the assignment belongs to the user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user || assignment.userId !== user._id) {
      throw new Error("Not authorized");
    }

    return await ctx.db.delete(args.assignmentId);
  },
});

// Get a single assignment by ID
export const getAssignment = query({
  args: {
    assignmentId: v.id("assignments")
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Verify the assignment belongs to the user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user || assignment.userId !== user._id) {
      throw new Error("Not authorized");
    }

    // Get course information
    const course = await ctx.db.get(assignment.courseId);

    return {
      ...assignment,
      // Use the actual database status
      courseCode: course?.code,
      courseName: course?.title
    };
  },
});

// Allow sync to override user modifications (reset protection)
export const resetAssignmentProtection = mutation({
  args: {
    assignmentId: v.id("assignments"),
    fields: v.optional(v.array(v.string())) // If not provided, resets all protection
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Verify the assignment belongs to the user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user || assignment.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const updateData: any = {};

    if (args.fields && args.fields.length > 0) {
      // Remove specific fields from protection
      const currentModifiedFields = assignment.userModifiedFields || [];
      const fieldsToRemove = new Set(args.fields);
      const newModifiedFields = currentModifiedFields.filter(field => !fieldsToRemove.has(field));

      if (newModifiedFields.length === 0) {
        updateData.userModifiedFields = undefined;
        updateData.userModifiedAt = undefined;
      } else {
        updateData.userModifiedFields = newModifiedFields;
        updateData.userModifiedAt = Date.now(); // Update timestamp
      }
    } else {
      // Reset all protection
      updateData.userModifiedFields = undefined;
      updateData.userModifiedAt = undefined;
    }

    return await ctx.db.patch(args.assignmentId, updateData);
  },
});