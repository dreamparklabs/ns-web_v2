import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new user when they sign up with Clerk
export const createUser = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    // Create new user with default values
    const userId = await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName || "",
      birthday: 0, // Will be set during onboarding
      ethnicity: "", // Will be set during onboarding
      gender: "", // Will be set during onboarding
      school: "", // Will be set during onboarding
      majorCategory: "", // Will be set during onboarding
      major: "", // Will be set during onboarding
      minor: "", // Will be set during onboarding
      currentYear: "", // Will be set during onboarding
      hasCompletedDemographics: false,
      hasCompletedGuidedTour: false,
      gpa: 0,
      location: "",
      phoneNumber: "",
      expectedGraduationDate: "",
      totalAssignments: 0,
      totalClassesEnrolled: 0,
      totalSubmissions: 0,
      totalTermsCreated: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

// Get user by Clerk ID
export const getUserByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();
  },
});

// Get progress data for dashboard
export const getProgressData = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the user from the database
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get user's assignments
    const assignments = await ctx.db
      .query("assignments")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    const completedAssignments = assignments.filter(a => a.status === "completed");
    const assignmentsWithGrades = assignments.filter(a => a.grade !== undefined);

    // Calculate current GPA (simplified - using assignment grades as proxy)
    const currentGPA = assignmentsWithGrades.length > 0
      ? Math.min((assignmentsWithGrades.reduce((sum, a) => sum + (a.grade || 0), 0) / assignmentsWithGrades.length) / 25, 4.0) // Convert percentage to 4.0 scale approximation
      : 0.0;

    // Get user's courses to calculate credits
    const courses = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    const totalCredits = courses.reduce((sum, course) => sum + course.creditHours, 0);
    const completedCredits = courses.length > 0 ? Math.floor(totalCredits * 0.75) : 0; // Only show progress if there are courses

    // Weekly progress would be tracked over time in a real implementation
    const weeklyProgress: { week: string; gpa: number; assignments: number }[] = [];

    return {
      currentGPA: Number(currentGPA.toFixed(2)), // Format to 2 decimal places for 4.0 scale
      targetGPA: 4.0, // Standard 4.0 scale maximum
      completedAssignments: completedAssignments.length,
      totalAssignments: assignments.length,
      completedCredits,
      totalCredits,
      weeklyProgress
    };
  },
});

// Update user demographics
export const updateUserDemographics = mutation({
  args: {
    userId: v.id("users"),
    birthday: v.float64(),
    ethnicity: v.string(),
    gender: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      birthday: args.birthday,
      ethnicity: args.ethnicity,
      gender: args.gender,
      // Don't set hasCompletedDemographics here - only when all onboarding is done
      updatedAt: Date.now(),
    });
  },
});

// Update user school information
export const updateUserSchoolInfo = mutation({
  args: {
    userId: v.id("users"),
    school: v.string(),
    majorCategory: v.string(),
    major: v.string(),
    minor: v.optional(v.string()),
    currentYear: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      school: args.school,
      majorCategory: args.majorCategory,
      major: args.major,
      minor: args.minor || "",
      currentYear: args.currentYear,
      updatedAt: Date.now(),
    });
  },
});

// Complete guided tour and mark demographics as complete
export const completeGuidedTour = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      hasCompletedGuidedTour: true,
      hasCompletedDemographics: true,
      updatedAt: Date.now(),
    });
  },
});

// Verify user data completeness
export const verifyUserDataCompleteness = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const hasBasicInfo = !!(user.firstName && user.email);
    const hasDemographics = !!(user.birthday && user.ethnicity && user.gender);
    const hasSchoolInfo = !!(user.school && user.majorCategory && user.major && user.currentYear);
    const hasActiveTerm = !!user.currentActiveTerm;

    return {
      user,
      hasBasicInfo,
      hasDemographics,
      hasSchoolInfo,
      hasActiveTerm,
      isComplete: hasBasicInfo && hasDemographics && hasSchoolInfo && hasActiveTerm,
    };
  },
});

// Reset onboarding status (for testing or re-onboarding)
export const resetOnboardingStatus = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      hasCompletedDemographics: false,
      hasCompletedGuidedTour: false,
      updatedAt: Date.now(),
    });
  },
});
