import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";

interface D2LOAuthSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function D2LOAuthSettings({ isOpen, onClose }: D2LOAuthSettingsProps) {
  const { user } = useUser();
  const [schoolUrl, setSchoolUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState("");

  // Queries and mutations
  const oauthStatus = useQuery(
    api.d2lOAuth.getD2LOAuthStatus,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const initializeOAuth = useMutation(api.d2lOAuth.initializeD2LOAuth);
  const refreshToken = useMutation(api.d2lOAuth.refreshD2LToken);
  const disconnect = useMutation(api.d2lOAuth.disconnectD2LOAuth);
  const syncCourses = useMutation(api.d2lOAuth.syncD2LCoursesOAuth);

  // Load existing school URL
  useEffect(() => {
    if (oauthStatus && isOpen) {
      setSchoolUrl(oauthStatus.baseUrl || "");
    }
  }, [oauthStatus, isOpen]);

  // Handle D2L SSO login
  const handleD2LLogin = async () => {
    if (!user?.id || !schoolUrl) return;

    setIsConnecting(true);
    setSyncMessage("Initializing D2L connection...");

    try {
      // Initialize OAuth flow
      const result = await initializeOAuth({
        clerkUserId: user.id,
        schoolUrl: schoolUrl.trim(),
      });

      // Open popup window for D2L SSO
      const popup = window.open(
        result.authUrl,
        'd2l-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Listen for OAuth callback
      const handleMessage = (event: MessageEvent) => {
        // Verify origin for security
        if (event.origin !== window.location.origin) {
          return;
        }

        if (event.data.type === 'D2L_OAUTH_SUCCESS') {
          setSyncMessage("Successfully connected to D2L!");
          setSyncStatus('success');
          setIsConnecting(false);
          popup.close();
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'D2L_OAUTH_ERROR') {
          setSyncMessage(`Connection failed: ${event.data.error}`);
          setSyncStatus('error');
          setIsConnecting(false);
          popup.close();
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Handle popup closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          if (isConnecting) {
            setSyncMessage("Connection cancelled by user");
            setSyncStatus('error');
            setIsConnecting(false);
          }
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);

    } catch (error) {
      setSyncMessage(`Failed to initialize connection: ${error.message}`);
      setSyncStatus('error');
      setIsConnecting(false);
    }
  };

  // Handle token refresh
  const handleRefreshToken = async () => {
    if (!user?.id) return;

    setSyncStatus('syncing');
    setSyncMessage("Refreshing connection...");

    try {
      await refreshToken({ clerkUserId: user.id });
      setSyncMessage("Connection refreshed successfully!");
      setSyncStatus('success');
    } catch (error) {
      setSyncMessage(`Failed to refresh connection: ${error.message}`);
      setSyncStatus('error');
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!user?.id) return;

    if (!confirm("Are you sure you want to disconnect from D2L? This will remove all synced data.")) {
      return;
    }

    setSyncStatus('syncing');
    setSyncMessage("Disconnecting from D2L...");

    try {
      await disconnect({ clerkUserId: user.id });
      setSyncMessage("Successfully disconnected from D2L");
      setSyncStatus('success');
      setSchoolUrl("");
    } catch (error) {
      setSyncMessage(`Failed to disconnect: ${error.message}`);
      setSyncStatus('error');
    }
  };

  // Handle course sync
  const handleSyncCourses = async () => {
    if (!user?.id) return;

    setSyncStatus('syncing');
    setSyncMessage("Syncing courses from D2L...");

    try {
      const result = await syncCourses({ clerkUserId: user.id });
      setSyncMessage(`Successfully synced ${result.totalSynced} courses!`);
      setSyncStatus('success');
    } catch (error) {
      if (error.message === 'REFRESH_TOKEN_NEEDED') {
        setSyncMessage("Connection expired. Please refresh your connection.");
        setSyncStatus('error');
      } else {
        setSyncMessage(`Course sync failed: ${error.message}`);
        setSyncStatus('error');
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 backdrop-blur-sm bg-black/20"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ 
              duration: 0.4, 
              ease: [0.16, 1, 0.3, 1],
              scale: { duration: 0.35 },
              y: { duration: 0.4 }
            }}
            className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">D2L SSO Integration</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Connect with your school's D2L using Single Sign-On
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Connection Status */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Connection Status</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    oauthStatus?.isConnected ? 'bg-green-500' : 
                    oauthStatus?.needsRefresh ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {oauthStatus?.isConnected ? 'Connected' : 
                     oauthStatus?.needsRefresh ? 'Connection Expired' : 
                     'Not Connected'}
                  </span>
                </div>
                {oauthStatus?.userName && (
                  <p className="text-xs text-gray-500 mt-1">
                    Logged in as: {oauthStatus.userName}
                  </p>
                )}
                {oauthStatus?.lastSyncAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last sync: {new Date(oauthStatus.lastSyncAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* School URL Input */}
              {!oauthStatus?.isConnected && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-white">Connect to Your School</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      School D2L URL *
                    </label>
                    <input
                      type="url"
                      value={schoolUrl}
                      onChange={(e) => setSchoolUrl(e.target.value)}
                      placeholder="https://myschool.brightspace.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter your school's D2L Brightspace URL
                    </p>
                  </div>

                  <button
                    onClick={handleD2LLogin}
                    disabled={isConnecting || !schoolUrl.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isConnecting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Connect with SSO
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Connected Actions */}
              {oauthStatus?.isConnected && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-white">Sync Controls</h3>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={handleSyncCourses}
                      disabled={syncStatus === 'syncing'}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Sync Courses & Assignments
                    </button>
                    
                    <button
                      onClick={handleDisconnect}
                      disabled={syncStatus === 'syncing'}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Disconnect D2L
                    </button>
                  </div>
                </div>
              )}

              {/* Refresh Connection */}
              {oauthStatus?.needsRefresh && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Connection Expired</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                    Your D2L connection has expired. Click below to refresh it.
                  </p>
                  <button
                    onClick={handleRefreshToken}
                    disabled={syncStatus === 'syncing'}
                    className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Refresh Connection
                  </button>
                </div>
              )}

              {/* Sync Status */}
              {syncMessage && (
                <div className={`p-3 rounded-lg ${
                  syncStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                  syncStatus === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
                  'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {syncStatus === 'syncing' && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    )}
                    <span className="text-sm">{syncMessage}</span>
                  </div>
                </div>
              )}

              {/* How it Works */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">How SSO Integration Works</h3>
                <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                  <li>Enter your school's D2L URL</li>
                  <li>Click "Connect with SSO" to open a secure popup</li>
                  <li>Log in with your school credentials (SSO)</li>
                  <li>Grant permission for Northstar to access your D2L data</li>
                  <li>Automatically sync courses and assignments</li>
                </ol>
              </div>

              {/* Features */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">What Gets Synced</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>✅ Course enrollments and details</li>
                  <li>✅ Assignment dropboxes with due dates</li>
                  <li>✅ Quizzes and exams</li>
                  <li>✅ Graded discussion forums</li>
                  <li>✅ News and announcements</li>
                  <li>✅ Calendar events and due dates</li>
                  <li>✅ Automatic status updates</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
