import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get total storage used by a user
export const getUserTotalStorage = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const totalBytes = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);
    return totalBytes;
  },
});

// Get storage quota and usage for a user
export const getStorageQuota = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return { used: 0, limit: 0, plan: 'free', percentUsed: 0 };
    }

    const subscriptionPlan = user.subscriptionPlan || 'free';
    const BASIC_LIMIT = 1 * 1024 * 1024 * 1024; // 1GB in bytes

    const files = await ctx.db
      .query("files")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    const totalBytes = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);

    const limit = subscriptionPlan === 'northstar_pro' ? -1 : BASIC_LIMIT; // -1 means unlimited
    const percentUsed = limit === -1 ? 0 : Math.round((totalBytes / limit) * 100);

    return {
      used: totalBytes,
      limit,
      plan: subscriptionPlan,
      percentUsed,
      isUnlimited: limit === -1,
    };
  },
});

// Get shared link count and quota
export const getSharedLinksQuota = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return { used: 0, limit: 0, plan: 'free' };
    }

    const subscriptionPlan = user.subscriptionPlan || 'free';
    const BASIC_LIMIT = 2; // 2 shared links for Basic users

    const sharedFiles = await ctx.db
      .query("files")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("shared"), true)
        )
      )
      .collect();

    const sharedCount = sharedFiles.length;
    const limit = subscriptionPlan === 'northstar_pro' ? -1 : BASIC_LIMIT; // -1 means unlimited

    return {
      used: sharedCount,
      limit,
      plan: subscriptionPlan,
      isUnlimited: limit === -1,
    };
  },
});

// Generate upload URL for file storage (authenticated)
export const generateUploadUrl = mutation({
  args: {
    clerkUserId: v.string(),
    fileSize: v.number(), // Size of file to be uploaded
  },
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify user exists
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check storage limits for Basic plan users
    const subscriptionPlan = user.subscriptionPlan || 'free';
    if (subscriptionPlan === 'northstar_basic') {
      const BASIC_LIMIT = 1 * 1024 * 1024 * 1024; // 1GB in bytes

      const files = await ctx.db
        .query("files")
        .filter((q) => q.eq(q.field("userId"), user._id))
        .collect();

      const currentUsage = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);
      const newUsage = currentUsage + args.fileSize;

      if (newUsage > BASIC_LIMIT) {
        const percentUsed = Math.round((currentUsage / BASIC_LIMIT) * 100);
        throw new Error(`STORAGE_LIMIT_EXCEEDED:You've reached your 1GB storage limit (${percentUsed}% used). Upgrade to Pro for unlimited storage.`);
      }
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Save file metadata after upload
export const saveFile = mutation({
  args: {
    clerkUserId: v.string(),
    assignmentId: v.optional(v.id("assignments")),
    courseId: v.optional(v.id("courses")),
    fileName: v.string(),
    originalFileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    storageId: v.id("_storage"),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Get user by clerkUserId
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify assignment belongs to user if provided
    if (args.assignmentId) {
      const assignment = await ctx.db.get(args.assignmentId);
      if (!assignment || assignment.userId !== user._id) {
        throw new Error("Assignment not found or access denied");
      }
    }

    // Verify course belongs to user if provided
    if (args.courseId) {
      const course = await ctx.db.get(args.courseId);
      if (!course || course.userId !== user._id) {
        throw new Error("Course not found or access denied");
      }
    }

    // Save file metadata
    const fileId = await ctx.db.insert("files", {
      userId: user._id,
      assignmentId: args.assignmentId,
      courseId: args.courseId,
      fileName: args.fileName,
      originalFileName: args.originalFileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      storageId: args.storageId,
      uploadedAt: Date.now(),
      description: args.description,
      tags: args.tags,
    });

    return fileId;
  },
});

// Get files for a specific assignment
export const getAssignmentFiles = query({
  args: {
    assignmentId: v.id("assignments"),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user by clerkUserId
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return [];
    }

    // Verify assignment belongs to user
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment || assignment.userId !== user._id) {
      return [];
    }

    // Get files for this assignment
    const files = await ctx.db
      .query("files")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    // Return files without direct download URLs for security
    return files;
  },
});

