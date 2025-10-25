import { useLocation, useNavigate, useSearchParams } from "react-router";
import React, { useEffect, memo, useRef } from "react";
import Sidebar from "./Sidebar";
import RouteTransition from "./RouteTransition";
import { useUserSetup } from "../hooks/useUserSetup";
import { useSessionTracking } from "../hooks/useSessionTracking";
import { PostHogPageView } from "./PostHogPageView";
import CannyWidget from "./CannyWidget";
import { SubscriptionSync } from "./SubscriptionSync";
import { useClerkBilling } from "../hooks/useClerkBilling";
import { useClerk } from "@clerk/clerk-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

// Memoized content area to prevent re-renders when sidebar doesn't need updates
const ContentArea = memo(({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
      {/* Content wrapper with proper padding for mobile menu button */}
      <main className="h-full pt-16 lg:pt-0 overflow-y-auto bg-white dark:bg-gray-900">
        <div className="h-full">
          <RouteTransition>
            {children}
          </RouteTransition>
        </div>
      </main>
    </div>
  );
});

ContentArea.displayName = 'ContentArea';

// Memoized sidebar wrapper to prevent re-renders
const SidebarWrapper = memo(() => {
  const location = useLocation();
  return <Sidebar currentPath={location.pathname} />;
});

SidebarWrapper.displayName = 'SidebarWrapper';

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { needsOnboarding, isUserReady, isCreatingUser, convexUser, user, isLoaded, userCreationFailed } = useUserSetup();
  const { syncSubscription } = useClerkBilling();
  const { signOut } = useClerk();
  const hasCompletedCheckout = useRef(false);

  // Initialize session tracking
  useSessionTracking();

  // Handle checkout success from onboarding - sync subscription but don't complete tour yet
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success' && convexUser && !hasCompletedCheckout.current && user) {
      hasCompletedCheckout.current = true;
      console.log('🎉 AppLayout: Checkout successful! Syncing subscription...');

      // Sync subscription from Stripe
      syncSubscription().then(async () => {
        console.log('✅ AppLayout: Subscription synced from Stripe');

        // Reload user to get updated metadata
        await user.reload();
        console.log('✅ AppLayout: User reloaded with new subscription data');

        // Don't complete guided tour yet - let step 5 handle it
        // User will see completion page and click "Continue" to finish
      }).catch((error) => {
        console.error('❌ AppLayout: Failed to sync subscription:', error);
      });
    }
  }, [searchParams, convexUser, syncSubscription, user]);

  // Reset checkout flag when leaving checkout success page
  useEffect(() => {
    if (searchParams.get('checkout') !== 'success') {
      hasCompletedCheckout.current = false;
    }
  }, [searchParams]);

  // Debug logging (reduced)
  if (!isLoaded || isCreatingUser) {
    console.log("AppLayout: Loading user data...");
  }

  // Redirect to onboarding when user needs it
  useEffect(() => {
    if (isUserReady && needsOnboarding && location.pathname !== "/onboarding") {
      navigate("/onboarding");
    }
  }, [isUserReady, needsOnboarding, location.pathname, navigate]);

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show setup loading state while user is being created
  if (isCreatingUser) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // If no user is logged in, this shouldn't happen in protected routes, but just in case
  if (!user) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Please sign in to continue.</p>
        </div>
      </div>
    );
  }

  // If user data is not found or creation failed, show friendly error with sign out option
  if ((userCreationFailed || (isUserReady && !convexUser)) && user) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-100 dark:bg-red-900/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">User Data Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            We couldn't find your user data in our system. This may happen if your account was deleted or there was an issue during setup.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => signOut(() => navigate('/sign-in'))}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition duration-200 shadow-lg hover:shadow-xl"
            >
              Sign Out & Try Again
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Need help?{" "}
              <a href="mailto:support@dreampark.dev" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
                Contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* PostHog Analytics - Track page views */}
      <PostHogPageView />

      {/* Subscription Sync - Automatically sync subscription from Clerk to Convex */}
      <SubscriptionSync />

      {/* Canny Feedback Widget */}
      <CannyWidget />

      {/* Memoized Sidebar */}
      <SidebarWrapper />

      {/* Memoized Content Area */}
      <ContentArea>
        {children}
      </ContentArea>
    </div>
  );
}
