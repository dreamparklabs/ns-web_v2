import { clerkClient } from "@clerk/clerk-sdk-node";
import { json } from "@remix-run/node";

export async function action({ request }: { request: Request }) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return json({ error: 'Missing userId' }, { status: 400 });
    }

    console.log('🔄 Syncing subscription for user:', userId);

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not found');
    }

    // Get the user's Clerk email to find their Stripe customer
    const user = await clerkClient.users.getUser(userId);
    const userEmail = user.emailAddresses?.[0]?.emailAddress;

    if (!userEmail) {
      throw new Error('User email not found');
    }

    console.log('📧 Looking up Stripe customer for email:', userEmail);

    // First, try to find the Stripe customer by email
    let stripeCustomerId: string | null = null;
    const customersResponse = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(userEmail)}&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
        },
      }
    );

    const customersData = await customersResponse.json();
    
    if (customersData.data && customersData.data.length > 0) {
      stripeCustomerId = customersData.data[0].id;
      console.log('👤 Found Stripe customer by email:', stripeCustomerId);
    } else {
      // If not found by email, search by Clerk user ID in metadata
      // This handles cases where user paid with Link using a different email
      console.log('🔍 No customer found by email, searching by Clerk user ID in metadata...');
      
      const metadataSearchResponse = await fetch(
        `https://api.stripe.com/v1/customers/search?query=metadata['clerkUserId']:'${userId}'&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
          },
        }
      );

      const metadataSearchData = await metadataSearchResponse.json();
      
      if (metadataSearchData.data && metadataSearchData.data.length > 0) {
        stripeCustomerId = metadataSearchData.data[0].id;
        console.log('👤 Found Stripe customer by metadata:', stripeCustomerId);
        console.log('📧 Customer email:', metadataSearchData.data[0].email);
      }
    }

    if (!stripeCustomerId) {
      return json({ error: 'No Stripe customer found for this user' }, { status: 404 });
    }

    // Get ALL subscriptions for this customer (active, trialing, incomplete, etc.)
    const subscriptionsResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${stripeCustomerId}&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
        },
      }
    );

    const subscriptionsData = await subscriptionsResponse.json();

    console.log('📋 All subscriptions for customer:', {
      customerId: stripeCustomerId,
      total: subscriptionsData.data?.length || 0,
      subscriptions: subscriptionsData.data?.map((sub: any) => ({
        id: sub.id,
        status: sub.status,
        priceId: sub.items.data[0]?.price.id,
        created: sub.created ? new Date(sub.created * 1000).toISOString() : null,
        current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null
      }))
    });

    if (!subscriptionsData.data || subscriptionsData.data.length === 0) {
      console.log('⚠️ No subscriptions found at all');
      return json({
        message: 'No subscriptions found. Please contact support.',
        customer: stripeCustomerId
      }, { status: 404 });
    }

    // Find the most recent active subscription by created date (newest first)
    const activeStatuses = ['active', 'trialing', 'past_due'];
    const activeSubscriptions = subscriptionsData.data.filter((sub: any) => activeStatuses.includes(sub.status));
    
    // Sort by created date descending (newest first)
    activeSubscriptions.sort((a: any, b: any) => b.created - a.created);
    
    let subscription = activeSubscriptions[0];
    
    // If no active/trialing, just take the most recent one overall
    if (!subscription) {
      const allSorted = [...subscriptionsData.data].sort((a: any, b: any) => b.created - a.created);
      subscription = allSorted[0];
    }
    
    console.log('📊 Subscription selection:', {
      totalActive: activeSubscriptions.length,
      selectedId: subscription.id,
      selectedCreated: new Date(subscription.created * 1000).toISOString(),
      selectedPriceId: subscription.items.data[0]?.price.id
    });

    console.log('✅ Using subscription:', {
      id: subscription.id,
      status: subscription.status
    });

    const priceId = subscription.items.data[0].price.id;

    // Map price IDs back to plan names
    const priceToPlan: Record<string, string> = {
      'price_1SIZnd85FHQX10MtedhBiK6G': 'northstar_basic',
      'price_1SIa5i85FHQX10MtUTMDf3P3': 'northstar_pro',
    };

    const planId = priceToPlan[priceId] || 'free_user';

    console.log('📦 Found subscription:', {
      subscriptionId: subscription.id,
      priceId,
      planId,
      status: subscription.status
    });

    // Update Clerk user metadata
    const subscriptionMetadata = {
      plan: planId,
      status: subscription.status,
      subscriptionId: subscription.id,
      stripeCustomerId: stripeCustomerId,
      currentPeriodEnd: subscription.current_period_end * 1000,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };

    console.log('📝 Updating Clerk user metadata:', subscriptionMetadata);

    const updatedUser = await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        subscription: subscriptionMetadata
      }
    });

    console.log('✅ Updated Clerk user metadata successfully');
    console.log('📋 Clerk user publicMetadata after update:', updatedUser.publicMetadata);

    // Also update Convex database for faster access
    // Note: This requires calling from the client-side with Convex client, not server-side
    // We'll need to update this in the frontend after sync completes
    console.log('📋 Subscription data ready for Convex update:', {
      clerkUserId: userId,
      subscriptionPlan: planId,
      subscriptionStatus: subscription.status,
      subscriptionId: subscription.id,
    });

    return json({
      success: true,
      subscription: {
        plan: planId,
        status: subscription.status,
        subscriptionId: subscription.id,
      }
    });
  } catch (error: any) {
    console.error('❌ Error syncing subscription:', error);
    return json({
      error: error.message || 'Failed to sync subscription',
      details: error
    }, { status: 500 });
  }
}

