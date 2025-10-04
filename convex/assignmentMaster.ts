import { query, mutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Assignment Master Database - Unified conflict resolution and assignment creation
// This module manages the consolidation of assignments from multiple sources (API, ICS, Email, Scraping)

interface ConflictResolution {
  strategy: 'merge' | 'replace' | 'keep_existing' | 'manual';
  priority: 'source_confidence' | 'source_type' | 'most_recent' | 'user_preference';
  rules: {
    titleConflict?: 'longest' | 'shortest' | 'most_detailed' | 'highest_confidence';
    dateConflict?: 'earliest' | 'latest' | 'highest_confidence';
    gradeConflict?: 'highest' | 'latest' | 'most_recent';
    descriptionConflict?: 'longest' | 'most_detailed' | 'combine';
  };
}

interface AssignmentMatch {
  sourceId: Id<"assignmentSources">;
  matchScore: number;
  matchReasons: string[];
  conflictFields: string[];
}

// Default conflict resolution strategy
const DEFAULT_RESOLUTION: ConflictResolution = {
  strategy: 'merge',
  priority: 'source_confidence',
  rules: {
    titleConflict: 'most_detailed',
    dateConflict: 'highest_confidence',
    gradeConflict: 'latest',
    descriptionConflict: 'longest',
  }
};

// Source priority mapping (higher number = higher priority)
const SOURCE_PRIORITY = {
  'api': 4,        // D2L API has highest priority (most reliable)
  'scraping': 3,   // Web scraping is second (direct from D2L)
  'email': 2,      // Email notifications are third
  'ics': 1,        // ICS feeds are lowest priority (can be outdated)
};

// Calculate similarity score between two strings
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  
  // Simple Levenshtein distance-based similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 100;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return Math.round(((longer.length - editDistance) / longer.length) * 100);
}

// Levenshtein distance implementation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Find potential matches for an assignment source
async function findPotentialMatches(
  ctx: any, 
  userId: Id<"users">, 
  newSource: any
): Promise<AssignmentMatch[]> {
  // Get all unprocessed assignment sources for the user
  const existingSources = await ctx.db
    .query("assignmentSources")
    .filter((q) => 
      q.and(
        q.eq(q.field("userId"), userId),
        q.eq(q.field("isProcessed"), false)
      )
    )
    .collect();

  const matches: AssignmentMatch[] = [];

  for (const existing of existingSources) {
    if (existing._id === newSource._id) continue; // Don't match with self

    let matchScore = 0;
    const matchReasons: string[] = [];
    const conflictFields: string[] = [];

    // Title similarity
    const titleSimilarity = calculateSimilarity(
      newSource.parsedData.title, 
      existing.parsedData.title
    );
    if (titleSimilarity >= 70) {
      matchScore += titleSimilarity * 0.4; // 40% weight
      matchReasons.push(`Title similarity: ${titleSimilarity}%`);
      if (titleSimilarity < 100) {
        conflictFields.push('title');
      }
    }

    // Enhanced course matching with normalization
    if (newSource.parsedData.courseCode && existing.parsedData.courseCode) {
      const normalizedNew = normalizeCourseCode(newSource.parsedData.courseCode);
      const normalizedExisting = normalizeCourseCode(existing.parsedData.courseCode);
      
      if (normalizedNew === normalizedExisting) {
        matchScore += 25; // Perfect course match bonus
        matchReasons.push(`Same course (${normalizedNew})`);
      } else {
        // Fallback to similarity check
        const courseSimilarity = calculateSimilarity(
          newSource.parsedData.courseCode,
          existing.parsedData.courseCode
        );
        if (courseSimilarity >= 80) {
          matchScore += 15; // Similar course bonus
          matchReasons.push(`Similar course (${courseSimilarity}%)`);
        }
      }
    }

    // Due date proximity (within 24 hours = potential match)
    if (newSource.parsedData.dueDate && existing.parsedData.dueDate) {
      const timeDiff = Math.abs(newSource.parsedData.dueDate - existing.parsedData.dueDate);
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff <= 24) {
        const dateScore = Math.max(0, 20 - hoursDiff); // Up to 20 points
        matchScore += dateScore;
        matchReasons.push(`Due date within ${hoursDiff.toFixed(1)} hours`);
        if (hoursDiff > 1) {
          conflictFields.push('dueDate');
        }
      }
    }

    // Assignment type matching
    if (newSource.parsedData.assignmentType === existing.parsedData.assignmentType) {
      matchScore += 10;
      matchReasons.push('Same assignment type');
    }

    // Description similarity (if both have descriptions)
    if (newSource.parsedData.description && existing.parsedData.description) {
      const descSimilarity = calculateSimilarity(
        newSource.parsedData.description,
        existing.parsedData.description
      );
      if (descSimilarity >= 50) {
        matchScore += descSimilarity * 0.2; // 20% weight
        matchReasons.push(`Description similarity: ${descSimilarity}%`);
        if (descSimilarity < 90) {
          conflictFields.push('description');
        }
      }
    }

    // Grade information matching
    if (newSource.parsedData.maxPoints && existing.parsedData.maxPoints) {
      if (newSource.parsedData.maxPoints === existing.parsedData.maxPoints) {
        matchScore += 10;
        matchReasons.push('Same max points');
      } else {
        conflictFields.push('maxPoints');
      }
    }

    if (newSource.parsedData.pointsEarned && existing.parsedData.pointsEarned) {
      if (newSource.parsedData.pointsEarned !== existing.parsedData.pointsEarned) {
        conflictFields.push('pointsEarned');
      }
    }

    // Consider it a match if score >= 60
    if (matchScore >= 60) {
      matches.push({
        sourceId: existing._id,
        matchScore,
        matchReasons,
        conflictFields,
      });
    }
  }

  // Sort matches by score (highest first)
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

