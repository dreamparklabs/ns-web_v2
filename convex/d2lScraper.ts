import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// D2L Web Scraping Integration (when OAuth is not available)
export const initializeD2LWebScraping = mutation({
  args: {
    clerkUserId: v.string(),
    schoolUrl: v.string(),
    sessionData: v.optional(v.string()), // Encrypted session data from browser extension
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find the user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Store school URL and mark as web scraping enabled
    await ctx.db.patch(user._id, {
      d2lBaseUrl: args.schoolUrl,
      d2lWebScrapingEnabled: true,
      d2lSessionData: args.sessionData,
      d2lLastScrapingAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "D2L web scraping initialized. Please use the browser extension to sync data.",
    };
  },
});

// Extract user info from D2L page content
export const extractD2LUserInfo = mutation({
  args: {
    clerkUserId: v.string(),
    pageContent: v.string(),
    pageUrl: v.string(),
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

    try {
      // Extract user information from D2L page content
      const userInfo = extractUserInfoFromHTML(args.pageContent);
      
      if (userInfo) {
        // Update user with D2L information
        await ctx.db.patch(user._id, {
          d2lUserId: userInfo.userId,
          d2lUserName: userInfo.fullName,
          d2lUserEmail: userInfo.email,
          d2lSyncEnabled: true,
          updatedAt: Date.now(),
        });

        return {
          success: true,
          userInfo,
          message: "User information extracted successfully",
        };
      }

      return {
        success: false,
        message: "Could not extract user information from page",
      };
    } catch (error) {
      console.error('User info extraction failed:', error);
      throw new Error(`Extraction failed: ${error.message}`);
    }
  },
});

// Process scraped course data with smart matching
export const processScrappedCourses = mutation({
  args: {
    clerkUserId: v.string(),
    termId: v.optional(v.string()), // Active term ID
    coursesData: v.array(v.object({
      orgUnitId: v.string(),
      name: v.string(),
      code: v.string(),
      instructor: v.optional(v.string()),
      isActive: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    // For extension calls, we'll skip the identity check for now
    // In production, you'd want to validate the clerkUserId properly
    console.log("Processing courses for user:", args.clerkUserId);

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const syncedCourses = [];
    const mergedCourses = [];

    for (const courseData of args.coursesData) {
      if (!courseData.isActive) continue;

      // Get user's active term if termId not provided
      let termId = args.termId;
      if (!termId) {
        const userData = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
          .first();
        
        if (userData?.activeTerm) {
          termId = userData.activeTerm;
          console.log(`Using user's active term: ${termId}`);
        } else {
          throw new Error("No active term found. Please set an active term in Northstar.");
        }
      }

      // Use smart course matching from aiParser
      const matchResult = await ctx.runMutation(api.aiParser.findAndMergeSimilarCourse, {
        clerkUserId: args.clerkUserId,
        termId: termId, // Pass the term ID
        d2lCourseData: {
          name: courseData.name,
          code: courseData.code,
          instructor: courseData.instructor,
          orgUnitId: courseData.orgUnitId,
        },
      });

      if (matchResult.action === 'merged') {
        mergedCourses.push({
          courseId: matchResult.courseId,
          title: courseData.name,
          code: courseData.code,
          mergedWith: matchResult.matchedWith,
          confidence: matchResult.confidence,
        });
      } else {
        syncedCourses.push({
          courseId: matchResult.courseId,
          title: courseData.name,
          code: courseData.code,
          action: 'created',
        });
      }
    }

    // Update last sync time
    await ctx.db.patch(user._id, {
      d2lLastScrapingAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      syncedCourses,
      mergedCourses,
      totalSynced: syncedCourses.length,
      totalMerged: mergedCourses.length,
    };
  },
});

// Intelligent course matching function
export const findMatchingCourse = query({
  args: {
    clerkUserId: v.string(),
    d2lCourseName: v.string(),
    d2lCourseCode: v.string(),
    d2lOrgUnitId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return null;
    }

    const userCourses = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    if (userCourses.length === 0) {
      return null;
    }

    // Helper function to calculate similarity score
    const calculateSimilarity = (str1: string, str2: string): number => {
      const s1 = str1.toLowerCase().trim();
      const s2 = str2.toLowerCase().trim();
      
      // Exact match
      if (s1 === s2) return 100;
      
      // Check if one contains the other
      if (s1.includes(s2) || s2.includes(s1)) return 90;
      
      // Extract course codes (like CS 101, MATH-250, etc.)
      const extractCourseCode = (text: string) => {
        const match = text.match(/([A-Z]{2,4}[\s\-_]?\d{3,4})/i);
        return match ? match[1].replace(/[\s\-_]/g, '').toLowerCase() : '';
      };
      
      const code1 = extractCourseCode(s1);
      const code2 = extractCourseCode(s2);
      
      if (code1 && code2 && code1 === code2) return 85;
      
      // Word overlap scoring
      const words1 = s1.split(/\s+/).filter(w => w.length > 2);
      const words2 = s2.split(/\s+/).filter(w => w.length > 2);
      
      if (words1.length === 0 || words2.length === 0) return 0;
      
      const commonWords = words1.filter(w => words2.includes(w));
      const overlapScore = (commonWords.length * 2) / (words1.length + words2.length);
      
      return Math.round(overlapScore * 80); // Max 80 for word overlap
    };

    // Score all courses
    const scoredCourses = userCourses.map(course => {
      const nameScore = calculateSimilarity(args.d2lCourseName, course.title);
      const codeScore = calculateSimilarity(args.d2lCourseCode, course.code);
      
      // Weighted average: course code is more reliable than name
      const totalScore = Math.max(nameScore, codeScore * 1.2);
      
      return {
        course,
        score: totalScore,
        nameScore,
        codeScore,
        matchReason: totalScore === nameScore ? 'name' : 'code'
      };
    });

    // Sort by score and return best match if it's above threshold
    scoredCourses.sort((a, b) => b.score - a.score);
    const bestMatch = scoredCourses[0];
    
    // Only return matches with score > 60 (configurable threshold)
    if (bestMatch && bestMatch.score > 60) {
      return {
        courseId: bestMatch.course._id,
        course: bestMatch.course,
        matchScore: bestMatch.score,
        matchReason: bestMatch.matchReason,
        allScores: scoredCourses.slice(0, 3) // Return top 3 for debugging
      };
    }

    return null;
  },
});

// Process scraped assignment data with intelligent course matching
export const processScrapedAssignmentsWithMatching = mutation({
  args: {
    clerkUserId: v.string(),
    assignmentsData: v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.union(v.string(), v.null())),
      dueDate: v.optional(v.union(v.string(), v.null())),
      type: v.string(),
      courseOrgUnitId: v.optional(v.union(v.string(), v.null())),
      courseName: v.optional(v.union(v.string(), v.null())),
      courseCode: v.optional(v.union(v.string(), v.null())),
      submissionStatus: v.optional(v.union(v.string(), v.null())),
      maxPoints: v.optional(v.union(v.float64(), v.null())),
      pointsEarned: v.optional(v.union(v.float64(), v.null())),
    })),
  },
  handler: async (ctx, args) => {
    // For extension calls, we'll skip the identity check for now
    // In production, you'd want to validate the clerkUserId properly
    console.log("Processing assignments for user:", args.clerkUserId);

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const syncedAssignments = [];
    const matchingResults = [];

    for (const assignmentData of args.assignmentsData) {
      let targetCourseId = null;
      let matchInfo = null;

      // Try to find matching course if we have course info
      if (assignmentData.courseName && assignmentData.courseCode) {
        const matchResult = await ctx.runQuery(api.d2lScraper.findMatchingCourse, {
          clerkUserId: args.clerkUserId,
          d2lCourseName: assignmentData.courseName,
          d2lCourseCode: assignmentData.courseCode,
          d2lOrgUnitId: assignmentData.courseOrgUnitId,
        });

        if (matchResult) {
          targetCourseId = matchResult.courseId;
          matchInfo = {
            matchScore: matchResult.matchScore,
            matchReason: matchResult.matchReason,
            matchedCourseName: matchResult.course.title
          };
        }
      }

      // If no match found, try to find by d2lOrgUnitId
      if (!targetCourseId && assignmentData.courseOrgUnitId) {
        const existingCourse = await ctx.db
          .query("courses")
          .filter((q) => 
            q.and(
              q.eq(q.field("userId"), user._id),
              q.eq(q.field("d2lOrgUnitId"), assignmentData.courseOrgUnitId)
            )
          )
          .first();

        if (existingCourse) {
          targetCourseId = existingCourse._id;
          matchInfo = {
            matchScore: 100,
            matchReason: 'd2lOrgUnitId',
            matchedCourseName: existingCourse.title
          };
        }
      }

      // Only sync assignment if we found a matching course
      if (targetCourseId) {
        // Check if assignment already exists
        const existingAssignment = await ctx.db
          .query("assignments")
          .filter((q) => 
            q.and(
              q.eq(q.field("userId"), user._id),
              q.eq(q.field("courseId"), targetCourseId),
              q.eq(q.field("d2lId"), assignmentData.id)
            )
          )
          .first();

        // Handle due dates - use null if no date provided instead of defaulting
        let dueDate = null;
        if (assignmentData.dueDate && assignmentData.dueDate.trim() !== '') {
          try {
            dueDate = new Date(assignmentData.dueDate).getTime();
            // Validate the date
            if (isNaN(dueDate)) {
              dueDate = null;
            }
          } catch (error) {
            console.log(`Failed to parse due date "${assignmentData.dueDate}":`, error);
            dueDate = null;
          }
        }

        // Calculate grade percentage if we have both points
        let calculatedGrade = null;
        if (assignmentData.pointsEarned && assignmentData.maxPoints && assignmentData.maxPoints > 0) {
          calculatedGrade = (assignmentData.pointsEarned / assignmentData.maxPoints) * 100;
        }

        // Determine status based on submission and grades
        let status = 'pending';
        
        // If there's a grade (points earned), it's completed
        if (assignmentData.pointsEarned !== null && assignmentData.pointsEarned !== undefined && assignmentData.pointsEarned > 0) {
          status = 'completed';
        }
        // If submission status indicates completion
        else if (assignmentData.submissionStatus === 'submitted' || assignmentData.submissionStatus === 'graded' || assignmentData.submissionStatus === 'completed') {
          status = 'completed';
        }
        // If max points exist but no points earned, could be graded as 0
        else if (assignmentData.maxPoints && assignmentData.pointsEarned === 0) {
          status = 'completed'; // Graded as 0
        }
        // Default to pending
        else {
          status = 'pending';
        }

        if (!existingAssignment) {
          // Create new assignment
          const assignmentId = await ctx.db.insert("assignments", {
            userId: user._id,
            courseId: targetCourseId,
            title: assignmentData.name,
            lc_title: assignmentData.name.toLowerCase(),
            ...(dueDate && { dueAt: dueDate }), // Only include dueAt if we have a date
            status: status,
            type: assignmentData.type,
            notes: assignmentData.description,
            d2lId: assignmentData.id,
            d2lSourceType: 'web_scraping',
            d2lWebScrapingEnabled: true,
            maxPoints: assignmentData.maxPoints,
            pointsEarned: assignmentData.pointsEarned,
            grade: calculatedGrade || undefined,
          });

          syncedAssignments.push({
            assignmentId,
            title: assignmentData.name,
            courseName: matchInfo?.matchedCourseName,
            matchInfo,
            action: 'created'
          });
        } else {
          // Update existing assignment - check what needs to be updated, respecting user modifications
          const updates: any = {};
          let hasChanges = false;
          let changesLog = [];
          const userModifiedFields = existingAssignment.userModifiedFields || [];

          // Check title changes - only if user hasn't modified it
          if (!userModifiedFields.includes('title') && existingAssignment.title !== assignmentData.name) {
            updates.title = assignmentData.name;
            updates.lc_title = assignmentData.name.toLowerCase();
            hasChanges = true;
            changesLog.push(`Title: "${existingAssignment.title}" → "${assignmentData.name}"`);
          }

          // Check due date changes - only if user hasn't modified it
          if (!userModifiedFields.includes('dueAt') && existingAssignment.dueAt !== dueDate) {
            if (dueDate) {
              updates.dueAt = dueDate;
            } else {
              updates.dueAt = undefined; // Remove due date if null
            }
            hasChanges = true;
            const oldDate = existingAssignment.dueAt ? new Date(existingAssignment.dueAt).toLocaleDateString() : 'none';
            const newDate = dueDate ? new Date(dueDate).toLocaleDateString() : 'none';
            changesLog.push(`Due date: ${oldDate} → ${newDate}`);
          }

          // Check grade changes - only if user hasn't modified them
          if (!userModifiedFields.includes('maxPoints') && assignmentData.maxPoints && existingAssignment.maxPoints !== assignmentData.maxPoints) {
            updates.maxPoints = assignmentData.maxPoints;
            hasChanges = true;
            changesLog.push(`Max points: ${existingAssignment.maxPoints || 'none'} → ${assignmentData.maxPoints}`);
          }

          if (!userModifiedFields.includes('pointsEarned') && assignmentData.pointsEarned !== null && existingAssignment.pointsEarned !== assignmentData.pointsEarned) {
            updates.pointsEarned = assignmentData.pointsEarned;
            updates.grade = calculatedGrade || undefined;
            hasChanges = true;
            changesLog.push(`Points earned: ${existingAssignment.pointsEarned || 'none'} → ${assignmentData.pointsEarned}`);
          }

          // Check status changes - only if user hasn't modified it
          if (!userModifiedFields.includes('status') && existingAssignment.status !== status) {
            updates.status = status;
            hasChanges = true;
            changesLog.push(`Status: ${existingAssignment.status} → ${status}`);
          }

          // Check description changes - only if user hasn't modified it
          if (!userModifiedFields.includes('notes') && assignmentData.description && existingAssignment.notes !== assignmentData.description) {
            updates.notes = assignmentData.description;
            hasChanges = true;
            changesLog.push(`Description updated`);
          }

          // Log skipped fields
          const skippedFields = [];
          if (userModifiedFields.includes('title') && existingAssignment.title !== assignmentData.name) {
            skippedFields.push('title');
          }
          if (userModifiedFields.includes('dueAt') && existingAssignment.dueAt !== dueDate) {
            skippedFields.push('due date');
          }
          if (userModifiedFields.includes('maxPoints') && assignmentData.maxPoints && existingAssignment.maxPoints !== assignmentData.maxPoints) {
            skippedFields.push('max points');
          }
          if (userModifiedFields.includes('pointsEarned') && assignmentData.pointsEarned !== null && existingAssignment.pointsEarned !== assignmentData.pointsEarned) {
            skippedFields.push('points earned');
          }
          if (userModifiedFields.includes('status') && existingAssignment.status !== status) {
            skippedFields.push('status');
          }
          if (userModifiedFields.includes('notes') && assignmentData.description && existingAssignment.notes !== assignmentData.description) {
            skippedFields.push('description');
          }

          if (skippedFields.length > 0) {
            console.log(`⚠️  Skipped updating user-modified fields for "${assignmentData.name}": ${skippedFields.join(', ')}`);
          }

          // Update if there are changes
          if (hasChanges) {
            await ctx.db.patch(existingAssignment._id, updates);
            console.log(`📝 Updated assignment "${assignmentData.name}": ${changesLog.join(', ')}`);
            
            syncedAssignments.push({
              assignmentId: existingAssignment._id,
              title: assignmentData.name,
              courseName: matchInfo?.matchedCourseName,
              matchInfo,
              action: 'updated',
              changes: changesLog
            });
          } else {
            console.log(`📝 No changes needed for assignment "${assignmentData.name}" (or all changes are user-protected)`);
            
            syncedAssignments.push({
              assignmentId: existingAssignment._id,
              title: assignmentData.name,
              courseName: matchInfo?.matchedCourseName,
              matchInfo,
              action: 'unchanged'
            });
          }
        }
      }

      matchingResults.push({
        assignmentName: assignmentData.name,
        courseName: assignmentData.courseName,
        courseCode: assignmentData.courseCode,
        matched: !!targetCourseId,
        matchInfo
      });
    }

    // Apply course rules to newly synced assignments if any exist
    const assignmentIds = syncedAssignments.map(a => a.assignmentId);
    if (assignmentIds.length > 0) {
      // Get unique course IDs from synced assignments
      const uniqueCourseIds = [...new Set(syncedAssignments.map(a => {
        // Find the course ID from the assignment
        const assignment = args.assignmentsData.find(ad => ad.id === syncedAssignments.find(sa => sa.assignmentId === a.assignmentId)?.assignmentId);
        return assignment?.courseOrgUnitId;
      }).filter(Boolean))];
      
      for (const orgUnitId of uniqueCourseIds) {
        // Find the course by orgUnitId
        const course = await ctx.db
          .query("courses")
          .filter((q) => 
            q.and(
              q.eq(q.field("userId"), user._id),
              q.eq(q.field("d2lOrgUnitId"), orgUnitId)
            )
          )
          .first();
          
        if (course) {
          const courseAssignmentIds = syncedAssignments
            .filter(a => a.courseName === course.title)
            .map(a => a.assignmentId);
          
          if (courseAssignmentIds.length > 0) {
            try {
              await ctx.runMutation(api.aiParser.applyRulesToAssignments, {
                clerkUserId: args.clerkUserId,
                courseId: course._id,
                assignmentIds: courseAssignmentIds,
              });
            } catch (error) {
              console.log(`Failed to apply rules to assignments for course ${course.title}:`, error);
            }
          }
        }
      }
    }

    // Calculate statistics
    const createdCount = syncedAssignments.filter(a => a.action === 'created').length;
    const updatedCount = syncedAssignments.filter(a => a.action === 'updated').length;
    const unchangedCount = syncedAssignments.filter(a => a.action === 'unchanged').length;

    return {
      success: true,
      syncedAssignments,
      totalSynced: syncedAssignments.length,
      totalCreated: createdCount,
      totalUpdated: updatedCount,
      totalUnchanged: unchangedCount,
      matchingResults,
      totalProcessed: args.assignmentsData.length,
      updateSummary: {
        created: createdCount,
        updated: updatedCount,
        unchanged: unchangedCount,
        total: syncedAssignments.length
      }
    };
  },
});

