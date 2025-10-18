import React from 'react';
import { useQuery } from 'convex/react';
import { useClerkBilling, usePlanAccess, useFeatureAccess } from '../hooks/useClerkBilling';
import { PricingTable } from './ClerkBillingComponents';
import { api } from '../../convex/_generated/api';
import { useUser } from '@clerk/clerk-react';

interface UsageDashboardProps {
  showPricingTable?: boolean;
  className?: string;
}

export function UsageDashboard({ showPricingTable = false, className = '' }: UsageDashboardProps) {
  const { user } = useUser();
  const { getCurrentPlan } = useClerkBilling();
  const { currentPlan, isSubscribed } = usePlanAccess();

  // Get the Convex user to access the Convex _id
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  // Get real usage data from cost tracking system using Convex user ID
  const costSummary = useQuery(
    api.userCosts.getUserCostSummary,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  // Get real file storage usage
  const totalStorageBytes = useQuery(
    api.files.getUserTotalStorage,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  // Plan limits configuration
  const planLimits = {
    free_user: {
      name: 'Free',
      price: 0,
      aiUsageLimit: 10000,
      storageLimit: 5 * 1024 * 1024 * 1024, // 5GB
    },
    northstar_basic: {
      name: 'Northstar Basic',
      price: 4.99,
      aiUsageLimit: 50000,
      storageLimit: 1024 * 1024 * 1024, // 1GB
    },
    northstar_pro: {
      name: 'Northstar Pro',
      price: 14.99,
      aiUsageLimit: Infinity,
      storageLimit: Infinity,
    }
  };

  const currentPlanInfo = planLimits[currentPlan?.plan as keyof typeof planLimits] || planLimits.free_user;

  // Calculate real usage data from cost tracking and file storage
  const currentAiUsage = costSummary?.aiCostUSD ?
    Math.round(costSummary.aiCostUSD * 1000000 / 0.5) : 0; // Rough token estimate from cost
  const currentStorage = totalStorageBytes || 0; // Use actual file storage in bytes

  const aiUsagePercentage = currentPlanInfo.aiUsageLimit === Infinity ? 0 :
    (currentAiUsage / currentPlanInfo.aiUsageLimit) * 100;
  const storageUsagePercentage = currentPlanInfo.storageLimit === Infinity ? 0 :
    (currentStorage / currentPlanInfo.storageLimit) * 100;
  const hasExceededAnyLimit = aiUsagePercentage >= 100 || storageUsagePercentage >= 100;

  const upgradeSuggestion = currentPlan?.plan === 'free_user' ? {
    reason: 'You\'re approaching your usage limits. Upgrade to Northstar Pro for unlimited access.',
    plan: 'Northstar Pro',
    features: [
      'Unlimited AI usage',
      'Unlimited file storage',
      'Academic Progress Analytics',
      'AI-Powered Study Buddy',
      'Homework Help'
    ]
  } : currentPlan?.plan === 'northstar_basic' ? {
    reason: 'Upgrade to Northstar Pro for unlimited access and premium features.',
    plan: 'Northstar Pro',
    features: [
      'Unlimited AI usage',
      'Unlimited file storage',
      'Academic Progress Analytics',
      'AI-Powered Study Buddy',
      'Homework Help'
    ]
  } : null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTokens = (tokens: number) => {
    if (tokens === 0) return '0';
    if (tokens >= 1000000) return (tokens / 1000000).toFixed(1) + 'M';
    if (tokens >= 1000) return (tokens / 1000).toFixed(1) + 'k';
    return tokens.toString();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Plan Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentPlanInfo.name} Plan
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {currentPlan?.plan === 'free' ? 'Free forever' : `$${currentPlanInfo.price}/month`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">Monthly Cost</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              ${currentPlanInfo.price.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Usage
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              hasExceededAnyLimit && aiUsagePercentage >= 100
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : aiUsagePercentage >= 80
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {formatTokens(currentAiUsage)} / {formatTokens(currentPlanInfo.aiUsageLimit)}
            </span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                hasExceededAnyLimit && aiUsagePercentage >= 100
                  ? 'bg-red-500'
                  : aiUsagePercentage >= 80
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(aiUsagePercentage, 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{formatTokens(currentAiUsage)} tokens used</span>
            <span>{formatTokens(currentPlanInfo.aiUsageLimit)} limit</span>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Storage
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              hasExceededAnyLimit && storageUsagePercentage >= 100
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : storageUsagePercentage >= 80
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {formatBytes(currentStorage)} / {formatBytes(currentPlanInfo.storageLimit)}
            </span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                hasExceededAnyLimit && storageUsagePercentage >= 100
                  ? 'bg-red-500'
                  : storageUsagePercentage >= 80
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(storageUsagePercentage, 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{formatBytes(currentStorage)} used</span>
            <span>{formatBytes(currentPlanInfo.storageLimit)} limit</span>
          </div>
        </div>
      </div>

      {/* Cost Breakdown - Simplified for Clerk billing */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Plan Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatTokens(currentAiUsage)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">AI Tokens Used</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatBytes(currentStorage)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Storage Used</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold ${
              currentPlan?.plan === 'northstar_pro' ? 'text-purple-600 dark:text-purple-400' :
              currentPlan?.plan === 'northstar_basic' ? 'text-blue-600 dark:text-blue-400' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              {currentPlan?.plan === 'northstar_pro' ? 'Pro' :
               currentPlan?.plan === 'northstar_basic' ? 'Basic' :
               'Free'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Plan Type</div>
          </div>
        </div>
      </div>

      {/* Upgrade Suggestion */}
      {upgradeSuggestion && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
                Upgrade Recommended
              </h3>
              <p className="mt-1 text-blue-800 dark:text-blue-200">
                {upgradeSuggestion.reason}
              </p>
              <div className="mt-3">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Upgrade to {upgradeSuggestion.plan} includes:
                </div>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  {upgradeSuggestion.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Table */}
      {showPricingTable && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Available Plans
          </h2>
          <PricingTable />
        </div>
      )}
    </div>
  );
}
