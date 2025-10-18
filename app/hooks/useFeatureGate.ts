import React, { useCallback, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useStatsigClient } from '@statsig/react-bindings';
import { useClerkBilling } from './useClerkBilling';
import { FEATURES, type FeatureId, type FeatureConfig } from '../config/features';

/**
 * Feature Gate Hook
 * 
 * This hook provides a unified interface for feature gating across:
 * - Clerk Billing (plan-based access)
 * - Statsig (feature flags & A/B testing)
 * - Usage limits (storage, AI tokens, etc.)
 * 
 * Usage:
 * ```tsx
 * const { hasAccess, checkAccess, trackUsage, showUpgrade } = useFeatureGate();
 * 
 * if (hasAccess('ai_study_buddy')) {
 *   // Feature is available
 *   trackUsage('ai_study_buddy');
 * } else {
 *   showUpgrade('ai_study_buddy');
 * }
 * ```
 */
export function useFeatureGate() {
  const { user } = useUser();
  const { getCurrentPlan, hasFeature: clerkHasFeature } = useClerkBilling();
  const { client: statsigClient } = useStatsigClient();

  const currentPlan = getCurrentPlan();
  const planId = currentPlan?.plan;

  /**
   * Check if user has access to a specific feature
   * Combines Clerk billing, Statsig feature flags, and usage limits
   */
  const checkAccess = useCallback((featureId: FeatureId): {
    hasAccess: boolean;
    reason?: 'plan' | 'feature_flag' | 'usage_limit' | 'account_status';
    requiresUpgrade: boolean;
    upgradeMessage?: string;
  } => {
    const feature = FEATURES[featureId];
    
    if (!feature) {
      console.warn(`Feature ${featureId} not found in FEATURES config`);
      return {
        hasAccess: false,
        reason: 'plan',
        requiresUpgrade: false,
      };
    }

    // Check 1: Account Status
    if (currentPlan?.accountStatus === 'suspended') {
      return {
        hasAccess: false,
        reason: 'account_status',
        requiresUpgrade: true,
        upgradeMessage: 'Your account is suspended. Please reactivate your subscription to continue.',
      };
    }

    // Check 2: Plan-based access (Clerk Billing)
    const hasPlanAccess = planId && feature.plans.includes(planId as any);
    
    if (!hasPlanAccess) {
      return {
        hasAccess: false,
        reason: 'plan',
        requiresUpgrade: feature.requiresUpgrade,
        upgradeMessage: feature.upgradeMessage,
      };
    }

    // Check 3: Statsig Feature Flag (if configured)
    if (feature.statsigGate && statsigClient) {
      try {
        const gateValue = statsigClient.checkGate(feature.statsigGate);
        
        if (!gateValue) {
          console.log(`🚫 Feature ${featureId} blocked by Statsig gate: ${feature.statsigGate}`);
          return {
            hasAccess: false,
            reason: 'feature_flag',
            requiresUpgrade: false,
            upgradeMessage: 'This feature is currently unavailable.',
          };
        }
      } catch (error) {
        console.warn(`Failed to check Statsig gate ${feature.statsigGate}:`, error);
        // If Statsig check fails, fall through to allow access based on plan
      }
    }

    // Check 4: Usage Limits (handled separately via checkUsageLimit)
    // For now, we assume if they have plan access and feature flag passes, they have access
    // Usage limits are enforced at the point of use

    return {
      hasAccess: true,
      requiresUpgrade: false,
    };
  }, [planId, currentPlan, statsigClient]);

  /**
   * Simple boolean check for feature access
   */
  const hasAccess = useCallback((featureId: FeatureId): boolean => {
    return checkAccess(featureId).hasAccess;
  }, [checkAccess]);

  /**
   * Track feature usage in Statsig
   */
  const trackUsage = useCallback((featureId: FeatureId, metadata?: Record<string, any>) => {
    const feature = FEATURES[featureId];
    
    if (!feature || !statsigClient) {
      console.warn(`Feature ${featureId} not found for tracking or Statsig client not available`);
      return;
    }

    const accessCheck = checkAccess(featureId);

    if (accessCheck.hasAccess) {
      // Track successful usage
      statsigClient.logEvent(feature.statsigEvents.used, undefined, {
        featureId,
        plan: planId,
        userId: user?.id,
        ...metadata,
      });
      
      console.log(`✅ Feature used: ${featureId}`, { plan: planId, ...metadata });
    } else {
      // Track attempted usage (for conversion analytics)
      statsigClient.logEvent(feature.statsigEvents.attempted, undefined, {
        featureId,
        plan: planId,
        userId: user?.id,
        reason: accessCheck.reason,
        ...metadata,
      });
      
      console.log(`🚫 Feature attempted but blocked: ${featureId}`, {
        reason: accessCheck.reason,
        plan: planId,
      });
    }
  }, [checkAccess, statsigClient, planId, user]);

  /**
   * Track when user upgrades to access a feature
   */
  const trackUpgrade = useCallback((featureId: FeatureId, fromPlan: string, toPlan: string) => {
    const feature = FEATURES[featureId];
    
    if (!feature || !statsigClient) return;

    statsigClient.logEvent(feature.statsigEvents.upgraded, undefined, {
      featureId,
      fromPlan,
      toPlan,
      userId: user?.id,
    });

    console.log(`🎉 User upgraded to access feature: ${featureId}`, { fromPlan, toPlan });
  }, [statsigClient, user]);

  /**
   * Get feature configuration
   */
  const getFeature = useCallback((featureId: FeatureId): FeatureConfig | undefined => {
    return FEATURES[featureId];
  }, []);

  /**
   * Get all features available to current user
   */
  const getAvailableFeatures = useCallback((): FeatureConfig[] => {
    return Object.values(FEATURES).filter(feature => {
      const access = checkAccess(feature.id);
      return access.hasAccess;
    });
  }, [checkAccess]);

  /**
   * Get features that require upgrade
   */
  const getLockedFeatures = useCallback((): FeatureConfig[] => {
    return Object.values(FEATURES).filter(feature => {
      const access = checkAccess(feature.id);
      return !access.hasAccess && access.requiresUpgrade;
    });
  }, [checkAccess]);

  /**
   * Show upgrade prompt for a feature
   * Returns the upgrade message and metadata
   */
  const getUpgradeInfo = useCallback((featureId: FeatureId) => {
    const feature = FEATURES[featureId];
    const accessCheck = checkAccess(featureId);

    if (!feature || accessCheck.hasAccess) {
      return null;
    }

    return {
      featureId: feature.id,
      featureName: feature.name,
      description: feature.description,
      upgradeMessage: accessCheck.upgradeMessage || feature.upgradeMessage,
      learnMoreUrl: feature.learnMoreUrl,
      currentPlan: planId,
      requiredPlans: feature.plans,
      icon: feature.icon,
    };
  }, [checkAccess, planId]);

  return {
    // Access control
    hasAccess,
    checkAccess,
    
    // Feature info
    getFeature,
    getAvailableFeatures,
    getLockedFeatures,
    getUpgradeInfo,
    
    // Usage tracking
    trackUsage,
    trackUpgrade,
    
    // Current state
    currentPlan: planId,
    accountStatus: currentPlan?.accountStatus,
  };
}