// Process scraped assignment data
export const processScrapedAssignments = mutation({
  args: {
    clerkUserId: v.string(),
    courseOrgUnitId: v.string(),
    assignmentsData: v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.union(v.string(), v.null())),
      dueDate: v.optional(v.union(v.string(), v.null())),
      type: v.optional(v.union(v.string(), v.null())), // dropbox, quiz, discussion
      maxPoints: v.optional(v.union(v.float64(), v.null())),
      isGraded: v.optional(v.union(v.boolean(), v.null())),
      submissionStatus: v.optional(v.union(v.string(), v.null())),
    })),
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

    // Find the course
    const course = await ctx.db
      .query("courses")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("d2lOrgUnitId"), args.courseOrgUnitId)
        )
      )
      .first();

    if (!course) {
      throw new Error("Course not found");
    }

    const syncedAssignments = [];

    for (const assignmentData of args.assignmentsData) {
      // Check if assignment already exists
      const existingAssignment = await ctx.db
        .query("assignments")
        .filter((q) => 
          q.and(
            q.eq(q.field("courseId"), course._id),
            q.eq(q.field("d2lId"), assignmentData.id)
          )
        )
        .first();

      const dueAt = assignmentData.dueDate ? 
        new Date(assignmentData.dueDate).getTime() : 
        Date.now() + 7 * 24 * 60 * 60 * 1000; // Default to 1 week from now

      const status = determineAssignmentStatus(assignmentData.submissionStatus, dueAt);

      if (!existingAssignment) {
        const assignmentId = await ctx.db.insert("assignments", {
          userId: user._id,
          courseId: course._id,
          title: assignmentData.name,
          notes: assignmentData.description || "",
          dueAt,
          status,
          type: assignmentData.type || "assignment",
          d2lId: assignmentData.id,
          d2lSyncEnabled: true,
          d2lWebScrapingEnabled: true,
          lc_title: assignmentData.name.toLowerCase(),
        });

        syncedAssignments.push({
          id: assignmentId,
          title: assignmentData.name,
          type: assignmentData.type,
          dueDate: dueAt,
        });
      } else {
        // Update existing assignment
        await ctx.db.patch(existingAssignment._id, {
          title: assignmentData.name,
          notes: assignmentData.description || existingAssignment.notes,
          dueAt,
          status,
          type: assignmentData.type || existingAssignment.type,
          lc_title: assignmentData.name.toLowerCase(),
        });
      }
    }

    return {
      success: true,
      syncedAssignments,
      totalSynced: syncedAssignments.length,
    };
  },
});

