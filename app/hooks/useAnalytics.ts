import { usePostHog } from "../contexts/PostHogContext";
import { useCallback } from "react";

/**
 * Hook for tracking analytics events throughout the application
 */
export function useAnalytics() {
  const posthog = usePostHog();

  // Track page view
  const trackPageView = useCallback((pageName: string, properties?: Record<string, any>) => {
    posthog.capture("$pageview", {
      page_name: pageName,
      ...properties,
    });
  }, [posthog]);

  // Track button/link clicks
  const trackClick = useCallback((elementName: string, properties?: Record<string, any>) => {
    posthog.capture("clicked_element", {
      element_name: elementName,
      ...properties,
    });
  }, [posthog]);

  // Track navigation
  const trackNavigation = useCallback((from: string, to: string, method?: string) => {
    posthog.capture("navigation", {
      from_page: from,
      to_page: to,
      navigation_method: method, // e.g., "sidebar", "breadcrumb", "link", "button"
    });
  }, [posthog]);

  // Track API calls
  const trackAPICall = useCallback((
    endpoint: string,
    method: string,
    status: "success" | "error",
    duration?: number,
    properties?: Record<string, any>
  ) => {
    posthog.capture("api_call", {
      endpoint,
      method,
      status,
      duration_ms: duration,
      ...properties,
    });
  }, [posthog]);

  // Track AI usage
  const trackAIUsage = useCallback((
    feature: string,
    model?: string,
    tokensUsed?: number,
    properties?: Record<string, any>
  ) => {
    posthog.capture("ai_usage", {
      feature,
      model,
      tokens_used: tokensUsed,
      ...properties,
    });
  }, [posthog]);

  // Track Convex mutations
  const trackConvexMutation = useCallback((
    mutationName: string,
    status: "success" | "error",
    duration?: number,
    properties?: Record<string, any>
  ) => {
    posthog.capture("convex_mutation", {
      mutation_name: mutationName,
      status,
      duration_ms: duration,
      ...properties,
    });
  }, [posthog]);

  // Track Convex queries
  const trackConvexQuery = useCallback((
    queryName: string,
    cached: boolean,
    duration?: number,
    properties?: Record<string, any>
  ) => {
    posthog.capture("convex_query", {
      query_name: queryName,
      cached,
      duration_ms: duration,
      ...properties,
    });
  }, [posthog]);

  // Track user actions
  const trackAction = useCallback((
    actionName: string,
    properties?: Record<string, any>
  ) => {
    posthog.capture(actionName, properties);
  }, [posthog]);

  // Track feature usage
  const trackFeature = useCallback((
    featureName: string,
    properties?: Record<string, any>
  ) => {
    posthog.capture("feature_used", {
      feature_name: featureName,
      ...properties,
    });
  }, [posthog]);

  // Track errors
  const trackError = useCallback((
    errorType: string,
    errorMessage: string,
    properties?: Record<string, any>
  ) => {
    posthog.capture("error_occurred", {
      error_type: errorType,
      error_message: errorMessage,
      ...properties,
    });
  }, [posthog]);

  // Track form submissions
  const trackFormSubmit = useCallback((
    formName: string,
    success: boolean,
    properties?: Record<string, any>
  ) => {
    posthog.capture("form_submitted", {
      form_name: formName,
      success,
      ...properties,
    });
  }, [posthog]);

  // Track file operations
  const trackFileOperation = useCallback((
    operation: "upload" | "download" | "view" | "share" | "delete",
    fileType?: string,
    fileSize?: number,
    properties?: Record<string, any>
  ) => {
    posthog.capture("file_operation", {
      operation,
      file_type: fileType,
      file_size_bytes: fileSize,
      ...properties,
    });
  }, [posthog]);

  // Track assignment operations
  const trackAssignmentOperation = useCallback((
    operation: "create" | "edit" | "complete" | "delete",
    assignmentType?: string,
    properties?: Record<string, any>
  ) => {
    posthog.capture("assignment_operation", {
      operation,
      assignment_type: assignmentType,
      ...properties,
    });
  }, [posthog]);

  // Track dashboard widget interactions
  const trackWidgetInteraction = useCallback((
    widgetName: string,
    interaction: string,
    properties?: Record<string, any>
  ) => {
    posthog.capture("widget_interaction", {
      widget_name: widgetName,
      interaction_type: interaction,
      ...properties,
    });
  }, [posthog]);

  return {
    trackPageView,
    trackClick,
    trackNavigation,
    trackAPICall,
    trackAIUsage,
    trackConvexMutation,
    trackConvexQuery,
    trackAction,
    trackFeature,
    trackError,
    trackFormSubmit,
    trackFileOperation,
    trackAssignmentOperation,
    trackWidgetInteraction,
  };
}

