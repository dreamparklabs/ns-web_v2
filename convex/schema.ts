import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  assignments: defineTable({
    courseId: v.id("courses"),
    dueAt: v.optional(v.float64()),
    pointsEarned: v.optional(v.float64()), // Points received/earned
    maxPoints: v.optional(v.float64()), // Maximum possible points
    grade: v.optional(v.float64()), // Calculated percentage (pointsEarned/maxPoints * 100)
    gradePercentage: v.optional(v.float64()), // Legacy field, will be removed
    lc_title: v.string(),
    notes: v.optional(v.string()),
    status: v.string(),
    title: v.string(),
    type: v.optional(v.string()), // assignment, quiz, discussion, project, exam
    userId: v.id("users"),
    // User modification tracking
    userModifiedAt: v.optional(v.float64()), // Timestamp when user last modified this assignment
    userModifiedFields: v.optional(v.array(v.string())), // Fields that user has modified
    // D2L integration fields
    d2lId: v.optional(v.string()),
    d2lSourceId: v.optional(v.string()),
    d2lSourceType: v.optional(v.string()), // announcement, module, content
    d2lSyncEnabled: v.optional(v.boolean()),
    d2lWebScrapingEnabled: v.optional(v.boolean()),
    aiGenerated: v.optional(v.boolean()),
  }),
  courses: defineTable({
    building: v.optional(v.string()),
    code: v.string(),
    creditHours: v.float64(),
    deliveryFormat: v.optional(v.string()), // "in-person" or "virtual" - optional for backward compatibility
    deliveryMode: v.optional(v.string()), // "synchronous" or "asynchronous" (only for virtual)
    instructor: v.string(),
    lc_code: v.string(),
    lc_title: v.string(),
    meetingDays: v.optional(v.array(v.string())),
    meetingEnd: v.optional(v.string()),
    meetingStart: v.optional(v.string()),
    room: v.optional(v.string()),
    termId: v.id("terms"),
    title: v.string(),
    userId: v.id("users"),
    // D2L integration fields
    d2lOrgUnitId: v.optional(v.string()),
    d2lSyncEnabled: v.optional(v.boolean()),
    d2lWebScrapingEnabled: v.optional(v.boolean()),
  }),
  courseRules: defineTable({
    courseId: v.id("courses"),
    userId: v.id("users"),
    ruleType: v.string(), // 'due_date', 'submission_time', 'grading', 'general'
    ruleText: v.string(), // Original text from announcement
    extractedRule: v.string(), // AI-processed rule
    isActive: v.boolean(),
    confidence: v.optional(v.float64()), // AI confidence score
    appliesTo: v.optional(v.array(v.string())), // ['quiz', 'assignment', 'discussion'] etc.
    createdAt: v.float64(),
    source: v.string(), // 'announcement', 'syllabus', 'manual'
    sourceId: v.optional(v.string()), // D2L announcement ID, etc.
  }),
  ethnicities: defineTable({
    lc_name: v.string(),
    name: v.string(),
  }),
  events: defineTable({
    attendees: v.optional(
      v.array(
        v.object({ initials: v.string(), name: v.string() })
      )
    ),
    color: v.string(),
    courseCode: v.optional(v.string()),
    courseId: v.optional(v.id("courses")),
    description: v.optional(v.string()),
    endTime: v.float64(),
    lc_title: v.string(),
    location: v.string(),
    startTime: v.float64(),
    title: v.string(),
    type: v.string(),
    userId: v.id("users"),
  }),
  majorCategories: defineTable({
    commonMajors: v.array(v.string()),
    description: v.string(),
    lc_name: v.string(),
    name: v.string(),
  }),
  schools: defineTable({
    city: v.string(),
    lc_name: v.string(),
    name: v.string(),
    state: v.string(),
    type: v.string(),
    website: v.optional(v.string()),
  }),
  terms: defineTable({
    endDate: v.string(),
    lc_name: v.string(),
    name: v.string(),
    startDate: v.string(),
    status: v.string(),
    userId: v.id("users"),
  }),
  users: defineTable({
    birthday: v.float64(),
    clerkUserId: v.string(),
    createdAt: v.float64(),
    currentActiveTerm: v.optional(v.id("terms")),
    currentYear: v.optional(v.string()),
    email: v.string(),
    ethnicity: v.string(),
    expectedGraduationDate: v.optional(v.string()),
    firstName: v.string(),
    gender: v.string(),
    gpa: v.optional(v.float64()),
    hasCompletedDemographics: v.boolean(),
    hasCompletedGuidedTour: v.boolean(),
    lastName: v.optional(v.string()),
    location: v.optional(v.string()),
    major: v.string(),
    majorCategory: v.string(),
    minor: v.string(),
    phoneNumber: v.optional(v.string()),
    school: v.string(),
    totalAssignments: v.float64(),
    totalClassesEnrolled: v.float64(),
    totalSubmissions: v.float64(),
    totalTermsCreated: v.float64(),
    updatedAt: v.float64(),
    // D2L integration fields (Legacy API Key method)
    d2lUserId: v.optional(v.string()),
    d2lUserKey: v.optional(v.string()),
    d2lBaseUrl: v.optional(v.string()),
    d2lSyncEnabled: v.optional(v.boolean()),
    d2lLastSyncAt: v.optional(v.float64()),
    // D2L OAuth fields (New SSO method)
    d2lAccessToken: v.optional(v.string()),
    d2lRefreshToken: v.optional(v.string()),
    d2lTokenExpiresAt: v.optional(v.float64()),
    d2lUserName: v.optional(v.string()),
    d2lOAuthState: v.optional(v.string()),
    d2lOAuthInitiatedAt: v.optional(v.float64()),
    // D2L Web Scraping fields (Alternative method)
    d2lWebScrapingEnabled: v.optional(v.boolean()),
    d2lSessionData: v.optional(v.string()),
    d2lLastScrapingAt: v.optional(v.float64()),
    d2lUserEmail: v.optional(v.string()),
  }),
  files: defineTable({
    userId: v.id("users"),
    assignmentId: v.optional(v.id("assignments")),
    courseId: v.optional(v.id("courses")),
    fileName: v.string(),
    originalFileName: v.string(),
    fileSize: v.float64(),
    mimeType: v.string(),
    storageId: v.id("_storage"),
    uploadedAt: v.float64(),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    // OCR fields
    ocrText: v.optional(v.string()),
    ocrProcessed: v.optional(v.boolean()),
    ocrProcessedAt: v.optional(v.float64()),
    ocrError: v.optional(v.string()),
    // Star and sharing fields
    starred: v.optional(v.boolean()),
    shared: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),
    sharedAt: v.optional(v.float64()),
  }).index("by_user", ["userId"])
    .index("by_assignment", ["assignmentId"])
    .index("by_course", ["courseId"])
    .index("by_ocr_processed", ["ocrProcessed"])
    .index("by_starred", ["userId", "starred"])
    .index("by_shared", ["shared"])
    .index("by_share_token", ["shareToken"]),

  // D2L API configurations
  d2lConfigurations: defineTable({
    clerkUserId: v.string(),
    institutionUrl: v.string(),
    clientId: v.string(),
    clientSecret: v.string(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["clerkUserId"]),

  // LTI (Learning Tools Interoperability) sessions for universal D2L access
  ltiSessions: defineTable({
    ltiUserId: v.string(),
    ltiCourseId: v.string(),
    institutionUrl: v.string(),
    userEmail: v.string(),
    courseName: v.string(),
    userRole: v.string(),
    consumerKey: v.string(),
    sessionToken: v.string(),
    createdAt: v.number(),
    lastAccessed: v.number(),
  }).index("by_lti_user_course", ["ltiUserId", "ltiCourseId"])
    .index("by_session_token", ["sessionToken"]),

  // LTI user mappings to Northstar users
  ltiUserMappings: defineTable({
    ltiUserId: v.string(),
    northstarUserId: v.id("users"),
    institutionUrl: v.string(),
    userEmail: v.string(),
    createdAt: v.number(),
  }).index("by_lti_user", ["ltiUserId"])
    .index("by_northstar_user", ["northstarUserId"]),

  // ICS Calendar Feed Integration
  icsFeeds: defineTable({
    userId: v.id("users"),
    feedUrl: v.string(),
    feedName: v.string(),
    courseId: v.optional(v.id("courses")), // Link to specific course if identified
    isActive: v.boolean(),
    lastSyncAt: v.optional(v.float64()),
    lastSyncStatus: v.optional(v.string()), // 'success', 'error', 'pending'
    lastSyncError: v.optional(v.string()),
    syncFrequency: v.optional(v.string()), // 'hourly', 'daily', 'weekly'
    createdAt: v.float64(),
    updatedAt: v.float64(),
    // Parsing settings
    assignmentKeywords: v.optional(v.array(v.string())), // Custom keywords to identify assignments
    excludeKeywords: v.optional(v.array(v.string())), // Keywords to exclude
    autoCreateCourses: v.optional(v.boolean()), // Auto-create courses from calendar data
  }).index("by_user", ["userId"])
    .index("by_active", ["userId", "isActive"]),

  // Email Integration for D2L Notifications
  emailIntegrations: defineTable({
    userId: v.id("users"),
    emailProvider: v.string(), // 'gmail', 'outlook', 'imap'
    isActive: v.boolean(),
    lastSyncAt: v.optional(v.float64()),
    lastSyncStatus: v.optional(v.string()),
    lastSyncError: v.optional(v.string()),
    syncFrequency: v.optional(v.string()),
    createdAt: v.float64(),
    updatedAt: v.float64(),
    // Email filtering settings
    fromFilters: v.optional(v.array(v.string())), // Email addresses to monitor
    subjectFilters: v.optional(v.array(v.string())), // Subject line patterns
    bodyKeywords: v.optional(v.array(v.string())), // Keywords in email body
    folderName: v.optional(v.string()), // Specific folder to monitor
    // OAuth tokens (encrypted)
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.float64()),
  }).index("by_user", ["userId"])
    .index("by_active", ["userId", "isActive"]),

  // Parsed Assignment Sources - Master Database
  assignmentSources: defineTable({
    userId: v.id("users"),
    assignmentId: v.optional(v.id("assignments")), // Link to created assignment
    sourceType: v.string(), // 'ics', 'email', 'api', 'scraping'
    sourceId: v.string(), // Unique ID from source (UID for ICS, Message-ID for email)
    sourceUrl: v.optional(v.string()), // Feed URL or email provider
    rawData: v.string(), // Original raw data (ICS event, email content)
    parsedData: v.object({
      title: v.string(),
      description: v.optional(v.string()),
      dueDate: v.optional(v.float64()),
      courseName: v.optional(v.string()),
      courseCode: v.optional(v.string()),
      assignmentType: v.optional(v.string()),
      location: v.optional(v.string()),
      instructor: v.optional(v.string()),
      maxPoints: v.optional(v.float64()),
      pointsEarned: v.optional(v.float64()),
      status: v.optional(v.string()),
    }),
    confidence: v.float64(), // AI confidence score for assignment detection
    isProcessed: v.boolean(), // Whether it's been converted to an assignment
    conflictsWith: v.optional(v.array(v.id("assignmentSources"))), // Duplicate detection
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }).index("by_user", ["userId"])
    .index("by_source", ["sourceType", "sourceId"])
    .index("by_assignment", ["assignmentId"])
    .index("by_unprocessed", ["userId", "isProcessed"]),

  // Sync Jobs for Background Processing
  syncJobs: defineTable({
    userId: v.id("users"),
    jobType: v.string(), // 'ics_sync', 'email_sync', 'conflict_resolution'
    sourceId: v.optional(v.string()), // ICS feed ID or email integration ID
    status: v.string(), // 'pending', 'running', 'completed', 'failed'
    progress: v.optional(v.float64()), // 0-100 percentage
    startedAt: v.optional(v.float64()),
    completedAt: v.optional(v.float64()),
    error: v.optional(v.string()),
    result: v.optional(v.object({
      itemsProcessed: v.number(),
      assignmentsCreated: v.number(),
      assignmentsUpdated: v.number(),
      duplicatesFound: v.number(),
      errors: v.array(v.string()),
    })),
    createdAt: v.float64(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_type", ["jobType"]),

  // Cost Tracking Tables for Unit Economics
  aiUsageLogs: defineTable({
    userId: v.id("users"),
    feature: v.string(), // "assignment-parser", "ocr", "email-parser", etc.
    model: v.string(), // "gemini-pro", "gpt-4", etc.
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    costUSD: v.float64(),
    timestamp: v.float64(),
    metadata: v.optional(v.any()),
  }).index("by_user", ["userId"])
    .index("by_feature", ["feature"])
    .index("by_timestamp", ["timestamp"]),

  apiUsageLogs: defineTable({
    userId: v.id("users"),
    service: v.string(), // "d2l", "clerk", "ocr", etc.
    endpoint: v.string(),
    requestCount: v.number(),
    costUSD: v.float64(),
    timestamp: v.float64(),
    metadata: v.optional(v.any()),
  }).index("by_user", ["userId"])
    .index("by_service", ["service"])
    .index("by_timestamp", ["timestamp"]),

  storageCostLogs: defineTable({
    userId: v.id("users"),
    storageType: v.string(), // "convex", "s3", etc.
    bytesStored: v.number(),
    costUSD: v.float64(),
    timestamp: v.float64(),
  }).index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  revenueLog: defineTable({
    userId: v.id("users"),
    revenueType: v.string(), // "subscription", "one-time", "usage"
    amountUSD: v.float64(),
    description: v.string(),
    billingPeriodStart: v.optional(v.float64()),
    billingPeriodEnd: v.optional(v.float64()),
    timestamp: v.float64(),
    metadata: v.optional(v.any()),
  }).index("by_user", ["userId"])
    .index("by_type", ["revenueType"])
    .index("by_timestamp", ["timestamp"]),

  userCostSummary: defineTable({
    userId: v.id("users"),
    totalCostUSD: v.float64(),
    aiCostUSD: v.float64(),
    apiCostUSD: v.float64(),
    storageCostUSD: v.float64(),
    totalRevenueUSD: v.float64(),
    profitMarginUSD: v.float64(), // revenue - cost
    lastUpdated: v.float64(),
  }).index("by_user", ["userId"])
    .index("by_profit", ["profitMarginUSD"]),
});
