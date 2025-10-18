import type { Route } from './+types/pricing';
import { PricingTable } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Pricing - Northstar' }];
}

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get('plan');
  const returnUrl = searchParams.get('return');

  // Handle successful checkout - Clerk will trigger this via URL params
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success' && returnUrl) {
      // Redirect back to the return URL with success status
      navigate(returnUrl + '&checkout=success', { replace: true });
    } else if (checkoutStatus === 'cancelled' && returnUrl) {
      // Redirect back to the return URL with cancelled status
      navigate(returnUrl + '&checkout=cancelled', { replace: true });
    }
  }, [searchParams, returnUrl, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Unlock the full potential of Northstar with our flexible pricing plans designed for students and educators.
          </p>
          {planId && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Recommended: {planId === 'northstar_basic' ? 'Northstar Basic' : 'Northstar Pro'}
            </p>
          )}
        </div>
        
        {/* Clerk's official PricingTable component */}
        <PricingTable />
        
        {returnUrl && (
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate(returnUrl)}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