// Get all files for a user
export const getUserFiles = query({
  args: {
    clerkUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get user by clerkUserId
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return [];
    }

    // Get files for this user
    const files = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit || 50);

    // Get additional info for each file
    const filesWithInfo = await Promise.all(
      files.map(async (file) => {
        // Get assignment info if linked
        let assignmentInfo = null;
        if (file.assignmentId) {
          const assignment = await ctx.db.get(file.assignmentId);
          if (assignment) {
            const course = await ctx.db.get(assignment.courseId);
            assignmentInfo = {
              title: assignment.title,
              courseCode: course?.code,
              courseName: course?.title,
            };
          }
        }

        // Get course info if linked directly
        let courseInfo = null;
        if (file.courseId && !file.assignmentId) {
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

    return filesWithInfo;
  },
});

// Get recent files for dashboard widget
export const getRecentFiles = query({
  args: {
    clerkUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get user by clerkUserId
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return [];
    }

    // Get recent files for this user
    const files = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit || 8);

    // Get additional info for each file
    const filesWithInfo = await Promise.all(
      files.map(async (file) => {
        // Get assignment info if linked
        let courseCode = null;
        let assignmentTitle = null;

        if (file.assignmentId) {
          const assignment = await ctx.db.get(file.assignmentId);
          if (assignment) {
            assignmentTitle = assignment.title;
            const course = await ctx.db.get(assignment.courseId);
            if (course) {
              courseCode = course.code;
            }
          }
        } else if (file.courseId) {
          const course = await ctx.db.get(file.courseId);
          if (course) {
            courseCode = course.code;
          }
        }

        return {
          _id: file._id,
          name: file.originalFileName,
          type: file.mimeType,
          size: file.fileSize,
          lastModified: file.uploadedAt,
          courseCode,
          assignmentTitle,
        };
      })
    );

    return filesWithInfo;
  },
});

// List courses that have files (directly or via assignments) for a given user
export const getCoursesWithFiles = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Resolve user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) return [] as Array<{
      courseId: string;
      code: string;
      title: string;
      fileCount: number;
      lastUpdated: number;
    }>;

    // Get all files for user
    const files = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Map courseId to info
    const courseMap = new Map<string, { code: string; title: string }>();
    const courseCounts = new Map<string, number>();
    const courseLast = new Map<string, number>();

    for (const f of files) {
      let courseId: string | undefined;

      if (f.courseId) {
        courseId = f.courseId as string;
      } else if (f.assignmentId) {
        const a = await ctx.db.get(f.assignmentId);
        if (a) courseId = a.courseId as string;
      }

      if (!courseId) continue;

      if (!courseMap.has(courseId)) {
        const c = await ctx.db.get(courseId as any);
        if (c) {
          courseMap.set(courseId, { code: c.code, title: c.title });
        } else {
          // Skip if course missing
          continue;
        }
      }

      courseCounts.set(courseId, (courseCounts.get(courseId) || 0) + 1);
      const last = courseLast.get(courseId) || 0;
      courseLast.set(courseId, Math.max(last, f.uploadedAt));
    }

    // Build result
    const result: Array<{ courseId: string; code: string; title: string; fileCount: number; lastUpdated: number }> = [];
    for (const [id, info] of courseMap.entries()) {
      result.push({
        courseId: id,
        code: info.code,
        title: info.title,
        fileCount: courseCounts.get(id) || 0,
        lastUpdated: courseLast.get(id) || 0,
      });
    }

    // Sort by most recent activity desc
    result.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
    return result;
  },
});

// Get files for a specific course (user-scoped)
export const getCourseFiles = query({
  args: {
    clerkUserId: v.string(),
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) return [];

    const course = await ctx.db.get(args.courseId);
    if (!course || course.userId !== user._id) return [];

    // Fetch files linked directly to course or to its assignments
    const files = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Build map of assignmentId -> title for this course for annotation
    const assignments = await ctx.db
      .query("assignments")
      .filter((q) => q.eq(q.field("courseId"), course._id))
      .collect();
    const assignmentMap = new Map(assignments.map((a) => [a._id, a.title]));

    const filtered = files.filter((f) => {
      if (f.courseId && f.courseId === course._id) return true;
      if (f.assignmentId) {
        const a = assignments.find((x) => x._id === f.assignmentId);
        return Boolean(a);
      }
      return false;
    });

    return filtered
      .map((f) => ({
        ...f,
        assignmentTitle: f.assignmentId ? assignmentMap.get(f.assignmentId as any) : undefined,
        courseCode: course.code,
      }))
      .sort((a, b) => b.uploadedAt - a.uploadedAt);
  },
});

// Toggle file star status
export const toggleFileStar = mutation({
  args: {
    fileId: v.id("files"),
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

    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== user._id) {
      throw new Error("File not found or access denied");
    }

    await ctx.db.patch(args.fileId, {
      starred: !file.starred,
    });

    return { starred: !file.starred };
  },
});

