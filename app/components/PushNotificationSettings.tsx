import React, { useState, useEffect } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface PushNotificationSettingsProps {
  className?: string;
}

export default function PushNotificationSettings({ className = '' }: PushNotificationSettingsProps) {
  const { state, enable, disable, sendTestNotification, requestPermission } = usePushNotifications();
  const [isTesting, setIsTesting] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Handle SSR
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      // First request permission, then enable
      const permission = await requestPermission();
      if (permission === 'granted') {
        await enable();
      }
    } else {
      await disable();
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      await sendTestNotification();
    } catch (error) {
      console.error('Test notification failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const getPermissionStatus = () => {
    switch (state.permission) {
      case 'granted':
        return { text: 'Allowed', color: 'text-green-600 dark:text-green-400' };
      case 'denied':
        return { text: 'Blocked', color: 'text-red-600 dark:text-red-400' };
      case 'default':
      default:
        return { text: 'Not requested', color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const permissionStatus = getPermissionStatus();

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className={`p-4 border border-gray-200 dark:border-gray-600 rounded-lg ${className}`}>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Push Notifications</h4>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!state.isSupported) {
    return (
      <div className={`p-4 border border-gray-200 dark:border-gray-600 rounded-lg ${className}`}>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Push Notifications</h4>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Push notifications are not supported in this browser.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border border-gray-200 dark:border-gray-600 rounded-lg ${className}`}>
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Push Notifications</h4>
      
      {/* Error Message */}
      {state.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800 dark:text-red-200">{state.error}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h5 className="text-sm font-medium text-gray-900 dark:text-white">Enable Push Notifications</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Receive push notifications in your browser
            </p>
            <div className="mt-1">
              <span className={`text-xs font-medium ${permissionStatus.color}`}>
                Permission: {permissionStatus.text}
              </span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={state.isEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
              disabled={state.isLoading}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
          </label>
        </div>

        {/* Permission Status */}
        {state.permission === 'denied' && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h6 className="text-sm font-medium text-red-800 dark:text-red-200">Notifications Blocked</h6>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Push notifications have been blocked. Please enable them in your browser settings and refresh the page.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Test Notification Button */}
        {state.isEnabled && state.permission === 'granted' && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <div>
              <h6 className="text-sm font-medium text-gray-900 dark:text-white">Test Notification</h6>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Send a test notification to verify everything is working
              </p>
            </div>
            <button
              onClick={handleTestNotification}
              disabled={isTesting || state.isLoading}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/30"
            >
              {isTesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6a4 4 0 00-4-4H4v10z" />
                  </svg>
                  Test
                </>
              )}
            </button>
          </div>
        )}

        {/* Loading State */}
        {state.isLoading && (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