// Resolve conflicts between assignment sources
function resolveConflicts(
  sources: any[], 
  resolution: ConflictResolution = DEFAULT_RESOLUTION
): any {
  if (sources.length === 0) return null;
  if (sources.length === 1) return sources[0].parsedData;

  // Sort sources by priority
  const sortedSources = sources.sort((a, b) => {
    if (resolution.priority === 'source_confidence') {
      return b.confidence - a.confidence;
    } else if (resolution.priority === 'source_type') {
      return SOURCE_PRIORITY[b.sourceType] - SOURCE_PRIORITY[a.sourceType];
    } else if (resolution.priority === 'most_recent') {
      return b.updatedAt - a.updatedAt;
    }
    return 0;
  });

  const resolved = { ...sortedSources[0].parsedData };

  // Resolve field-by-field conflicts
  for (let i = 1; i < sortedSources.length; i++) {
    const current = sortedSources[i].parsedData;

    // Title conflict resolution
    if (current.title && current.title !== resolved.title) {
      if (resolution.rules.titleConflict === 'longest') {
        if (current.title.length > resolved.title.length) {
          resolved.title = current.title;
        }
      } else if (resolution.rules.titleConflict === 'most_detailed') {
        // Choose the one with more words/details
        const currentWords = current.title.split(/\s+/).length;
        const resolvedWords = resolved.title.split(/\s+/).length;
        if (currentWords > resolvedWords) {
          resolved.title = current.title;
        }
      } else if (resolution.rules.titleConflict === 'highest_confidence') {
        if (sortedSources[i].confidence > sortedSources[0].confidence) {
          resolved.title = current.title;
        }
      }
    }

    // Due date conflict resolution
    if (current.dueDate && current.dueDate !== resolved.dueDate) {
      if (resolution.rules.dateConflict === 'earliest') {
        if (!resolved.dueDate || current.dueDate < resolved.dueDate) {
          resolved.dueDate = current.dueDate;
        }
      } else if (resolution.rules.dateConflict === 'latest') {
        if (!resolved.dueDate || current.dueDate > resolved.dueDate) {
          resolved.dueDate = current.dueDate;
        }
      } else if (resolution.rules.dateConflict === 'highest_confidence') {
        if (sortedSources[i].confidence > sortedSources[0].confidence) {
          resolved.dueDate = current.dueDate;
        }
      }
    }

    // Description conflict resolution
    if (current.description && current.description !== resolved.description) {
      if (resolution.rules.descriptionConflict === 'longest') {
        if (!resolved.description || current.description.length > resolved.description.length) {
          resolved.description = current.description;
        }
      } else if (resolution.rules.descriptionConflict === 'combine') {
        if (resolved.description && !resolved.description.includes(current.description)) {
          resolved.description += '\n\n' + current.description;
        } else if (!resolved.description) {
          resolved.description = current.description;
        }
      }
    }

    // Grade conflict resolution (take the latest/most recent)
    if (current.pointsEarned !== undefined && resolution.rules.gradeConflict === 'latest') {
      resolved.pointsEarned = current.pointsEarned;
      resolved.status = current.status;
    }

    if (current.maxPoints !== undefined && !resolved.maxPoints) {
      resolved.maxPoints = current.maxPoints;
    }

    // Fill in missing fields
    if (!resolved.courseName && current.courseName) resolved.courseName = current.courseName;
    if (!resolved.courseCode && current.courseCode) resolved.courseCode = current.courseCode;
    if (!resolved.assignmentType && current.assignmentType) resolved.assignmentType = current.assignmentType;
    if (!resolved.location && current.location) resolved.location = current.location;
    if (!resolved.instructor && current.instructor) resolved.instructor = current.instructor;
  }

  return resolved;
}

// Process unprocessed assignment sources and create assignments
export const processAssignmentSources = mutation({
  args: {
    clerkUserId: v.string(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Allow internal/background callers without user identity; we rely on passed clerkUserId

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const batchSize = args.batchSize || 1; // Process a single source per call to avoid 1s timeout
    
    // Get unprocessed assignment sources
    const unprocessedSources = await ctx.db
      .query("assignmentSources")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("isProcessed"), false)
        )
      )
      .order("desc")
      .take(batchSize);

    if (unprocessedSources.length === 0) {
      return {
        processed: 0,
        created: 0,
        merged: 0,
        errors: [],
      };
    }

    const results = {
      processed: 0,
      created: 0,
      merged: 0,
      errors: [] as string[],
    };

    // Process each source (keep extremely fast to stay under 1s limit)
    for (const source of unprocessedSources) {
      try {
        // Fast path: create/attach directly with internal dedupe (title/Gemini)
        const assignmentId = await createAssignmentFromSource(ctx, user._id, source);
        // Mark source as processed
        await ctx.db.patch(source._id, {
          isProcessed: true,
          assignmentId: assignmentId,
          updatedAt: Date.now(),
        });
        results.created++;
        
        results.processed++;
      } catch (error) {
        results.errors.push(`Error processing source ${source._id}: ${error}`);
      }
    }

    console.log(`🔄 Processed ${results.processed} assignment sources: ${results.created} created, ${results.merged} merged`);
    return results;
  },
});

