import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeatureGate } from '../hooks/useFeatureGate';
import { useClerkBilling } from '../hooks/useClerkBilling';
import type { FeatureId } from '../config/features';

interface FeatureUpgradePromptProps {
  featureId: FeatureId;
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

/**
 * Modal that shows when a user tries to access a locked feature
 * Displays feature benefits and upgrade options
 */
export default function FeatureUpgradePrompt({
  featureId,
  isOpen,
  onClose,
  onUpgrade,
}: FeatureUpgradePromptProps) {
  const { getUpgradeInfo, trackUsage } = useFeatureGate();
  const { subscribeToPlan, isLoading } = useClerkBilling();

  const upgradeInfo = getUpgradeInfo(featureId);

  if (!upgradeInfo) return null;

  const handleUpgrade = async () => {
    // Track the upgrade attempt
    trackUsage(featureId, { action: 'upgrade_clicked' });

    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default behavior: redirect to Pro plan checkout
      try {
        await subscribeToPlan('northstar_pro');
      } catch (error) {
        console.error('Failed to start upgrade:', error);
      }
    }
  };

  const handleClose = () => {
    trackUsage(featureId, { action: 'upgrade_dismissed' });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full mx-auto mb-4">
              <svg
                className="w-8 h-8 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
              Unlock {upgradeInfo.featureName}
            </h3>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              {upgradeInfo.description}
            </p>

            {/* Upgrade Message */}
            {upgradeInfo.upgradeMessage && (
              <div className="bg-purple-50 dark:bg-purple-900 dark:bg-opacity-20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-purple-900 dark:text-purple-200">
                  {upgradeInfo.upgradeMessage}
                </p>
              </div>
            )}

            {/* Current vs Required Plan */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Your Plan:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {upgradeInfo.currentPlan === 'northstar_basic'
                    ? 'Northstar Basic'
                    : upgradeInfo.currentPlan === 'northstar_pro'
                    ? 'Northstar Pro'
                    : 'No Active Plan'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Required:</span>
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Northstar Pro
                </span>
              </div>
            </div>

            {/* Learn More Link */}
            {upgradeInfo.learnMoreUrl && (
              <a
                href={upgradeInfo.learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline block text-center mb-6"
                onClick={() => trackUsage(featureId, { action: 'learn_more_clicked' })}
              >
                Learn more about this feature →
              </a>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Upgrade to Pro'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Inline upgrade banner that can be placed within a feature area
 */
interface UpgradeBannerProps {
  featureId: FeatureId;
  compact?: boolean;
  onUpgrade?: () => void;
}

export function FeatureUpgradeBanner({ featureId, compact = false, onUpgrade }: UpgradeBannerProps) {
  const { getUpgradeInfo, trackUsage } = useFeatureGate();
  const { subscribeToPlan, isLoading } = useClerkBilling();

  const upgradeInfo = getUpgradeInfo(featureId);

  if (!upgradeInfo) return null;

  const handleUpgrade = async () => {
    trackUsage(featureId, { action: 'inline_upgrade_clicked' });

    if (onUpgrade) {
      onUpgrade();
    } else {
      try {
        await subscribeToPlan('northstar_pro');
      } catch (error) {
        console.error('Failed to start upgrade:', error);
      }
    }
  };

  if (compact) {
    return (
      <div className="bg-purple-50 dark:bg-purple-900 dark:bg-opacity-20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full">
              <svg
                className="w-5 h-5 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
                {upgradeInfo.featureName} is a Pro feature
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Upgrade to unlock
              </p>
            </div>
          </div>
          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Upgrade'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 dark:bg-opacity-20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full">
          <svg
            className="w-6 h-6 text-purple-600 dark:text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Unlock {upgradeInfo.featureName}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {upgradeInfo.description}
          </p>
          {upgradeInfo.upgradeMessage && (
            <p className="text-sm text-purple-900 dark:text-purple-200 mb-4">
              {upgradeInfo.upgradeMessage}
            </p>
          )}
          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Upgrade to Northstar Pro'}
          </button>
        </div>
      </div>
    </div>
  );
}


