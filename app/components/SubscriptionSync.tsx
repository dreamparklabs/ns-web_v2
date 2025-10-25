import { useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router';
import { useUser } from '@clerk/clerk-react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * Component that automatically syncs subscription data from Clerk to Convex
 * - Runs on mount and page reload
 * - Runs when Clerk metadata changes
 * Note: Checkout success syncing is handled by onboarding route or SettingsModal
 */
export function SubscriptionSync() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useUser();
  const updateSubscription = useMutation(api.subscriptions.updateUserSubscription);
  const lastSyncedMetadata = useRef<string | null>(null);

  // Check if returning from successful checkout
  const checkoutSuccess = searchParams.get('checkout') === 'success';
  const isOnboardingStep5 = location.pathname.includes('/onboarding/step/5');

  useEffect(() => {
    async function syncSubscription() {
      if (!user?.id) return;
      
      // Create a hash of the subscription metadata to detect changes
      const currentMetadataHash = JSON.stringify({
        subscription: user.publicMetadata?.subscription,
        subscriptions: user.subscriptions,
      });
      
      // Skip if this is a checkout success (onboarding route or SettingsModal handles this)
      if (checkoutSuccess) {
        const handler = isOnboardingStep5 ? 'onboarding route' : 'SettingsModal';
        console.log(`🔄 SubscriptionSync: Skipping sync on checkout success (handled by ${handler})`);
        return;
      }
      
      // Skip if metadata hasn't changed
      if (lastSyncedMetadata.current === currentMetadataHash) {
        console.log('🔄 SubscriptionSync: Metadata unchanged, skipping sync');
        return;
      }

      try {
        console.log('🔄 SubscriptionSync: Starting sync...', {
          userId: user.id,
          checkoutSuccess,
          publicMetadata: user.publicMetadata
        });

        // Get subscription data from Clerk
        const subscription = user.publicMetadata?.subscription as any;
        // @ts-ignore - Clerk's experimental billing API
        const clerkSubscription = user.subscriptions?.[0];

        // Determine the subscription plan
        let subscriptionPlan = null;
        let subscriptionStatus = 'active';
        let subscriptionId = undefined;
        let stripeCustomerId = undefined;
        let currentPeriodEnd = undefined;
        let cancelAtPeriodEnd = undefined;

        if (clerkSubscription) {
          subscriptionPlan = clerkSubscription.plan || null;
          subscriptionStatus = clerkSubscription.status || 'active';
          subscriptionId = clerkSubscription.subscriptionId;
          stripeCustomerId = clerkSubscription.stripeCustomerId;
          currentPeriodEnd = clerkSubscription.currentPeriodEnd;
          cancelAtPeriodEnd = clerkSubscription.cancelAtPeriodEnd;
        } else if (subscription) {
          subscriptionPlan = subscription.plan || null;
          subscriptionStatus = subscription.status || 'active';
          subscriptionId = subscription.subscriptionId;
          stripeCustomerId = subscription.stripeCustomerId;
          currentPeriodEnd = subscription.currentPeriodEnd;
          cancelAtPeriodEnd = subscription.cancelAtPeriodEnd;
        }

        // Determine account status
        const accountStatus = (subscriptionPlan && subscriptionPlan !== 'free_user' && subscriptionStatus === 'active')
          ? 'active'
          : 'suspended';

        console.log('🔄 SubscriptionSync: Syncing to Convex...', {
          subscriptionPlan,
          subscriptionStatus,
          accountStatus,
          subscriptionId,
          stripeCustomerId
        });

        // Build sync payload - only include fields with valid values
        const syncPayload: any = {
          clerkUserId: user.id,
          subscriptionPlan,
          subscriptionStatus,
          accountStatus,
        };

        // Only add optional fields if they have valid values
        if (subscriptionId) {
          syncPayload.subscriptionId = subscriptionId;
        }
        if (stripeCustomerId) {
          syncPayload.stripeCustomerId = stripeCustomerId;
        }
        if (currentPeriodEnd !== null && currentPeriodEnd !== undefined) {
          syncPayload.currentPeriodEnd = currentPeriodEnd;
        }
        if (cancelAtPeriodEnd !== undefined) {
          syncPayload.cancelAtPeriodEnd = cancelAtPeriodEnd;
        }

        // Sync to Convex
        await updateSubscription(syncPayload);

        console.log('✅ SubscriptionSync: Sync completed successfully!');

        // Update last synced metadata hash
        lastSyncedMetadata.current = currentMetadataHash;
      } catch (error) {
        console.error('❌ SubscriptionSync: Failed to sync subscription:', error);
      }
    }

    syncSubscription();
  }, [user?.id, user?.publicMetadata, user?.subscriptions, checkoutSuccess, updateSubscription]);

  // This component doesn't render anything
  return null;
}

