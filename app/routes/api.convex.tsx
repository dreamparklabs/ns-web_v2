import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

interface ActionFunctionArgs {
  request: Request;
}

export async function action({ request }: ActionFunctionArgs) {
  // Only allow POST requests
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Handle CORS for extension
  const origin = request.headers.get("origin");
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  try {
    // Parse request body first
    const body = await request.json();
    let userId: string | null = null;
    
    // For now, use the extension-provided user ID
    // In production, you'd validate a JWT token here
    const requestUserId = body.args?.clerkUserId;
    
    if (requestUserId) {
      userId = requestUserId;
      console.log('Using extension authentication for user:', userId);
    }
    
    if (!userId) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { 
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const { function: functionPath, args } = body;

    if (!functionPath || !args) {
      return new Response(JSON.stringify({ error: "Missing function or args" }), { 
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    console.log('API Convex: User', userId, 'calling function', functionPath);

    // Parse function path (e.g., "d2lScraper:processScrapedAssignmentsWithMatching")
    const [module, functionName] = functionPath.split(':');
    
    if (!module || !functionName) {
      return new Response(JSON.stringify({ error: "Invalid function path format" }), { 
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    // Get the function reference from the API
    const functionRef = (api as any)[module]?.[functionName];
    
    if (!functionRef) {
      return new Response(JSON.stringify({ error: `Function ${functionPath} not found` }), { 
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    // Set the clerkUserId to the authenticated user
    args.clerkUserId = userId;

    // Execute the Convex function 
    const convexUrl = 'https://uncommon-rook-99.convex.cloud';
    
    const convexClient = new ConvexHttpClient(convexUrl);
    
    const result = await convexClient.mutation(functionRef, args);
    
    console.log('API Convex: Function executed successfully for user', userId);
    
    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('API Convex: Error calling function:', error);
    
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }), { 
      status: 500, 
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
}

// Handle CORS for browser extension
export async function loader() {
  return new Response(JSON.stringify({ error: "Method not allowed" }), { 
    status: 405,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
  });
}

// Handle preflight OPTIONS requests
export async function options() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
