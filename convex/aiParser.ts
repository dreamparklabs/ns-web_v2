import { mutation, action } from "./_generated/server";
import { v } from "convex/values";

// AI-powered content parser for D2L announcements and modules
export const parseD2LContentForAssignments = mutation({
  args: {
    clerkUserId: v.string(),
    content: v.string(),
    contentType: v.string(), // 'announcement', 'module', 'content'
    courseId: v.id("courses"),
    d2lSourceId: v.optional(v.string()),
    extractRules: v.optional(v.boolean()), // Extract assignment rules from content
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    try {
      // Use AI to parse the content and extract assignment information
      const parsedAssignments = await parseContentWithAI(args.content, args.contentType);
      
      // If extractRules is true, also extract course assignment rules
      let extractedRules = null;
      if (args.extractRules) {
        extractedRules = await extractAssignmentRules(args.content, args.courseId, ctx);
      }
      
      const createdAssignments = [];

      for (const assignmentData of parsedAssignments) {
        // Check if this assignment already exists
        const existingAssignment = await ctx.db
          .query("assignments")
          .filter((q) => 
            q.and(
              q.eq(q.field("courseId"), args.courseId),
              q.eq(q.field("lc_title"), assignmentData.title.toLowerCase())
            )
          )
          .first();

        if (!existingAssignment) {
          // Create new assignment from AI-parsed data
          const assignmentId = await ctx.db.insert("assignments", {
            userId: user._id,
            courseId: args.courseId,
            title: assignmentData.title,
            notes: assignmentData.description || args.content.substring(0, 500) + "...",
            dueAt: assignmentData.dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000, // Default to 1 week
            status: "todo",
            type: assignmentData.type || "assignment",
            d2lSourceId: args.d2lSourceId,
            d2lSourceType: args.contentType,
            aiGenerated: true,
            lc_title: assignmentData.title.toLowerCase(),
          });

          createdAssignments.push({
            id: assignmentId,
            title: assignmentData.title,
            type: assignmentData.type,
            dueDate: assignmentData.dueDate,
          });
        }
      }

      return {
        success: true,
        createdAssignments,
        totalCreated: createdAssignments.length,
        extractedRules,
      };
    } catch (error) {
      console.error('AI content parsing failed:', error);
      throw new Error(`Content parsing failed: ${error.message}`);
    }
  },
});

// AI parsing function using Google Gemini API
async function parseContentWithAI(content: string, contentType: string): Promise<any[]> {
  // Try to use Gemini API first, fallback to pattern matching
  try {
    const geminiResult = await parseWithGemini(content, contentType);
    if (geminiResult && geminiResult.length > 0) {
      return geminiResult;
    }
  } catch (error) {
    console.warn('Gemini API failed, falling back to pattern matching:', error);
  }

  // Fallback to improved pattern matching
  
  const assignments: any[] = [];
  
  // Common assignment indicators
  const assignmentPatterns = [
    /assignment.*?due.*?(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|january|february|march|april|may|june|july|august|september|october|november|december)/gi,
    /homework.*?due.*?(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|january|february|march|april|may|june|july|august|september|october|november|december)/gi,
    /quiz.*?due.*?(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|january|february|march|april|may|june|july|august|september|october|november|december)/gi,
    /project.*?due.*?(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|january|february|march|april|may|june|july|august|september|october|november|december)/gi,
    /exam.*?(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|january|february|march|april|may|june|july|august|september|october|november|december)/gi,
    /discussion.*?post.*?due.*?(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|january|february|march|april|may|june|july|august|september|october|november|december)/gi,
  ];

  // In a real implementation, you would call OpenAI API like this:
  /*
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are an expert at parsing academic content to extract assignment information. 
        Analyze the following ${contentType} content and extract any assignments, quizzes, projects, 
        discussions, or other academic tasks mentioned. For each item found, provide:
        - title: The name/title of the assignment
        - description: Brief description if available
        - dueDate: Due date in ISO format if mentioned (or null)
        - type: assignment, quiz, discussion, project, exam, or other
        
        Return a JSON array of objects. If no assignments are found, return an empty array.`
      },
      {
        role: "user",
        content: content
      }
    ],
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(response.choices[0].message.content);
  return result.assignments || [];
  */

  // Mock implementation using pattern matching
  for (const pattern of assignmentPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Extract title and due date from the match
        const title = extractAssignmentTitle(match);
        const dueDate = extractDueDate(match);
        const type = determineAssignmentType(match);

        if (title) {
          assignments.push({
            title,
            description: `Extracted from ${contentType}: ${match}`,
            dueDate,
            type,
          });
        }
      }
    }
  }

  // Look for common assignment keywords
  const lines = content.split('\n');
  for (const line of lines) {
    if (containsAssignmentKeywords(line)) {
      const title = extractTitleFromLine(line);
      const dueDate = extractDueDate(line);
      const type = determineAssignmentType(line);

      if (title && !assignments.some(a => a.title.toLowerCase() === title.toLowerCase())) {
        assignments.push({
          title,
          description: `Extracted from ${contentType}: ${line.trim()}`,
          dueDate,
          type,
        });
      }
    }
  }

  return assignments;
}

