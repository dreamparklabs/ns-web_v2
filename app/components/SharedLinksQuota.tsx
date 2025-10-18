import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useFeatureGate } from "../hooks/useFeatureGate";
import { useClerkBilling } from "../hooks/useClerkBilling";
import { useState } from "react";
import FeatureUpgradePrompt from "./FeatureUpgradePrompt";

interface SharedLinksQuotaProps {
  compact?: boolean;
}

export default function SharedLinksQuota({ compact = false }: SharedLinksQuotaProps) {
  const { user } = useUser();
  const { trackUsage } = useFeatureGate();
  const { subscribeToPlan, isLoading: isBillingLoading } = useClerkBilling();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const sharedLinksQuota = useQuery(
    api.files.getSharedLinksQuota,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  if (!sharedLinksQuota) return null;
  
  // For Pro users with unlimited sharing, show a simple card with count only
  if (sharedLinksQuota.isUnlimited && compact) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
        <div className="flex items-center justify-between h-full">
          <div>
            <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Shared Links</p>
            <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">
              {sharedLinksQuota.used}
            </p>
          </div>
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }
  
  if (sharedLinksQuota.isUnlimited) return null;

  const { used, limit, plan } = sharedLinksQuota;
  const atLimit = used >= limit;
  const percentUsed = Math.round((used / limit) * 100);

  const handleUpgradeClick = async () => {
    trackUsage('unlimited_storage_share', { action: 'upgrade_clicked_from_shared_links', usedCount: used });
    setShowUpgradePrompt(true);
  };

  if (compact) {
    return (
      <>
        <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
          <div className="flex items-center justify-between h-full">
            <div>
              <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Shared Links</p>
              <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">
                {used} / {limit}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </div>
          </div>
        </div>
        <FeatureUpgradePrompt
          featureId="unlimited_storage_share"
          isOpen={showUpgradePrompt}
          onClose={() => setShowUpgradePrompt(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className={`rounded-lg border p-4 ${
        atLimit
          ? 'bg-orange-50 dark:bg-orange-900 dark:bg-opacity-20 border-orange-200 dark:border-orange-800'
          : 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border-blue-200 dark:border-blue-800'
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className={`text-sm font-semibold ${
              atLimit
                ? 'text-orange-900 dark:text-orange-200'
                : 'text-blue-900 dark:text-blue-200'
            } mb-1`}>
              Shared Links
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {plan === 'northstar_basic' ? 'Basic Plan (2 links)' : 'Free Plan'}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${
              atLimit
                ? 'text-orange-900 dark:text-orange-200'
                : 'text-blue-900 dark:text-blue-200'
            }`}>
              {used} / {limit}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">used</p>
          </div>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              atLimit ? 'bg-orange-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>

        {atLimit && (
          <div className="mt-3 p-3 rounded-lg bg-orange-100 dark:bg-orange-900 dark:bg-opacity-30">
            <div className="flex items-start gap-2 mb-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-xs font-medium text-orange-900 dark:text-orange-200">
                  Shared link limit reached!
                </p>
                <p className="text-xs mt-1 text-orange-800 dark:text-orange-300">
                  You've used all {limit} of your shared links. Unshare a file or upgrade to Pro for unlimited sharing.
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
        featureId="unlimited_storage_share"
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
      />
    </>
  );
}

