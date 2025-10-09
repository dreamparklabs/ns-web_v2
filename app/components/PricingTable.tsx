import React, { useState } from 'react';
import { useBillingSimple as useBilling } from '../hooks/useBillingSimple';
import { useUser } from '@clerk/clerk-react';

interface PricingTableProps {
  onPlanSelect?: (planId: string) => void;
  showCurrentPlan?: boolean;
  className?: string;
}

export function PricingTable({ onPlanSelect, showCurrentPlan = true, className = '' }: PricingTableProps) {
  const { availablePlans, currentPlan, subscribeToPlan, isSubscribed } = useBilling();
  const { user } = useUser();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handlePlanSelect = async (planId: string) => {
    if (!user) {
      alert('Please sign in to subscribe to a plan');
      return;
    }

    if (planId === currentPlan) {
      return; // Already on this plan
    }

    setLoadingPlan(planId);
    
    try {
      await subscribeToPlan(planId as any);
      onPlanSelect?.(planId);
    } catch (error) {
      console.error('Failed to subscribe to plan:', error);
      alert('Failed to subscribe to plan. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = Object.entries(availablePlans).map(([id, plan]) => ({
    id,
    ...plan,
  }));

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {plans.map((plan) => {
        const isCurrentPlan = plan.id === currentPlan;
        const isPopular = plan.id === 'pro';
        const isLoading = loadingPlan === plan.id;
        
        return (
          <div
            key={plan.id}
            className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 transition-all duration-200 hover:shadow-xl ${
              isCurrentPlan 
                ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' 
                : isPopular 
                ? 'border-purple-500' 
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            {isPopular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}
            
            {isCurrentPlan && showCurrentPlan && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Current Plan
                </span>
              </div>
            )}

            <div className="p-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                  {plan.name}
                </h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${plan.price}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                    /month
                  </span>
                  {plan.annualPrice && (
                    <div className="mt-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        or ${plan.annualPrice}/month billed annually
                      </span>
                    </div>
                  )}
                  {plan.trialDays && (
                    <div className="mt-1">
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        {plan.trialDays}-day free trial
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {plan.features?.map((feature, index) => (
                  <div key={`${plan.id}-feature-${index}`} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 py-2 px-4 rounded-lg font-medium cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlanSelect(plan.id)}
                    disabled={isLoading}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      isPopular
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : plan.id === 'free'
                        ? 'bg-gray-600 hover:bg-gray-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : plan.id === 'free' ? (
                      'Get Started'
                    ) : (
                      `Subscribe to ${plan.name}`
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
