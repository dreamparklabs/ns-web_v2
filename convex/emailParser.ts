import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Email Parser for D2L Notification Extraction
// This module parses email notifications from D2L to extract assignment and grade data

interface EmailData {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  date: string;
  headers: Record<string, string>;
  attachments?: EmailAttachment[];
}

interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content?: string; // Base64 encoded
}

interface ParsedAssignmentData {
  title: string;
  description?: string;
  dueDate?: number;
  courseName?: string;
  courseCode?: string;
  assignmentType?: string;
  location?: string;
  instructor?: string;
  maxPoints?: number;
  pointsEarned?: number;
  status?: string;
}

// Enhanced D2L email patterns based on real SIU email examples
const D2L_EMAIL_PATTERNS = {
  // Assignment notifications
  ASSIGNMENT_DUE: [
    /assignment\s+(?:is\s+)?due/i,
    /submission\s+(?:is\s+)?due/i,
    /deadline\s+(?:is\s+)?approaching/i,
    /due\s+(?:date\s+)?(?:reminder|notification)/i,
    /due\s+date\s+is\s+in\s+\d+\s+days?/i,
  ],
  
  // Grade notifications (enhanced for SIU patterns)
  GRADE_POSTED: [
    /grade\s+(?:has\s+been\s+)?(?:posted|updated)/i,
    /updated\s+grade/i,
    /your\s+grade\s+for\s+.+\s+has\s+been\s+updated/i,
    /feedback\s+(?:has\s+been\s+)?provided/i,
    /graded\s+submission/i,
    /assessment\s+results/i,
    /your\s+grade\s+is:/i,
    /following\s+grades\s+were\s+also\s+automatically\s+updated/i,
  ],
  
  // New assignment/content notifications
  NEW_ASSIGNMENT: [
    /new\s+assignment/i,
    /assignment\s+(?:has\s+been\s+)?created/i,
    /assignment\s+(?:has\s+been\s+)?published/i,
    /new\s+activity\s+available/i,
    /has\s+been\s+created/i,
    /page\s+.+\s+has\s+been\s+created/i,
  ],
  
  // Activity summary emails (SIU specific)
  ACTIVITY_SUMMARY: [
    /activity\s+summary\s+for/i,
    /course\s+updates/i,
    /assignments\s+with\s+unread\s+feedback/i,
    /unread\s+discussion\s+posts/i,
    /quizzes\s+not\s+attempted/i,
  ],
  
  // Course announcements
  ANNOUNCEMENT: [
    /course\s+announcement/i,
    /important\s+(?:update|notice)/i,
    /class\s+(?:update|notice)/i,
  ],
  
  // Discussion forums
  DISCUSSION: [
    /discussion\s+(?:topic|forum)/i,
    /new\s+post\s+in/i,
    /forum\s+notification/i,
    /unread\s+discussion\s+posts/i,
  ],
};

