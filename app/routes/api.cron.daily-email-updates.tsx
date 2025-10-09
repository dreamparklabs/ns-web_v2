import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Route } from "./+types/api.cron.daily-email-updates";

export async function loader({ request }: Route.LoaderArgs) {
  // Verify this is a legitimate cron request (optional security check)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
  
  try {
    console.log("Starting daily email updates...");
    await convex.action(api.emailNotifications.scheduleDailyUpdates, {});
    console.log("Daily email updates completed successfully");
    
    return new Response("Daily updates sent successfully", { 
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      }
    });
  } catch (error) {
    console.error("Failed to send daily updates:", error);
    return new Response("Failed to send daily updates", { 
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      }
    });
  }
}

export async function action({ request }: Route.ActionArgs) {
  return loader({ request });
}

