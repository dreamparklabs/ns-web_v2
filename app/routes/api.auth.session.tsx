import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";

// This is a client-side route that can detect Clerk authentication
export default function AuthSession() {
  const { user, isLoaded } = useUser();
  const [response, setResponse] = useState(null);

  useEffect(() => {
    if (isLoaded) {
      const authData = user ? {
        authenticated: true,
        clerkUserId: user.id,
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress || null
      } : {
        authenticated: false,
        error: "Not authenticated"
      };

      setResponse(authData);

      // Send response as JSON
      if (window.parent !== window) {
        // If in iframe, send to parent
        window.parent.postMessage({
          type: 'CLERK_AUTH_RESPONSE',
          data: authData
        }, '*');
      }
    }
  }, [isLoaded, user]);

  // Return JSON response for direct access
  if (response) {
    return (
      <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', padding: '10px' }}>
        {JSON.stringify(response, null, 2)}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui', padding: '20px', textAlign: 'center' }}>
      <p>Checking authentication...</p>
    </div>
  );
}
