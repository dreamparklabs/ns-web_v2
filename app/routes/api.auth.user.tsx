export async function loader({ request }: { request: Request }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  try {
    // Get cookies from the request
    const cookieHeader = request.headers.get("Cookie");
    console.log("🔍 Checking cookies:", cookieHeader);
    
    // Look for Clerk session cookies
    if (cookieHeader) {
      // Check for common Clerk session cookie patterns
      const hasClerkSession = cookieHeader.includes("__session") || 
                             cookieHeader.includes("__clerk") ||
                             cookieHeader.includes("clerk-session") ||
                             cookieHeader.includes("__client_uat");
      
      if (hasClerkSession) {
        console.log("🎉 Found Clerk session cookie");
        
        // For now, we can't easily extract user details from cookies alone
        // The extension should rely on the callback URL parameters for real user data
        return new Response(JSON.stringify({
          authenticated: true,
          clerkUserId: "session-detected",
          userId: "session-detected", 
          email: "session-detected",
          source: "session-cookie",
          note: "Use callback URL for real user data"
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          },
        });
      }
    }
    
    console.log("❌ No Clerk session found");
    return new Response(JSON.stringify({
      authenticated: false,
      error: "Not authenticated",
      message: "Please sign in using the extension's Sign In button"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return new Response(JSON.stringify({
      authenticated: false,
      error: "Server error", 
      message: "Failed to check authentication"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      },
    });
  }
}

// Handle CORS for browser extension
export async function options() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
