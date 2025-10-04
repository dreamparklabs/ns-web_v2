import { createContext, useContext, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import posthog from "posthog-js";

interface PostHogContextType {
  posthog: typeof posthog;
}

const PostHogContext = createContext<PostHogContextType | null>(null);

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();

  useEffect(() => {
    // Initialize PostHog
    const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
    const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

    if (POSTHOG_KEY && typeof window !== "undefined") {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: true, // Automatically capture page views
        capture_pageleave: true, // Track when users leave pages
        autocapture: true, // Automatically capture clicks, form submissions, etc.
        disable_session_recording: false, // Enable session recordings
        session_recording: {
          maskAllInputs: true, // Mask sensitive input fields
          maskTextSelector: "[data-private]", // Mask elements with data-private attribute
        },
        // Advanced tracking
        capture_performance: true, // Track performance metrics
        enable_recording_console_log: true, // Capture console logs
      });

      // Track user identity
      if (user) {
        posthog.identify(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt,
        });
      }
    }

    return () => {
      // Reset on unmount (for hot reload in dev)
      if (typeof window !== "undefined" && posthog) {
        posthog.reset();
      }
    };
  }, [user]);

  return (
    <PostHogContext.Provider value={{ posthog }}>
      {children}
    </PostHogContext.Provider>
  );
}

export function usePostHog() {
  const context = useContext(PostHogContext);
  if (!context) {
    throw new Error("usePostHog must be used within PostHogProvider");
  }
  return context.posthog;
}

