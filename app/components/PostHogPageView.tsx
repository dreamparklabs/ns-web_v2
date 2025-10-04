import { useEffect } from "react";
import { useLocation } from "react-router";
import { useAnalytics } from "../hooks/useAnalytics";

/**
 * Component that automatically tracks page views on route changes
 * Place this in your layout/app root to track all navigation
 */
export function PostHogPageView() {
  const location = useLocation();
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    // Track page view on mount and route change
    trackPageView(location.pathname, {
      search: location.search,
      hash: location.hash,
    });
  }, [location.pathname, location.search, location.hash, trackPageView]);

  return null; // This component doesn't render anything
}

