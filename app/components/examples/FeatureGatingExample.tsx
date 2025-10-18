/**
 * Example Component: Feature Gating Usage
 * 
 * This file demonstrates various ways to use the feature gating system.
 * Copy these patterns into your own components!
 */

import React, { useState } from 'react';
import { useFeatureGate, useFeature, FeatureGate } from '../../hooks/useFeatureGate';
import FeatureUpgradePrompt, { FeatureUpgradeBanner } from '../FeatureUpgradePrompt';

/**
 * Example 1: Simple Boolean Check
 * Use when you just need to show/hide a feature
 */
export function Example1_SimpleCheck() {
  const { hasAccess, trackUsage } = useFeatureGate();
  
  const handleUseFeature = () => {
    if (!hasAccess('ai_study_buddy')) {
      alert('You need Pro to use AI Study Buddy');
      return;
    }
    
    // Track usage
    trackUsage('ai_study_buddy', { 
      action: 'question_asked',
      questionLength: 100 
    });
    
    // Use the feature...
    console.log('Using AI Study Buddy!');
  };
  
  return (
    <div>
      <h3>AI Study Buddy</h3>
      {hasAccess('ai_study_buddy') ? (
        <button onClick={handleUseFeature}>Ask Question</button>
      ) : (
        <p>🔒 Upgrade to Pro to use AI Study Buddy</p>
      )}
    </div>
  );
}

/**
 * Example 2: Detailed Access Check
 * Use when you need to know WHY access was denied
 */
export function Example2_DetailedCheck() {
  const { checkAccess, trackUsage } = useFeatureGate();
  
  const handleUploadFile = (fileSize: number) => {
    const access = checkAccess('unlimited_storage');
    
    if (!access.hasAccess) {
      if (access.reason === 'plan') {
        alert(`Upgrade required: ${access.upgradeMessage}`);
      } else if (access.reason === 'feature_flag') {
        alert('This feature is temporarily unavailable');
      } else if (access.reason === 'account_status') {
        alert('Your account is suspended. Please reactivate.');
      }
      return;
    }
    
    // Track usage with metadata
    trackUsage('unlimited_storage', {
      fileSize,
      action: 'file_uploaded',
    });
    
    // Upload file...
  };
  
  return (
    <button onClick={() => handleUploadFile(5 * 1024 * 1024)}>
      Upload Large File
    </button>
  );
}

/**
 * Example 3: Using the useFeature Hook
 * Use for cleaner code when working with a single feature
 */
export function Example3_UseFeatureHook() {
  const { hasAccess, trackUsage, upgradeInfo } = useFeature('academic_analytics');
  
  if (!hasAccess) {
    return (
      <div className="p-6 bg-gray-100 rounded-lg">
        <h3 className="text-xl font-bold mb-2">{upgradeInfo?.featureName}</h3>
        <p className="text-gray-600 mb-4">{upgradeInfo?.upgradeMessage}</p>
        <button className="px-4 py-2 bg-purple-600 text-white rounded">
          Upgrade to Pro
        </button>
      </div>
    );
  }
  
  const handleViewAnalytics = () => {
    trackUsage({ 
      action: 'analytics_viewed',
      timestamp: Date.now() 
    });
  };
  
  return (
    <div>
      <h3>Academic Analytics</h3>
      <button onClick={handleViewAnalytics}>View My Analytics</button>
      {/* Analytics UI here */}
    </div>
  );
}

/**
 * Example 4: FeatureGate Component
 * Use for declarative feature gating
 */
export function Example4_FeatureGateComponent() {
  return (
    <div>
      <h2>My Dashboard</h2>
      
      {/* Show basic analytics to everyone */}
      <BasicAnalytics />
      
      {/* Only show advanced analytics to Pro users */}
      <FeatureGate
        feature="academic_analytics"
        fallback={<FeatureUpgradeBanner featureId="academic_analytics" />}
      >
        <AdvancedAnalytics />
      </FeatureGate>
    </div>
  );
}

function BasicAnalytics() {
  return <div>Basic Analytics (everyone can see this)</div>;
}

function AdvancedAnalytics() {
  return <div>Advanced Analytics (Pro only)</div>;
}

/**
 * Example 5: Upgrade Modal Pattern
 * Use when you want to show a modal on feature access attempt
 */
export function Example5_UpgradeModal() {
  const { hasAccess, trackUsage } = useFeatureGate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const handleUseProFeature = () => {
    if (!hasAccess('homework_help')) {
      // Track the blocked attempt
      trackUsage('homework_help', { action: 'upgrade_modal_shown' });
      
      // Show upgrade modal
      setShowUpgradeModal(true);
      return;
    }
    
    // Track successful usage
    trackUsage('homework_help', { action: 'homework_help_used' });
    
    // Use the feature...
  };
  
  return (
    <>
      <button onClick={handleUseProFeature}>
        Get Homework Help 🔒
      </button>
      
      <FeatureUpgradePrompt
        featureId="homework_help"
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={() => {
          // Custom upgrade handler (optional)
          console.log('User clicked upgrade!');
        }}
      />
    </>
  );
}

/**
 * Example 6: Inline Upgrade Banner
 * Use for contextual upgrade prompts within a page
 */
