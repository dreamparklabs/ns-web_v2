import React, { ReactNode } from 'react';
import { useClerkBilling } from '../hooks/useClerkBilling';

interface ProtectProps {
  plan?: string;
  feature?: string;
  fallback?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Protect component that follows Clerk's API
 * Based on: https://clerk.com/docs/nextjs/guides/billing/for-b2c
 */
export function Protect({ plan, feature, fallback, children, className = '' }: ProtectProps) {
  const { hasPlan, hasFeature } = useClerkBilling();
  
  // Check access based on plan or feature
  let hasAccess = false;
  
  if (plan) {
    hasAccess = hasPlan(plan);
  } else if (feature) {
    hasAccess = hasFeature(feature);
  }
  
  // If user has access, render children
  if (hasAccess) {
    return <div className={className}>{children}</div>;
  }
  
  // If no access, render fallback or default message
  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }
  
  // Default fallback message
  const defaultFallback = (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
      <div className="flex items-center">
        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="text-yellow-800 dark:text-yellow-200">
          {plan 
            ? `This content requires the ${plan} plan.` 
            : `This content requires the ${feature} feature.`
          }
        </span>
      </div>
    </div>
  );
  
  return <div className={className}>{defaultFallback}</div>;
}

// Convenience components for specific features
export function ProtectGradeAnalytics({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <Protect 
      feature="grade_analytics" 
      fallback={fallback}
    >
      {children}
    </Protect>
  );
}

export function ProtectAIRecommendations({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <Protect 
      feature="ai_recommendations" 
      fallback={fallback}
    >
      {children}
    </Protect>
  );
}

export function ProtectUnlimitedStorage({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <Protect 
      feature="unlimited_storage" 
      fallback={fallback}
    >
      {children}
    </Protect>
  );
}

export function ProtectStudentPro({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <Protect 
      plan="student_pro" 
      fallback={fallback}
    >
      {children}
    </Protect>
  );
}



