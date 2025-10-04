import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Route } from "./+types/auth.d2l.callback";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "D2L Authentication - Northstar" },
    { name: "description", content: "Completing D2L authentication" },
  ];
}

export default function D2LCallback() {
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing D2L authentication...');

  const handleCallback = useMutation(api.d2lOAuth.handleD2LOAuthCallback);

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Check for OAuth errors
      if (error) {
        setStatus('error');
        setMessage(`D2L authentication failed: ${errorDescription || error}`);
        
        // Notify parent window of error
        if (window.opener) {
          window.opener.postMessage({
            type: 'D2L_OAUTH_ERROR',
            error: errorDescription || error,
          }, window.location.origin);
        }
        return;
      }

      // Check for required parameters
      if (!code || !state) {
        setStatus('error');
        setMessage('Invalid callback parameters received from D2L');
        
        if (window.opener) {
          window.opener.postMessage({
            type: 'D2L_OAUTH_ERROR',
            error: 'Invalid callback parameters',
          }, window.location.origin);
        }
        return;
      }

      // Wait for user to be loaded
      if (!user?.id) {
        setMessage('Waiting for user authentication...');
        return;
      }

      try {
        setMessage('Exchanging authorization code...');
        
        const result = await handleCallback({
          clerkUserId: user.id,
          code,
          state,
        });

        if (result.success) {
          setStatus('success');
          setMessage(`Successfully connected to D2L as ${result.user.name}!`);
          
          // Notify parent window of success
          if (window.opener) {
            window.opener.postMessage({
              type: 'D2L_OAUTH_SUCCESS',
              user: result.user,
            }, window.location.origin);
            
            // Close popup after a short delay
            setTimeout(() => {
              window.close();
            }, 2000);
          }
        }
      } catch (error) {
        setStatus('error');
        setMessage(`Authentication failed: ${error.message}`);
        
        if (window.opener) {
          window.opener.postMessage({
            type: 'D2L_OAUTH_ERROR',
            error: error.message,
          }, window.location.origin);
        }
      }
    };

    processCallback();
  }, [searchParams, user, handleCallback]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          {/* D2L Logo */}
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            D2L Authentication
          </h1>

          {/* Status Display */}
          <div className="mb-6">
            {status === 'processing' && (
              <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                <span className="text-sm">{message}</span>
              </div>
            )}

            {status === 'success' && (
              <div className="text-green-600 dark:text-green-400">
                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium">{message}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  This window will close automatically...
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-red-600 dark:text-red-400">
                <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-sm font-medium">{message}</p>
                <button
                  onClick={() => window.close()}
                  className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
            <p>
              This is a secure authentication window for connecting your D2L account to Northstar.
              {status === 'processing' && ' Please do not close this window until authentication is complete.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
