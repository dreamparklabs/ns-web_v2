import type { ActionFunctionArgs } from "react-router";
import { json } from "@remix-run/node";
import Stripe from "stripe";

export async function action({ request }: ActionFunctionArgs) {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    throw new Error("Missing required environment variables");
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2025-09-30.clover",
  });

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return json({ error: "No signature" }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log("🎯 Stripe webhook received:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("✅ Checkout completed:", session.id);
        console.log("📋 Client reference ID:", session.client_reference_id);
        console.log("📋 Customer:", session.customer);
        
        if (!session.client_reference_id) {
          console.error("❌ No client_reference_id in checkout session");
          break;
        }

        // Update the Stripe customer metadata with Clerk user ID
        if (session.customer) {
          try {
            await stripe.customers.update(session.customer as string, {
              metadata: {
                clerkUserId: session.client_reference_id,
              },
            });
            console.log("✅ Updated customer metadata with Clerk user ID");
          } catch (error) {
            console.error("❌ Failed to update customer metadata:", error);
          }
        }
        
        // Sync the subscription status using the Clerk user ID
        await fetch(`${new URL(request.url).origin}/api/billing/sync-subscription`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: session.client_reference_id }),
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`📦 Subscription ${event.type}:`, subscription.id);
        
        // Get the customer
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (!customer || customer.deleted) break;
        
        // Get the Clerk user ID from customer metadata
        const clerkUserId = customer.metadata.clerkUserId;
        if (!clerkUserId) {
          console.error("❌ No Clerk user ID found in customer metadata");
          break;
        }

        // Sync the subscription status
        await fetch(`${new URL(request.url).origin}/api/billing/sync-subscription`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: clerkUserId }),
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("💰 Payment succeeded:", invoice.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("❌ Payment failed:", invoice.id);
        
        // Get the customer
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        if (!customer || customer.deleted) break;
        
        // Get the Clerk user ID from customer metadata
        const clerkUserId = customer.metadata.clerkUserId;
        if (!clerkUserId) {
          console.error("❌ No Clerk user ID found in customer metadata");
          break;
        }

        // TODO: Send email to user about failed payment
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return json({ received: true });
  } catch (error) {
    console.error(`Error handling webhook ${event.type}:`, error);
    return json({ error: "Error processing webhook" }, { status: 500 });
  }
}

export async function loader() {
  return json({ message: "Stripe webhook endpoint" });
}