// Helper functions for pattern matching
function extractAssignmentTitle(text: string): string | null {
  // Extract title from text patterns
  const titlePatterns = [
    /(?:assignment|homework|quiz|project|exam|discussion)\s*\d*:?\s*([^,\n.!?]+)/gi,
    /([^,\n.!?]+)\s*(?:assignment|homework|quiz|project|exam|discussion)/gi,
  ];

  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().replace(/^[:\-\s]+|[:\-\s]+$/g, '');
    }
  }

  return null;
}

function extractDueDate(text: string): number | null {
  // Extract due dates from various formats
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})/g,
    /(\d{4}-\d{2}-\d{2})/g,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/gi,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      const date = new Date(match[0]);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
    }
  }

  return null;
}

function determineAssignmentType(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('quiz')) return 'quiz';
  if (lowerText.includes('exam') || lowerText.includes('test')) return 'exam';
  if (lowerText.includes('discussion') || lowerText.includes('forum')) return 'discussion';
  if (lowerText.includes('project')) return 'project';
  if (lowerText.includes('homework') || lowerText.includes('assignment')) return 'assignment';
  
  return 'assignment';
}

function containsAssignmentKeywords(line: string): boolean {
  const keywords = [
    'assignment', 'homework', 'quiz', 'test', 'exam', 'project',
    'discussion', 'post', 'submit', 'due', 'deadline', 'turn in',
    'complete', 'finish', 'work on'
  ];

  const lowerLine = line.toLowerCase();
  return keywords.some(keyword => lowerLine.includes(keyword));
}

function extractTitleFromLine(line: string): string | null {
  // Clean up the line and extract a meaningful title
  const cleaned = line.trim()
    .replace(/^[•\-\*\d\.]+\s*/, '') // Remove bullet points and numbers
    .replace(/due.*$/gi, '') // Remove due date part
    .replace(/submit.*$/gi, '') // Remove submit instructions
    .trim();

  if (cleaned.length > 5 && cleaned.length < 100) {
    return cleaned;
  }

  return null;
}

