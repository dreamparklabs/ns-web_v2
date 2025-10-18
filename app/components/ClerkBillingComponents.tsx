import React, { useEffect, useState } from 'react';
import { PricingTable as ClerkPricingTable } from '@clerk/clerk-react';

interface PricingTableProps {
  className?: string;
}

export function PricingTable({ className = '' }: PricingTableProps) {
  const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);

  // Detect when checkout is active by looking for Stripe iframes
  useEffect(() => {
    const checkForCheckout = () => {
      const stripeIframes = document.querySelectorAll('iframe[src*="stripe.com"]');
      const paymentElements = document.querySelectorAll('[class*="Payment"], [class*="checkout"]');
      const allClerkElements = document.querySelectorAll('[class*="cl-"]');
      const hasCheckout = stripeIframes.length > 0 || paymentElements.length > 0;
      
      // Debug logging
      console.log('🔍 Checkout Detection:', {
        stripeIframes: stripeIframes.length,
        paymentElements: paymentElements.length,
        clerkElements: allClerkElements.length,
        hasCheckout,
        iframesSrc: Array.from(stripeIframes).map(iframe => (iframe as HTMLIFrameElement).src.substring(0, 100))
      });

      // Log the DOM structure
      const wrapper = document.querySelector('.clerk-pricing-table-wrapper');
      if (wrapper) {
        console.log('🔍 Pricing Table Wrapper HTML:', wrapper.innerHTML.substring(0, 500));
      }
      
      setIsCheckoutVisible(hasCheckout);
    };

    // Check initially and then periodically
    checkForCheckout();
    const interval = setInterval(checkForCheckout, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`w-full ${className}`}>
      {/* Show a notice when checkout is active */}
      {isCheckoutVisible && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
              🔒 Secure checkout active - Please complete your payment below
            </p>
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Choose Your Plan
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select the plan that best fits your needs
        </p>
      </div>

      {/* Use Clerk's official PricingTable component */}
      {/* This will render inline and show the checkout form when a plan is selected */}
      <div className="clerk-pricing-table-wrapper min-h-[600px]" style={{ 
        border: '2px solid red',
        padding: '20px',
        background: 'rgba(255, 0, 0, 0.1)'
      }}>
        <div style={{ marginBottom: '10px', color: 'red', fontWeight: 'bold' }}>
          DEBUG: Clerk PricingTable Container
        </div>
        <ClerkPricingTable />
        <div style={{ marginTop: '10px', color: 'red', fontWeight: 'bold' }}>
          DEBUG: End of PricingTable
        </div>
      </div>

      {/* Add inline styles to ensure Clerk/Stripe elements are visible and properly positioned */}
      <style>{`
        /* Ensure all Stripe/Clerk iframes and containers are visible */
        iframe[src*="stripe.com"],
        iframe[src*="clerk"],
        .__PrivateStripeElement {
          position: relative !important;
          z-index: 1 !important;
        }

        /* Ensure payment elements container is properly sized */
        .clerk-pricing-table-wrapper {
          position: relative;
          z-index: 1;
        }

        /* Style Clerk pricing table */
        .cl-rootBox {
          max-width: 100%;
        }

        /* Ensure Stripe Elements containers are visible within modal */
        [class*="PaymentElement"],
        [class*="StripeElement"],
        .StripeElement {
          position: relative !important;
          z-index: 1 !important;
        }
      `}</style>
    </div>
  );
}