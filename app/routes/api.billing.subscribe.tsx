// Clerk billing subscription creation endpoint
export async function action({ request }: { request: Request }) {
  try {
    const { planId, userId } = await request.json();

    if (!planId || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get the user from Clerk
    // const user = await clerkClient.users.getUser(userId);
    // if (!user) {
    //   return json({ error: "User not found" }, { status: 404 });
    // }
    
    // For now, simulate user validation
    console.log(`[API] User ${userId} attempting to subscribe to plan: ${planId}`);

    // Define plan configurations
    const plans = {
      northstar_basic: {
        price: 4.99,
        currency: 'usd',
        interval: 'month',
        features: [
          'ai_ocr',
          'smart_search',
          'limited_dashboards',
          'limited_storage'
        ]
      },
      northstar_pro: {
        price: 14.99,
        currency: 'usd',
        interval: 'month',
        features: [
          'unlimited_dashboards',
          'unlimited_storage',
          'grade_analytics',
          'ai_recommendations',
          'academic_progress_analytics',
          'calendar_sync',
          'ai_study_buddy',
          'homework_help'
        ]
      }
    };

    const plan = plans[planId as keyof typeof plans];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Invalid plan ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // In a real implementation, you would:
    // 1. Create a Stripe customer if they don't have one
    // 2. Create a Stripe subscription
    // 3. Set up webhooks to handle subscription events
    // 4. Update user metadata with subscription info

    // For now, we'll simulate the subscription creation
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentPeriodEnd = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Update user metadata with subscription info
    // await clerkClient.users.updateUser(userId, {
    //   publicMetadata: {
    //     ...user.publicMetadata,
    //     subscription: {
    //       plan: planId,
    //       status: 'active',
    //       subscriptionId,
    //       startDate: Date.now(),
    //       currentPeriodEnd,
    //       price: plan.price,
    //       currency: plan.currency,
    //       interval: plan.interval,
    //     }
    //   }
    // });
    
    console.log(`[API] Successfully simulated subscription for user ${userId} to plan ${planId}. Subscription ID: ${subscriptionId}`);

    // In a real implementation, you would also:
    // - Create a Stripe checkout session
    // - Return the checkout URL for payment
    // - Handle the payment flow

    return new Response(JSON.stringify({
      success: true,
      subscriptionId,
      currentPeriodEnd,
      checkoutUrl: null, // Would be the Stripe checkout URL in real implementation
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error creating subscription:", error);
    return new Response(JSON.stringify({ error: "Failed to create subscription" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function loader() {
  return new Response(JSON.stringify({ message: "Subscription creation endpoint" }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