// Try to resolve course directly from the integration link (e.g., ICS feed -> linked course)
async function resolveCourseForSource(
  ctx: any,
  userId: Id<"users">,
  source: any,
  data: any
): Promise<Id<"courses"> | null> {
  try {
    // When coming from an ICS feed, prefer the feed's explicitly linked courseId
    if (source.sourceType === 'ics' && source.sourceUrl) {
      const feed = await ctx.db
        .query('icsFeeds')
        .filter((q: any) =>
          q.and(
            q.eq(q.field('userId'), userId),
            q.eq(q.field('feedUrl'), source.sourceUrl)
          )
        )
        .first();

      if (feed?.courseId) {
        return feed.courseId as Id<'courses'>;
      }
    }
  } catch (e) {
    // Non-fatal; fall back to normalization-based matching
  }

  // If the parsed data already contains course identifiers, try to match without creating
  if (data?.courseCode || data?.courseName) {
    // Attempt non-creating lookup by code/name using the same logic as findOrCreateCourse but without creation
    const userCourses = await ctx.db
      .query('courses')
      .filter((q: any) => q.eq(q.field('userId'), userId))
      .collect();

    if (data.courseCode) {
      const normalizedInputCode = normalizeCourseCode(data.courseCode);
      for (const course of userCourses) {
        const normalizedExistingCode = normalizeCourseCode(course.code);
        if (normalizedInputCode === normalizedExistingCode) {
          return course._id as Id<'courses'>;
        }
      }
    }

    if (data.courseName) {
      const normalizedInputName = data.courseName.toLowerCase().replace(/[^\w\s]/g, '').trim();
      // Exact name match
      const exact = userCourses.find((c: any) => c.lc_title === data.courseName.toLowerCase());
      if (exact) return exact._id as Id<'courses'>;

      // Fuzzy name match
      for (const course of userCourses) {
        const normalizedExistingName = course.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const inputWords = normalizedInputName.split(/\s+/);
        const existingWords = normalizedExistingName.split(/\s+/);
        const matchingWords = inputWords.filter(
          (word: string) => word.length > 3 && existingWords.some((w: string) => w.startsWith(word) || word.startsWith(w))
        );
        if (matchingWords.length >= Math.min(2, inputWords.length * 0.6)) {
          return course._id as Id<'courses'>;
        }
      }
    }
  }

  return null;
}

// Create assignment from a single source
async function createAssignmentFromSource(ctx: any, userId: Id<"users">, source: any): Promise<Id<"assignments">> {
  const data = source.parsedData;
  
  // Prefer the integration-linked course (no accidental new course creation)
  let courseId = await resolveCourseForSource(ctx, userId, source, data);
  if (!courseId) {
    // Fall back to smart normalization-based matching with creation as last resort
    courseId = await findOrCreateCourse(ctx, userId, data.courseName, data.courseCode);
  }

  // Duplicate prevention: exact title, then semantic check via Gemini
  const existingId = await findExistingAssignmentByTitle(ctx, userId, courseId, data.title);
  if (existingId) {
    console.log(`↩️  Reusing existing assignment by title match: "${data.title}"`);
    return existingId;
  }
  // Optional semantic duplicate check (only callable from actions).
  // Mutations do not support runAction; guard accordingly.
  if ((ctx as any).runAction) {
    try {
      const ai = await (ctx as any).runAction(internal.assignmentMaster.semanticDuplicateCheck, {
        courseId,
        title: data.title,
        description: data.description || '',
        dueDate: data.dueDate || undefined,
        maxCandidates: 25,
      });
      if (ai?.match && ai.confidence >= 0.8) {
        console.log(`🧠 Gemini matched existing assignment with ${Math.round(ai.confidence * 100)}% confidence: reusing`);
        return ai.match;
      }
    } catch (_) {
      // Ignore AI errors inside mutation context
    }
  }
  
  // Create assignment
  const assignmentId = await ctx.db.insert("assignments", {
    userId,
    courseId,
    title: data.title,
    lc_title: data.title.toLowerCase(),
    notes: data.description,
    dueAt: data.dueDate,
    status: data.status || 'todo',
    type: data.assignmentType || 'assignment',
    maxPoints: data.maxPoints,
    pointsEarned: data.pointsEarned,
    grade: data.pointsEarned && data.maxPoints ? (data.pointsEarned / data.maxPoints) * 100 : undefined,
    // Mark as AI generated from alternative sources
    aiGenerated: source.sourceType !== 'api',
  });
  
  console.log(`✅ Created assignment "${data.title}" from ${source.sourceType} source`);
  return assignmentId;
}