// Sync announcements and parse for assignments
export const syncD2LAnnouncements = mutation({
  args: {
    clerkUserId: v.string(),
    courseId: v.optional(v.id("courses")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user with D2L credentials
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user || !user.d2lUserId || !user.d2lUserKey) {
      throw new Error("D2L credentials not found");
    }

    try {
      // Get courses to sync
      let coursesToSync;
      if (args.courseId) {
        coursesToSync = [await ctx.db.get(args.courseId)];
      } else {
        coursesToSync = await ctx.db
          .query("courses")
          .filter((q) => 
            q.and(
              q.eq(q.field("userId"), user._id),
              q.eq(q.field("d2lSyncEnabled"), true)
            )
          )
          .collect();
      }

      const parsedAssignments = [];

      for (const course of coursesToSync) {
        if (!course?.d2lOrgUnitId) continue;

        // This would call D2L API to get announcements
        // const announcements = await d2lClient.getCourseNews(course.d2lOrgUnitId);
        
        // Mock announcement data for demonstration
        const mockAnnouncements = [
          {
            Id: "123",
            Title: "Assignment 3 Due Next Week",
            Body: "Don't forget that Assignment 3: Data Analysis Project is due on March 15, 2024. Please submit your work through the dropbox.",
          },
          {
            Id: "124",
            Title: "Quiz 2 Reminder",
            Body: "Quiz 2 on chapters 5-7 will be available from March 10-12, 2024. Make sure to complete it by 11:59 PM on March 12.",
          }
        ];

        for (const announcement of mockAnnouncements) {
          // Parse content and create assignments directly
          const content = `${announcement.Title}\n\n${announcement.Body}`;
          const parsedAssignmentData = await parseContentWithAI(content, 'announcement');
          
          for (const assignmentData of parsedAssignmentData) {
            // Check if this assignment already exists
            const existingAssignment = await ctx.db
              .query("assignments")
              .filter((q) => 
                q.and(
                  q.eq(q.field("courseId"), course._id),
                  q.eq(q.field("lc_title"), assignmentData.title.toLowerCase())
                )
              )
              .first();

            if (!existingAssignment) {
              // Create new assignment from AI-parsed data
              const assignmentId = await ctx.db.insert("assignments", {
                userId: user._id,
                courseId: course._id,
                title: assignmentData.title,
                notes: assignmentData.description || content.substring(0, 500) + "...",
                dueAt: assignmentData.dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000,
                status: "todo",
                type: assignmentData.type || "assignment",
                d2lSourceId: announcement.Id,
                d2lSourceType: 'announcement',
                aiGenerated: true,
                lc_title: assignmentData.title.toLowerCase(),
              });

              parsedAssignments.push({
                id: assignmentId,
                title: assignmentData.title,
                type: assignmentData.type,
                dueDate: assignmentData.dueDate,
              });
            }
          }
        }
      }

      return {
        success: true,
        parsedAssignments,
        totalParsed: parsedAssignments.length,
      };
    } catch (error) {
      console.error('D2L announcement sync failed:', error);
      throw new Error(`Announcement sync failed: ${error.message}`);
    }
  },
});

// Extract assignment rules from announcement content
async function extractAssignmentRules(content: string, courseId: any, ctx: any) {
  const rules = [];
  
  // Common rule patterns to look for
  const rulePatterns = [
    {
      type: 'due_date',
      pattern: /(all\s+\w+\s+are\s+(?:due\s+)?(?:no\s+later\s+than\s+)?\(?nlt\)?\s*[\d:]+\s*[ap]m.*?(?:saturday|sunday|monday|tuesday|wednesday|thursday|friday))/gi,
      appliesTo: ['quiz', 'assignment', 'homework']
    },
    {
      type: 'submission_time',
      pattern: /(submit.*?before.*?due\s+date|can\s+submit.*?early|late\s+submissions?\s+(?:will\s+)?(?:not\s+)?(?:be\s+)?accepted)/gi,
      appliesTo: ['all']
    },
    {
      type: 'grading',
      pattern: /(grading\s+criteria|points?\s+will\s+be\s+deducted|rubric|grade\s+based\s+on)/gi,
      appliesTo: ['all']
    },
    {
      type: 'format',
      pattern: /(must\s+be\s+submitted\s+as|file\s+format|pdf\s+only|word\s+document)/gi,
      appliesTo: ['assignment', 'homework', 'project']
    }
  ];

  for (const rulePattern of rulePatterns) {
    const matches = content.match(rulePattern.pattern);
    if (matches) {
      for (const match of matches) {
        // Store the rule in the database
        const ruleId = await ctx.db.insert("courseRules", {
          courseId: courseId,
          userId: (await ctx.db.get(courseId)).userId,
          ruleType: rulePattern.type,
          ruleText: match,
          extractedRule: await processRuleWithAI(match, rulePattern.type),
          isActive: true,
          confidence: 0.8, // Mock confidence score
          appliesTo: rulePattern.appliesTo,
          createdAt: Date.now(),
          source: 'announcement',
          sourceId: null,
        });

        rules.push({
          id: ruleId,
          type: rulePattern.type,
          text: match,
          appliesTo: rulePattern.appliesTo
        });
      }
    }
  }

  return rules;
}

// Process rule with AI to make it more actionable
async function processRuleWithAI(ruleText: string, ruleType: string): Promise<string> {
  // In a real implementation, this would use OpenAI to process the rule
  // For now, we'll do some basic text processing
  
  let processedRule = ruleText.toLowerCase().trim();
  
  // Clean up common patterns
  processedRule = processedRule
    .replace(/\s+/g, ' ')
    .replace(/[()]/g, '')
    .replace(/nlt/gi, 'no later than');

  // Extract specific patterns based on rule type
  if (ruleType === 'due_date') {
    // Extract time and day patterns
    const timeMatch = processedRule.match(/(\d{1,2}:\d{2}\s*[ap]m)/);
    const dayMatch = processedRule.match(/(saturday|sunday|monday|tuesday|wednesday|thursday|friday)/);
    
    if (timeMatch && dayMatch) {
      return `All assignments of this type are due by ${timeMatch[1]} on ${dayMatch[1]} of the assigned week`;
    }
  }

  return processedRule;
}

