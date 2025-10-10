import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

// Canny SDK Types
declare global {
  interface Window {
    Canny: any;
  }
}

export default function CannyWidget() {
  const { user } = useUser();
  const CANNY_APP_ID = import.meta.env.VITE_CANNY_APP_ID;

  useEffect(() => {
    if (!CANNY_APP_ID) {
      return; // Canny not configured
    }

    // Load Canny SDK
    const script = document.createElement('script');
    script.src = 'https://canny.io/sdk.js';
    script.async = true;
    
    script.onload = () => {
      if (window.Canny) {
        // Initialize Canny
        window.Canny('identify', {
          appID: CANNY_APP_ID,
          user: user ? {
            email: user.emailAddresses[0]?.emailAddress,
            name: user.fullName || user.firstName || 'User',
            id: user.id,
            avatarURL: user.imageUrl,
            created: new Date(user.createdAt || Date.now()).toISOString(),
          } : undefined,
        });
      }
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [user, CANNY_APP_ID]);

  // Render nothing - Canny will inject its own widget
  return null;
}