// Create assignment from merged data
async function createAssignmentFromMergedData(ctx: any, userId: Id<"users">, data: any): Promise<Id<"assignments">> {
  // When merging, we don't have the original source object; attempt best-effort resolution
  let courseId = await resolveCourseForSource(ctx, userId, { sourceType: 'ics', sourceUrl: data?.sourceUrl }, data);
  if (!courseId) {
    courseId = await findOrCreateCourse(ctx, userId, data.courseName, data.courseCode);
  }

  // Duplicate prevention: exact title, then semantic
  const existingId = await findExistingAssignmentByTitle(ctx, userId, courseId, data.title);
  if (existingId) {
    console.log(`↩️  Reusing existing assignment by title match (merged): "${data.title}"`);
    return existingId;
  }
  if ((ctx as any).runAction) {
    try {
      const ai = await (ctx as any).runAction(internal.assignmentMaster.semanticDuplicateCheck, {
        courseId,
        title: data.title,
        description: data.description || '',
        dueDate: data.dueDate || undefined,
        maxCandidates: 25,
      });
      if (ai?.match && ai.confidence >= 0.8) {
        console.log(`🧠 Gemini matched existing assignment (merged) with ${Math.round(ai.confidence * 100)}% confidence: reusing`);
        return ai.match;
      }
    } catch (_) {
      // Ignore AI errors inside mutation context
    }
  }
  
  // Create assignment
  const assignmentId = await ctx.db.insert("assignments", {
    userId,
    courseId,
    title: data.title,
    lc_title: data.title.toLowerCase(),
    notes: data.description,
    dueAt: data.dueDate,
    status: data.status || 'todo',
    type: data.assignmentType || 'assignment',
    maxPoints: data.maxPoints,
    pointsEarned: data.pointsEarned,
    grade: data.pointsEarned && data.maxPoints ? (data.pointsEarned / data.maxPoints) * 100 : undefined,
    aiGenerated: true, // Merged from multiple sources
  });
  
  console.log(`🔗 Created merged assignment "${data.title}"`);
  return assignmentId;
}

// Fast exact-title lookup within a course (case-insensitive)
async function findExistingAssignmentByTitle(
  ctx: any,
  userId: Id<'users'>,
  courseId: Id<'courses'>,
  title: string
): Promise<Id<'assignments'> | null> {
  if (!title) return null;
  const lc = title.toLowerCase();
  const existing = await ctx.db
    .query('assignments')
    .filter((q: any) =>
      q.and(
        q.eq(q.field('userId'), userId),
        q.eq(q.field('courseId'), courseId),
        q.eq(q.field('lc_title'), lc)
      )
    )
    .first();
  return existing?._id || null;
}

// Normalize course code to handle different formats
function normalizeCourseCode(courseCode: string): string {
  if (!courseCode) return '';

  // Remove all spaces, hyphens, and convert to uppercase
  let normalized = courseCode.replace(/[\s\-]/g, '').toUpperCase();

  // Handle different formats:
  // "ITEC-235-001" → "ITEC235"
  // "ITEC-216-940" → "ITEC216" 
  // "ITEC 235" → "ITEC235"
  // "ITEC235" → "ITEC235" (already normalized)

  // Extract department and course number (ignore section numbers)
  const match = normalized.match(/^([A-Z]{2,4})(\d{3,4})/);
  if (match) {
    return match[1] + match[2]; // e.g., "ITEC235"
  }

  return normalized;
}

