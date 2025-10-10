import type { ActionFunctionArgs } from "react-router";
import { json } from "react-router";
import { Webhook } from "svix";
import { headers } from "next/headers";

// Clerk billing webhook handler
export async function action({ request }: ActionFunctionArgs) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET to your environment variables");
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return json({ error: "Error occured -- no svix headers" }, { status: 400 });
  }

  // Get the body
  const payload = await request.text();
  const body = JSON.parse(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return json({ error: "Error verifying webhook" }, { status: 400 });
  }

  // Handle the webhook
  const eventType = evt.type;
  
  console.log(`Received Clerk billing webhook: ${eventType}`);

  try {
    switch (eventType) {
      case "subscription.created":
        await handleSubscriptionCreated(evt.data);
        break;
      
      case "subscription.updated":
        await handleSubscriptionUpdated(evt.data);
        break;
      
      case "subscription.deleted":
        await handleSubscriptionDeleted(evt.data);
        break;
      
      case "subscription.activated":
        await handleSubscriptionActivated(evt.data);
        break;
      
      case "subscription.canceled":
        await handleSubscriptionCanceled(evt.data);
        break;
      
      case "subscription.past_due":
        await handleSubscriptionPastDue(evt.data);
        break;
      
      case "subscription.unpaid":
        await handleSubscriptionUnpaid(evt.data);
        break;
      
      case "subscription.trial_started":
        await handleTrialStarted(evt.data);
        break;
      
      case "subscription.trial_ended":
        await handleTrialEnded(evt.data);
        break;
      
      case "payment.succeeded":
        await handlePaymentSucceeded(evt.data);
        break;
      
      case "payment.failed":
        await handlePaymentFailed(evt.data);
        break;
      
      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }

    return json({ received: true });
  } catch (error) {
    console.error(`Error handling webhook ${eventType}:`, error);
    return json({ error: "Error processing webhook" }, { status: 500 });
  }
}

// Webhook event handlers
async function handleSubscriptionCreated(data: any) {
  console.log("Subscription created:", data);
  
  // Update user metadata with subscription info
  // This would typically involve updating your database
  // For now, we'll just log the event
  
  // You might want to:
  // 1. Update user's subscription status in your database
  // 2. Send welcome email
  // 3. Track the event in analytics
  // 4. Update user's plan limits
}

async function handleSubscriptionUpdated(data: any) {
  console.log("Subscription updated:", data);
  
  // Handle subscription changes like:
  // - Plan upgrades/downgrades
  // - Billing cycle changes
  // - Feature changes
}

async function handleSubscriptionDeleted(data: any) {
  console.log("Subscription deleted:", data);
  
  // Handle subscription cancellation:
  // - Downgrade user to free plan
  // - Update access permissions
  // - Send cancellation confirmation
}

async function handleSubscriptionActivated(data: any) {
  console.log("Subscription activated:", data);
  
  // Subscription is now active:
  // - Enable premium features
  // - Update user status
  // - Send activation email
}

async function handleSubscriptionCanceled(data: any) {
  console.log("Subscription canceled:", data);
  
  // Handle cancellation:
  // - Set subscription to canceled status
  // - Allow access until end of billing period
  // - Send cancellation email
}

async function handleSubscriptionPastDue(data: any) {
  console.log("Subscription past due:", data);
  
  // Handle past due status:
  // - Restrict premium features
  // - Send payment reminder
  // - Update user status
}

async function handleSubscriptionUnpaid(data: any) {
  console.log("Subscription unpaid:", data);
  
  // Handle unpaid status:
  // - Restrict all premium features
  // - Send urgent payment reminder
  // - Consider account suspension
}

async function handleTrialStarted(data: any) {
  console.log("Trial started:", data);
  
  // Handle trial start:
  // - Enable trial features
  // - Set trial end date
  // - Send trial welcome email
}

async function handleTrialEnded(data: any) {
  console.log("Trial ended:", data);
  
  // Handle trial end:
  // - Check if user converted to paid
  // - Restrict features if not converted
  // - Send trial end notification
}

async function handlePaymentSucceeded(data: any) {
  console.log("Payment succeeded:", data);
  
  // Handle successful payment:
  // - Update subscription status
  // - Send payment confirmation
  // - Track revenue in analytics
}

async function handlePaymentFailed(data: any) {
  console.log("Payment failed:", data);
  
  // Handle failed payment:
  // - Update subscription status
  // - Send payment failure notification
  // - Consider retry logic
}

// Helper function to update user subscription status
async function updateUserSubscriptionStatus(userId: string, subscriptionData: any) {
  // This would integrate with your user management system
  // For Clerk, you might update user metadata:
  
  try {
    // Example of how you might update user metadata
    // const { user } = await clerkClient.users.getUser(userId);
    // await clerkClient.users.updateUser(userId, {
    //   publicMetadata: {
    //     ...user.publicMetadata,
    //     subscription: subscriptionData
    //   }
    // });
    
    console.log(`Updated subscription status for user ${userId}:`, subscriptionData);
  } catch (error) {
    console.error(`Failed to update subscription status for user ${userId}:`, error);
  }
}

// Helper function to track billing events in analytics
async function trackBillingEvent(eventType: string, data: any) {
  // Track billing events in your analytics system
  // This could be PostHog, Mixpanel, or any other analytics platform
  
  console.log(`Tracking billing event: ${eventType}`, data);
  
  // Example PostHog tracking:
  // posthog.capture({
  //   distinctId: data.user_id,
  //   event: `billing_${eventType}`,
  //   properties: {
  //     subscription_id: data.subscription_id,
  //     plan_id: data.plan_id,
  //     amount: data.amount,
  //     currency: data.currency,
  //     ...data
  //   }
  // });
}

export async function loader() {
  return json({ message: "Clerk billing webhook endpoint" });
}



