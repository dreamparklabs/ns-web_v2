import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Route } from "./+types/onboarding";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Welcome - Complete Your Setup" },
    { name: "description", content: "Complete your account setup to get started" },
  ];
}

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Get user data from Convex
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const createUser = useMutation(api.users.createUser);

  // Automatically create user in Convex when they arrive at onboarding
  useEffect(() => {
    const createConvexUser = async () => {
      if (isLoaded && user && !convexUser && !isCreatingUser) {
        console.log("Creating Convex user for onboarding:", user.id);
        setIsCreatingUser(true);
        try {
          await createUser({
            clerkUserId: user.id,
            email: user.emailAddresses[0]?.emailAddress || "",
            firstName: user.firstName || "",
            lastName: user.lastName || "",
          });
          console.log("Successfully created Convex user");
        } catch (error) {
          console.error("Failed to create user in Convex:", error);
          // Set timeout to show retry button
          setLoadingTimeout(true);
        } finally {
          setIsCreatingUser(false);
        }
      }
    };

    createConvexUser();
  }, [isLoaded, user, convexUser, createUser, isCreatingUser]);

  // Redirect users who have already completed ALL onboarding steps
  useEffect(() => {
    if (convexUser && convexUser.hasCompletedDemographics && convexUser.hasCompletedGuidedTour) {
      navigate("/app/v2/dashboard", { replace: true });
    } else if (convexUser) {
      // Redirect to step 1 of the new onboarding flow
      navigate("/onboarding/step/1", { replace: true });
    }
  }, [convexUser, navigate]);

  // Set a timeout for loading state (only if not already creating)
  useEffect(() => {
    if (isCreatingUser) return;

    const timer = setTimeout(() => {
      if (!convexUser) {
        setLoadingTimeout(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timer);
  }, [convexUser, retryCount, isCreatingUser]);

  // Try to create user if timeout occurs
  const handleRetry = async () => {
    if (!user) return;

    setLoadingTimeout(false);
    setRetryCount(prev => prev + 1);
    setIsCreatingUser(true);

    try {
      await createUser({
        clerkUserId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      });
    } catch (error) {
      console.error("Failed to create user:", error);
      alert("Failed to create your profile. Please try again or contact support.");
    } finally {
      setIsCreatingUser(false);
    }
  };


  // Show loading if user data isn't ready
  if (!convexUser) {
    return (
      <div className="min-h-screen h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {loadingTimeout
              ? "This is taking longer than expected..."
              : isCreatingUser
              ? "Setting up your account..."
              : "Loading your profile..."}
          </p>
          {loadingTimeout && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-500">
                We're having trouble loading your profile. This might be due to a temporary issue.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Retry
                </button>
                <button
                  onClick={() => navigate("/app/v2/dashboard")}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors font-medium"
                >
                  Skip Setup
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                If the problem persists, please contact{" "}
                <a href="mailto:support@dreampark.dev" className="text-blue-600 hover:underline">
                  support@dreampark.dev
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // This route now just redirects to the step-based onboarding
  return null;
}