// Find or create course based on course name/code with smart matching
async function findOrCreateCourse(ctx: any, userId: Id<"users">, courseName?: string, courseCode?: string): Promise<Id<"courses">> {
  if (!courseName && !courseCode) {
    // Create a default "Unknown Course" if no course information
    const defaultCourse = await ctx.db
      .query("courses")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("code"), "UNKNOWN")
        )
      )
      .first();
    
    if (defaultCourse) {
      return defaultCourse._id;
    }
    
    // Get user's active term
    const user = await ctx.db.get(userId);
    if (!user?.currentActiveTerm) {
      throw new Error("No active term found for user");
    }
    
    return await ctx.db.insert("courses", {
      userId,
      termId: user.currentActiveTerm,
      code: "UNKNOWN",
      lc_code: "unknown",
      title: "Unknown Course",
      lc_title: "unknown course",
      instructor: "Unknown",
      creditHours: 3,
    });
  }
  
  // Try to find existing course by normalized code first
  if (courseCode) {
    const normalizedInputCode = normalizeCourseCode(courseCode);
    
    // Get all user courses and check for matches
    const userCourses = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    
    for (const course of userCourses) {
      const normalizedExistingCode = normalizeCourseCode(course.code);
      if (normalizedInputCode === normalizedExistingCode) {
        console.log(`📚 Matched course codes: "${courseCode}" → "${course.code}" (${course.title})`);
        return course._id;
      }
    }
  }
  
  // Try to find by name with fuzzy matching
  if (courseName) {
    const normalizedInputName = courseName.toLowerCase().replace(/[^\w\s]/g, '').trim();
    
    // First try exact match
    const existingByName = await ctx.db
      .query("courses")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("lc_title"), courseName.toLowerCase())
        )
      )
      .first();
    
    if (existingByName) {
      console.log(`📚 Matched course by exact name: "${courseName}" → "${existingByName.title}"`);
      return existingByName._id;
    }
    
    // Try fuzzy matching for similar course names
    const userCourses = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    
    for (const course of userCourses) {
      const normalizedExistingName = course.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
      
      // Check for similar course names (handle "Systems" vs "System", etc.)
      const inputWords = normalizedInputName.split(/\s+/);
      const existingWords = normalizedExistingName.split(/\s+/);
      
      // If most key words match, consider it the same course
      const matchingWords = inputWords.filter(word => 
        word.length > 3 && // Only consider substantial words
        existingWords.some(existingWord => 
          existingWord.startsWith(word) || word.startsWith(existingWord)
        )
      );
      
      if (matchingWords.length >= Math.min(2, inputWords.length * 0.6)) {
        console.log(`📚 Matched course by fuzzy name: "${courseName}" → "${course.title}" (${matchingWords.length} matching words)`);
        return course._id;
      }
    }
  }
  
  // Create new course with both original and normalized codes stored
  const user = await ctx.db.get(userId);
  if (!user?.currentActiveTerm) {
    throw new Error("No active term found for user");
  }
  
  const originalCode = courseCode || courseName?.substring(0, 10).toUpperCase() || "UNKNOWN";
  const normalizedCode = courseCode ? normalizeCourseCode(courseCode) : originalCode;
  const title = courseName || courseCode || "Unknown Course";
  
  console.log(`📚 Creating new course: "${originalCode}" (normalized: "${normalizedCode}")`);
  
  return await ctx.db.insert("courses", {
    userId,
    termId: user.currentActiveTerm,
    code: originalCode, // Store original format for display
    lc_code: normalizedCode.toLowerCase(), // Store normalized for matching
    title,
    lc_title: title.toLowerCase(),
    instructor: "Unknown",
    creditHours: 3,
  });
}

// Merge duplicate courses that have already been created
export const mergeDuplicateCourses = mutation({
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
    
    const userCourses = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();
    
    const mergedCourses = [];
    const coursesToDelete = [];
    
    // Group courses by normalized code
    const courseGroups = new Map<string, typeof userCourses>();
    
    for (const course of userCourses) {
      const normalizedCode = normalizeCourseCode(course.code);
      if (!courseGroups.has(normalizedCode)) {
        courseGroups.set(normalizedCode, []);
      }
      courseGroups.get(normalizedCode)!.push(course);
    }
    
    // Find and merge duplicates
    for (const [normalizedCode, courses] of courseGroups.entries()) {
      if (courses.length > 1) {
        console.log(`📚 Found ${courses.length} duplicate courses for ${normalizedCode}:`, courses.map(c => c.title));
        
        // Keep the oldest course (first created) as the primary
        const primaryCourse = courses.reduce((oldest, current) => 
          current._creationTime < oldest._creationTime ? current : oldest
        );
        
        const duplicates = courses.filter(c => c._id !== primaryCourse._id);
        
        // Move all assignments from duplicates to primary course
        for (const duplicate of duplicates) {
          const assignments = await ctx.db
            .query("assignments")
            .filter((q) => q.eq(q.field("courseId"), duplicate._id))
            .collect();
          
          for (const assignment of assignments) {
            await ctx.db.patch(assignment._id, { courseId: primaryCourse._id });
          }
          
          console.log(`📚 Moved ${assignments.length} assignments from "${duplicate.title}" to "${primaryCourse.title}"`);
          
          // Mark duplicate for deletion
          coursesToDelete.push(duplicate._id);
        }
        
        mergedCourses.push({
          primary: primaryCourse.title,
          merged: duplicates.map(d => d.title),
          assignmentsMoved: duplicates.length,
        });
      }
    }
    
    // Delete duplicate courses
    for (const courseId of coursesToDelete) {
      await ctx.db.delete(courseId);
    }
    
    console.log(`📚 Merged ${mergedCourses.length} course groups, deleted ${coursesToDelete.length} duplicates`);
    
    return {
      mergedGroups: mergedCourses.length,
      coursesDeleted: coursesToDelete.length,
      details: mergedCourses,
    };
  },
});

// Get assignment sources for review
export const getAssignmentSources = query({
  args: {
    clerkUserId: v.string(),
    isProcessed: v.optional(v.boolean()),
    sourceType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return [];
    }

    let query = ctx.db
      .query("assignmentSources")
      .filter((q) => q.eq(q.field("userId"), user._id));

    if (args.isProcessed !== undefined) {
      query = query.filter((q) => q.eq(q.field("isProcessed"), args.isProcessed));
    }

    if (args.sourceType) {
      query = query.filter((q) => q.eq(q.field("sourceType"), args.sourceType));
    }

    const sources = await query
      .order("desc")
      .take(args.limit || 50);

    // Get assignment info for processed sources
    const sourcesWithAssignments = await Promise.all(
      sources.map(async (source) => {
        let assignment = null;
        if (source.assignmentId) {
          assignment = await ctx.db.get(source.assignmentId);
        }
        
        return {
          ...source,
          assignment: assignment ? {
            _id: assignment._id,
            title: assignment.title,
            status: assignment.status,
            dueAt: assignment.dueAt,
          } : null,
        };
      })
    );

    return sourcesWithAssignments;
  },
});

