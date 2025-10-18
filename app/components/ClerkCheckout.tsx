import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useClerkBilling } from '../hooks/useClerkBilling';

interface ClerkCheckoutProps {
  planId: string;
  planPeriod: 'month' | 'year';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ClerkCheckout({ planId, planPeriod, onSuccess, onCancel }: ClerkCheckoutProps) {
  const { user } = useUser();
  const { subscribeToPlan, isLoading, error } = useClerkBilling();

  console.log('🔍 ClerkCheckout Debug:', {
    planId,
    planPeriod,
    onSuccess: !!onSuccess,
    onCancel: !!onCancel,
    userId: user?.id
  });

  const handleSubscribe = async () => {
    if (!user) {
      return;
    }

    try {
      const result = await subscribeToPlan(planId);
      console.log('🔍 Subscription result:', result);

      if (result.success) {
        onSuccess?.();
      }
    } catch (err) {
      console.error('🔍 Subscription error:', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Subscribe to {planId === 'northstar_basic' ? 'Northstar Basic' : 'Northstar Pro'}
        </h2>
        
        <div className="mb-6">
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {planId === 'northstar_basic' ? '$4.99' : '$14.99'}
            <span className="text-lg text-gray-500 dark:text-gray-400">/month</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {planId === 'northstar_pro' && '14-day free trial included'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-3 px-6 rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Processing...' : `Subscribe to ${planId === 'northstar_basic' ? 'Basic' : 'Pro'}`}
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          <p>• All subscriptions are billed monthly and automatically renew</p>
          <p>• You can cancel your subscription at any time</p>
          <p>• Cancellations take effect at the end of your current billing period</p>
        </div>
      </div>
    </div>
  );
}

