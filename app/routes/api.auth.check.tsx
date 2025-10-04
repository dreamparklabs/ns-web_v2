export async function loader({ request }: { request: Request }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  // For now, just return false since we don't have server-side Clerk auth
  return new Response(JSON.stringify({ authenticated: false }), {
    status: 401,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
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