// Manually process specific assignment source
export const manuallyProcessSource = mutation({
  args: {
    sourceId: v.id("assignmentSources"),
    action: v.union(v.literal("create"), v.literal("merge"), v.literal("ignore")),
    mergeWithSourceId: v.optional(v.id("assignmentSources")),
    customData: v.optional(v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      dueDate: v.optional(v.number()),
      courseName: v.optional(v.string()),
      courseCode: v.optional(v.string()),
      assignmentType: v.optional(v.string()),
      maxPoints: v.optional(v.number()),
      pointsEarned: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const source = await ctx.db.get(args.sourceId);
    if (!source) {
      throw new Error("Source not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user || source.userId !== user._id) {
      throw new Error("Not authorized");
    }

    if (args.action === "ignore") {
      // Just mark as processed without creating assignment
      await ctx.db.patch(args.sourceId, {
        isProcessed: true,
        updatedAt: Date.now(),
      });
      return { success: true, action: "ignored" };
    }

    let assignmentId: Id<"assignments">;

    if (args.action === "create") {
      // Create new assignment, optionally with custom data
      const data = args.customData ? { ...source.parsedData, ...args.customData } : source.parsedData;
      assignmentId = await createAssignmentFromMergedData(ctx, user._id, data);
    } else if (args.action === "merge" && args.mergeWithSourceId) {
      // Merge with specified source
      const mergeSource = await ctx.db.get(args.mergeWithSourceId);
      if (!mergeSource) {
        throw new Error("Merge source not found");
      }
      
      const sources = args.customData ? 
        [{ ...source, parsedData: { ...source.parsedData, ...args.customData } }, mergeSource] :
        [source, mergeSource];
      
      const mergedData = resolveConflicts(sources);
      assignmentId = await createAssignmentFromMergedData(ctx, user._id, mergedData);
      
      // Mark merge source as processed too
      await ctx.db.patch(args.mergeWithSourceId, {
        isProcessed: true,
        assignmentId: assignmentId,
        conflictsWith: [args.sourceId],
        updatedAt: Date.now(),
      });
    } else {
      throw new Error("Invalid action or missing merge target");
    }

    // Mark source as processed
    await ctx.db.patch(args.sourceId, {
      isProcessed: true,
      assignmentId: assignmentId,
      conflictsWith: args.mergeWithSourceId ? [args.mergeWithSourceId] : undefined,
      updatedAt: Date.now(),
    });

    return { 
      success: true, 
      action: args.action,
      assignmentId: assignmentId,
    };
  },
});

// Get processing statistics
export const getProcessingStats = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return null;
    }

    const allSources = await ctx.db
      .query("assignmentSources")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    const stats = {
      total: allSources.length,
      processed: allSources.filter(s => s.isProcessed).length,
      unprocessed: allSources.filter(s => !s.isProcessed).length,
      bySource: {} as Record<string, { total: number; processed: number }>,
      averageConfidence: 0,
      highConfidence: 0, // >= 80
      mediumConfidence: 0, // 50-79
      lowConfidence: 0, // < 50
    };

    // Calculate by source type
    for (const source of allSources) {
      if (!stats.bySource[source.sourceType]) {
        stats.bySource[source.sourceType] = { total: 0, processed: 0 };
      }
      stats.bySource[source.sourceType].total++;
      if (source.isProcessed) {
        stats.bySource[source.sourceType].processed++;
      }
    }

    // Calculate confidence stats
    if (allSources.length > 0) {
      const totalConfidence = allSources.reduce((sum, s) => sum + s.confidence, 0);
      stats.averageConfidence = Math.round(totalConfidence / allSources.length);
      
      stats.highConfidence = allSources.filter(s => s.confidence >= 80).length;
      stats.mediumConfidence = allSources.filter(s => s.confidence >= 50 && s.confidence < 80).length;
      stats.lowConfidence = allSources.filter(s => s.confidence < 50).length;
    }

    return stats;
  },
});

// Purge assignment sources for a user, optionally filtered by sourceType or sourceUrl
export const purgeAssignmentSources = mutation({
  args: {
    clerkUserId: v.string(),
    sourceType: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('clerkUserId'), args.clerkUserId))
      .first();
    if (!user) throw new Error('User not found');

    let queryBuilder = ctx.db
      .query('assignmentSources')
      .filter((q) => q.eq(q.field('userId'), user._id));

    if (args.sourceType) {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field('sourceType'), args.sourceType!));
    }
    if (args.sourceUrl) {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field('sourceUrl'), args.sourceUrl!));
    }

    const toDelete = await queryBuilder.collect();
    for (const src of toDelete) {
      await ctx.db.delete(src._id);
    }
    return { deleted: toDelete.length };
  },
});

