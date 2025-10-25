import { clerkClient } from "@clerk/clerk-sdk-node";
import { json } from "@remix-run/node";

export async function action({ request }: { request: Request }) {
  try {
    const { planId, successUrl, cancelUrl, userId, currentPlanId } = await request.json();

    if (!planId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing planId or userId' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log('🔍 Creating Stripe checkout for plan:', planId);
    console.log('📋 Current plan:', currentPlanId);

    // Map plan IDs to Stripe price IDs
    // These match the price IDs in your Stripe account
    const stripePriceIds: Record<string, string> = {
      'northstar_basic': process.env.STRIPE_PRICE_ID_BASIC || 'price_1SIZnd85FHQX10MtedhBiK6G',
      'northstar_pro': process.env.STRIPE_PRICE_ID_PRO || 'price_1SIa5i85FHQX10MtUTMDf3P3',
    };

    const priceId = stripePriceIds[planId];
    if (!priceId) {
      console.error('❌ No Stripe price ID found for plan:', planId);
      return new Response(
        JSON.stringify({ 
          error: `Plan ${planId} not configured. Please add STRIPE_PRICE_ID_${planId.toUpperCase()} to your environment variables.`,
          hint: 'Check your Stripe dashboard for the price IDs and add them to .env.local'
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not found in environment variables');
    }

    // If user has a current subscription, cancel it first before creating new checkout
    if (currentPlanId && currentPlanId !== planId) {
      const isUpgrade = currentPlanId === 'northstar_basic' && planId === 'northstar_pro';
      const isDowngrade = currentPlanId === 'northstar_pro' && planId === 'northstar_basic';
      
      console.log('🔄 User is changing plans from', currentPlanId, 'to', planId, 
                  isUpgrade ? '(UPGRADE ⬆️)' : isDowngrade ? '(DOWNGRADE ⬇️)' : '');
      
      try {
        // Get Clerk user to find their Stripe customer
        const clerkUser = await clerkClient.users.getUser(userId);
        const userEmail = clerkUser.emailAddresses?.[0]?.emailAddress;

        if (userEmail) {
          // Find Stripe customer
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
            const stripeCustomerId = customersData.data[0].id;
            
            // Get all active subscriptions
            const subscriptionsResponse = await fetch(
              `https://api.stripe.com/v1/subscriptions?customer=${stripeCustomerId}&status=active&limit=10`,
              {
                headers: {
                  'Authorization': `Bearer ${stripeSecretKey}`,
                },
              }
            );

            const subscriptionsData = await subscriptionsResponse.json();

            // Cancel all existing subscriptions
            for (const sub of subscriptionsData.data || []) {
              console.log('❌ Canceling existing subscription:', sub.id);
              await fetch(`https://api.stripe.com/v1/subscriptions/${sub.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${stripeSecretKey}`,
                },
              });
            }
          }
        }
      } catch (cancelError) {
        console.warn('⚠️ Failed to cancel existing subscriptions (non-fatal):', cancelError);
      }
    }

    // Get user email to ensure checkout uses correct customer
    const clerkUser = await clerkClient.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses?.[0]?.emailAddress;

    if (!userEmail) {
      throw new Error('User email not found');
    }

    console.log('📧 Creating checkout for email:', userEmail);

    // Find or create Stripe customer
    let stripeCustomerId: string | undefined;
    try {
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
        console.log('👤 Found existing Stripe customer:', stripeCustomerId);

        // Update customer metadata with Clerk user ID
        await fetch(`https://api.stripe.com/v1/customers/${stripeCustomerId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'metadata[clerkUserId]': userId,
          }).toString(),
        });
        console.log('✅ Updated customer metadata with Clerk user ID');
      } else {
        // Create new customer with metadata
        const createCustomerResponse = await fetch('https://api.stripe.com/v1/customers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'email': userEmail,
            'metadata[clerkUserId]': userId,
          }).toString(),
        });
        const newCustomer = await createCustomerResponse.json();
        stripeCustomerId = newCustomer.id;
        console.log('✅ Created new Stripe customer:', stripeCustomerId);
      }
    } catch (error) {
      console.warn('⚠️ Could not find/create customer, will use customer_email instead:', error);
    }

    // Create a Stripe checkout session with customer
    const checkoutParams = new URLSearchParams({
      'mode': 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': successUrl || `${new URL(request.url).origin}/app/v2/dashboard?checkout=success`,
      'cancel_url': cancelUrl || `${new URL(request.url).origin}/app/v2/dashboard?checkout=cancelled`,
      'client_reference_id': userId, // Store Clerk user ID for webhook processing
    });

    // Use existing customer if found, otherwise use email
    if (stripeCustomerId) {
      checkoutParams.append('customer', stripeCustomerId);
    } else {
      checkoutParams.append('customer_email', userEmail);
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: checkoutParams.toString(),
    });

    const responseText = await response.text();
    console.log('📡 Stripe API response status:', response.status);
    console.log('📡 Stripe API response:', responseText.substring(0, 500));

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }
      console.error('❌ Stripe API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to create checkout session');
    }

    const session = JSON.parse(responseText);
    console.log('✅ Stripe checkout session created:', session.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error('❌ Error creating checkout:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create checkout session',
        details: error
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

