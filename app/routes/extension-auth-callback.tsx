import { useUser } from "@clerk/clerk-react";
import { useEffect } from "react";

export default function ExtensionAuthCallback() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        // User is authenticated - send success message to extension
        console.log('🎉 User authenticated:', user.id);
        
        // Store auth data in localStorage for extension to pick up
        const authData = {
          success: true,
          user: {
            clerkUserId: user.id,
            userId: user.id,
            email: user.primaryEmailAddress?.emailAddress || '',
            firstName: user.firstName || '',
            fullName: user.fullName || '',
            authenticated: true
          }
        };
        
        try {
          localStorage.setItem('northstar_extension_auth', JSON.stringify(authData));
          console.log('🎉 Stored auth data in localStorage');
          
          // Note: Chrome extension storage access removed - content script will handle this
        } catch (error) {
          console.log('Failed to store in localStorage:', error);
        }

        // Try to communicate with extension via postMessage
        if (window.opener) {
          window.opener.postMessage({
            type: 'NORTHSTAR_AUTH_SUCCESS',
            data: authData
          }, window.location.origin);
        }

        // Try to communicate with extension via postMessage to window
        try {
          // Post message to the current window for extension to capture
          window.postMessage({
            type: 'NORTHSTAR_AUTH_SUCCESS',
            source: 'northstar_auth',
            data: authData
          }, window.location.origin);
          console.log('🚀 Posted auth success message to window');
        } catch (error) {
          console.log('Failed to post message to window:', error);
        }

        // Chrome runtime messaging removed - web pages can't send messages without extension ID
        // Content script will handle the communication via postMessage
        
        // Set URL parameters as fallback for extension to read
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('auth_success', 'true');
        newUrl.searchParams.set('clerk_user_id', user.id);
        newUrl.searchParams.set('email', user.primaryEmailAddress?.emailAddress || '');
        newUrl.searchParams.set('first_name', user.firstName || '');
        newUrl.searchParams.set('full_name', user.fullName || '');
        
        console.log('🔗 Setting URL with auth data:', newUrl.toString());
        window.history.replaceState({}, '', newUrl.toString());

        // Give the extension time to read the URL parameters before closing
        setTimeout(() => {
          console.log('🔗 Current URL after auth:', window.location.href);
          try {
            window.close();
          } catch (error) {
            console.log('Cannot close window automatically - user must close manually');
            // Set a flag to show close instruction
            document.body.innerHTML += '<div style="margin-top: 20px; padding: 10px; background: #fef3c7; border-radius: 8px;"><strong>Please close this tab manually</strong><br>Authentication was successful!</div>';
          }
        }, 3000); // Increased delay to give extension more time
      } else {
        // User not authenticated
        console.log('❌ User not authenticated');
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    }
  }, [isLoaded, user]);

  return (
    <div style={{ 
      padding: "20px", 
      fontFamily: "system-ui", 
      textAlign: "center",
      backgroundColor: "#f0f9ff"
    }}>
      {!isLoaded ? (
        <>
          <h2>🔄 Processing Authentication...</h2>
          <p>Checking your authentication status...</p>
        </>
      ) : user ? (
        <>
          <h2>🎉 Authentication Successful!</h2>
          <p>Welcome, {user.firstName || user.primaryEmailAddress?.emailAddress}!</p>
          <p>This window will close automatically...</p>
        </>
      ) : (
        <>
          <h2>❌ Authentication Required</h2>
          <p>Please sign in and try again.</p>
          <p>This window will close automatically...</p>
        </>
      )}
    </div>
  );
}