// Repair utility: merge duplicate Convex users that share the same clerkUserId
export const mergeDuplicateUsersByClerkId = mutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('clerkUserId'), args.clerkUserId))
      .collect();

    if (users.length <= 1) {
      return { merged: false, kept: users[0]?._id || null, removed: 0 };
    }

    // Keep the oldest record as primary for stability
    const primary = users.reduce((oldest, u) => (u._creationTime < oldest._creationTime ? u : oldest));
    const duplicates = users.filter((u) => u._id !== primary._id);

    // Repoint dependent records to primary
    for (const dupe of duplicates) {
      // assignmentSources
      const sources = await ctx.db
        .query('assignmentSources')
        .filter((q) => q.eq(q.field('userId'), dupe._id))
        .collect();
      for (const s of sources) {
        await ctx.db.patch(s._id, { userId: primary._id });
      }

      // icsFeeds
      const feeds = await ctx.db
        .query('icsFeeds')
        .filter((q) => q.eq(q.field('userId'), dupe._id))
        .collect();
      for (const f of feeds) {
        await ctx.db.patch(f._id, { userId: primary._id });
      }

      // assignments
      const assignments = await ctx.db
        .query('assignments')
        .filter((q) => q.eq(q.field('userId'), dupe._id))
        .collect();
      for (const a of assignments) {
        await ctx.db.patch(a._id, { userId: primary._id });
      }

      // courses
      const courses = await ctx.db
        .query('courses')
        .filter((q) => q.eq(q.field('userId'), dupe._id))
        .collect();
      for (const c of courses) {
        await ctx.db.patch(c._id, { userId: primary._id });
      }

      // Finally delete duplicate user record
      await ctx.db.delete(dupe._id);
    }

    return { merged: true, kept: primary._id, removed: duplicates.length };
  },
});

// Query: get user by clerk id
export const getUserByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('clerkUserId'), args.clerkUserId))
      .first();
  }
});

// Query: get user's courses
export const getUserCourses = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('courses')
      .filter((q) => q.eq(q.field('userId'), args.userId))
      .collect();
  }
});

// Query: get ICS feed by url for user
export const getICSFeedByUrlForUser = query({
  args: { userId: v.id('users'), feedUrl: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('icsFeeds')
      .filter((q) => q.and(q.eq(q.field('userId'), args.userId), q.eq(q.field('feedUrl'), args.feedUrl)))
      .first();
  }
});

// Query: existing assignment by lc_title
export const getAssignmentByLcTitle = query({
  args: { userId: v.id('users'), courseId: v.id('courses'), lcTitle: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('assignments')
      .filter((q) => q.and(
        q.eq(q.field('userId'), args.userId),
        q.eq(q.field('courseId'), args.courseId),
        q.eq(q.field('lc_title'), args.lcTitle)
      ))
      .first();
  }
});

// Query: get unprocessed assignment sources for a user
export const getUnprocessedSources = query({
  args: { userId: v.id('users'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 25;
    return await ctx.db
      .query('assignmentSources')
      .filter((q) => q.and(q.eq(q.field('userId'), args.userId), q.eq(q.field('isProcessed'), false)))
      .order('desc')
      .take(limit);
  }
});

// Mutation: insert assignment (used by action)
export const insertAssignment = mutation({
  args: {
    userId: v.id('users'),
    courseId: v.id('courses'),
    title: v.string(),
    notes: v.optional(v.string()),
    dueAt: v.optional(v.number()),
    status: v.optional(v.string()),
    type: v.optional(v.string()),
    maxPoints: v.optional(v.number()),
    pointsEarned: v.optional(v.number()),
    aiGenerated: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    return await ctx.db.insert('assignments', {
      userId: a.userId,
      courseId: a.courseId,
      title: a.title,
      lc_title: a.title.toLowerCase(),
      notes: a.notes,
      dueAt: a.dueAt,
      status: a.status ?? 'todo',
      type: a.type ?? 'assignment',
      maxPoints: a.maxPoints,
      pointsEarned: a.pointsEarned,
      grade: a.pointsEarned && a.maxPoints ? (a.pointsEarned / a.maxPoints) * 100 : undefined,
      aiGenerated: a.aiGenerated ?? true,
    });
  }
});

// Mutation: mark source processed
export const markSourceProcessed = mutation({
  args: { sourceId: v.id('assignmentSources'), assignmentId: v.id('assignments') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sourceId, {
      isProcessed: true,
      assignmentId: args.assignmentId,
      updatedAt: Date.now(),
    });
  }
});

