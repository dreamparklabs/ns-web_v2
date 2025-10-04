import { v } from "convex/values";
import { query } from "./_generated/server";

// Get current user's overall academic stats
export const getUserStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    return {
      gpa: user.gpa || 0,
      totalCredits: user.totalClassesEnrolled || 0,
      // You can add more calculated stats here based on your business logic
    };
  },
});

// Get courses with grades for a specific term
export const getCourseGrades = query({
  args: {
    termId: v.optional(v.id("terms"))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    let coursesQuery = ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("userId"), user._id));

    // Filter by term if specified
    if (args.termId) {
      coursesQuery = coursesQuery.filter((q) => q.eq(q.field("termId"), args.termId));
    }

    const courses = await coursesQuery.collect();

    // Get assignments for each course to calculate grades
    const coursesWithGrades = await Promise.all(
      courses.map(async (course) => {
        const assignments = await ctx.db
          .query("assignments")
          .filter((q) => q.eq(q.field("courseId"), course._id))
          .filter((q) => q.eq(q.field("userId"), user._id))
          .collect();

        // Calculate course grade based on assignments
        const gradedAssignments = assignments.filter(a => a.grade !== undefined);
        const totalPoints = gradedAssignments.reduce((sum, a) => sum + (a.grade || 0), 0);
        const averageGrade = gradedAssignments.length > 0 ? totalPoints / gradedAssignments.length : 0;

        // Convert percentage to letter grade
        const getLetterGrade = (percentage: number): string => {
          if (percentage >= 97) return "A+";
          if (percentage >= 93) return "A";
          if (percentage >= 90) return "A-";
          if (percentage >= 87) return "B+";
          if (percentage >= 83) return "B";
          if (percentage >= 80) return "B-";
          if (percentage >= 77) return "C+";
          if (percentage >= 73) return "C";
          if (percentage >= 70) return "C-";
          if (percentage >= 67) return "D+";
          if (percentage >= 63) return "D";
          if (percentage >= 60) return "D-";
          return "F";
        };

        // Calculate grade points (assuming 4.0 scale)
        const getGradePoints = (percentage: number): number => {
          if (percentage >= 97) return 4.0;
          if (percentage >= 93) return 4.0;
          if (percentage >= 90) return 3.7;
          if (percentage >= 87) return 3.3;
          if (percentage >= 83) return 3.0;
          if (percentage >= 80) return 2.7;
          if (percentage >= 77) return 2.3;
          if (percentage >= 73) return 2.0;
          if (percentage >= 70) return 1.7;
          if (percentage >= 67) return 1.3;
          if (percentage >= 63) return 1.0;
          if (percentage >= 60) return 0.7;
          return 0.0;
        };

        const letterGrade = getLetterGrade(averageGrade);
        const gradePoints = getGradePoints(averageGrade);

        return {
          ...course,
          averageGrade,
          letterGrade,
          gradePoints: gradePoints * course.creditHours,
          assignmentCount: assignments.length,
          gradedAssignmentCount: gradedAssignments.length,
        };
      })
    );

    return coursesWithGrades;
  },
});

// Get user's terms
export const getUserTerms = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Get all terms for this user
    const terms = await ctx.db
      .query("terms")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    return terms.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  },
});

// Get term by ID
export const getTerm = query({
  args: { termId: v.id("terms") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const term = await ctx.db.get(args.termId);
    if (!term) {
      throw new Error("Term not found");
    }

    // Verify the term belongs to the current user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .unique();

    if (!user || term.userId !== user._id) {
      throw new Error("Access denied");
    }

    return term;
  },
});

// Get GPA trend data by calculating GPA for each term
export const getGPATrend = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Get all terms for this user
    const terms = await ctx.db
      .query("terms")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    // Sort terms by start date (oldest first for trend display)
    const sortedTerms = terms.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    // Calculate GPA for each term
    const gpaTrend = await Promise.all(
      sortedTerms.map(async (term) => {
        // Get courses for this term
        const courses = await ctx.db
          .query("courses")
          .filter((q) => q.eq(q.field("userId"), user._id))
          .filter((q) => q.eq(q.field("termId"), term._id))
          .collect();

        if (courses.length === 0) {
          return {
            termName: term.name,
            gpa: null, // No GPA if no courses
            creditHours: 0
          };
        }

        // Calculate GPA for each course in this term
        let totalGradePoints = 0;
        let totalCreditHours = 0;

        for (const course of courses) {
          // Get assignments for this course
          const assignments = await ctx.db
            .query("assignments")
            .filter((q) => q.eq(q.field("courseId"), course._id))
            .filter((q) => q.eq(q.field("userId"), user._id))
            .collect();

          // Calculate course grade based on assignments
          const gradedAssignments = assignments.filter(a => a.grade !== undefined);

          if (gradedAssignments.length > 0) {
            const totalPoints = gradedAssignments.reduce((sum, a) => sum + (a.grade || 0), 0);
            const averageGrade = totalPoints / gradedAssignments.length;

            // Convert percentage to grade points (4.0 scale)
            const getGradePoints = (percentage: number): number => {
              if (percentage >= 97) return 4.0;
              if (percentage >= 93) return 4.0;
              if (percentage >= 90) return 3.7;
              if (percentage >= 87) return 3.3;
              if (percentage >= 83) return 3.0;
              if (percentage >= 80) return 2.7;
              if (percentage >= 77) return 2.3;
              if (percentage >= 73) return 2.0;
              if (percentage >= 70) return 1.7;
              if (percentage >= 67) return 1.3;
              if (percentage >= 63) return 1.0;
              if (percentage >= 60) return 0.7;
              return 0.0;
            };

            const gradePoints = getGradePoints(averageGrade);
            const creditHours = course.creditHours || 3; // Default to 3 credit hours if not specified

            totalGradePoints += gradePoints * creditHours;
            totalCreditHours += creditHours;
          }
        }

        // Calculate term GPA
        const termGPA = totalCreditHours > 0 ? totalGradePoints / totalCreditHours : null;

        return {
          termName: term.name,
          gpa: termGPA ? Number(termGPA.toFixed(2)) : null,
          creditHours: totalCreditHours
        };
      })
    );

    // Filter out terms with no GPA data and return only the most recent 5 terms
    return gpaTrend
      .filter(term => term.gpa !== null)
      .slice(-5); // Get the last 5 terms with GPA data
  },
});
