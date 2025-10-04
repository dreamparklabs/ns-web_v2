interface LoaderFunctionArgs {
  request: Request;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  try {
    // Get cookies from the request
    const cookieHeader = request.headers.get("Cookie");
    console.log("🔍 Checking cookies for real user auth:", cookieHeader);
    
    // Look for Clerk session cookies
    if (cookieHeader) {
      // Check for common Clerk session cookie patterns
      const hasClerkSession = cookieHeader.includes("__session") || 
                             cookieHeader.includes("__clerk") ||
                             cookieHeader.includes("clerk-session") ||
                             cookieHeader.includes("__client_uat");
      
      if (hasClerkSession) {
        console.log("🎉 Found Clerk session cookie - user is authenticated");
        
        // For now, we still can't extract real user details from cookies alone
        // But we can indicate that the user is authenticated and should use the callback flow
        return new Response(JSON.stringify({
          authenticated: true,
          requiresCallback: true,
          message: "Please use the extension authentication flow to get complete user data",
          instructions: "Click 'Sign In' in the extension to authenticate properly"
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
    console.error("Real user auth check error:", error);
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

// Handle CORS
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
