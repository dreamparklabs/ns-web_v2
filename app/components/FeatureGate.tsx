import React, { ReactNode } from 'react';
import { useBillingSimple as useBilling } from '../hooks/useBillingSimple';
import { PricingTable } from './PricingTable';

interface FeatureGateProps {
  feature: 'ai-recommendations' | 'grade-analytics' | 'unlimited-storage' | 'unlimited-terms' | 'advanced-tracking';
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradeModal?: boolean;
  className?: string;
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback, 
  showUpgradeModal = true,
  className = '' 
}: FeatureGateProps) {
  const { canAccessFeature, upgradeSuggestion, currentPlan } = useBilling();
  
  const hasAccess = canAccessFeature(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Custom fallback UI
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  return (
    <div className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}>
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {feature === 'ai-recommendations' && 'AI-Powered Recommendations'}
          {feature === 'grade-analytics' && 'Grade Analytics & Insights'}
          {feature === 'unlimited-storage' && 'Unlimited Storage'}
          {feature === 'unlimited-terms' && 'Unlimited Terms'}
          {feature === 'advanced-tracking' && 'Advanced Assignment Tracking'}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {feature === 'ai-recommendations' && 'AI-powered recommendations are available with Student Pro.'}
          {feature === 'grade-analytics' && 'Grade analytics and insights are available with Student Pro.'}
          {feature === 'unlimited-storage' && 'Unlimited file storage is available with Student Pro.'}
          {feature === 'unlimited-terms' && 'Unlimited terms are available with Student Pro.'}
          {feature === 'advanced-tracking' && 'Advanced assignment tracking is available with Student Pro.'}
        </p>

        {upgradeSuggestion && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="text-left">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Upgrade to {upgradeSuggestion.plan} to unlock:
              </h4>
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
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.href = '/billing'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            View Plans
          </button>
          
          {currentPlan === 'free' && (
            <button
              onClick={() => {
                // This would trigger the subscription flow
                console.log('Starting subscription flow...');
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Start Free Trial
            </button>
          )}
        </div>

        {showUpgradeModal && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <p>Current plan: <span className="font-medium capitalize">{currentPlan}</span></p>
          </div>
        )}
      </div>
    </div>
  );
}

// Higher-order component for easy feature gating
export function withFeatureGate<P extends object>(
  Component: React.ComponentType<P>,
  feature: FeatureGateProps['feature'],
  fallback?: ReactNode
) {
  return function FeatureGatedComponent(props: P) {
    return (
      <FeatureGate feature={feature} fallback={fallback}>
        <Component {...props} />
      </FeatureGate>
    );
  };
}

// Hook for conditional rendering
export function useFeatureGate(feature: FeatureGateProps['feature']) {
  const { canAccessFeature, upgradeSuggestion, currentPlan } = useBilling();
  
  return {
    hasAccess: canAccessFeature(feature),
    upgradeSuggestion,
    currentPlan,
    // Helper to get feature-specific messaging
    getMessage: () => {
      switch (feature) {
        case 'ai-recommendations':
          return {
            title: 'AI-Powered Recommendations',
            description: 'AI-powered recommendations are available with Student Pro.',
            action: 'Upgrade to Student Pro for AI insights'
          };
        case 'grade-analytics':
          return {
            title: 'Grade Analytics & Insights',
            description: 'Grade analytics and insights are available with Student Pro.',
            action: 'Upgrade to Student Pro for detailed analytics'
          };
        case 'unlimited-storage':
          return {
            title: 'Unlimited Storage',
            description: 'Unlimited file storage is available with Student Pro.',
            action: 'Upgrade to Student Pro for unlimited storage'
          };
        case 'unlimited-terms':
          return {
            title: 'Unlimited Terms',
            description: 'Unlimited terms are available with Student Pro.',
            action: 'Upgrade to Student Pro for unlimited terms'
          };
        case 'advanced-tracking':
          return {
            title: 'Advanced Assignment Tracking',
            description: 'Advanced assignment tracking is available with Student Pro.',
            action: 'Upgrade to Student Pro for advanced features'
          };
        default:
          return {
            title: 'Feature Restricted',
            description: 'This feature requires Student Pro.',
            action: 'Upgrade to Student Pro'
          };
      }
    }
  };
}
