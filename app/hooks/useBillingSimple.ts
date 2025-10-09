import { useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';

/**
 * Simplified billing hook without Convex dependency
 * Use this temporarily while fixing Convex issues
 */
export function useBillingSimple() {
  const { user } = useUser();
  
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
        'Unlimited Terms'
      ]
    },
  };

  // Get current plan from user metadata or default to free
  const currentPlan = (user?.publicMetadata?.subscription as any)?.plan || 'free';
  const subscriptionStatus = (user?.publicMetadata?.subscription as any)?.status || 'active';
  
  const isSubscribed = subscriptionStatus === 'active' && currentPlan !== 'free';
  const isTrial = subscriptionStatus === 'trialing';
  
  const planLimits = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
  
  // Simplified usage tracking (without Convex)
  const currentAiUsage = 0; // TODO: Get from cost tracking when Convex is fixed
  const currentStorage = 0; // TODO: Get actual storage usage
  
  // Check if user has exceeded limits
  const hasExceededAiLimit = currentAiUsage > planLimits.aiUsageLimit;
  const hasExceededStorageLimit = currentStorage > planLimits.storageLimit;
  const hasExceededAnyLimit = hasExceededAiLimit || hasExceededStorageLimit;

  // Subscription management functions
  const subscribeToPlan = useCallback(async (planId: keyof typeof PLAN_LIMITS) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      // For now, we'll just simulate the subscription
      // In a real implementation, you would integrate with Clerk's billing API
      console.log('Subscribing to plan:', planId);
      
      // TODO: Integrate with actual Clerk billing API when available
      // This would typically involve:
      // 1. Creating a subscription in Clerk dashboard
      // 2. Processing payment via Stripe
      // 3. Updating user metadata via webhooks
      
      // For demo purposes, we'll just show success
      alert(`Successfully subscribed to ${PLAN_LIMITS[planId].name} plan!`);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to subscribe to plan:', error);
      throw error;
    }
  }, [user]);

  const cancelSubscription = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      // For now, we'll just simulate the cancellation
      console.log('Canceling subscription');
      
      // TODO: Integrate with actual Clerk billing API when available
      alert('Subscription canceled successfully!');
      
      return { success: true };
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  }, [user]);

  // Check if user can access a feature
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

  // Get upgrade suggestions
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
    
    return null;
  }, [currentPlan]);

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
    
    // Cost tracking integration (simplified)
    costSummary: null,
    
    // All available plans
    availablePlans: PLAN_LIMITS,
  };
}
