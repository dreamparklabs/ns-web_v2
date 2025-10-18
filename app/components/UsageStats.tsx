import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from '@clerk/clerk-react';

interface UsageStatsProps {
  currentPlan: string;
}

export function UsageStats({ currentPlan }: UsageStatsProps) {
  const { user } = useUser();

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
      aiUsageLimit: 10000,
      storageLimit: 5 * 1024 * 1024 * 1024, // 5GB
    },
    northstar_basic: {
      aiUsageLimit: 50000,
      storageLimit: 1024 * 1024 * 1024, // 1GB
    },
    northstar_pro: {
      aiUsageLimit: Infinity,
      storageLimit: Infinity,
    }
  };

  const currentPlanInfo = planLimits[currentPlan as keyof typeof planLimits] || planLimits.free_user;

  // Calculate real usage data from cost tracking and file storage
  const currentAiUsage = costSummary?.aiCostUSD ?
    Math.round(costSummary.aiCostUSD * 1000000 / 0.5) : 0; // Rough token estimate from cost
  const currentStorage = totalStorageBytes || 0; // Use actual file storage in bytes

  const aiUsagePercentage = currentPlanInfo.aiUsageLimit === Infinity ? 0 :
    (currentAiUsage / currentPlanInfo.aiUsageLimit) * 100;
  const storageUsagePercentage = currentPlanInfo.storageLimit === Infinity ? 0 :
    (currentStorage / currentPlanInfo.storageLimit) * 100;

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* AI Usage */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Usage
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            aiUsagePercentage >= 100
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              : aiUsagePercentage >= 80
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          }`}>
            {formatTokens(currentAiUsage)} / {currentPlanInfo.aiUsageLimit === Infinity ? '∞' : formatTokens(currentPlanInfo.aiUsageLimit)}
          </span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              aiUsagePercentage >= 100
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
          <span>{currentPlanInfo.aiUsageLimit === Infinity ? 'Unlimited' : `${formatTokens(currentPlanInfo.aiUsageLimit)} limit`}</span>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Storage
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            storageUsagePercentage >= 100
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              : storageUsagePercentage >= 80
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          }`}>
            {formatBytes(currentStorage)} / {currentPlanInfo.storageLimit === Infinity ? '∞' : formatBytes(currentPlanInfo.storageLimit)}
          </span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              storageUsagePercentage >= 100
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
          <span>{currentPlanInfo.storageLimit === Infinity ? 'Unlimited' : `${formatBytes(currentPlanInfo.storageLimit)} limit`}</span>
        </div>
      </div>
    </div>
  );
}


