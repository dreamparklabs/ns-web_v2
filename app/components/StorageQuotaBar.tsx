import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useFeatureGate } from "../hooks/useFeatureGate";
import { useClerkBilling } from "../hooks/useClerkBilling";
import { useState } from "react";
import FeatureUpgradePrompt from "./FeatureUpgradePrompt";

interface StorageQuotaBarProps {
  showDetails?: boolean;
  compact?: boolean;
}

export default function StorageQuotaBar({ showDetails = true, compact = false }: StorageQuotaBarProps) {
  const { user } = useUser();
  const { trackUsage } = useFeatureGate();
  const { subscribeToPlan, isLoading: isBillingLoading } = useClerkBilling();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const storageQuota = useQuery(
    api.files.getStorageQuota,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  if (!storageQuota) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };
  
  // For Pro users with unlimited storage, show a simple card with usage only
  if (storageQuota.isUnlimited && compact) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
        <div className="flex items-center justify-between h-full">
          <div>
            <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Storage Used</p>
            <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">
              {formatBytes(storageQuota.used)}
            </p>
          </div>
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
        </div>
      </div>
    );
  }
  
  if (storageQuota.isUnlimited) return null;

  const { used, limit, percentUsed, plan } = storageQuota;

  // Determine color based on usage
  const getColorClasses = () => {
    if (percentUsed >= 100) return {
      bar: 'bg-red-500',
      text: 'text-red-900 dark:text-red-200',
      bg: 'bg-red-50 dark:bg-red-900 dark:bg-opacity-20',
      border: 'border-red-200 dark:border-red-800',
    };
    if (percentUsed >= 80) return {
      bar: 'bg-orange-500',
      text: 'text-orange-900 dark:text-orange-200',
      bg: 'bg-orange-50 dark:bg-orange-900 dark:bg-opacity-20',
      border: 'border-orange-200 dark:border-orange-800',
    };
    if (percentUsed >= 60) return {
      bar: 'bg-yellow-500',
      text: 'text-yellow-900 dark:text-yellow-200',
      bg: 'bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20',
      border: 'border-yellow-200 dark:border-yellow-800',
    };
    return {
      bar: 'bg-blue-500',
      text: 'text-blue-900 dark:text-blue-200',
      bg: 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20',
      border: 'border-blue-200 dark:border-blue-800',
    };
  };

  const colors = getColorClasses();
  const shouldShowWarning = percentUsed >= 80;

  const handleUpgradeClick = async () => {
    trackUsage('unlimited_file_storage', { action: 'upgrade_clicked_from_storage_bar', percentUsed });
    setShowUpgradePrompt(true);
  };

  if (compact) {
    return (
      <>
        <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
          <div className="flex items-center justify-between h-full">
            <div>
              <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Storage Used</p>
              <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">
                {formatBytes(used)} / {formatBytes(limit)}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
          </div>
        </div>
        <FeatureUpgradePrompt
          featureId="unlimited_file_storage"
          isOpen={showUpgradePrompt}
          onClose={() => setShowUpgradePrompt(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className={`text-sm font-semibold ${colors.text} mb-1`}>Storage Usage</h3>
            {showDetails && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {plan === 'northstar_basic' ? 'Basic Plan (1GB)' : 'Free Plan'}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${colors.text}`}>{percentUsed}%</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">used</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
          <div
            className={`h-3 rounded-full ${colors.bar} transition-all duration-300`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>

        {/* Details */}
        {showDetails && (
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-3">
            <span>{formatBytes(used)} used</span>
            <span>{formatBytes(limit - used)} remaining</span>
          </div>
        )}

        {/* Warning/Upgrade Section */}
        {shouldShowWarning && (
          <div className={`mt-3 p-3 rounded-lg ${percentUsed >= 100 ? 'bg-red-100 dark:bg-red-900 dark:bg-opacity-30' : 'bg-orange-100 dark:bg-orange-900 dark:bg-opacity-30'}`}>
            <div className="flex items-start gap-2 mb-2">
              <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${percentUsed >= 100 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className={`text-xs font-medium ${percentUsed >= 100 ? 'text-red-900 dark:text-red-200' : 'text-orange-900 dark:text-orange-200'}`}>
                  {percentUsed >= 100
                    ? 'Storage limit reached!'
                    : 'Storage almost full'}
                </p>
                <p className={`text-xs mt-1 ${percentUsed >= 100 ? 'text-red-800 dark:text-red-300' : 'text-orange-800 dark:text-orange-300'}`}>
                  {percentUsed >= 100
                    ? 'You cannot upload more files. Upgrade to Pro for unlimited storage.'
                    : 'You\'re running out of space. Upgrade to Pro for unlimited storage.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleUpgradeClick}
              disabled={isBillingLoading}
              className="w-full px-4 py-2 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBillingLoading ? 'Processing...' : 'Upgrade to Pro'}
            </button>
          </div>
        )}
      </div>
      <FeatureUpgradePrompt
        featureId="unlimited_file_storage"
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
      />
    </>
  );
}