// Generate share link for file
export const shareFile = mutation({
  args: {
    fileId: v.id("files"),
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

    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== user._id) {
      throw new Error("File not found or access denied");
    }

    // Check if file is already shared
    if (!file.shared) {
      // Check shared link limits for Basic plan users
      const subscriptionPlan = user.subscriptionPlan || 'free';
      if (subscriptionPlan === 'northstar_basic') {
        const BASIC_LIMIT = 2; // 2 shared links for Basic users

        const sharedFiles = await ctx.db
          .query("files")
          .filter((q) =>
            q.and(
              q.eq(q.field("userId"), user._id),
              q.eq(q.field("shared"), true)
            )
          )
          .collect();

        const currentSharedCount = sharedFiles.length;

        if (currentSharedCount >= BASIC_LIMIT) {
          throw new Error(`SHARE_LIMIT_EXCEEDED:You've reached your limit of ${BASIC_LIMIT} shared links. Upgrade to Pro for unlimited file sharing.`);
        }
      }
    }

    // Generate a unique share token (or reuse existing)
    const shareToken = file.shareToken || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await ctx.db.patch(args.fileId, {
      shared: true,
      shareToken,
      sharedAt: Date.now(),
    });

    return { shareToken, shareUrl: `${process.env.SITE_URL}/share/${shareToken}` };
  },
});

// Unshare file
export const unshareFile = mutation({
  args: {
    fileId: v.id("files"),
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

    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== user._id) {
      throw new Error("File not found or access denied");
    }

    await ctx.db.patch(args.fileId, {
      shared: false,
      shareToken: undefined,
      sharedAt: undefined,
    });

    return { success: true };
  },
});

// Get shared file by token (public access)
export const getSharedFile = query({
  args: {
    shareToken: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("files")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .first();

    if (!file || !file.shared) {
      return null;
    }

    // Get the user who shared this file
    const user = await ctx.db.get(file.userId);
    const sharedByName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Someone';

    // Get file download URL
    const downloadUrl = await ctx.storage.getUrl(file.storageId);

    return {
      _id: file._id,
      originalFileName: file.originalFileName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      uploadedAt: file.uploadedAt,
      downloadUrl,
      sharedAt: file.sharedAt,
      sharedByName,
    };
  },
});

// Update OCR text for a file
export const updateOCRText = mutation({
  args: {
    fileId: v.id("files"),
    ocrText: v.string(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    // Update the file with OCR text
    await ctx.db.patch(args.fileId, {
      ocrText: args.ocrText,
      ocrProcessed: true,
      ocrProcessedAt: Date.now(),
      ocrError: undefined,
    });

    return { success: true };
  },
});

// Mark OCR processing as failed
export const markOCRFailed = mutation({
  args: {
    fileId: v.id("files"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      ocrProcessed: true,
      ocrProcessedAt: Date.now(),
      ocrError: args.error,
    });

    return { success: true };
  },
});

// Get files that need OCR processing
export const getFilesForOCRProcessing = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_ocr_processed", (q) => q.eq("ocrProcessed", undefined))
      .take(args.limit || 10);

    return files;
  },
});

// Verify user has access to a specific file and return secure download URL
export const verifyFileAccess = query({
  args: {
    fileId: v.id("files"),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { hasAccess: false, downloadUrl: null, error: "Not authenticated" };
    }

    // Get user by clerkUserId
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return { hasAccess: false, downloadUrl: null, error: "User not found" };
    }

    // Verify the authenticated user matches the requesting user
    if (identity.subject !== args.clerkUserId) {
      return { hasAccess: false, downloadUrl: null, error: "User mismatch" };
    }

    // Get file and verify ownership
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== user._id) {
      return { hasAccess: false, downloadUrl: null, error: "File not found or access denied" };
    }

    // Generate time-limited download URL (valid for 1 hour)
    const downloadUrl = await ctx.storage.getUrl(file.storageId);
    
    return { 
      hasAccess: true, 
      downloadUrl,
      fileName: file.originalFileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour from now
    };
  },
});

// Delete a file
export const deleteFile = mutation({
  args: {
    fileId: v.id("files"),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user by clerkUserId
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get file and verify ownership
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== user._id) {
      throw new Error("File not found or access denied");
    }

    // Delete from storage
    await ctx.storage.delete(file.storageId);

    // Delete from database
    await ctx.db.delete(args.fileId);

    return { success: true };
  },
});
