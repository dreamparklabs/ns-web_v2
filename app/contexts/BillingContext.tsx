import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useCostTracking } from '../hooks/useCostTracking';

interface BillingContextType {
  // Subscription status
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'unpaid' | null;
  subscriptionPlan: string | null;
  subscriptionEndDate: Date | null;
  isSubscribed: boolean;
  isTrial: boolean;
  
  // Plan limits and usage
  aiUsageLimit: number;
  currentAiUsage: number;
  storageLimit: number;
  currentStorage: number;
  
  // Billing actions
  subscribeToPlan: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  updatePaymentMethod: () => Promise<void>;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

interface BillingProviderProps {
  children: React.ReactNode;
}

// Default plan limits
const PLAN_LIMITS = {
  free: {
    aiUsageLimit: 10000, // 10k tokens per month
    storageLimit: 100 * 1024 * 1024, // 100MB
  },
  basic: {
    aiUsageLimit: 100000, // 100k tokens per month
    storageLimit: 1024 * 1024 * 1024, // 1GB
  },
  pro: {
    aiUsageLimit: 1000000, // 1M tokens per month
    storageLimit: 10 * 1024 * 1024 * 1024, // 10GB
  },
  enterprise: {
    aiUsageLimit: Infinity, // Unlimited
    storageLimit: Infinity, // Unlimited
  },
};

export function BillingProvider({ children }: BillingProviderProps) {
  const { user } = useUser();
  const { trackRevenue } = useCostTracking();
  
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load subscription data from Clerk
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    loadSubscriptionData();
  }, [user]);

  const loadSubscriptionData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if user has subscription data in Clerk
      const subscription = user?.publicMetadata?.subscription as any;
      
      if (subscription) {
        setSubscriptionStatus(subscription.status);
        setSubscriptionPlan(subscription.plan);
        setSubscriptionEndDate(subscription.endDate ? new Date(subscription.endDate) : null);
      } else {
        // Default to free plan
        setSubscriptionStatus('active');
        setSubscriptionPlan('free');
      }
    } catch (err) {
      console.error('Failed to load subscription data:', err);
      setError('Failed to load subscription information');
      // Default to free plan on error
      setSubscriptionStatus('active');
      setSubscriptionPlan('free');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToPlan = async (planId: string) => {
    try {
      setError(null);
      
      // This would integrate with Clerk's billing API when available
      // For now, we'll simulate the subscription process
      console.log('Subscribing to plan:', planId);
      
      // Track revenue in our cost tracking system
      if (user) {
        const planPricing = {
          basic: 9.99,
          pro: 29.99,
          enterprise: 99.99,
        };
        
        await trackRevenue(
          user.id as any, // This will need to be the Convex user ID
          'subscription',
          planPricing[planId as keyof typeof planPricing] || 0,
          `${planId} subscription`,
          Date.now(),
          Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
          { planId, source: 'clerk-billing' }
        );
      }
      
      // Update subscription status
      setSubscriptionStatus('active');
      setSubscriptionPlan(planId);
      setSubscriptionEndDate(new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)));
      
    } catch (err) {
      console.error('Failed to subscribe to plan:', err);
      setError('Failed to subscribe to plan. Please try again.');
      throw err;
    }
  };

  const cancelSubscription = async () => {
    try {
      setError(null);
      
      // This would integrate with Clerk's billing API
      console.log('Canceling subscription');
      
      setSubscriptionStatus('canceled');
      setSubscriptionPlan('free');
      setSubscriptionEndDate(null);
      
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      setError('Failed to cancel subscription. Please try again.');
      throw err;
    }
  };

  const updatePaymentMethod = async () => {
    try {
      setError(null);
      
      // This would open Clerk's payment method update UI
      console.log('Updating payment method');
      
    } catch (err) {
      console.error('Failed to update payment method:', err);
      setError('Failed to update payment method. Please try again.');
      throw err;
    }
  };

  // Calculate current usage (this would come from your cost tracking system)
  const currentAiUsage = 0; // TODO: Get from cost tracking
  const currentStorage = 0; // TODO: Get from storage tracking

  // Get plan limits
  const planLimits = PLAN_LIMITS[subscriptionPlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
  
  const isSubscribed = subscriptionStatus === 'active' && subscriptionPlan !== 'free';
  const isTrial = subscriptionStatus === 'trialing';

  const value: BillingContextType = {
    subscriptionStatus: subscriptionStatus as any,
    subscriptionPlan,
    subscriptionEndDate,
    isSubscribed,
    isTrial,
    aiUsageLimit: planLimits.aiUsageLimit,
    currentAiUsage,
    storageLimit: planLimits.storageLimit,
    currentStorage,
    subscribeToPlan,
    cancelSubscription,
    updatePaymentMethod,
    isLoading,
    error,
  };

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (context === undefined) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
}




