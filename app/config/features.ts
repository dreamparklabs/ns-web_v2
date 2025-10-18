/**
 * Feature Configuration & Feature Gating System
 * 
 * This file defines all features in the application and their metadata for:
 * - Clerk Billing (plan access control)
 * - Statsig (feature flags & analytics)
 * - Stripe (product features)
 * - Usage monitoring and limits
 * 
 * IMPORTANT: Feature IDs and lookup keys MUST match Stripe Product Catalog
 */

export type PlanId = 'northstar_basic' | 'northstar_pro';

/**
 * Feature IDs - Must match Stripe lookup keys exactly
 */
export type FeatureId =
  // Basic Plan Features
  | '1gb_of_file_storage'
  | '2_unified_dashboards'
  | 'smart_search'
  | 'ai_powered_ocr'
  | 'term_based_assignment_management'
  
  // Pro Plan Features (marked with * in Stripe)
  | 'academic_progress_analytics'
  | 'homework_help'
  | 'ai_powered_study_buddy'
  | 'calendar_sync'
  | 'unlimited_storage_share'
  | 'unlimited_file_storage'
  | 'unlimited_unified_dashboards';

export interface FeatureConfig {
  // Identification
  id: FeatureId;
  name: string;
  description: string;
  category: 'core' | 'productivity' | 'ai' | 'analytics' | 'integrations' | 'storage';
  
  // Stripe Integration
  stripeLookupKey: string; // Must match Stripe lookup key exactly
  
  // Access Control
  plans: PlanId[]; // Which plans have access to this feature
  requiresUpgrade: boolean; // Show upgrade prompt when accessed on lower tier
  
  // Statsig Integration
  statsigGate?: string; // Statsig gate name (if different from feature ID)
  statsigEvents: {
    used: string; // Event name when feature is used
    attempted: string; // Event name when feature is attempted but blocked
    upgraded: string; // Event name when user upgrades to access this feature
  };
  
  // Usage Tracking
  hasUsageLimits: boolean;
  limits?: {
    basic?: number | 'unlimited';
    pro?: number | 'unlimited';
  };
  usageMetric?: 'count' | 'storage' | 'bytes' | 'dashboards';
  
  // UI/UX
  icon?: string; // Icon identifier
  upgradeMessage?: string; // Custom message when upgrade is required
  learnMoreUrl?: string; // Documentation URL
}

/**
 * Master Feature Configuration
 * This is the single source of truth for all features in the application
 * Feature IDs match Stripe Product Catalog lookup keys exactly
 */
