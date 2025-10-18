export async function action({ request }: { request: Request }) {
  try {
    const { userId, planId, returnUrl, cancelUrl } = await request.json();

    if (!userId || !planId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or planId' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log('🔍 Creating Clerk subscription:', { userId, planId });

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY not found');
    }

    // Use Clerk's Backend API to create a checkout session
    const response = await fetch(`https://api.clerk.com/v1/users/${userId}/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan: planId,
        success_url: returnUrl || `${new URL(request.url).origin}/app/v2/dashboard?settings=true&checkout=success`,
        cancel_url: cancelUrl || `${new URL(request.url).origin}/app/v2/dashboard?settings=true&checkout=cancelled`,
      }),
    });

    console.log('📡 Clerk API response status:', response.status);
    
    // Get the response as text first to see what we're dealing with
    const responseText = await response.text();
    console.log('📡 Clerk API response body:', responseText);

    // Try to parse it as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse Clerk response as JSON:', parseError);
      throw new Error(`Clerk API returned invalid JSON: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      console.error('❌ Clerk API error:', data);
      throw new Error(data.errors?.[0]?.message || data.message || 'Failed to create subscription');
    }

    console.log('✅ Subscription created:', data);

    return new Response(
      JSON.stringify({ 
        success: true,
        checkout_url: data.checkout_url || data.url,
        subscription: data
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error('❌ Error creating subscription:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create subscription',
        details: error.errors || error
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