// Extract course information from email (enhanced for SIU patterns)
function extractCourseInfo(subject: string, body: string, from: string): { courseName?: string; courseCode?: string; instructor?: string } {
  const result: { courseName?: string; courseCode?: string; instructor?: string } = {};
  
  // Enhanced course code extraction for SIU patterns
  const courseCodePatterns = [
    // SIU format: "Fall 2025 System Administration (ITEC-235-001)"
    /\(([A-Z]{2,4}-\d{3}-\d{3})\)/i,
    // Standard format: "[ITEC-235]" or "ITEC-235:"
    /\[([A-Z]{2,4}-\d{3}(?:-\d{3})?)\]/i,
    /^([A-Z]{2,4}-\d{3}(?:-\d{3})?)[:\s]/i,
    // Generic patterns
    /\[([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\]/i,
    /^([A-Z]{2,4}\s*\d{3,4}[A-Z]?)[:|\s]/i,
    /([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\s*[-–—]/i,
  ];
  
  for (const pattern of courseCodePatterns) {
    const match = subject.match(pattern) || body.match(pattern);
    if (match) {
      result.courseCode = match[1].replace(/\s+/g, ' ').trim();
      break;
    }
  }
  
  // Enhanced course name extraction for SIU patterns
  const courseNamePatterns = [
    // SIU format: "Fall 2025 System Administration (ITEC-235-001)"
    /(Fall|Spring|Summer)\s+\d{4}\s+([^(]+)\s+\([A-Z]{2,4}-\d{3}-\d{3}\)/i,
    // Activity summary format: "Activity summary for Fall 2025 System Administration"
    /activity\s+summary\s+for\s+(Fall|Spring|Summer)\s+\d{4}\s+([^(]+?)(?:\s+\(|$)/i,
    // Generic patterns
    /course:\s*([^,\n]+)/i,
    /class:\s*([^,\n]+)/i,
    /subject:\s*([^,\n]+)/i,
    // Subject line course extraction
    /(Fall|Spring|Summer)\s+\d{4}\s+([^-\n]+?)(?:\s+-|$)/i,
  ];
  
  for (const pattern of courseNamePatterns) {
    const match = subject.match(pattern) || body.match(pattern);
    if (match) {
      // For SIU patterns, use the course name part (index 2)
      const courseName = match[2] || match[1];
      result.courseName = courseName.trim();
      break;
    }
  }
  
  // Extract instructor from email address or body
  if (from.includes('@')) {
    const emailMatch = from.match(/([^<]+)<([^>]+)>/);
    if (emailMatch) {
      result.instructor = emailMatch[2]; // Email address
    } else {
      result.instructor = from;
    }
  }
  
  return result;
}

// Extract assignment details from email content (enhanced for SIU patterns)
function extractAssignmentDetails(subject: string, body: string): Partial<ParsedAssignmentData> {
  const details: Partial<ParsedAssignmentData> = {};
  
  // Enhanced assignment title extraction for SIU patterns
  const titlePatterns = [
    // Grade notification patterns: "Your grade for "Quiz 5" has been updated"
    /your\s+grade\s+for\s+"([^"]+)"/i,
    /your\s+grade\s+for\s+([^\s]+(?:\s+\d+)?)\s+has\s+been/i,
    // Activity summary patterns: "Lab 7 - Due date is in 6 days"
    /^([A-Z][^-\n]+?)\s+-\s+Due\s+date/im,
    // Updated grade patterns: "Updated - Quiz 6"
    /Updated\s+-\s+([^:\n]+)/i,
    // Access patterns: "Access "Quiz 5""
    /Access\s+"([^"]+)"/i,
    // Standard patterns
    /assignment:\s*([^\n,]+)/i,
    /activity:\s*([^\n,]+)/i,
    /task:\s*([^\n,]+)/i,
    /quiz:\s*([^\n,]+)/i,
    /exam:\s*([^\n,]+)/i,
    /project:\s*([^\n,]+)/i,
    /lab:\s*([^\n,]+)/i,
  ];
  
  for (const pattern of titlePatterns) {
    const match = body.match(pattern) || subject.match(pattern);
    if (match) {
      details.title = match[1].trim().replace(/^["']|["']$/g, ''); // Remove quotes
      break;
    }
  }
  
  // If no title found, extract from subject with SIU-specific cleaning
  if (!details.title) {
    let cleanSubject = subject;
    
    // Remove SIU course format: "Fall 2025 System Administration (ITEC-235-001) - "
    cleanSubject = cleanSubject.replace(/(Fall|Spring|Summer)\s+\d{4}\s+[^(]+\s+\([A-Z]{2,4}-\d{3}-\d{3}\)\s*-\s*/i, '');
    
    // Remove other course prefixes
    cleanSubject = cleanSubject.replace(/^\[[^\]]+\]\s*/, ''); // Remove [COURSE] prefix
    cleanSubject = cleanSubject.replace(/^[A-Z]{2,4}[-\s]*\d{3,4}[A-Z]?\s*[:|\s-]/, ''); // Remove course code
    cleanSubject = cleanSubject.replace(/^(assignment|quiz|exam|project|homework|hw)\s*[:|\s]*/i, '');
    cleanSubject = cleanSubject.replace(/\s*(due|reminder|notification|posted|available|has\s+been\s+updated).*$/i, '');
    cleanSubject = cleanSubject.replace(/^Updated\s+Grade:\s*/i, ''); // Remove "Updated Grade:" prefix
    
    details.title = cleanSubject.trim() || subject;
  }
  
  // Enhanced due date extraction for SIU patterns
  const dueDatePatterns = [
    // SIU format: "Lab 7 - Due date is in 6 days, 16 hours"
    /due\s+date\s+is\s+in\s+(\d+)\s+days?,?\s*(\d+)?\s*hours?/i,
    // SIU format: "Due date: Sunday, October 5, 2025 11:59 PM CDT"
    /due\s+date:\s*([^\n]+)/i,
    // Standard patterns
    /due\s+(?:date\s*)?:?\s*([^\n,]+)/i,
    /deadline\s*:?\s*([^\n,]+)/i,
    /submit\s+by\s*:?\s*([^\n,]+)/i,
    /available\s+until\s*:?\s*([^\n,]+)/i,
  ];
  
  for (const pattern of dueDatePatterns) {
    const match = body.match(pattern);
    if (match) {
      // Handle relative date format: "due date is in 6 days, 16 hours"
      if (pattern === dueDatePatterns[0]) { // Relative format pattern
        const days = parseInt(match[1]);
        const hours = match[2] ? parseInt(match[2]) : 0;
        const now = Date.now();
        const dueDate = now + (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000);
        details.dueDate = dueDate;
        break;
      } else {
        const dateStr = match[1].trim();
        const parsedDate = parseEmailDate(dateStr);
        if (parsedDate) {
          details.dueDate = parsedDate;
          break;
        }
      }
    }
  }
  
  // Enhanced grade extraction for SIU patterns
  const pointsPatterns = [
    // SIU grade format: "Your grade is: 0 / 100, F, 0 / 7% of final grade"
    /your\s+grade\s+is:\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/i,
    // SIU updated grade format: "Your grade: 9.5 / 10, A"
    /your\s+grade:\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/i,
    // SIU current grade format: "Current Grade: 198.87 / 230, B"
    /current\s+grade:\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/i,
    // Standard patterns
    /(?:worth|total|max)\s*:?\s*(\d+)\s*points?/i,
    /points?\s*:?\s*(\d+)/i,
    /grade\s*:?\s*(\d+(?:\.\d+)?)\s*[\/out\s]*\s*(\d+(?:\.\d+)?)/i,
    /score\s*:?\s*(\d+(?:\.\d+)?)\s*[\/out\s]*\s*(\d+(?:\.\d+)?)/i,
  ];
  
  for (const pattern of pointsPatterns) {
    const match = body.match(pattern);
    if (match) {
      if (match[2]) {
        // Format: "Grade: 85/100" or "Score: 42.5 out of 50"
        details.pointsEarned = parseFloat(match[1]);
        details.maxPoints = parseFloat(match[2]);
      } else {
        // Format: "Worth 100 points" or "Points: 50"
        details.maxPoints = parseInt(match[1]);
      }
      break;
    }
  }
  
  // Determine assignment type
  const typeKeywords = {
    quiz: /quiz|test/i,
    exam: /exam|midterm|final/i,
    project: /project|portfolio/i,
    homework: /homework|hw/i,
    lab: /lab|laboratory/i,
    discussion: /discussion|forum|post/i,
    assignment: /assignment/i,
  };
  
  const combinedText = `${subject} ${body}`.toLowerCase();
  for (const [type, pattern] of Object.entries(typeKeywords)) {
    if (pattern.test(combinedText)) {
      details.assignmentType = type;
      break;
    }
  }
  
  details.assignmentType = details.assignmentType || 'assignment';
  
  // Extract description from email body
  const descriptionPatterns = [
    /description\s*:?\s*([^\n]+(?:\n(?!\s*\w+\s*:)[^\n]*)*)/i,
    /details\s*:?\s*([^\n]+(?:\n(?!\s*\w+\s*:)[^\n]*)*)/i,
    /instructions\s*:?\s*([^\n]+(?:\n(?!\s*\w+\s*:)[^\n]*)*)/i,
  ];
  
  for (const pattern of descriptionPatterns) {
    const match = body.match(pattern);
    if (match) {
      details.description = match[1].trim().replace(/\n\s+/g, ' ');
      break;
    }
  }
  
  return details;
}

// Parse various date formats found in D2L emails
function parseEmailDate(dateStr: string): number | null {
  // Clean up the date string
  const cleanDate = dateStr.replace(/\s+/g, ' ').trim();
  
  // Common D2L date formats
  const dateFormats = [
    // "December 1, 2023 at 11:59 PM"
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})\s+(?:at\s+)?(\d{1,2}):(\d{2})\s*(AM|PM)/i,
    // "Dec 1, 2023 11:59 PM"
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i,
    // "2023-12-01 23:59"
    /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/,
    // "12/1/2023 11:59 PM"
    /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i,
  ];
  
  for (const format of dateFormats) {
    const match = cleanDate.match(format);
    if (match) {
      try {
        let year: number, month: number, day: number, hour: number, minute: number;
        
        if (format === dateFormats[0] || format === dateFormats[1]) {
          // Month name format
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                             'july', 'august', 'september', 'october', 'november', 'december'];
          const monthAbbr = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                            'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          
          const monthStr = match[1].toLowerCase();
          month = monthNames.indexOf(monthStr);
          if (month === -1) {
            month = monthAbbr.indexOf(monthStr);
          }
          
          day = parseInt(match[2]);
          year = parseInt(match[3]);
          hour = parseInt(match[4]);
          minute = parseInt(match[5]);
          
          if (match[6] && match[6].toUpperCase() === 'PM' && hour !== 12) {
            hour += 12;
          } else if (match[6] && match[6].toUpperCase() === 'AM' && hour === 12) {
            hour = 0;
          }
        } else if (format === dateFormats[2]) {
          // ISO format
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1; // JavaScript months are 0-based
          day = parseInt(match[3]);
          hour = parseInt(match[4]);
          minute = parseInt(match[5]);
        } else if (format === dateFormats[3]) {
          // MM/DD/YYYY format
          month = parseInt(match[1]) - 1;
          day = parseInt(match[2]);
          year = parseInt(match[3]);
          hour = parseInt(match[4]);
          minute = parseInt(match[5]);
          
          if (match[6] && match[6].toUpperCase() === 'PM' && hour !== 12) {
            hour += 12;
          } else if (match[6] && match[6].toUpperCase() === 'AM' && hour === 12) {
            hour = 0;
          }
        }
        
        const date = new Date(year, month, day, hour, minute);
        if (!isNaN(date.getTime())) {
          return date.getTime();
        }
      } catch (error) {
        console.warn(`Failed to parse date: ${dateStr}`, error);
      }
    }
  }
  
  // Fallback to JavaScript's Date parser
  try {
    const date = new Date(cleanDate);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  } catch (error) {
    console.warn(`Fallback date parsing failed: ${dateStr}`, error);
  }
  
  return null;
}

// Analyze email for assignment-related content
function analyzeEmailForAssignment(email: EmailData): { isAssignment: boolean; confidence: number; data: ParsedAssignmentData } {
  const subject = email.subject.toLowerCase();
  const body = (email.body || '').toLowerCase();
  const combined = `${subject} ${body}`;
  
  let assignmentScore = 0;
  let excludeScore = 0;
  
  // Check for D2L assignment patterns
  for (const patterns of Object.values(D2L_EMAIL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(combined)) {
        assignmentScore += 3;
        break; // Only count each pattern type once
      }
    }
  }
  
  // Additional assignment indicators
  const assignmentKeywords = [
    'assignment', 'homework', 'hw', 'essay', 'paper', 'project', 'lab', 'quiz', 'test', 'exam',
    'due', 'submit', 'submission', 'turn in', 'upload', 'dropbox', 'discussion', 'forum',
    'midterm', 'final', 'presentation', 'report', 'case study', 'analysis', 'review',
    'grade', 'graded', 'feedback', 'score', 'points', 'assessment'
  ];
  
  assignmentKeywords.forEach(keyword => {
    if (combined.includes(keyword)) {
      assignmentScore += keyword === 'assignment' ? 2 : keyword === 'due' ? 2 : keyword === 'grade' ? 2 : 1;
    }
  });
  
  // Check for D2L-specific indicators
  if (email.from.includes('brightspace') || email.from.includes('d2l') || email.from.includes('desire2learn')) {
    assignmentScore += 3;
  }
  
  // Check for exclude patterns (non-assignment emails)
  const excludeKeywords = [
    'welcome', 'enrolled', 'registration', 'schedule', 'calendar sync', 'system maintenance',
    'password', 'login', 'account', 'profile', 'settings', 'newsletter', 'survey'
  ];
  
  excludeKeywords.forEach(keyword => {
    if (combined.includes(keyword)) {
      excludeScore += 2;
    }
  });
  
  // Calculate confidence (0-100)
  const confidence = Math.min(100, Math.max(0, (assignmentScore - excludeScore) * 10));
  const isAssignment = confidence >= 40; // Higher threshold for email than ICS
  
  // Extract assignment data
  const courseInfo = extractCourseInfo(email.subject, email.body, email.from);
  const assignmentDetails = extractAssignmentDetails(email.subject, email.body);
  
  const data: ParsedAssignmentData = {
    title: assignmentDetails.title || email.subject,
    description: assignmentDetails.description,
    dueDate: assignmentDetails.dueDate,
    courseName: courseInfo.courseName,
    courseCode: courseInfo.courseCode,
    assignmentType: assignmentDetails.assignmentType,
    instructor: courseInfo.instructor,
    maxPoints: assignmentDetails.maxPoints,
    pointsEarned: assignmentDetails.pointsEarned,
    status: assignmentDetails.pointsEarned !== undefined ? 'completed' : 'todo',
  };
  
  return { isAssignment, confidence, data };
}

// Add email integration for a user
export const addEmailIntegration = mutation({
  args: {
    clerkUserId: v.string(),
    emailProvider: v.string(),
    fromFilters: v.optional(v.array(v.string())),
    subjectFilters: v.optional(v.array(v.string())),
    bodyKeywords: v.optional(v.array(v.string())),
    folderName: v.optional(v.string()),
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

    // Enhanced D2L email filters (including SIU patterns)
    const defaultFromFilters = [
      'mycourses@siu.edu', // SIU specific
      'brightspace',
      'd2l',
      'desire2learn',
      'noreply',
      'donotreply',
      'mycourses',
      ...args.fromFilters || []
    ];

    const defaultSubjectFilters = [
      'assignment',
      'due',
      'grade',
      'updated grade', // SIU specific
      'activity summary', // SIU specific
      'quiz',
      'exam',
      'discussion',
      'announcement',
      'has been created', // SIU specific
      'has been updated', // SIU specific
      ...args.subjectFilters || []
    ];

    const integrationId = await ctx.db.insert("emailIntegrations", {
      userId: user._id,
      emailProvider: args.emailProvider,
      isActive: false, // Requires OAuth setup first
      syncFrequency: 'hourly',
      fromFilters: defaultFromFilters,
      subjectFilters: defaultSubjectFilters,
      bodyKeywords: args.bodyKeywords || [],
      folderName: args.folderName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return integrationId;
  },
});

// Special handler for SIU activity summary emails with multiple assignments
function parseActivitySummaryEmail(subject: string, body: string): ParsedAssignmentData[] {
  const assignments: ParsedAssignmentData[] = [];
  
  // Extract course info from subject
  const courseInfo = extractCourseInfo(subject, body, '');
  
  // Patterns for different assignment types in activity summaries
  const assignmentPatterns = [
    // Individual assignments: "Lab 7 - Due date is in 6 days, 16 hours"
    /^([A-Z][^-\n]+?)\s+-\s+Due\s+date\s+is\s+in\s+(\d+)\s+days?,?\s*(\d+)?\s*hours?/gim,
    // Updated grades: "Updated - Quiz 6: Your grade: 9.5 / 10, A"
    /Updated\s+-\s+([^:\n]+):\s*Your\s+grade:\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/gim,
    // OS assignments: "OS-DoTWeek #02 - Ubuntu ? LTS - Linux - Due date is in 5 days, 15 hours"
    /^([A-Z][^-\n]+?(?:#\d+)?[^-\n]*?)\s+-\s+Due\s+date\s+is\s+in\s+(\d+)\s+days?,?\s*(\d+)?\s*hours?/gim,
  ];
  
  for (const pattern of assignmentPatterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      const assignment: ParsedAssignmentData = {
        title: match[1].trim(),
        courseName: courseInfo.courseName,
        courseCode: courseInfo.courseCode,
        instructor: courseInfo.instructor,
      };
      
      // Handle due date for patterns with relative dates
      if (match[2]) {
        const days = parseInt(match[2]);
        const hours = match[3] ? parseInt(match[3]) : 0;
        const now = Date.now();
        assignment.dueDate = now + (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000);
      }
      
      // Handle grades for updated grade patterns
      if (pattern === assignmentPatterns[1]) {
        assignment.pointsEarned = parseFloat(match[2]);
        assignment.maxPoints = parseFloat(match[3]);
        assignment.status = 'completed';
      } else {
        assignment.status = 'todo';
      }
      
      // Determine assignment type
      const titleLower = assignment.title.toLowerCase();
      if (titleLower.includes('quiz')) assignment.assignmentType = 'quiz';
      else if (titleLower.includes('lab')) assignment.assignmentType = 'lab';
      else if (titleLower.includes('exam')) assignment.assignmentType = 'exam';
      else if (titleLower.includes('project')) assignment.assignmentType = 'project';
      else assignment.assignmentType = 'assignment';
      
      assignments.push(assignment);
    }
  }
  
  return assignments;
}

// Process email data and extract assignments
export const processEmailData = mutation({
  args: {
    integrationId: v.id("emailIntegrations"),
    emails: v.array(v.object({
      messageId: v.string(),
      from: v.string(),
      to: v.string(),
      subject: v.string(),
      body: v.string(),
      bodyHtml: v.optional(v.string()),
      date: v.string(),
      headers: v.record(v.string(), v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration) {
      throw new Error("Email integration not found");
    }

    const results = {
      itemsProcessed: args.emails.length,
      assignmentsCreated: 0,
      assignmentsUpdated: 0,
      duplicatesFound: 0,
      errors: [] as string[],
    };

    for (const emailData of args.emails) {
      try {
        // Check if email matches filters
        const matchesFilters = 
          (!integration.fromFilters || integration.fromFilters.some(filter => 
            emailData.from.toLowerCase().includes(filter.toLowerCase())
          )) &&
          (!integration.subjectFilters || integration.subjectFilters.some(filter => 
            emailData.subject.toLowerCase().includes(filter.toLowerCase())
          )) &&
          (!integration.bodyKeywords || integration.bodyKeywords.some(keyword => 
            emailData.body.toLowerCase().includes(keyword.toLowerCase())
          ));

        if (!matchesFilters) {
          continue; // Skip emails that don't match filters
        }

        // Check if this is an activity summary email with multiple assignments
        const isActivitySummary = /activity\s+summary\s+for/i.test(emailData.subject);
        
        if (isActivitySummary) {
          // Parse multiple assignments from activity summary
          const multipleAssignments = parseActivitySummaryEmail(emailData.subject, emailData.body);
          
          for (const assignmentData of multipleAssignments) {
            // Create individual assignment sources for each detected assignment
            const sourceId = `${emailData.messageId}-${assignmentData.title.replace(/\s+/g, '-')}`;
            
            const existingSource = await ctx.db
              .query("assignmentSources")
              .filter((q) => 
                q.and(
                  q.eq(q.field("sourceType"), "email"),
                  q.eq(q.field("sourceId"), sourceId)
                )
              )
              .first();

            if (existingSource) {
              await ctx.db.patch(existingSource._id, {
                rawData: JSON.stringify(emailData),
                parsedData: assignmentData,
                confidence: 85, // High confidence for structured activity summaries
                updatedAt: Date.now(),
              });
              results.assignmentsUpdated++;
            } else {
              await ctx.db.insert("assignmentSources", {
                userId: integration.userId,
                sourceType: 'email',
                sourceId: sourceId,
                sourceUrl: integration.emailProvider,
                rawData: JSON.stringify(emailData),
                parsedData: assignmentData,
                confidence: 85, // High confidence for structured activity summaries
                isProcessed: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
              results.assignmentsCreated++;
            }
          }
        } else {
          // Handle single assignment emails
          const analysis = analyzeEmailForAssignment(emailData);
          
            if (analysis.isAssignment && analysis.confidence >= 40) {
              // Check if this email was already processed
              const existingSource = await ctx.db
                .query("assignmentSources")
                .filter((q) => 
                  q.and(
                    q.eq(q.field("sourceType"), "email"),
                    q.eq(q.field("sourceId"), emailData.messageId)
                  )
                )
                .first();

              if (existingSource) {
                // Update existing source
                await ctx.db.patch(existingSource._id, {
                  rawData: JSON.stringify(emailData),
                  parsedData: analysis.data,
                  confidence: analysis.confidence,
                  updatedAt: Date.now(),
                });
                results.assignmentsUpdated++;
              } else {
                // Create new assignment source
                await ctx.db.insert("assignmentSources", {
                  userId: integration.userId,
                  sourceType: 'email',
                  sourceId: emailData.messageId,
                  sourceUrl: integration.emailProvider,
                  rawData: JSON.stringify(emailData),
                  parsedData: analysis.data,
                  confidence: analysis.confidence,
                  isProcessed: false,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                });
                results.assignmentsCreated++;
              }
            }
          }
      } catch (error) {
        results.errors.push(`Error processing email ${emailData.messageId}: ${error}`);
      }
    }

    // Update integration sync status
    await ctx.db.patch(args.integrationId, {
      lastSyncAt: Date.now(),
      lastSyncStatus: 'success',
      updatedAt: Date.now(),
    });

    console.log(`📧 Email processing completed: ${results.assignmentsCreated} created, ${results.assignmentsUpdated} updated`);
    return results;
  },
});

// Get email integrations for a user
export const getUserEmailIntegrations = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      return [];
    }

    return await ctx.db
      .query("emailIntegrations")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();
  },
});

// Toggle email integration active status
export const toggleEmailIntegration = mutation({
  args: {
    integrationId: v.id("emailIntegrations"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const integration = await ctx.db.get(args.integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user || integration.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.integrationId, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete email integration
export const deleteEmailIntegration = mutation({
  args: {
    integrationId: v.id("emailIntegrations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const integration = await ctx.db.get(args.integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user || integration.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.integrationId);
    return { success: true };
  },
});
