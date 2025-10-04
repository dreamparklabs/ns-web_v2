import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";

interface D2LWebScrapingSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function D2LWebScrapingSettings({ isOpen, onClose }: D2LWebScrapingSettingsProps) {
  const { user } = useUser();
  const [schoolUrl, setSchoolUrl] = useState("");
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState("");

  // Queries and mutations
  const scrapingStatus = useQuery(
    api.d2lScraper.getD2LScrapingStatus,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const initializeScraping = useMutation(api.d2lScraper.initializeD2LWebScraping);
  const disconnect = useMutation(api.d2lScraper.disconnectD2LWebScraping);

  // Load existing school URL
  useEffect(() => {
    if (scrapingStatus && isOpen) {
      setSchoolUrl(scrapingStatus.baseUrl || "");
    }
  }, [scrapingStatus, isOpen]);

  // Handle initialization
  const handleInitialize = async () => {
    if (!user?.id || !schoolUrl.trim()) return;

    setSyncStatus('syncing');
    setSyncMessage("Initializing D2L web scraping...");

    try {
      await initializeScraping({
        clerkUserId: user.id,
        schoolUrl: schoolUrl.trim(),
      });

      setSyncMessage("D2L web scraping initialized! Install the browser extension to start syncing.");
      setSyncStatus('success');
    } catch (error) {
      setSyncMessage(`Failed to initialize: ${error.message}`);
      setSyncStatus('error');
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!user?.id) return;

    if (!confirm("Are you sure you want to disconnect D2L web scraping?")) {
      return;
    }

    setSyncStatus('syncing');
    setSyncMessage("Disconnecting...");

    try {
      await disconnect({ clerkUserId: user.id });
      setSyncMessage("Successfully disconnected from D2L web scraping");
      setSyncStatus('success');
      setSchoolUrl("");
    } catch (error) {
      setSyncMessage(`Failed to disconnect: ${error.message}`);
      setSyncStatus('error');
    }
  };

  const downloadExtension = () => {
    // In a real implementation, this would link to the Chrome Web Store
    // For now, we'll show instructions for manual installation
    setSyncMessage("Extension files are available in the browser-extension folder. Load as unpacked extension in Chrome Developer Mode.", 'info');
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
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">D2L Web Scraping</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Alternative method when OAuth is not available
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
              {/* Status */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Connection Status</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    scrapingStatus?.isConfigured ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {scrapingStatus?.isConfigured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>
                {scrapingStatus?.userName && (
                  <p className="text-xs text-gray-500 mt-1">
                    User: {scrapingStatus.userName}
                  </p>
                )}
                {scrapingStatus?.lastScrapingAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last sync: {new Date(scrapingStatus.lastScrapingAt).toLocaleString()}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <div className={`w-2 h-2 rounded-full ${
                    scrapingStatus?.hasExtension ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Browser Extension: {scrapingStatus?.hasExtension ? 'Installed' : 'Not Detected'}
                  </span>
                </div>
              </div>

              {/* Setup Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">How Web Scraping Works</h3>
                <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                  <li>Install the Northstar D2L browser extension</li>
                  <li>Enter your school's D2L URL below</li>
                  <li>Navigate to D2L pages (homepage, courses, assignments)</li>
                  <li>Click the extension icon to extract and sync data</li>
                  <li>Data is securely sent to your Northstar account</li>
                </ol>
              </div>

              {/* School URL Setup */}
              {!scrapingStatus?.isConfigured && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-white">Configure D2L Web Scraping</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      School D2L URL *
                    </label>
                    <input
                      type="url"
                      value={schoolUrl}
                      onChange={(e) => setSchoolUrl(e.target.value)}
                      placeholder="https://mycourses.siu.edu"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter your school's D2L URL (like the one that gave the 404 error)
                    </p>
                  </div>

                  <button
                    onClick={handleInitialize}
                    disabled={syncStatus === 'syncing' || !schoolUrl.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {syncStatus === 'syncing' ? 'Initializing...' : 'Initialize Web Scraping'}
                  </button>
                </div>
              )}

              {/* Extension Download */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Browser Extension</h3>
                
                {!scrapingStatus?.hasExtension && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Extension Required</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                      The browser extension is required to extract data from D2L pages.
                    </p>
                    <button
                      onClick={downloadExtension}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Get Extension
                    </button>
                  </div>
                )}

                {scrapingStatus?.hasExtension && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Extension Active</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      The browser extension is installed and ready to sync D2L data.
                    </p>
                  </div>
                )}
              </div>

              {/* Disconnect */}
              {scrapingStatus?.isConfigured && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-white">Manage Connection</h3>
                  
                  <button
                    onClick={handleDisconnect}
                    disabled={syncStatus === 'syncing'}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Disconnect Web Scraping
                  </button>
                </div>
              )}

              {/* Status Messages */}
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

              {/* Security Note */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Security & Privacy</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Data is extracted only from pages you visit</li>
                  <li>• No passwords or sensitive data are stored</li>
                  <li>• All communication is encrypted</li>
                  <li>• You control when data is extracted and synced</li>
                  <li>• Extension only works on D2L pages</li>
                </ul>
              </div>

              {/* What Gets Extracted */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">What Gets Extracted</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>✅ Course names and codes</li>
                  <li>✅ Assignment titles and due dates</li>
                  <li>✅ Quiz information</li>
                  <li>✅ Discussion forum assignments</li>
                  <li>✅ Course announcements</li>
                  <li>✅ User information (name, email)</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