// Process scraped announcements and extract rules
export const processScrapedAnnouncements = mutation({
  args: {
    clerkUserId: v.string(),
    announcementsData: v.array(v.object({
      id: v.string(),
      title: v.string(),
      content: v.string(),
      publishedDate: v.optional(v.string()),
      courseOrgUnitId: v.string(),
      courseName: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    console.log("Processing announcements for user:", args.clerkUserId);

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const processedAnnouncements = [];
    const extractedRules = [];

    for (const announcementData of args.announcementsData) {
      // Find the course this announcement belongs to
      const course = await ctx.db
        .query("courses")
        .filter((q) => 
          q.and(
            q.eq(q.field("userId"), user._id),
            q.eq(q.field("d2lOrgUnitId"), announcementData.courseOrgUnitId)
          )
        )
        .first();

      if (!course) {
        console.log(`Course not found for announcement: ${announcementData.title}`);
        continue;
      }

      // Extract assignment rules from announcement content
      try {
        const fullContent = `${announcementData.title}\n\n${announcementData.content}`;
        
        // Use AI parser to extract rules
        const rulesResult = await ctx.runMutation(api.aiParser.parseD2LContentForAssignments, {
          clerkUserId: args.clerkUserId,
          content: fullContent,
          contentType: 'announcement',
          courseId: course._id,
          d2lSourceId: announcementData.id,
          extractRules: true,
        });

        if (rulesResult.extractedRules && rulesResult.extractedRules.length > 0) {
          extractedRules.push(...rulesResult.extractedRules.map(rule => ({
            ...rule,
            announcementTitle: announcementData.title,
            courseName: course.title,
          })));
        }

        processedAnnouncements.push({
          id: announcementData.id,
          title: announcementData.title,
          courseName: course.title,
          rulesExtracted: rulesResult.extractedRules?.length || 0,
          assignmentsCreated: rulesResult.totalCreated || 0,
        });

      } catch (error) {
        console.error(`Failed to process announcement ${announcementData.title}:`, error);
        processedAnnouncements.push({
          id: announcementData.id,
          title: announcementData.title,
          courseName: course.title,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      processedAnnouncements,
      extractedRules,
      totalProcessed: processedAnnouncements.length,
      totalRulesExtracted: extractedRules.length,
    };
  },
});

// Update existing assignments with new data from D2L
export const updateExistingAssignments = mutation({
  args: {
    clerkUserId: v.string(),
    assignmentUpdates: v.array(v.object({
      d2lId: v.string(),
      name: v.optional(v.string()),
      dueDate: v.optional(v.string()),
      maxPoints: v.optional(v.float64()),
      pointsEarned: v.optional(v.float64()),
      submissionStatus: v.optional(v.string()),
      description: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    console.log("Updating existing assignments for user:", args.clerkUserId);

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const updatedAssignments = [];
    const notFoundAssignments = [];

    for (const updateData of args.assignmentUpdates) {
      // Find the existing assignment by D2L ID
      const existingAssignment = await ctx.db
        .query("assignments")
        .filter((q) => 
          q.and(
            q.eq(q.field("userId"), user._id),
            q.eq(q.field("d2lId"), updateData.d2lId)
          )
        )
        .first();

      if (!existingAssignment) {
        notFoundAssignments.push(updateData.d2lId);
        continue;
      }

      // Prepare updates
      const updates: any = {};
      let hasChanges = false;
      let changesLog = [];

      // Check for name changes
      if (updateData.name && existingAssignment.title !== updateData.name) {
        updates.title = updateData.name;
        updates.lc_title = updateData.name.toLowerCase();
        hasChanges = true;
        changesLog.push(`Title: "${existingAssignment.title}" → "${updateData.name}"`);
      }

      // Check for due date changes
      if (updateData.dueDate) {
        const newDueDate = new Date(updateData.dueDate).getTime();
        if (existingAssignment.dueAt !== newDueDate) {
          updates.dueAt = newDueDate;
          hasChanges = true;
          changesLog.push(`Due date changed`);
        }
      }

      // Check for grade changes
      if (updateData.maxPoints !== undefined && existingAssignment.maxPoints !== updateData.maxPoints) {
        updates.maxPoints = updateData.maxPoints;
        hasChanges = true;
        changesLog.push(`Max points: ${existingAssignment.maxPoints || 'none'} → ${updateData.maxPoints}`);
      }

      if (updateData.pointsEarned !== undefined && existingAssignment.pointsEarned !== updateData.pointsEarned) {
        updates.pointsEarned = updateData.pointsEarned;
        // Recalculate grade percentage
        if (updateData.pointsEarned && updateData.maxPoints && updateData.maxPoints > 0) {
          updates.grade = (updateData.pointsEarned / updateData.maxPoints) * 100;
        }
        hasChanges = true;
        changesLog.push(`Points earned: ${existingAssignment.pointsEarned || 'none'} → ${updateData.pointsEarned}`);
      }

      // Check for status changes based on grades
      const shouldBeCompleted = (updateData.pointsEarned !== null && updateData.pointsEarned !== undefined && updateData.pointsEarned >= 0) ||
                               updateData.submissionStatus === 'submitted' || updateData.submissionStatus === 'graded';
      const newStatus = shouldBeCompleted ? 'completed' : 'pending';
      
      if (existingAssignment.status !== newStatus) {
        updates.status = newStatus;
        hasChanges = true;
        changesLog.push(`Status: ${existingAssignment.status} → ${newStatus}`);
      }

      // Check for description changes
      if (updateData.description && existingAssignment.notes !== updateData.description) {
        updates.notes = updateData.description;
        hasChanges = true;
        changesLog.push(`Description updated`);
      }

      // Apply updates if there are changes
      if (hasChanges) {
        await ctx.db.patch(existingAssignment._id, updates);
        updatedAssignments.push({
          id: existingAssignment._id,
          d2lId: updateData.d2lId,
          title: updateData.name || existingAssignment.title,
          changes: changesLog
        });
        console.log(`📝 Updated assignment "${updateData.name || existingAssignment.title}": ${changesLog.join(', ')}`);
      }
    }

    return {
      success: true,
      updatedAssignments,
      notFoundAssignments,
      totalUpdated: updatedAssignments.length,
      totalNotFound: notFoundAssignments.length,
      totalProcessed: args.assignmentUpdates.length
    };
  },
});

// Get D2L web scraping status
export const getD2LScrapingStatus = query({
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

    return {
      isConfigured: !!(user.d2lBaseUrl && user.d2lWebScrapingEnabled),
      baseUrl: user.d2lBaseUrl,
      userName: user.d2lUserName,
      userEmail: user.d2lUserEmail,
      lastScrapingAt: user.d2lLastScrapingAt,
      hasExtension: !!user.d2lSessionData,
    };
  },
});

// Helper functions
function extractUserInfoFromHTML(html: string): any {
  // Extract user information from various D2L page patterns
  const patterns = {
    // From widget data (like in the console error)
    userId: /data-ft-user-id[="](\d+)/i,
    firstName: /data-ft-user-first-name[="]([^"&]+)/i,
    lastName: /data-ft-user-last-name[="]([^"&]+)/i,
    email: /data-ft-user-email[="]([^"&]+)/i,
    fullName: /data-ft-user-name[="]([^"&]+)/i,
    
    // From page content
    userIdAlt: /"userId":\s*"?(\d+)"?/i,
    userNameAlt: /"userName":\s*"([^"]+)"/i,
    emailAlt: /"email":\s*"([^"]+)"/i,
    
    // From HTML elements
    userDisplayName: /<[^>]*class[^>]*user[^>]*>([^<]+)</i,
    profileName: /<[^>]*class[^>]*profile[^>]*>([^<]+)</i,
  };

  const extracted: any = {};

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = html.match(pattern);
    if (match && match[1]) {
      extracted[key] = decodeURIComponent(match[1].replace(/\+/g, ' '));
    }
  }

  // Combine and clean up the data
  if (extracted.userId || extracted.userIdAlt) {
    return {
      userId: extracted.userId || extracted.userIdAlt,
      firstName: extracted.firstName,
      lastName: extracted.lastName,
      fullName: extracted.fullName || extracted.userNameAlt || 
                `${extracted.firstName || ''} ${extracted.lastName || ''}`.trim(),
      email: extracted.email || extracted.emailAlt,
    };
  }

  return null;
}

function determineAssignmentStatus(submissionStatus?: string, dueAt?: number): string {
  const now = Date.now();
  
  if (submissionStatus && submissionStatus.toLowerCase().includes('submitted')) {
    return 'completed';
  }
  
  if (dueAt && dueAt < now) {
    return 'overdue';
  }
  
  return 'todo';
}

// Disconnect D2L web scraping
export const disconnectD2LWebScraping = mutation({
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

    // Clear all D2L web scraping data
    await ctx.db.patch(user._id, {
      d2lWebScrapingEnabled: false,
      d2lSessionData: undefined,
      d2lSyncEnabled: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
