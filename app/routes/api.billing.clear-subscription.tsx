import { clerkClient } from "@clerk/clerk-sdk-node";
import Stripe from 'stripe';

/**
 * Handle subscription changes and account suspension
 * This handles:
 * 1. Downgrade (Pro → Basic): Cancel Pro subscription, create Basic subscription
 * 2. Suspend Account: Mark account as suspended when subscription is canceled
 */
export async function action({ request }: { request: Request }) {
  try {
    const { userId, action: userAction } = await request.json();

    if (!userId || !userAction) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or action' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`🔄 Processing ${userAction} for user:`, userId);

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceIdBasic = process.env.STRIPE_PRICE_ID_BASIC;

    if (!stripeSecretKey || !stripePriceIdBasic) {
      throw new Error('Stripe environment variables not found');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-04-10',
    });

    // Get Clerk user to find email and current subscription
    const clerkUser = await clerkClient.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
    const currentSub = clerkUser.publicMetadata?.subscription as any;

    if (!userEmail) {
      throw new Error('User email not found');
    }

    if (userAction === 'downgrade_to_basic') {
      // Downgrade from Pro to Basic
      console.log('⬇️ Downgrading from Pro to Basic');

      // Find Stripe customer
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (!customers.data || customers.data.length === 0) {
        throw new Error('Stripe customer not found');
      }

      const stripeCustomerId = customers.data[0].id;

      // Get current subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active',
        limit: 10,
      });

      // Cancel all existing subscriptions
      for (const sub of subscriptions.data) {
        console.log('❌ Canceling existing subscription:', sub.id);
        await stripe.subscriptions.cancel(sub.id);
      }

      // Create new Basic subscription
      console.log('✅ Creating new Basic subscription');
      const newSubscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: stripePriceIdBasic }],
      });

      // Update Clerk metadata
      const subscriptionMetadata = {
        plan: 'northstar_basic',
        status: newSubscription.status,
        subscriptionId: newSubscription.id,
        stripeCustomerId: stripeCustomerId,
        currentPeriodEnd: newSubscription.current_period_end * 1000,
        cancelAtPeriodEnd: newSubscription.cancel_at_period_end,
        accountStatus: 'active',
      };

      await clerkClient.users.updateUser(userId, {
        publicMetadata: { subscription: subscriptionMetadata }
      });

      console.log('✅ Downgraded to Basic successfully');

      return new Response(
        JSON.stringify({ 
          success: true,
          subscription: {
            plan: 'northstar_basic',
            status: newSubscription.status,
            subscriptionId: newSubscription.id,
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    } else if (userAction === 'suspend_account') {
      // Suspend account due to cancellation
      console.log('🔒 Suspending account due to cancellation');

      const subscriptionMetadata = {
        plan: currentSub?.plan || null,
        status: 'suspended',
        subscriptionId: currentSub?.subscriptionId || null,
        stripeCustomerId: currentSub?.stripeCustomerId || null,
        currentPeriodEnd: currentSub?.currentPeriodEnd || null,
        cancelAtPeriodEnd: true,
        accountStatus: 'suspended',
      };

      await clerkClient.users.updateUser(userId, {
        publicMetadata: { subscription: subscriptionMetadata }
      });

      console.log('✅ Account suspended successfully');

      return new Response(
        JSON.stringify({ 
          success: true,
          subscription: {
            plan: null,
            status: 'suspended',
            accountStatus: 'suspended',
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('❌ Error processing subscription change:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process subscription change',
        details: error
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

