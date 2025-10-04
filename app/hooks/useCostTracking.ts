import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAnalytics } from "./useAnalytics";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Hook for tracking costs and revenue with PostHog integration
 * This enables per-user unit economics tracking
 */
export function useCostTracking() {
  const logAIUsage = useMutation(api.userCosts.logAIUsage);
  const logAPIUsage = useMutation(api.userCosts.logAPIUsage);
  const logStorageCost = useMutation(api.userCosts.logStorageCost);
  const logRevenue = useMutation(api.userCosts.logRevenue);
  const analytics = useAnalytics();

  /**
   * Track AI usage and costs
   */
  const trackAICost = useCallback(async (
    userId: Id<"users">,
    feature: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    metadata?: Record<string, any>
  ) => {
    try {
      const result = await logAIUsage({
        userId,
        feature,
        model,
        inputTokens,
        outputTokens,
        metadata,
      });

      // Also send to PostHog
      analytics.trackAIUsage(feature, model, inputTokens + outputTokens, {
        inputTokens,
        outputTokens,
        costUSD: result?.cost,
        ...metadata,
      });

      return result;
    } catch (error) {
      console.error("Failed to track AI cost:", error);
      analytics.trackError("ai-cost-tracking-failed", error.message, {
        feature,
        model,
      });
      throw error;
    }
  }, [logAIUsage, analytics]);

  /**
   * Track API usage and costs
   */
  const trackAPICost = useCallback(async (
    userId: Id<"users">,
    service: string,
    endpoint: string,
    requestCount: number,
    costUSD: number,
    metadata?: Record<string, any>
  ) => {
    try {
      const result = await logAPIUsage({
        userId,
        service,
        endpoint,
        requestCount,
        costUSD,
        metadata,
      });

      // Also send to PostHog
      analytics.trackAPICall(endpoint, "ANY", "success", undefined, {
        service,
        requestCount,
        costUSD,
        ...metadata,
      });

      return result;
    } catch (error) {
      console.error("Failed to track API cost:", error);
      analytics.trackError("api-cost-tracking-failed", error.message, {
        service,
        endpoint,
      });
      throw error;
    }
  }, [logAPIUsage, analytics]);

  /**
   * Track storage costs
   */
  const trackStorageCost = useCallback(async (
    userId: Id<"users">,
    storageType: string,
    bytesStored: number,
    costUSD: number
  ) => {
    try {
      const result = await logStorageCost({
        userId,
        storageType,
        bytesStored,
        costUSD,
      });

      // Send to PostHog
      analytics.trackAction("storage_cost_logged", {
        storageType,
        bytesStored,
        costUSD,
      });

      return result;
    } catch (error) {
      console.error("Failed to track storage cost:", error);
      analytics.trackError("storage-cost-tracking-failed", error.message, {
        storageType,
      });
      throw error;
    }
  }, [logStorageCost, analytics]);

  /**
   * Track revenue (subscriptions, payments, etc.)
   */
  const trackRevenue = useCallback(async (
    userId: Id<"users">,
    revenueType: "subscription" | "one-time" | "usage",
    amountUSD: number,
    description: string,
    billingPeriodStart?: number,
    billingPeriodEnd?: number,
    metadata?: Record<string, any>
  ) => {
    try {
      const result = await logRevenue({
        userId,
        revenueType,
        amountUSD,
        description,
        billingPeriodStart,
        billingPeriodEnd,
        metadata,
      });

      // Send to PostHog
      analytics.trackAction("revenue_logged", {
        revenueType,
        amountUSD,
        description,
        ...metadata,
      });

      return result;
    } catch (error) {
      console.error("Failed to track revenue:", error);
      analytics.trackError("revenue-tracking-failed", error.message, {
        revenueType,
      });
      throw error;
    }
  }, [logRevenue, analytics]);

  return {
    trackAICost,
    trackAPICost,
    trackStorageCost,
    trackRevenue,
  };
}

