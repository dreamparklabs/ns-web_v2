import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useStatsigClient } from '@statsig/react-bindings';
import { useUserSetup } from '../hooks/useUserSetup';

/**
 * Component that keeps Statsig user in sync with Clerk authentication
 * Updates Statsig whenever the user signs in/out or subscription changes
 */
export function StatsigUserBinder() {
  const { user } = useUser();
  const { convexUser } = useUserSetup();
  const { client, updateUserSync } = useStatsigClient();

  useEffect(() => {
    // Only update if we have a real Clerk user
    if (!user || !client || !updateUserSync) {
      console.log('🔍 StatsigUserBinder: Skipping update (no user or client)');
      return;
    }

    const clerkUserId = user.id;
    
    // Get user's plan from Clerk publicMetadata
    const subscription = user.publicMetadata?.subscription as any;
    // @ts-ignore - Clerk's experimental billing API
    const clerkSubscription = user.subscriptions?.[0];
    const userPlan = clerkSubscription?.plan
      || subscription?.plan
      || (subscription?.status === 'suspended' ? null : 'free_user');

    console.log('🔍 StatsigUserBinder: Updating Statsig user:', {
      clerkUserId,
      userPlan,
      email: user.emailAddresses?.[0]?.emailAddress,
      convexUserId: convexUser?._id,
    });

    // Update Statsig with current user info using updateUserSync from the hook
    updateUserSync({
      userID: clerkUserId,
      email: user.emailAddresses?.[0]?.emailAddress,
      custom: {
        plan: userPlan,
        clerkUserId: clerkUserId,
        convexUserId: convexUser?._id,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    });

    console.log('✅ StatsigUserBinder: User updated successfully');
  }, [user?.id, user?.publicMetadata, convexUser?._id, client, updateUserSync, user?.emailAddresses, user?.firstName, user?.lastName]);

  return null; // This component doesn't render anything
}

