import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useFeatureGate } from "../hooks/useFeatureGate";
import { useClerkBilling } from "../hooks/useClerkBilling";
import { useState } from "react";
import FeatureUpgradePrompt from "./FeatureUpgradePrompt";

export default function StorageUpgradeCard() {
  const { user } = useUser();
  const { trackUsage } = useFeatureGate();
  const { subscribeToPlan, isLoading: isBillingLoading } = useClerkBilling();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const storageQuota = useQuery(
    api.files.getStorageQuota,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  // Don't show upgrade card if no data or if user already has Pro (unlimited storage)
  if (!storageQuota || storageQuota.isUnlimited) return null;

  const { used, limit, percentUsed } = storageQuota;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Determine color based on usage
  const getColorClasses = () => {
    if (percentUsed >= 100) return {
      bar: 'bg-red-500',
      text: 'text-red-900 dark:text-red-200',
    };
    if (percentUsed >= 80) return {
      bar: 'bg-orange-500',
      text: 'text-orange-900 dark:text-orange-200',
    };
    if (percentUsed >= 60) return {
      bar: 'bg-yellow-500',
      text: 'text-yellow-900 dark:text-yellow-200',
    };
    return {
      bar: 'bg-blue-500',
      text: 'text-blue-900 dark:text-blue-200',
    };
  };

  const colors = getColorClasses();
  const shouldShowWarning = percentUsed >= 80;

  const handleUpgradeClick = async () => {
    trackUsage('unlimited_file_storage', { action: 'upgrade_clicked_from_upgrade_card', percentUsed });
    setShowUpgradePrompt(true);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl px-3 xl:px-4 h-full flex flex-col py-3 xl:py-4">
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Upgrade</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Get unlimited storage and file sharing with Pro
          </p>
        </div>
        
        <button
          onClick={handleUpgradeClick}
          disabled={isBillingLoading}
          className="w-full px-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBillingLoading ? 'Processing...' : 'Upgrade to Pro'}
        </button>
      </div>
      <FeatureUpgradePrompt
        featureId="unlimited_file_storage"
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
      />
    </>
  );
}

