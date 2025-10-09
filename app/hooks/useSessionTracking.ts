import { useEffect, useCallback } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { detectDeviceInfo, getLocationInfo, type DeviceInfo } from "../utils/deviceDetection";

export function useSessionTracking() {
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const trackSession = useMutation(api.userSessions.trackSession);
  const updateSessionActivity = useMutation(api.userSessions.updateSessionActivity);
  const deactivateSession = useMutation(api.userSessions.deactivateSession);

  // Track session on login
  const trackUserSession = useCallback(async () => {
    if (!user?.id || !clerk.session?.id) return;

    try {
      // Get device info
      const deviceInfo = detectDeviceInfo();
      
      // Get location info (async) with timeout
      let locationInfo = {};
      try {
        const locationPromise = getLocationInfo();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Location fetch timeout')), 5000)
        );
        locationInfo = await Promise.race([locationPromise, timeoutPromise]);
      } catch (error) {
        console.warn('Failed to fetch location info:', error);
        // Continue without location info
      }
      
      // Combine device and location info
      const fullDeviceInfo: DeviceInfo = {
        ...deviceInfo,
        ...locationInfo,
      };

      console.log('Tracking session for user:', user.id, 'session:', clerk.session.id);
      console.log('Device info:', fullDeviceInfo);

      await trackSession({
        clerkUserId: user.id,
        sessionId: clerk.session.id,
        deviceInfo: fullDeviceInfo,
      });

      console.log('Session tracked successfully');
    } catch (error) {
      console.error('Failed to track session:', error);
    }
  }, [user?.id, clerk.session?.id, trackSession]);

  // Update session activity periodically
  const updateActivity = useCallback(async () => {
    if (!clerk.session?.id) return;

    try {
      await updateSessionActivity({
        sessionId: clerk.session.id,
      });
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }, [clerk.session?.id, updateSessionActivity]);

  // Deactivate session on logout
  const deactivateUserSession = useCallback(async () => {
    if (!clerk.session?.id) return;

    try {
      await deactivateSession({
        sessionId: clerk.session.id,
      });
      console.log('Session deactivated');
    } catch (error) {
      console.error('Failed to deactivate session:', error);
    }
  }, [clerk.session?.id, deactivateSession]);

  // Track session when user is loaded and authenticated
  useEffect(() => {
    if (isLoaded && user && clerk.session) {
      trackUserSession();
    }
  }, [isLoaded, user, clerk.session, trackUserSession]);

  // Update activity every 10 minutes (reduced frequency)
  useEffect(() => {
    if (!isLoaded || !user || !clerk.session) return;

    const interval = setInterval(() => {
      updateActivity();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [isLoaded, user, clerk.session, updateActivity]);

  // Track activity on user interaction
  useEffect(() => {
    if (!isLoaded || !user || !clerk.session) return;

    let activityTimeout: NodeJS.Timeout;
    
    const handleActivity = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        updateActivity();
      }, 60000); // Update after 60 seconds of inactivity (reduced frequency)
    };

    // Track various user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearTimeout(activityTimeout);
    };
  }, [isLoaded, user, clerk.session, updateActivity]);

  // Handle page visibility changes
  useEffect(() => {
    if (!isLoaded || !user || !clerk.session) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, update activity
        updateActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoaded, user, clerk.session, updateActivity]);

  // Handle page unload
  useEffect(() => {
    if (!isLoaded || !user || !clerk.session) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery during page unload
      navigator.sendBeacon('/api/sessions/deactivate', JSON.stringify({
        sessionId: clerk.session.id,
      }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isLoaded, user, clerk.session?.id]);

  return {
    trackUserSession,
    updateActivity,
    deactivateUserSession,
  };
}
