// Session deactivation endpoint
export async function action({ request }: { request: Request }) {
  try {
    console.log("[API] Session deactivation requested");

    // In a real application, you would handle session deactivation logic here.
    // For example, invalidating a session token, logging out the user, etc.
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Session deactivated successfully." 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deactivating session:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to deactivate session" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function loader() {
  return new Response(JSON.stringify({ 
    message: "Session deactivation endpoint" 
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

