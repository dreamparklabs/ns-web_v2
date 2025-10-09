import React from 'react';
import { FeatureGate } from '../FeatureGate';
import { useBilling } from '../../hooks/useBilling';

/**
 * Example component showing how to use FeatureGate
 * This demonstrates gating different features behind subscription tiers
 */
export function FeatureGateExample() {
  const { currentPlan, hasExceededAnyLimit } = useBilling();

  return (
    <div className="space-y-6 p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Feature Gate Examples
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Current plan: <span className="font-medium capitalize">{currentPlan}</span>
        </p>
        
        {/* AI Recommendations Feature - Gated behind Student Pro */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            AI-Powered Recommendations
          </h3>
          <FeatureGate feature="ai-recommendations">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-green-800 dark:text-green-200">
                  AI recommendations are available! Get personalized study insights.
                </span>
              </div>
              <button className="mt-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                Get AI Recommendations
              </button>
            </div>
          </FeatureGate>
        </div>

        {/* Grade Analytics Feature - Gated behind Student Pro */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Grade Analytics & Insights
          </h3>
          <FeatureGate feature="grade-analytics">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-blue-800 dark:text-blue-200">
                  Grade analytics unlocked! View detailed insights and performance trends.
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  View Grade Trends
                </button>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  Export Grade Report
                </button>
              </div>
            </div>
          </FeatureGate>
        </div>

        {/* Unlimited Storage Feature - Gated behind Student Pro */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Unlimited File Storage
          </h3>
          <FeatureGate feature="unlimited-storage">
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-purple-800 dark:text-purple-200">
                  Unlimited storage enabled! Store all your files without limits.
                </span>
              </div>
              <button className="mt-3 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                Upload Files
              </button>
            </div>
          </FeatureGate>
        </div>

        {/* Custom fallback example */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Custom Fallback Example
          </h3>
          <FeatureGate 
            feature="ai-recommendations" 
            fallback={
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="text-center">
                  <h4 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                    🎯 Upgrade to Student Pro
                  </h4>
                  <p className="text-yellow-800 dark:text-yellow-200 mb-4">
                    Get AI recommendations, grade analytics, unlimited storage, and more!
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                      View Plans
                    </button>
                    <button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                      Start Free Trial
                    </button>
                  </div>
                </div>
              </div>
            }
          >
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-green-800 dark:text-green-200">
                This feature is unlocked! (This would normally show the actual feature)
              </p>
            </div>
          </FeatureGate>
        </div>

        {/* Usage warning */}
        {hasExceededAnyLimit && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 dark:text-red-200">
                You've exceeded your usage limits. Some features may be restricted.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
