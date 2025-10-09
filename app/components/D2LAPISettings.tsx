import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { motion, AnimatePresence } from 'framer-motion';

interface D2LAPISettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function D2LAPISettings({ isOpen, onClose }: D2LAPISettingsProps) {
  const { user } = useUser();
  const [step, setStep] = useState<'setup' | 'oauth' | 'testing' | 'complete'>('setup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [institutionUrl, setInstitutionUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  // Convex functions
  const storeCredentials = useMutation(api.d2lAPI.storeD2LCredentials);
  const getConfiguration = useQuery(api.d2lAPI.getD2LConfiguration, 
    user?.id ? { clerkUserId: user.id } : "skip"
  );
  const testConnection = useMutation(api.d2lAPI.testD2LConnection);
  const syncAssignments = useMutation(api.d2lAPI.syncAssignmentsFromD2L);

  // Load existing configuration
  useEffect(() => {
    if (getConfiguration) {
      setInstitutionUrl(getConfiguration.institutionUrl || '');
      setClientId(getConfiguration.clientId || '');
      if (getConfiguration.hasAccessToken) {
        setStep('complete');
      }
    }
  }, [getConfiguration]);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      await storeCredentials({
        clerkUserId: user.id,
        institutionUrl: institutionUrl.replace(/\/$/, ''), // Remove trailing slash
        clientId,
        clientSecret,
      });

      setSuccess('✅ D2L API credentials saved! Now we need to authenticate...');
      setStep('oauth');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials');
    } finally {
      setLoading(false);
    }
  };

  const initiateOAuth = () => {
    // Generate OAuth URL for D2L
    const oauthUrl = `${institutionUrl}/d2l/auth/oauth2/authorize?` + new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: `${window.location.origin}/app/v2/settings?d2l_oauth=callback`,
      scope: 'core:*:*', // Request all permissions
      state: 'northstar_d2l_oauth',
    });

    // Open OAuth window
    window.open(oauthUrl, 'D2L OAuth', 'width=600,height=700,scrollbars=yes');
    
    // Listen for OAuth callback
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'd2l_oauth_success') {
        window.removeEventListener('message', handleMessage);
        setStep('testing');
        handleOAuthCallback(event.data.code);
      } else if (event.data.type === 'd2l_oauth_error') {
        window.removeEventListener('message', handleMessage);
        setError('OAuth authentication failed: ' + event.data.error);
      }
    };

    window.addEventListener('message', handleMessage);
  };

  const handleOAuthCallback = async (authCode: string) => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Exchange auth code for tokens (this would typically be done on the backend)
      const tokenResponse = await fetch(`${institutionUrl}/d2l/auth/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code: authCode,
          redirect_uri: `${window.location.origin}/app/v2/settings?d2l_oauth=callback`,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange authorization code for tokens');
      }

      const tokenData = await tokenResponse.json();

      // Store tokens
      await storeCredentials({
        clerkUserId: user.id,
        institutionUrl,
        clientId,
        clientSecret,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: Date.now() + (tokenData.expires_in * 1000),
      });

      setSuccess('✅ OAuth authentication successful! Testing connection...');
      
      // Test the connection
      const testResult = await testConnection({ clerkUserId: user.id });
      
      if (testResult.success) {
        setSuccess(`✅ Connection successful! Connected as ${testResult.userInfo?.firstName} ${testResult.userInfo?.lastName}`);
        setStep('complete');
      } else {
        throw new Error(testResult.error || 'Connection test failed');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await syncAssignments({ clerkUserId: user.id });
      
      if (result.success) {
        setSuccess(`✅ Sync complete! Imported ${result.assignmentsCount} assignments and ${result.gradesCount} grades from ${result.coursesProcessed} courses.`);
      } else {
        throw new Error('Sync failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setLoading(false);
    }
  };

  const resetSetup = () => {
    setStep('setup');
    setError(null);
    setSuccess(null);
    setInstitutionUrl('');
    setClientId('');
    setClientSecret('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50 dark:bg-opacity-75"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="relative w-full max-w-2xl p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                🔗 D2L API Integration
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {['setup', 'oauth', 'testing', 'complete'].map((stepName, index) => (
                  <div key={stepName} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step === stepName 
                        ? 'bg-purple-600 text-white' 
                        : ['setup', 'oauth', 'testing', 'complete'].indexOf(step) > index
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                    }`}>
                      {['setup', 'oauth', 'testing', 'complete'].indexOf(step) > index ? '✓' : index + 1}
                    </div>
                    {index < 3 && (
                      <div className={`w-16 h-1 mx-2 ${
                        ['setup', 'oauth', 'testing', 'complete'].indexOf(step) > index
                          ? 'bg-green-500'
                          : 'bg-gray-200 dark:bg-gray-600'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {step === 'setup' && 'Configure API Credentials'}
                {step === 'oauth' && 'Authenticate with D2L'}
                {step === 'testing' && 'Test Connection'}
                {step === 'complete' && 'Ready to Sync'}
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-200">{success}</p>
              </div>
            )}

            {/* Step Content */}
            {step === 'setup' && (
              <div>
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">📋 Before You Start</h3>
                  <p className="text-blue-800 dark:text-blue-200 text-sm mb-2">
                    You'll need to register an application with your institution's D2L administrator to get:
                  </p>
                  <ul className="text-blue-800 dark:text-blue-200 text-sm list-disc ml-4 space-y-1">
                    <li><strong>Client ID</strong> - Your application identifier</li>
                    <li><strong>Client Secret</strong> - Your application secret key</li>
                    <li><strong>Institution URL</strong> - Your D2L/Brightspace URL</li>
                  </ul>
                  <p className="text-blue-800 dark:text-blue-200 text-sm mt-2">
                    📖 <a href="https://docs.valence.desire2learn.com/" target="_blank" rel="noopener noreferrer" className="underline">
                      View D2L API Documentation
                    </a>
                  </p>
                </div>

                <form onSubmit={handleSetupSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="institution-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Institution URL
                    </label>
                    <input
                      type="url"
                      id="institution-url"
                      value={institutionUrl}
                      onChange={(e) => setInstitutionUrl(e.target.value)}
                      placeholder="https://your-school.brightspace.com"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="client-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Client ID
                    </label>
                    <input
                      type="text"
                      id="client-id"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="client-secret" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      id="client-secret"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        'Continue to Authentication'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {step === 'oauth' && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2v6m0 0a2 2 0 01-2 2m2-2a2 2 0 002 2M9 5a2 2 0 00-2 2v6a2 2 0 002 2m0 0a2 2 0 002 2m-2-2V7a2 2 0 012-2m-2 2V5a2 2 0 012-2m-2 2H7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Authenticate with D2L</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Click the button below to open a secure authentication window and log into your D2L account.
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={initiateOAuth}
                    disabled={loading}
                    className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    🔐 Authenticate with D2L
                  </button>

                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    A new window will open for secure authentication
                  </div>

                  <button
                    onClick={() => setStep('setup')}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
                  >
                    ← Back to Setup
                  </button>
                </div>
              </div>
            )}

            {step === 'testing' && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="animate-spin w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Testing Connection</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Verifying your D2L API connection and permissions...
                  </p>
                </div>
              </div>
            )}

            {step === 'complete' && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">🎉 D2L API Ready!</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Your D2L API integration is configured and ready to use.
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={handleSync}
                    disabled={loading}
                    className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Syncing...
                      </>
                    ) : (
                      '🔄 Sync All Assignments & Grades'
                    )}
                  </button>

                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    This will import all your assignments and grades from D2L
                  </div>

                  <button
                    onClick={resetSetup}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
                  >
                    🔧 Reconfigure Settings
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}