// Smart course matching and merging
export const findAndMergeSimilarCourse = mutation({
  args: {
    clerkUserId: v.string(),
    d2lCourseData: v.object({
      name: v.string(),
      code: v.string(),
      instructor: v.optional(v.string()),
      orgUnitId: v.string(),
    }),
    termId: v.id("terms"),
  },
  handler: async (ctx, args) => {
    // Skip auth check for extension calls - validate clerkUserId instead
    console.log("Smart course matching for user:", args.clerkUserId);

    // Get user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get all courses in the current term
    const existingCourses = await ctx.db
      .query("courses")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("termId"), args.termId)
        )
      )
      .collect();

    // Smart matching logic
    const matchedCourse = await findBestCourseMatch(args.d2lCourseData, existingCourses);

    if (matchedCourse) {
      // Merge the courses
      await ctx.db.patch(matchedCourse._id, {
        d2lOrgUnitId: args.d2lCourseData.orgUnitId,
        d2lSyncEnabled: true,
        d2lWebScrapingEnabled: true,
        // Update instructor if it was empty
        instructor: matchedCourse.instructor || args.d2lCourseData.instructor || 'Unknown',
      });

      return {
        success: true,
        action: 'merged',
        courseId: matchedCourse._id,
        matchedWith: matchedCourse.title,
        confidence: 0.9, // Mock confidence
      };
    }

    // No match found, create new course in the CURRENT ACTIVE TERM
    console.log(`Creating new course in term: ${args.termId}`);
    const newCourseId = await ctx.db.insert("courses", {
      userId: user._id,
      termId: args.termId, // This should be the current active term
      title: args.d2lCourseData.name,
      code: extractCourseCode(args.d2lCourseData.code) || args.d2lCourseData.code,
      lc_title: args.d2lCourseData.name.toLowerCase(),
      lc_code: (extractCourseCode(args.d2lCourseData.code) || args.d2lCourseData.code).toLowerCase(),
      instructor: args.d2lCourseData.instructor || 'Unknown',
      creditHours: 3, // Default
      d2lOrgUnitId: args.d2lCourseData.orgUnitId,
      d2lSyncEnabled: true,
      d2lWebScrapingEnabled: true,
    });

    return {
      success: true,
      action: 'created',
      courseId: newCourseId,
      matchedWith: null,
      confidence: 1.0,
    };
  },
});

// Find the best matching course using multiple criteria
async function findBestCourseMatch(d2lCourse: any, existingCourses: any[]): Promise<any> {
  let bestMatch = null;
  let bestScore = 0;

  for (const course of existingCourses) {
    let score = 0;

    // Title matching (most important)
    const d2lTitle = cleanCourseTitle(d2lCourse.name);
    const existingTitle = cleanCourseTitle(course.title);
    const titleSimilarity = calculateStringSimilarity(d2lTitle, existingTitle);
    score += titleSimilarity * 0.4;

    // Code matching (very important)
    const d2lCode = extractCourseCode(d2lCourse.code);
    const existingCode = extractCourseCode(course.code);
    if (d2lCode && existingCode) {
      const codeSimilarity = calculateStringSimilarity(d2lCode, existingCode);
      score += codeSimilarity * 0.4;
      
      // Exact code match is very strong
      if (d2lCode === existingCode) {
        score += 0.3; // Bonus for exact match
      }
    }

    // Instructor matching
    if (d2lCourse.instructor && course.instructor) {
      const instructorSimilarity = calculateStringSimilarity(
        d2lCourse.instructor.toLowerCase(),
        course.instructor.toLowerCase()
      );
      score += instructorSimilarity * 0.2;
    }

    // Special matching for "Career Development" courses
    if (d2lTitle.includes('career development') && existingTitle.includes('career development')) {
      score += 0.3; // Strong bonus for career development courses
    }

    // Threshold for considering a match (lowered for better matching)
    if (score > 0.5 && score > bestScore) {
      bestScore = score;
      bestMatch = course;
    }
    
    // Special case: if course codes match exactly, it's almost certainly a match
    if (d2lCode && existingCode && d2lCode === existingCode && score > 0.2) {
      bestScore = Math.max(score, 0.95);
      bestMatch = course;
    }

    console.log(`Course matching: "${d2lCourse.name}" vs "${course.title}" - Score: ${score.toFixed(2)} (code: ${d2lCode} vs ${existingCode})`);
  }

  if (bestMatch) {
    console.log(`✅ Best match found: "${bestMatch.title}" with score ${bestScore.toFixed(2)}`);
  } else {
    console.log(`❌ No match found for "${d2lCourse.name}"`);
  }

  return bestMatch;
}

