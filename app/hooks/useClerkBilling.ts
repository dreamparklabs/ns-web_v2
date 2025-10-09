import { useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';

/**
 * Clerk Billing Hook using official Clerk methods
 * Based on: https://clerk.com/docs/nextjs/guides/billing/for-b2c
 */
export function useClerkBilling() {
  const { user } = useUser();

  // Check if user has access to a plan using Clerk's has() method
  const hasPlan = useCallback((planName: string) => {
    // In a real implementation, this would use Clerk's has() method
    // For now, we'll check user metadata or return false
    if (!user) return false;
    
    // Check if user has the plan in their metadata
    const subscription = user.publicMetadata?.subscription as any;
    return subscription?.plan === planName && subscription?.status === 'active';
  }, [user]);

  // Check if user has access to a feature using Clerk's has() method
  const hasFeature = useCallback((featureName: string) => {
    // In a real implementation, this would use Clerk's has() method
    // For now, we'll check based on the user's plan
    if (!user) return false;
    
    const subscription = user.publicMetadata?.subscription as any;
    const plan = subscription?.plan || 'free';
    
    // Define which features are available for each plan
    const planFeatures = {
      free: ['basic_dashboard', 'assignment_tracking', 'calendar_integration'],
      student_pro: [
        'basic_dashboard', 
        'assignment_tracking', 
        'calendar_integration',
        'grade_analytics',
        'ai_recommendations',
        'unlimited_storage',
        'unlimited_terms'
      ]
    };
    
    const userFeatures = planFeatures[plan as keyof typeof planFeatures] || planFeatures.free;
    return userFeatures.includes(featureName);
  }, [user]);

  // Get current plan information
  const getCurrentPlan = useCallback(() => {
    if (!user) return null;
    
    const subscription = user.publicMetadata?.subscription as any;
    return {
      plan: subscription?.plan || 'free',
      status: subscription?.status || 'active',
      isSubscribed: subscription?.plan !== 'free' && subscription?.status === 'active'
    };
  }, [user]);

  // Subscribe to a plan (placeholder - would integrate with Clerk billing API)
  const subscribeToPlan = useCallback(async (planId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      // TODO: Integrate with Clerk billing API
      // This would typically involve:
      // 1. Creating a subscription via Clerk's billing API
      // 2. Processing payment via Stripe
      // 3. Updating user metadata via webhooks
      
      console.log('Subscribing to plan:', planId);
      
      // For demo purposes, show success message
      alert(`Successfully subscribed to ${planId} plan!`);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to subscribe to plan:', error);
      throw error;
    }
  }, [user]);

  // Cancel subscription (placeholder)
  const cancelSubscription = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      // TODO: Integrate with Clerk billing API
      console.log('Canceling subscription');
      
      // For demo purposes, show success message
      alert('Subscription canceled successfully!');
      
      return { success: true };
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  }, [user]);

  return {
    // Clerk billing methods
    hasPlan,
    hasFeature,
    getCurrentPlan,
    subscribeToPlan,
    cancelSubscription,
    
    // Current user info
    user,
    isAuthenticated: !!user,
  };
}

/**
 * Hook for checking specific features (matches Clerk's feature names)
 */
export function useFeatureAccess() {
  const { hasFeature } = useClerkBilling();
  
  return {
    // Core features
    canAccessBasicDashboard: hasFeature('basic_dashboard'),
    canAccessAssignmentTracking: hasFeature('assignment_tracking'),
    canAccessCalendarIntegration: hasFeature('calendar_integration'),
    
    // Premium features (Student Pro only)
    canAccessGradeAnalytics: hasFeature('grade_analytics'),
    canAccessAIRecommendations: hasFeature('ai_recommendations'),
    canAccessUnlimitedStorage: hasFeature('unlimited_storage'),
    canAccessUnlimitedTerms: hasFeature('unlimited_terms'),
  };
}

/**
 * Hook for checking plan access
 */
export function usePlanAccess() {
  const { hasPlan, getCurrentPlan } = useClerkBilling();
  
  return {
    // Plan checks
    hasFreePlan: hasPlan('free'),
    hasStudentProPlan: hasPlan('student_pro'),
    
    // Current plan info
    currentPlan: getCurrentPlan(),
    isSubscribed: getCurrentPlan()?.isSubscribed || false,
  };
}