export const FEATURES: Record<FeatureId, FeatureConfig> = {
  // ==================== BASIC PLAN FEATURES ====================
  
  '1gb_of_file_storage': {
    id: '1gb_of_file_storage',
    name: '1GB of File Storage',
    description: 'Store up to 1GB of files, documents, and course materials',
    category: 'storage',
    stripeLookupKey: '1gb_of_file_storage',
    plans: ['northstar_basic'],
    requiresUpgrade: false,
    statsigGate: 'file_storage_enabled',
    statsigEvents: {
      used: 'file_uploaded',
      attempted: 'file_storage_attempted',
      upgraded: 'upgraded_for_storage',
    },
    hasUsageLimits: true,
    limits: {
      basic: 1 * 1024 * 1024 * 1024, // 1GB in bytes
      pro: 'unlimited',
    },
    usageMetric: 'bytes',
    icon: 'hard-drive',
    upgradeMessage: 'You\'ve reached your 1GB storage limit. Upgrade to Pro for unlimited storage.',
  },

  '2_unified_dashboards': {
    id: '2_unified_dashboards',
    name: '2 Unified Dashboards',
    description: 'Create and manage up to 2 custom dashboards for your coursework',
    category: 'productivity',
    stripeLookupKey: '2_unified_dashboards',
    plans: ['northstar_basic'],
    requiresUpgrade: false,
    statsigGate: 'dashboards_enabled',
    statsigEvents: {
      used: 'dashboard_created',
      attempted: 'dashboard_limit_reached',
      upgraded: 'upgraded_for_unlimited_dashboards',
    },
    hasUsageLimits: true,
    limits: {
      basic: 2,
      pro: 'unlimited',
    },
    usageMetric: 'dashboards',
    icon: 'layout-dashboard',
    upgradeMessage: 'You\'ve reached your 2 dashboard limit. Upgrade to Pro for unlimited dashboards.',
  },

  smart_search: {
    id: 'smart_search',
    name: 'Smart Search',
    description: 'AI-powered semantic search across all your content and files',
    category: 'ai',
    stripeLookupKey: 'smart_search',
    plans: ['northstar_basic', 'northstar_pro'],
    requiresUpgrade: false,
    statsigGate: 'smart_search_enabled',
    statsigEvents: {
      used: 'smart_search_performed',
      attempted: 'smart_search_attempted',
      upgraded: 'upgraded_for_smart_search',
    },
    hasUsageLimits: false,
    icon: 'search',
  },

  ai_powered_ocr: {
    id: 'ai_powered_ocr',
    name: 'AI-Powered OCR',
    description: 'Extract text from images, PDFs, and scanned documents using advanced AI',
    category: 'ai',
    stripeLookupKey: 'ai_powered_ocr',
    plans: ['northstar_basic', 'northstar_pro'],
    requiresUpgrade: false,
    statsigGate: 'ai_ocr_enabled',
    statsigEvents: {
      used: 'ocr_used',
      attempted: 'ocr_limit_reached',
      upgraded: 'upgraded_for_unlimited_ocr',
    },
    hasUsageLimits: true,
    limits: {
      basic: 100, // 100 OCR operations per month
      pro: 'unlimited',
    },
    usageMetric: 'count',
    icon: 'scan',
    upgradeMessage: 'You\'ve reached your 100 OCR limit. Upgrade to Pro for unlimited OCR.',
  },

  term_based_assignment_management: {
    id: 'term_based_assignment_management',
    name: 'Term-based Assignment Management',
    description: 'Organize and track assignments by academic terms and semesters',
    category: 'productivity',
    stripeLookupKey: 'term_based_assignment_management',
    plans: ['northstar_basic', 'northstar_pro'],
    requiresUpgrade: false,
    statsigGate: 'assignment_management_enabled',
    statsigEvents: {
      used: 'assignment_created',
      attempted: 'assignment_management_attempted',
      upgraded: 'upgraded_for_assignment_management',
    },
    hasUsageLimits: false,
    icon: 'calendar-check',
  },

  // ==================== PRO PLAN FEATURES ====================

  academic_progress_analytics: {
    id: 'academic_progress_analytics',
    name: 'Academic Progress Analytics',
    description: 'Advanced analytics and insights into your academic performance, trends, and predictions',
    category: 'analytics',
    stripeLookupKey: 'academic_progress_analytics_',
    plans: ['northstar_pro'],
    requiresUpgrade: true,
    statsigEvents: {
      used: 'academic_analytics_viewed',
      attempted: 'academic_analytics_attempted',
      upgraded: 'upgraded_for_academic_analytics',
    },
    hasUsageLimits: false,
    icon: 'trending-up',
    upgradeMessage: 'Upgrade to Pro to unlock Academic Progress Analytics and track your performance.',
    learnMoreUrl: '/features/academic-analytics',
  },

  homework_help: {
    id: 'homework_help',
    name: 'Homework Help',
    description: 'Get AI-powered assistance with homework, assignments, and problem-solving',
    category: 'ai',
    stripeLookupKey: 'homework_help_',
    plans: ['northstar_pro'],
    requiresUpgrade: true,
    statsigGate: 'homework_help_enabled',
    statsigEvents: {
      used: 'homework_help_used',
      attempted: 'homework_help_attempted',
      upgraded: 'upgraded_for_homework_help',
    },
    hasUsageLimits: false,
    icon: 'help-circle',
    upgradeMessage: 'Upgrade to Pro to get AI-powered homework help.',
    learnMoreUrl: '/features/homework-help',
  },

  ai_powered_study_buddy: {
    id: 'ai_powered_study_buddy',
    name: 'AI-Powered Study Buddy',
    description: 'Your personal AI tutor that helps you study, understand concepts, and prepare for exams',
    category: 'ai',
    stripeLookupKey: 'ai_powered_study_buddy_',
    plans: ['northstar_pro'],
    requiresUpgrade: true,
    statsigGate: 'study_buddy_enabled',
    statsigEvents: {
      used: 'study_buddy_used',
      attempted: 'study_buddy_attempted',
      upgraded: 'upgraded_for_study_buddy',
    },
    hasUsageLimits: false,
    icon: 'brain',
    upgradeMessage: 'Upgrade to Pro to unlock your personal AI Study Buddy.',
    learnMoreUrl: '/features/ai-study-buddy',
  },

  calendar_sync: {
    id: 'calendar_sync',
    name: 'Calendar Sync',
    description: 'Two-way sync with Google Calendar, Outlook, Apple Calendar, and more',
    category: 'integrations',
    stripeLookupKey: 'calendar_sync_',
    plans: ['northstar_pro'],
    requiresUpgrade: true,
    statsigGate: 'calendar_sync_enabled',
    statsigEvents: {
      used: 'calendar_synced',
      attempted: 'calendar_sync_attempted',
      upgraded: 'upgraded_for_calendar_sync',
    },
    hasUsageLimits: false,
    icon: 'calendar',
    upgradeMessage: 'Upgrade to Pro for advanced calendar sync across all your devices.',
  },

  unlimited_storage_share: {
    id: 'unlimited_storage_share',
    name: 'Unlimited Storage Share',
    description: 'Share unlimited files and folders with classmates and study groups',
    category: 'storage',
    stripeLookupKey: 'unlimited_storage_share',
    plans: ['northstar_pro'],
    requiresUpgrade: true,
    statsigGate: 'storage_share_enabled',
    statsigEvents: {
      used: 'file_shared',
      attempted: 'share_attempted',
      upgraded: 'upgraded_for_unlimited_sharing',
    },
    hasUsageLimits: true,
    limits: {
      basic: 2, // 2 shared links for Basic users
      pro: 'unlimited',
    },
    usageMetric: 'count',
    icon: 'share-2',
    upgradeMessage: 'You\'ve reached your limit of 2 shared links. Upgrade to Pro for unlimited file sharing.',
  },

  unlimited_file_storage: {
    id: 'unlimited_file_storage',
    name: 'Unlimited File Storage',
    description: 'Store unlimited files, documents, PDFs, images, and course materials',
    category: 'storage',
    stripeLookupKey: 'unlimited_file_storage',
    plans: ['northstar_pro'],
    requiresUpgrade: true,
    statsigGate: 'unlimited_storage_enabled',
    statsigEvents: {
      used: 'file_uploaded_unlimited',
      attempted: 'unlimited_storage_attempted',
      upgraded: 'upgraded_for_unlimited_storage',
    },
    hasUsageLimits: false,
    icon: 'database',
    upgradeMessage: 'Upgrade to Pro for unlimited file storage.',
  },

  unlimited_unified_dashboards: {
    id: 'unlimited_unified_dashboards',
    name: 'Unlimited Unified Dashboards',
    description: 'Create unlimited custom dashboards to organize your coursework your way',
    category: 'productivity',
    stripeLookupKey: 'unlimited_unified_dashboards',
    plans: ['northstar_pro'],
    requiresUpgrade: true,
    statsigGate: 'unlimited_dashboards_enabled',
    statsigEvents: {
      used: 'unlimited_dashboard_created',
      attempted: 'unlimited_dashboard_attempted',
      upgraded: 'upgraded_for_unlimited_dashboards',
    },
    hasUsageLimits: false,
    icon: 'layout-grid',
    upgradeMessage: 'Upgrade to Pro for unlimited dashboards.',
  },
};