// Clean course title for better matching
function cleanCourseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/^(fall|spring|summer)\s+\d{4}\s+/i, '') // Remove semester/year
    .replace(/\([^)]*\)$/, '') // Remove course code in parentheses at end
    .replace(/\s+for\s+it\s+professionals$/i, '') // Remove "for IT Professionals"
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract course code (e.g., "ITEC-216" from "ITEC-216-940", "ITEC390" from "ITEC390")
function extractCourseCode(code: string): string | null {
  // Handle both "ITEC-390" and "ITEC390" formats
  const dashMatch = code.match(/([A-Z]+-\d+)/);
  if (dashMatch) return dashMatch[1];
  
  const noDashMatch = code.match(/([A-Z]+\d+)/);
  if (noDashMatch) {
    // Convert "ITEC390" to "ITEC-390" format
    const letters = noDashMatch[1].match(/([A-Z]+)(\d+)/);
    if (letters) {
      return `${letters[1]}-${letters[2]}`;
    }
  }
  
  return null;
}

// Calculate string similarity (simple implementation)
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
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

// Apply course rules to assignments
export const applyRulesToAssignments = mutation({
  args: {
    clerkUserId: v.string(),
    courseId: v.id("courses"),
    assignmentIds: v.array(v.id("assignments")),
  },
  handler: async (ctx, args) => {
    // Skip auth check for extension calls - validate clerkUserId instead
    console.log("Applying rules for user:", args.clerkUserId);

    // Get course rules
    const courseRules = await ctx.db
      .query("courseRules")
      .filter((q) => 
        q.and(
          q.eq(q.field("courseId"), args.courseId),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();

    const updatedAssignments = [];

    for (const assignmentId of args.assignmentIds) {
      const assignment = await ctx.db.get(assignmentId);
      if (!assignment) continue;

      let updates: any = {};
      let rulesApplied = [];

      for (const rule of courseRules) {
        // Check if rule applies to this assignment type
        if (rule.appliesTo && !rule.appliesTo.includes('all') && 
            !rule.appliesTo.includes(assignment.type || 'assignment')) {
          continue;
        }

        // Apply due date rules
        if (rule.ruleType === 'due_date' && assignment.type === 'quiz') {
          const adjustedDueDate = applyDueDateRule(assignment.dueAt, rule.extractedRule);
          if (adjustedDueDate && adjustedDueDate !== assignment.dueAt) {
            updates.dueAt = adjustedDueDate;
            rulesApplied.push(`Applied due date rule: ${rule.extractedRule}`);
          }
        }

        // Apply other rule types as needed
        // ...
      }

      // Update assignment if we have changes
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(assignmentId, updates);
        updatedAssignments.push({
          id: assignmentId,
          title: assignment.title,
          rulesApplied,
          updates
        });
      }
    }

    return {
      success: true,
      updatedAssignments,
      totalUpdated: updatedAssignments.length,
    };
  },
});

// Apply due date rule logic
function applyDueDateRule(originalDueDate: number, ruleText: string): number | null {
  // Parse rule to extract timing information
  // For example: "All assignments of this type are due by 11:59 pm on saturday of the assigned week"
  
  const timeMatch = ruleText.match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
  const dayMatch = ruleText.match(/(saturday|sunday|monday|tuesday|wednesday|thursday|friday)/i);
  
  if (timeMatch && dayMatch) {
    const hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]);
    const isPM = timeMatch[3].toLowerCase() === 'pm';
    const targetDay = dayMatch[1].toLowerCase();
    
    // Convert to 24-hour format
    const hour24 = isPM && hour !== 12 ? hour + 12 : (isPM ? hour : hour === 12 ? 0 : hour);
    
    // Get the original due date
    const originalDate = new Date(originalDueDate);
    
    // Find the target day of the week (0 = Sunday, 6 = Saturday)
    const dayMap: { [key: string]: number } = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };
    
    const targetDayNum = dayMap[targetDay];
    if (targetDayNum === undefined) return null;
    
    // Find the Saturday of the same week as the original due date
    const currentDay = originalDate.getDay();
    const daysUntilTarget = (targetDayNum - currentDay + 7) % 7;
    
    const newDate = new Date(originalDate);
    newDate.setDate(originalDate.getDate() + daysUntilTarget);
    newDate.setHours(hour24, minute, 59, 999); // Set to 11:59:59.999
    
    return newDate.getTime();
  }
  
  return null;
}

