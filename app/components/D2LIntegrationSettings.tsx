import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";

interface D2LIntegrationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function D2LIntegrationSettings({ isOpen, onClose }: D2LIntegrationSettingsProps) {
  const { user } = useUser();
  const [d2lUserId, setD2lUserId] = useState("");
  const [d2lUserKey, setD2lUserKey] = useState("");
  const [d2lBaseUrl, setD2lBaseUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState("");

  // Queries and mutations
  const d2lStatus = useQuery(
    api.d2l.getD2LSyncStatus,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const storeCredentials = useMutation(api.d2l.storeD2LCredentials);
  const syncCourses = useMutation(api.d2l.syncD2LCourses);
  const syncAssignments = useMutation(api.d2l.syncD2LAssignments);
  const syncAnnouncements = useMutation(api.aiParser.syncD2LAnnouncements);

  // Load existing credentials
  useEffect(() => {
    if (d2lStatus && isOpen) {
      setD2lBaseUrl(d2lStatus.baseUrl || "");
    }
  }, [d2lStatus, isOpen]);

  const handleSaveCredentials = async () => {
    if (!user?.id || !d2lUserId || !d2lUserKey || !d2lBaseUrl) return;

    setIsSubmitting(true);
    try {
      await storeCredentials({
        clerkUserId: user.id,
        d2lUserId,
        d2lUserKey,
        d2lBaseUrl,
      });
      setSyncMessage("D2L credentials saved successfully!");
      setSyncStatus('success');
    } catch (error) {
      setSyncMessage(`Failed to save credentials: ${error.message}`);
      setSyncStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncCourses = async () => {
    if (!user?.id) return;

    setSyncStatus('syncing');
    setSyncMessage("Syncing courses from D2L...");
    
    try {
      const result = await syncCourses({ clerkUserId: user.id });
      setSyncMessage(`Successfully synced ${result.totalSynced} courses!`);
      setSyncStatus('success');
    } catch (error) {
      setSyncMessage(`Course sync failed: ${error.message}`);
      setSyncStatus('error');
    }
  };

  const handleSyncAssignments = async () => {
    if (!user?.id) return;

    setSyncStatus('syncing');
    setSyncMessage("Syncing assignments from D2L...");
    
    try {
      const result = await syncAssignments({ clerkUserId: user.id });
      setSyncMessage(`Successfully synced ${result.totalSynced} assignments!`);
      setSyncStatus('success');
    } catch (error) {
      setSyncMessage(`Assignment sync failed: ${error.message}`);
      setSyncStatus('error');
    }
  };

  const handleSyncAnnouncements = async () => {
    if (!user?.id) return;

    setSyncStatus('syncing');
    setSyncMessage("Parsing announcements with AI...");
    
    try {
      const result = await syncAnnouncements({ clerkUserId: user.id });
      setSyncMessage(`Successfully parsed ${result.totalParsed} assignments from announcements!`);
      setSyncStatus('success');
    } catch (error) {
      setSyncMessage(`Announcement parsing failed: ${error.message}`);
      setSyncStatus('error');
    }
  };

  const handleFullSync = async () => {
    if (!user?.id) return;

    setSyncStatus('syncing');
    setSyncMessage("Running full D2L sync...");
    
    try {
      // Sync courses first
      const courseResult = await syncCourses({ clerkUserId: user.id });
      setSyncMessage(`Synced ${courseResult.totalSynced} courses, now syncing assignments...`);
      
      // Then sync assignments
      const assignmentResult = await syncAssignments({ clerkUserId: user.id });
      setSyncMessage(`Synced ${assignmentResult.totalSynced} assignments, now parsing announcements...`);
      
      // Finally parse announcements
      const announcementResult = await syncAnnouncements({ clerkUserId: user.id });
      
      setSyncMessage(`Full sync complete! ${courseResult.totalSynced} courses, ${assignmentResult.totalSynced} assignments, ${announcementResult.totalParsed} AI-parsed assignments.`);
      setSyncStatus('success');
    } catch (error) {
      setSyncMessage(`Full sync failed: ${error.message}`);
      setSyncStatus('error');
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">D2L Brightspace Integration</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Connect your D2L account to automatically sync courses and assignments
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
              <div className={`w-3 h-3 rounded-full ${d2lStatus?.isConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {d2lStatus?.isConfigured ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            {d2lStatus?.lastSyncAt && (
              <p className="text-xs text-gray-500 mt-1">
                Last sync: {new Date(d2lStatus.lastSyncAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Credentials Form */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white">D2L API Credentials</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                D2L Base URL *
              </label>
              <input
                type="url"
                value={d2lBaseUrl}
                onChange={(e) => setD2lBaseUrl(e.target.value)}
                placeholder="https://your-institution.brightspace.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your institution's D2L Brightspace URL
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User ID *
              </label>
              <input
                type="text"
                value={d2lUserId}
                onChange={(e) => setD2lUserId(e.target.value)}
                placeholder="Your D2L User ID"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User Key *
              </label>
              <input
                type="password"
                value={d2lUserKey}
                onChange={(e) => setD2lUserKey(e.target.value)}
                placeholder="Your D2L User Key"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get this from your D2L account settings under API access
              </p>
            </div>

            <button
              onClick={handleSaveCredentials}
              disabled={isSubmitting || !d2lUserId || !d2lUserKey || !d2lBaseUrl}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {isSubmitting ? "Saving..." : "Save Credentials"}
            </button>
          </div>

          {/* Sync Controls */}
          {d2lStatus?.isConfigured && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Sync Controls</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSyncCourses}
                  disabled={syncStatus === 'syncing'}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Sync Courses
                </button>
                
                <button
                  onClick={handleSyncAssignments}
                  disabled={syncStatus === 'syncing'}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Sync Assignments
                </button>
                
                <button
                  onClick={handleSyncAnnouncements}
                  disabled={syncStatus === 'syncing'}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Parse Announcements
                </button>
                
                <button
                  onClick={handleFullSync}
                  disabled={syncStatus === 'syncing'}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Full Sync
                </button>
              </div>

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
            </div>
          )}

          {/* Setup Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Setup Instructions</h3>
            <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>Log into your D2L Brightspace account</li>
              <li>Go to Account Settings → API Access</li>
              <li>Create a new API key pair (User ID and User Key)</li>
              <li>Enter your credentials above and click "Save Credentials"</li>
              <li>Use the sync buttons to import your courses and assignments</li>
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
              <li>✅ AI-powered announcement parsing for hidden assignments</li>
              <li>✅ Automatic status updates (todo/overdue/completed)</li>
            </ul>
          </div>
        </div>
      </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