/**
 * Get features for a specific plan
 */
export function getFeaturesForPlan(plan: PlanId): FeatureConfig[] {
  return Object.values(FEATURES).filter(feature => feature.plans.includes(plan));
}

/**
 * Check if a feature is available for a plan
 */
export function isFeatureAvailableForPlan(featureId: FeatureId, plan: PlanId): boolean {
  const feature = FEATURES[featureId];
  return feature?.plans.includes(plan) ?? false;
}

/**
 * Get features by category
 */
export function getFeaturesByCategory(category: FeatureConfig['category']): FeatureConfig[] {
  return Object.values(FEATURES).filter(feature => feature.category === category);
}

/**
 * Get Pro-only features
 */
export function getProOnlyFeatures(): FeatureConfig[] {
  return Object.values(FEATURES).filter(
    feature => feature.plans.includes('northstar_pro') && !feature.plans.includes('northstar_basic')
  );
}

/**
 * Get Basic plan features
 */
export function getBasicFeatures(): FeatureConfig[] {
  return Object.values(FEATURES).filter(
    feature => feature.plans.includes('northstar_basic')
  );
}

/**
 * Get features that require upgrade from Basic to Pro
 */
export function getUpgradeFeatures(): FeatureConfig[] {
  return Object.values(FEATURES).filter(feature => feature.requiresUpgrade);
}

/**
 * Get feature by Stripe lookup key
 */
export function getFeatureByStripeLookupKey(lookupKey: string): FeatureConfig | undefined {
  return Object.values(FEATURES).find(feature => feature.stripeLookupKey === lookupKey);
}

/**
 * Get all Stripe lookup keys for a plan
 */
export function getStripeLookupKeysForPlan(plan: PlanId): string[] {
  return getFeaturesForPlan(plan).map(feature => feature.stripeLookupKey);
}