// Google Gemini API integration
// Parse content using Google Gemini API (Action)
export const parseWithGeminiAction = action({
  args: {
    content: v.string(),
    contentType: v.string(),
  },
  handler: async (ctx, args): Promise<any[]> => {
    return await parseWithGemini(args.content, args.contentType);
  },
});

async function parseWithGemini(content: string, contentType: string): Promise<any[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = `You are an expert at parsing D2L (Desire2Learn) academic content. Analyze this ${contentType} and extract ALL academic items comprehensively.

EXTRACT FROM ALL PAGE TYPES:
- Assignments Page: "Homework 0", "Homework 1A", "Cisco IoT Course"  
- Grades Page: All grade items with scores like "25/25", "- /50"
- Discussions Page: "Student Introductions", "Discussion 0", "Homework 2"
- Quizzes Page: Any quiz or test items

ASSIGNMENT NAMES (Clean these patterns):
✅ GOOD: "Homework 0", "Homework 1A", "Cisco IoT Course", "Discussion 1A", "Student Introductions"
❌ REMOVE: "Attachments", "Due on", "View History", "Not Submitted", "Unread", "1 Submission, 2 Files", "Feedback: Unread"

COMPREHENSIVE EXTRACTION RULES:
1. **Assignments**: Any homework, project, or coursework with due dates
2. **Discussions**: Forum topics, discussion posts, conversation threads  
3. **Quizzes**: Tests, exams, quizzes, assessments
4. **Grades**: Any item with points (earned/possible) like "25/25", "0/5", "- /50"

DUE DATES:
- Convert to ISO: "Sep 30, 2025 11:59 PM" → "2025-09-30T23:59:00.000Z"
- Default to 11:59 PM if time missing
- Use 2025 if year missing

POINTS AND STATUS:
- Extract from patterns: "25/25", "20/20", "- /50", "0/5"
- maxPoints: total possible (25, 50, etc.)
- pointsEarned: earned points (25, 0, null if not submitted)
- submissionStatus: "completed" if earned > 0, "not_submitted" if 0 or null

CONTENT TO ANALYZE:
${content}

Return comprehensive JSON array:
[
  {
    "title": "Clean name (e.g., 'Homework 0', 'Student Introductions')",
    "description": "Brief description if available or null",
    "dueDate": "ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ) or null",
    "type": "assignment|quiz|discussion|project|exam",
    "maxPoints": number or null,
    "pointsEarned": number or null,
    "submissionStatus": "completed|not_submitted"
  }
]

Extract EVERYTHING - assignments, discussions, grades, quizzes. Return empty array [] only if truly nothing found.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('No content generated by Gemini');
    }

    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = generatedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, generatedText];
    const jsonText = jsonMatch[1].trim();
    
    try {
      const assignments = JSON.parse(jsonText);
      return Array.isArray(assignments) ? assignments : [];
    } catch (parseError) {
      console.error('Failed to parse Gemini JSON response:', jsonText);
      throw new Error('Invalid JSON response from Gemini');
    }
    
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}

// Enhanced assignment name cleaning for D2L content
export const cleanAssignmentDataWithAI = mutation({
  args: {
    clerkUserId: v.string(),
    rawAssignmentData: v.array(v.object({
      id: v.string(),
      name: v.string(),
      dueDate: v.optional(v.union(v.string(), v.null())),
      type: v.optional(v.string()),
      courseOrgUnitId: v.optional(v.string()),
      maxPoints: v.optional(v.float64()),
      pointsEarned: v.optional(v.float64()),
    })),
  },
  handler: async (ctx, args) => {
    // Skip auth check for extension calls - validate clerkUserId instead
    console.log("Cleaning assignment data for user:", args.clerkUserId);

    const cleanedAssignments = [];

    for (const assignment of args.rawAssignmentData) {
      try {
        // Use Gemini to clean up the assignment data
        const content = `Assignment: ${assignment.name}
Due Date: ${assignment.dueDate || 'Not specified'}
Type: ${assignment.type || 'assignment'}
Max Points: ${assignment.maxPoints || 'Not specified'}
Points Earned: ${assignment.pointsEarned || 'Not specified'}`;

        const aiResult = await ctx.runAction(parseWithGeminiAction, {
          content: content,
          contentType: 'assignment_data'
        });
        
        if (aiResult && aiResult.length > 0) {
          const cleaned = aiResult[0];
          cleanedAssignments.push({
            id: assignment.id,
            name: cleaned.title || assignment.name,
            dueDate: cleaned.dueDate,
            type: cleaned.type || assignment.type || 'assignment',
            courseOrgUnitId: assignment.courseOrgUnitId,
            maxPoints: cleaned.maxPoints || assignment.maxPoints,
            pointsEarned: cleaned.pointsEarned || assignment.pointsEarned,
            submissionStatus: cleaned.submissionStatus || 'not_submitted',
          });
        } else {
          // Fallback to manual cleaning
          cleanedAssignments.push({
            ...assignment,
            name: cleanAssignmentName(assignment.name),
            dueDate: fixDueDate(assignment.dueDate),
          });
        }
      } catch (error) {
        console.error(`Failed to clean assignment ${assignment.name}:`, error);
        // Fallback to manual cleaning
        cleanedAssignments.push({
          ...assignment,
          name: cleanAssignmentName(assignment.name),
          dueDate: fixDueDate(assignment.dueDate),
        });
      }
    }

    return {
      success: true,
      cleanedAssignments,
      totalCleaned: cleanedAssignments.length,
    };
  },
});

// Manual assignment name cleaning fallback
function cleanAssignmentName(name: string): string {
  if (!name) return 'Untitled Assignment';
  
  let cleaned = name;
  
  // First, try to extract "Mod X Asg Y" pattern if it exists
  const modPattern = /(Mod\s+\d+\s+Asg\s+\d+:\s*[^,\n\r]+)/i;
  const modMatch = name.match(modPattern); // Search in original name first
  if (modMatch) {
    cleaned = modMatch[1].trim();
    console.log(`Found Mod pattern in original name: "${cleaned}"`);
  }
  
  // Remove common D2L artifacts
  cleaned = cleaned
    .replace(/Due on [^,\n]*/gi, '') // Remove "Due on ..." text
    .replace(/\bdue\b.*$/gi, '') // Remove everything after "due"
    .replace(/Attachments$/gi, '') // Remove "Attachments" at end
    .replace(/\bAttachments\b/gi, '') // Remove "Attachments" anywhere
    .replace(/View History$/gi, '') // Remove "View History" at end
    .replace(/\bView History\b/gi, '') // Remove "View History" anywhere
    .replace(/\bHelp\b/gi, '') // Remove "Help"
    .replace(/\bSubmission\b/gi, '') // Remove "Submission"
    .replace(/\bFile\b$/gi, '') // Remove "File" at end
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[:\-\s]+$/, '') // Remove trailing colons, dashes, spaces
    .trim();
  
  // Handle edge cases where cleaning went too far
  if (cleaned.length < 3 || cleaned.match(/^[\d\s,]+$/)) {
    // If we got something like "1, 1" or just numbers, try to find better text
    const betterMatch = name.match(/([A-Za-z][A-Za-z\s&-]+[A-Za-z])/);
    if (betterMatch && betterMatch[1].length > 3) {
      cleaned = betterMatch[1].trim();
    } else {
      cleaned = name; // Use original if nothing better found
    }
  }
  
  return cleaned;
}

// Fix due date parsing
function fixDueDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  
  try {
    // Handle various date formats
    let date = new Date(dateStr);
    
    // If year is too old, assume current year
    if (date.getFullYear() < 2020) {
      date.setFullYear(2025);
    }
    
    // If date is invalid, try parsing with current year
    if (isNaN(date.getTime())) {
      const currentYear = new Date().getFullYear();
      const withYear = dateStr.replace(/\b\d{4}\b/, currentYear.toString());
      date = new Date(withYear);
    }
    
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch (error) {
    return null;
  }
}
