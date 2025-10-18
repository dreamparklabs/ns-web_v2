import { useLocation, useNavigate } from "react-router";
import React, { useEffect, memo } from "react";
import Sidebar from "./Sidebar";
import RouteTransition from "./RouteTransition";
import { useUserSetup } from "../hooks/useUserSetup";
import { useSessionTracking } from "../hooks/useSessionTracking";
import { PostHogPageView } from "./PostHogPageView";
import CannyWidget from "./CannyWidget";
import { SubscriptionSync } from "./SubscriptionSync";

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
  const { needsOnboarding, isUserReady, isCreatingUser, convexUser, user, isLoaded, userCreationFailed } = useUserSetup();

  // Initialize session tracking
  useSessionTracking();

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

  // If user creation failed, show error with retry option
  if (userCreationFailed && !convexUser) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 dark:bg-red-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Setup Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            There was an issue setting up your account. Please refresh the page to try again.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition duration-200"
          >
            Refresh Page
          </button>
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