// Action: process sources with AI duplicate detection
export const processAssignmentSourcesAction = action({
  args: { clerkUserId: v.string(), batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.assignmentMaster.getUserByClerkId, { clerkUserId: args.clerkUserId });
    if (!user) return { processed: 0, created: 0, reused: 0, errors: ['User not found'] };

    const batch = await ctx.runQuery(internal.assignmentMaster.getUnprocessedSources, { userId: user._id, limit: args.batchSize ?? 10 });
    if (batch.length === 0) return { processed: 0, created: 0, reused: 0, errors: [] };

    const courses = await ctx.runQuery(internal.assignmentMaster.getUserCourses, { userId: user._id });

    const results = { processed: 0, created: 0, reused: 0, errors: [] as string[] };

    for (const source of batch) {
      try {
        const data = source.parsedData as any;
        // Resolve course
        let courseId: any = null;
        if (source.sourceUrl) {
          const feed = await ctx.runQuery(internal.assignmentMaster.getICSFeedByUrlForUser, { userId: user._id, feedUrl: source.sourceUrl });
          if (feed?.courseId) courseId = feed.courseId;
        }
        if (!courseId) {
          // Try by code/name using local helpers
          const normalizedInputCode = data?.courseCode ? normalizeCourseCode(data.courseCode) : '';
          if (normalizedInputCode) {
            const match = courses.find((c: any) => normalizeCourseCode(c.code) === normalizedInputCode);
            if (match) courseId = match._id;
          }
          if (!courseId && data?.courseName) {
            const name = (data.courseName as string).toLowerCase();
            let match = courses.find((c: any) => c.lc_title === name);
            if (!match) {
              const normIn = name.replace(/[^\w\s]/g, '').trim().split(/\s+/);
              match = courses.find((c: any) => {
                const normEx = c.title.toLowerCase().replace(/[^\w\s]/g, '').trim().split(/\s+/);
                const matching = normIn.filter((w: string) => w.length > 3 && normEx.some((e: string) => e.startsWith(w) || w.startsWith(e)));
                return matching.length >= Math.min(2, Math.ceil(normIn.length * 0.6));
              });
            }
            if (match) courseId = match._id;
          }
          if (!courseId && courses.length > 0) courseId = courses[0]._id; // last resort to avoid failure
        }

        const lc = (data?.title || '').toLowerCase();
        let existing = lc ? await ctx.runQuery(internal.assignmentMaster.getAssignmentByLcTitle, { userId: user._id, courseId, lcTitle: lc }) : null;

        if (!existing && lc) {
          // AI duplicate check
          const ai = await ctx.runAction(internal.assignmentMaster.semanticDuplicateCheck, {
            courseId,
            title: data.title,
            description: data.description || '',
            dueDate: data.dueDate || undefined,
            maxCandidates: 25,
          });
          if (ai?.match && ai.confidence >= 0.8) {
            existing = { _id: ai.match } as any;
          }
        }

        const assignmentId = existing?._id || await ctx.runMutation(internal.assignmentMaster.insertAssignment, {
          userId: user._id,
          courseId,
          title: data.title,
          notes: data.description,
          dueAt: data.dueDate,
          status: data.status || 'todo',
          type: data.assignmentType || 'assignment',
          maxPoints: data.maxPoints,
          pointsEarned: data.pointsEarned,
          aiGenerated: true,
        });

        await ctx.runMutation(internal.assignmentMaster.markSourceProcessed, { sourceId: source._id, assignmentId });
        results.processed++;
        results.created += existing ? 0 : 1;
        results.reused += existing ? 1 : 0;
      } catch (e: any) {
        results.errors.push(`Source ${source._id}: ${e?.message || e}`);
      }
    }

    return results;
  }
});

// Use Gemini to semantically detect duplicates within a course
export const semanticDuplicateCheck = action({
  args: {
    courseId: v.id('courses'),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    maxCandidates: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxCandidates = args.maxCandidates || 25;

    // Pull candidate assignments from the same course (most recent first)
    const candidates = await ctx.runQuery(internalQueryAssignmentsByCourse, {
      courseId: args.courseId,
      limit: maxCandidates,
    });

    if (candidates.length === 0) {
      return { match: null, confidence: 0, rationale: 'No candidates in course' };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { match: null, confidence: 0, rationale: 'GEMINI_API_KEY not configured' };
    }

    // Build compact prompt for Gemini JSON response
    const systemPrompt = `You are helping deduplicate course assignments. Given a new assignment and a list of existing course assignments, return a single best match if it clearly refers to the same assignment. Respond in strict JSON with keys: matchIndex (number|null), confidence (0..1), rationale (string). Consider title semantics, synonyms, due-date proximity (±3 days), and obvious phrasing variants like 'Availability Ends' vs 'Due'.`;

    const payload = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            { text: `New assignment:\n${JSON.stringify({ title: args.title, description: args.description || '', dueDate: args.dueDate || null })}` },
            { text: `Existing assignments (indexed):\n${JSON.stringify(candidates.map(c => ({ title: c.title, description: c.notes || '', dueDate: c.dueAt || null })))}` },
            { text: 'Return JSON only.' },
          ],
        },
      ],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    } as any;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        return { match: null, confidence: 0, rationale: `Gemini HTTP ${res.status}` };
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      let parsed: any = {};
      try { parsed = JSON.parse(text); } catch (_) { parsed = {}; }

      const matchIndex = typeof parsed.matchIndex === 'number' ? parsed.matchIndex : null;
      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
      const rationale = typeof parsed.rationale === 'string' ? parsed.rationale : 'No rationale';

      if (matchIndex === null || matchIndex < 0 || matchIndex >= candidates.length) {
        return { match: null, confidence, rationale };
      }

      return { match: candidates[matchIndex]?._id || null, confidence, rationale };
    } catch (e: any) {
      return { match: null, confidence: 0, rationale: `Gemini error: ${e?.message || 'unknown'}` };
    }
  },
});

// Internal query used by the action above (actions cannot access ctx.db directly)
const internalQueryAssignmentsByCourse = query({
  args: { courseId: v.id('courses'), limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('assignments')
      .filter((q) => q.eq(q.field('courseId'), args.courseId))
      .order('desc')
      .take(args.limit);
  },
});
