import { useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCostTracking } from './useCostTracking';
import type { Id } from '../../convex/_generated/dataModel';

/**
 * Hook for managing billing and subscription features
 * Integrates with existing cost tracking system
 */
export function useBilling() {
  const { user } = useUser();
  const { trackRevenue } = useCostTracking();
  
  // Get user's cost summary to check current usage
  const costSummary = useQuery(api.userCosts.getUserCostSummary, 
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  // Plan limits and pricing - Updated to match Clerk dashboard configuration
  const PLAN_LIMITS = {
    free: {
      aiUsageLimit: 10000, // 10k tokens per month (for AI features)
      storageLimit: 5 * 1024 * 1024 * 1024, // 5GB storage
      termLimit: 2, // 2 terms
      price: 0,
      name: 'Free',
      features: [
        'Unified Dashboard',
        'Basic assignment tracking',
        'Calendar integration',
        'File storage (5GB)',
        '2 Terms'
      ]
    },
    student_pro: {
      aiUsageLimit: Infinity, // Unlimited AI usage
      storageLimit: Infinity, // Unlimited storage
      termLimit: Infinity, // Unlimited terms
      price: 9.99,
      annualPrice: 8.99,
      name: 'Student Pro',
      trialDays: 14,
      features: [
        'All Free features',
        'Grade analytics & insights',
        'AI-powered recommendations',
        'Unlimited file storage',
        'Unlimited Terms',
        '14-day free trial'
      ]
    },
  };

  // Get current plan from user metadata or default to free
  const currentPlan = (user?.publicMetadata?.subscription as any)?.plan || 'free';
  const subscriptionStatus = (user?.publicMetadata?.subscription as any)?.status || 'active';
  
  const isSubscribed = subscriptionStatus === 'active' && currentPlan !== 'free';
  const isTrial = subscriptionStatus === 'trialing';
  
  const planLimits = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
  
  // Calculate current usage from cost summary
  const currentAiUsage = costSummary?.aiCostUSD ? 
    Math.round(costSummary.aiCostUSD * 1000000 / 0.5) : 0; // Rough token estimate
  const currentStorage = 0; // TODO: Get actual storage usage
  
  // Check if user has exceeded limits
  const hasExceededAiLimit = currentAiUsage > planLimits.aiUsageLimit;
  const hasExceededStorageLimit = currentStorage > planLimits.storageLimit;
  const hasExceededAnyLimit = hasExceededAiLimit || hasExceededStorageLimit;

  // Subscription management functions
  const subscribeToPlan = useCallback(async (planId: keyof typeof PLAN_LIMITS) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      // Track revenue in cost tracking system
      await trackRevenue(
        user.id as Id<"users">,
        'subscription',
        PLAN_LIMITS[planId].price,
        `${PLAN_LIMITS[planId].name} subscription`,
        Date.now(),
        Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
        { 
          planId, 
          source: 'clerk-billing',
          previousPlan: currentPlan 
        }
      );

      // Update user metadata with new subscription
      await user.update({
        publicMetadata: {
          ...user.publicMetadata,
          subscription: {
            plan: planId,
            status: 'active',
            startDate: Date.now(),
            endDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
          }
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to subscribe to plan:', error);
      throw error;
    }
  }, [user, trackRevenue, currentPlan]);

  const cancelSubscription = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      await user.update({
        publicMetadata: {
          ...user.publicMetadata,
          subscription: {
            plan: 'free',
            status: 'canceled',
            canceledAt: Date.now(),
          }
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  }, [user]);

  // Check if user can access a feature - Updated to match your actual features
  const canAccessFeature = useCallback((feature: 'ai-recommendations' | 'grade-analytics' | 'unlimited-storage' | 'unlimited-terms' | 'advanced-tracking') => {
    if (!user) return false;
    
    switch (feature) {
      case 'ai-recommendations':
        return isSubscribed || currentPlan === 'student_pro';
      case 'grade-analytics':
        return isSubscribed || currentPlan === 'student_pro';
      case 'unlimited-storage':
        return isSubscribed || currentPlan === 'student_pro';
      case 'unlimited-terms':
        return isSubscribed || currentPlan === 'student_pro';
      case 'advanced-tracking':
        return isSubscribed || currentPlan === 'student_pro';
      default:
        return false;
    }
  }, [user, isSubscribed, currentPlan]);

  // Get upgrade suggestions - Updated to match your plan structure
  const getUpgradeSuggestion = useCallback(() => {
    if (currentPlan === 'free') {
      return {
        plan: 'student_pro' as const,
        reason: 'Upgrade to Student Pro to unlock advanced features and unlimited usage.',
        features: [
          'Grade analytics & insights',
          'AI-powered recommendations', 
          'Unlimited file storage',
          'Unlimited Terms',
          '14-day free trial'
        ]
      };
    }
    
    if (hasExceededStorageLimit && currentPlan === 'free') {
      return {
        plan: 'student_pro' as const,
        reason: 'You\'ve reached your 5GB storage limit. Upgrade for unlimited storage.',
        features: ['Unlimited file storage', 'AI-powered recommendations', 'Grade analytics']
      };
    }
    
    return null;
  }, [hasExceededStorageLimit, currentPlan]);

  return {
    // Subscription status
    currentPlan,
    subscriptionStatus,
    isSubscribed,
    isTrial,
    
    // Plan limits and usage
    planLimits,
    currentAiUsage,
    currentStorage,
    hasExceededAiLimit,
    hasExceededStorageLimit,
    hasExceededAnyLimit,
    
    // Usage percentage
    aiUsagePercentage: planLimits.aiUsageLimit === Infinity ? 0 : 
      Math.min((currentAiUsage / planLimits.aiUsageLimit) * 100, 100),
    storageUsagePercentage: planLimits.storageLimit === Infinity ? 0 : 
      Math.min((currentStorage / planLimits.storageLimit) * 100, 100),
    
    // Actions
    subscribeToPlan,
    cancelSubscription,
    canAccessFeature,
    
    // Upgrade suggestions
    upgradeSuggestion: getUpgradeSuggestion(),
    
    // Cost tracking integration
    costSummary,
    
    // All available plans
    availablePlans: PLAN_LIMITS,
  };
}