/**
 * Hook for a specific feature
 * Convenience hook that pre-configures for a single feature
 */
export function useFeature(featureId: FeatureId) {
  const featureGate = useFeatureGate();
  
  const feature = useMemo(() => FEATURES[featureId], [featureId]);
  const accessCheck = useMemo(
    () => featureGate.checkAccess(featureId),
    [featureGate, featureId]
  );
  
  const trackUsage = useCallback((metadata?: Record<string, any>) => {
    featureGate.trackUsage(featureId, metadata);
  }, [featureGate, featureId]);
  
  const upgradeInfo = useMemo(
    () => featureGate.getUpgradeInfo(featureId),
    [featureGate, featureId]
  );

  return {
    feature,
    hasAccess: accessCheck.hasAccess,
    requiresUpgrade: accessCheck.requiresUpgrade,
    reason: accessCheck.reason,
    upgradeInfo,
    trackUsage,
  };
}

/**
 * React component wrapper for feature gating
 * 
 * Usage:
 * ```tsx
 * <FeatureGate feature="ai_study_buddy" fallback={<UpgradePrompt />}>
 *   <AIStudyBuddy />
 * </FeatureGate>
 * ```
 */
interface FeatureGateProps {
  feature: FeatureId;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onBlocked?: (reason: string) => void;
}

export function FeatureGate({ feature, children, fallback, onBlocked }: FeatureGateProps): React.ReactElement | null {
  const { checkAccess } = useFeatureGate();
  
  const accessCheck = checkAccess(feature);
  
  if (!accessCheck.hasAccess) {
    if (onBlocked) {
      onBlocked(accessCheck.reason || 'unknown');
    }
    
    if (fallback) {
      return React.createElement(React.Fragment, null, fallback);
    }
    
    return null;
  }
  
  return React.createElement(React.Fragment, null, children);
}

