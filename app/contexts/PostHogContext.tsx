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
    const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
    const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

    if (POSTHOG_KEY && typeof window !== "undefined") {
      console.log('🔍 PostHog: Initializing with key:', POSTHOG_KEY.substring(0, 10) + '...');
      console.log('🔍 PostHog: Host:', POSTHOG_HOST);
      
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        defaults: '2025-05-24',
        person_profiles: "identified_only",
        capture_pageview: true, // Automatically capture page views
        capture_pageleave: false, // Disable page leave tracking to reduce load
        autocapture: {
          // Capture only essential events to reduce load
          dom_event_allowlist: ['click', 'submit'],
          url_allowlist: [window.location.origin], // Only track our domain
          element_allowlist: ['a', 'button', 'form'], // Reduced element list
          css_selector_allowlist: ['[ph-capture]'], // Custom attribute for tracking
        },
        disable_session_recording: true, // Disable session recordings to prevent timeouts
        session_recording: {
          maskAllInputs: true, // Mask inputs for privacy
          maskTextSelector: "[data-private]", // Only mask elements with data-private attribute
          recordCrossOriginIframes: false, // Disable iframe recording
        },
        // Reduced tracking to prevent timeouts
        capture_performance: false, // Disable performance metrics
        enable_recording_console_log: false, // Disable console log capture
        capture_dead_clicks: false, // Disable dead click tracking
        // Add timeout configuration
        request_timeout_ms: 10000, // 10 second timeout
        batch_events: true, // Batch events to reduce requests
        batch_size: 50, // Batch size
        loaded: function(posthog) {
          console.log('✅ PostHog: Successfully initialized and loaded!');
        },
      });
      
      console.log('✅ PostHog: Init called successfully');

      // Track user identity
      if (user) {
        console.log('👤 PostHog: Identifying user:', user.id);
        posthog.identify(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt,
        });
      }
    } else {
      console.warn('⚠️ PostHog: Not initializing - Missing API key or not in browser environment');
      console.log('POSTHOG_KEY present?', !!POSTHOG_KEY);
      console.log('In browser?', typeof window !== "undefined");
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