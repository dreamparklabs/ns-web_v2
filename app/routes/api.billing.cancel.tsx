// import { clerkClient } from "@clerk/clerk-sdk-node"; // Uncomment when Clerk SDK is properly configured

// Clerk billing subscription cancellation endpoint
export async function action({ request }: { request: Request }) {
  try {
    const { subscriptionId, userId } = await request.json();

    if (!subscriptionId || !userId) {
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

    // In a real implementation, you would:
    // 1. Cancel the Stripe subscription
    // 2. Set cancel_at_period_end to true to allow access until period ends
    // 3. Update user metadata

    // For now, we'll simulate the cancellation
    console.log(`[API] User ${userId} attempting to cancel subscription: ${subscriptionId}`);
    
    // Simulate successful cancellation
    console.log(`[API] Successfully simulated cancellation for subscription ${subscriptionId} by user ${userId}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Subscription canceled successfully. Access will continue until the end of the current billing period.",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error canceling subscription:", error);
    return new Response(JSON.stringify({ error: "Failed to cancel subscription" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function loader() {
  return new Response(JSON.stringify({ message: "Subscription cancellation endpoint" }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