export function Example6_InlineBanner() {
  const { hasAccess } = useFeatureGate();
  
  return (
    <div className="space-y-6">
      <h2>AI Features</h2>
      
      {/* Show OCR to Basic users */}
      {hasAccess('ai_ocr') && (
        <div className="p-4 bg-white rounded-lg shadow">
          <h3>AI OCR</h3>
          <p>Extract text from images</p>
        </div>
      )}
      
      {/* Show upgrade banner for AI Study Buddy (Pro only) */}
      {!hasAccess('ai_study_buddy') ? (
        <FeatureUpgradeBanner featureId="ai_study_buddy" />
      ) : (
        <div className="p-4 bg-white rounded-lg shadow">
          <h3>AI Study Buddy</h3>
          <p>Your personal AI tutor</p>
        </div>
      )}
      
      {/* Compact banner for secondary features */}
      {!hasAccess('ai_recommendations') && (
        <FeatureUpgradeBanner featureId="ai_recommendations" compact />
      )}
    </div>
  );
}

/**
 * Example 7: Feature List with Locked Indicators
 * Use for settings pages or feature discovery
 */
export function Example7_FeatureList() {
  const { getAvailableFeatures, getLockedFeatures } = useFeatureGate();
  
  const availableFeatures = getAvailableFeatures();
  const lockedFeatures = getLockedFeatures();
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Your Features</h3>
        {availableFeatures.map(feature => (
          <div key={feature.id} className="flex items-center gap-2 p-2 bg-green-50 rounded">
            <span className="text-green-600">✓</span>
            <span>{feature.name}</span>
          </div>
        ))}
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Upgrade to Unlock</h3>
        {lockedFeatures.map(feature => (
          <div key={feature.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <span className="text-gray-400">🔒</span>
            <span className="text-gray-600">{feature.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example 8: Conditional UI Based on Plan
 * Use when the UI changes based on plan features
 */
export function Example8_ConditionalUI() {
  const { hasAccess, currentPlan } = useFeatureGate();
  
  const canUploadLargeFiles = hasAccess('unlimited_storage');
  const hasAdvancedAnalytics = hasAccess('academic_analytics');
  
  return (
    <div>
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-900">
          You're on: <strong>{currentPlan || 'No Plan'}</strong>
        </p>
      </div>
      
      {/* File upload with different limits */}
      <div className="mb-4">
        <h4>File Upload</h4>
        <p className="text-sm text-gray-600">
          {canUploadLargeFiles 
            ? 'Upload files of any size' 
            : 'Max file size: 10MB (upgrade for unlimited)'}
        </p>
      </div>
      
      {/* Analytics section */}
      <div>
        <h4>Analytics</h4>
        {hasAdvancedAnalytics ? (
          <div>
            <p>View grade predictions, trends, and insights</p>
          </div>
        ) : (
          <div>
            <p>Basic analytics available</p>
            <button className="text-sm text-purple-600 underline">
              Upgrade for advanced analytics
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Example 9: Track Upgrade Conversions
 * Use when implementing upgrade flows
 */
export function Example9_UpgradeTracking() {
  const { trackUpgrade } = useFeatureGate();
  const [upgrading, setUpgrading] = useState(false);
  
  const handleUpgrade = async (featureId: string) => {
    setUpgrading(true);
    
    try {
      // Initiate upgrade (Stripe checkout, etc.)
      // await upgradeToProPlan();
      
      // Track the successful upgrade
      trackUpgrade(
        featureId as any,
        'northstar_basic', // from plan
        'northstar_pro'    // to plan
      );
      
      console.log('Upgrade successful!');
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setUpgrading(false);
    }
  };
  
  return (
    <button 
      onClick={() => handleUpgrade('ai_study_buddy')}
      disabled={upgrading}
    >
      {upgrading ? 'Upgrading...' : 'Upgrade for AI Study Buddy'}
    </button>
  );
}

/**
 * Example 10: Feature with Usage Limits
 * Use when tracking quota/usage limits
 */
export function Example10_UsageLimits() {
  const { hasAccess, getFeature, trackUsage } = useFeatureGate();
  const [usageCount, setUsageCount] = useState(0);
  
  const feature = getFeature('ai_ocr');
  const basicLimit = feature?.limits?.basic as number;
  
  const handleUseFeature = () => {
    if (!hasAccess('ai_ocr')) {
      alert('Feature locked');
      return;
    }
    
    // Check usage limit (you'd get this from your backend)
    if (usageCount >= basicLimit) {
      alert('You\'ve reached your monthly limit. Upgrade to Pro for unlimited!');
      return;
    }
    
    // Track usage
    trackUsage('ai_ocr', {
      usageCount: usageCount + 1,
      remainingUses: basicLimit - usageCount - 1
    });
    
    setUsageCount(prev => prev + 1);
    
    // Use feature...
  };
  
  return (
    <div>
      <p>OCR Usage: {usageCount} / {basicLimit}</p>
      <button onClick={handleUseFeature}>Use OCR</button>
      {usageCount >= basicLimit * 0.8 && (
        <p className="text-orange-600 text-sm mt-2">
          You're approaching your limit. Upgrade to Pro for unlimited OCR!
        </p>
      )}
    </div>
  );
}


