// No imports needed - using native Response API

export async function action({ request }: { request: Request }) {
  // Only allow POST requests
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Handle CORS for extension
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  try {
    const body = await request.json();
    const { email, password, extensionAuth } = body;

    if (!email || !password) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Email and password are required" 
    }), { 
      status: 400, 
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    }

    // For now, we'll provide a helpful message since we can't directly authenticate with Clerk
    // In a full implementation, you'd integrate with Clerk's server-side authentication
    return new Response(JSON.stringify({
      success: false,
      error: "Direct authentication not yet implemented",
      message: "Please sign in to Northstar in your browser first, then the extension will automatically detect your session.",
      fallbackUrl: "/sign-in"
    }), { 
      status: 501, 
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error) {
    console.error('Extension auth error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: "Authentication service error",
      message: "Please try signing in to Northstar in your browser."
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

// Handle preflight OPTIONS requests
export async function options() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
