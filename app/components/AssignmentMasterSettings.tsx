import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Id } from "../../convex/_generated/dataModel";
import { useNotifications } from "../contexts/NotificationContext";

interface AssignmentMasterSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AssignmentMasterSettings({ isOpen, onClose }: AssignmentMasterSettingsProps) {
  const { user } = useUser();
  const { success, error: showError, warning, info } = useNotifications();
  const [activeTab, setActiveTab] = useState<'ics' | 'email' | 'sources' | 'stats'>('ics');

  // Reset to ICS tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('ics');
    }
  }, [isOpen]);

  // ICS Feed Management
  const [showAddICS, setShowAddICS] = useState(false);
  const [icsFormData, setIcsFormData] = useState({
    feedUrl: '',
    feedName: '',
    courseId: '',
    assignmentKeywords: '',
    excludeKeywords: '',
    autoCreateCourses: true,
  });

  // Email Integration Management
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [emailFormData, setEmailFormData] = useState({
    emailProvider: 'gmail',
    fromFilters: '',
    subjectFilters: '',
    bodyKeywords: '',
    folderName: '',
  });

  // Queries
  const icsFeeds = useQuery(
    api.icsParser.getUserICSFeeds,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const emailIntegrations = useQuery(
    api.emailParser.getUserEmailIntegrations,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const assignmentSources = useQuery(
    api.assignmentMaster.getAssignmentSources,
    user?.id ? { clerkUserId: user.id, limit: 100 } : "skip"
  );

  const processingStats = useQuery(
    api.assignmentMaster.getProcessingStats,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const syncStats = useQuery(
    api.autoSync.getSyncStats,
    user?.id ? { clerkUserId: user.id, timeframe: "7d" } : "skip"
  );

  const courses = useQuery(
    api.courses.getUserCourses,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  // Mutations
  const addICSFeed = useMutation(api.icsParser.addICSFeed);
  const toggleICSFeed = useMutation(api.icsParser.toggleICSFeed);
  const deleteICSFeed = useMutation(api.icsParser.deleteICSFeed);
  const addEmailIntegration = useMutation(api.emailParser.addEmailIntegration);
  const toggleEmailIntegration = useMutation(api.emailParser.toggleEmailIntegration);
  const deleteEmailIntegration = useMutation(api.emailParser.deleteEmailIntegration);
  const processAssignmentSources = useMutation(api.assignmentMaster.processAssignmentSources);
  const manuallyProcessSource = useMutation(api.assignmentMaster.manuallyProcessSource);
  const triggerManualSync = useMutation(api.autoSync.triggerManualSync);
  const testSyncProcess = useAction(api.autoSync.testSyncProcess);
  const debugICSFeed = useAction(api.autoSync.debugICSFeed);
  const mergeDuplicateCourses = useMutation(api.assignmentMaster.mergeDuplicateCourses);

  // Handle ICS feed submission
  const handleAddICSFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const result = await addICSFeed({
        clerkUserId: user.id,
        feedUrl: icsFormData.feedUrl,
        feedName: icsFormData.feedName,
        courseId: icsFormData.courseId || undefined,
        assignmentKeywords: icsFormData.assignmentKeywords.split(',').map(k => k.trim()).filter(k => k),
        excludeKeywords: icsFormData.excludeKeywords.split(',').map(k => k.trim()).filter(k => k),
        autoCreateCourses: icsFormData.autoCreateCourses,
      });

      // Show success message
      if (result.error) {
        warning(
          'ICS feed added but sync failed to start',
          'The feed will sync in the background. Check back in a few minutes.'
        );
      } else {
        success(
          'ICS feed added successfully!',
          'Your D2L calendar is being processed now. Check back in a minute to see your assignments in the Assignment Sources tab.'
        );
      }

      setIcsFormData({
        feedUrl: '',
        feedName: '',
        courseId: '',
        assignmentKeywords: '',
        excludeKeywords: '',
        autoCreateCourses: true,
      });
      setShowAddICS(false);
    } catch (error) {
      console.error("Failed to add ICS feed:", error);
      showError("Failed to add ICS feed", "Please check your feed URL and try again.");
    }
  };

  // Handle email integration submission
  const handleAddEmailIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      await addEmailIntegration({
        clerkUserId: user.id,
        emailProvider: emailFormData.emailProvider,
        fromFilters: emailFormData.fromFilters.split(',').map(f => f.trim()).filter(f => f),
        subjectFilters: emailFormData.subjectFilters.split(',').map(f => f.trim()).filter(f => f),
        bodyKeywords: emailFormData.bodyKeywords.split(',').map(k => k.trim()).filter(k => k),
        folderName: emailFormData.folderName || undefined,
      });

      setEmailFormData({
        emailProvider: 'gmail',
        fromFilters: '',
        subjectFilters: '',
        bodyKeywords: '',
        folderName: '',
      });
      setShowAddEmail(false);
    } catch (error) {
      console.error("Failed to add email integration:", error);
      showError("Failed to add email integration", "Please check your settings and try again.");
    }
  };

  // Handle manual sync
  const handleManualSync = async (type: 'ics' | 'email', integrationId: string) => {
    if (!user?.id) return;

    try {
      await triggerManualSync({
        clerkUserId: user.id,
        integrationType: type,
        integrationId,
      });
      success("Sync started!", "Check the sync history for updates.");
    } catch (error) {
      console.error("Failed to trigger sync:", error);
      showError("Failed to start sync", "Please try again.");
    }
  };

  // Local confirm modal state (replaces window.confirm)
  const [confirmDialog, setConfirmDialog] = React.useState<{
    type: 'ics' | 'email';
    id: string;
    title: string;
    message: string;
  } | null>(null);

  // Per-source loading state to surface feedback and prevent double clicks
  const [processingSourceIds, setProcessingSourceIds] = useState<Set<string>>(new Set());

  // Handle process all sources with auto-retry
  const handleProcessAllSources = async () => {
    if (!user?.id) return;

    let totalCreated = 0;
    let totalMerged = 0;
    let attempts = 0;

    try {
      info("Processing assignment sources...", "Processing in small batches with auto-retry to handle all sources.");
      
      // Keep processing until backend reports nothing left to process
      const maxSafetyIterations = 10000; // hard safety guard only
      while (attempts < maxSafetyIterations) {
        attempts++;
        
        try {
          const result = await processAssignmentSources({
            clerkUserId: user.id,
            batchSize: 1, // Single-item batches to ensure sub-1s execution
          });
          
          totalCreated += result.created;
          totalMerged += result.merged;
          
          // If no sources were processed, we're done
          if (result.processed === 0) {
            break;
          }
          
          console.log(`Batch ${attempts}: ${result.created} created, ${result.merged} merged, ${result.processed} processed`);
          
          // Small delay between batches to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (batchError) {
          console.error(`Batch ${attempts} failed:`, batchError);
          if (batchError.message.includes("timeout")) {
            // Continue to next batch even if one times out
            warning("Batch timeout", `Batch ${attempts} timed out, continuing with next batch...`);
            continue;
          } else {
            throw batchError; // Re-throw non-timeout errors
          }
        }
      }
      
      success("Processing completed!", `${totalCreated} assignments created, ${totalMerged} merged across ${attempts} batches.`);
      
    } catch (error) {
      console.error("Failed to process sources:", error);
      showError("Processing failed", `Completed ${totalCreated + totalMerged} assignments before error. Please try again.`);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Inline Confirm Dialog */}
          {confirmDialog && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 w-full max-w-sm shadow-xl">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">{confirmDialog.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{confirmDialog.message}</p>
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    className="px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if (confirmDialog.type === 'ics') {
                          await deleteICSFeed({ feedId: confirmDialog.id });
                          success('ICS feed deleted', 'The feed was removed successfully.');
                        } else {
                          await deleteEmailIntegration({ integrationId: confirmDialog.id });
                          success('Integration deleted', 'The email integration was removed successfully.');
                        }
                      } catch (e: any) {
                        showError('Delete failed', e?.message || 'Unknown error');
                      } finally {
                        setConfirmDialog(null);
                      }
                    }}
                    className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-6 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Assignment Master Database</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage ICS feeds, email parsing, and assignment source consolidation
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 mt-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {[
                { id: 'ics', label: 'ICS Feeds', icon: '📅' },
                { id: 'email', label: 'Email Integration', icon: '📧' },
                { id: 'sources', label: 'Assignment Sources', icon: '🔗' },
                { id: 'stats', label: 'Statistics', icon: '📊' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* ICS Feeds Tab */}
            {activeTab === 'ics' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">ICS Calendar Feeds</h3>
                  <button
                    onClick={() => setShowAddICS(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Add ICS Feed
                  </button>
                </div>

                {/* Add ICS Feed Form */}
                {showAddICS && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                  >
                    <form onSubmit={handleAddICSFeed} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Feed URL *
                          </label>
                          <input
                            type="url"
                            value={icsFormData.feedUrl}
                            onChange={(e) => setIcsFormData({ ...icsFormData, feedUrl: e.target.value })}
                            placeholder="https://mycourses.siu.edu/d2l/le/calendar/feed/user/feed.ics?token=..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            required
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            💡 <strong>SIU Students:</strong> Go to D2L Calendar → Settings → Export → Copy the "All Courses" ICS feed URL
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Feed Name *
                          </label>
                          <input
                            type="text"
                            value={icsFormData.feedName}
                            onChange={(e) => setIcsFormData({ ...icsFormData, feedName: e.target.value })}
                            placeholder="My D2L Calendar"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Link to Course (Optional)
                          </label>
                          <select
                            value={icsFormData.courseId}
                            onChange={(e) => setIcsFormData({ ...icsFormData, courseId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            <option value="">Auto-detect from calendar</option>
                            {courses?.map((course) => (
                              <option key={course._id} value={course._id}>
                                {course.code} - {course.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={icsFormData.autoCreateCourses}
                              onChange={(e) => setIcsFormData({ ...icsFormData, autoCreateCourses: e.target.checked })}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Auto-create courses</span>
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Assignment Keywords (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={icsFormData.assignmentKeywords}
                            onChange={(e) => setIcsFormData({ ...icsFormData, assignmentKeywords: e.target.value })}
                            placeholder="assignment, homework, quiz, exam"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Exclude Keywords (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={icsFormData.excludeKeywords}
                            onChange={(e) => setIcsFormData({ ...icsFormData, excludeKeywords: e.target.value })}
                            placeholder="class, lecture, meeting"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                          Add Feed
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddICS(false)}
                          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* ICS Feeds List */}
                <div className="space-y-4">
                  {icsFeeds?.map((feed) => (
                    <div key={feed._id} className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium text-gray-900 dark:text-white">{feed.feedName}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              feed.isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'
                            }`}>
                              {feed.isActive ? 'Active' : 'Inactive'}
                            </span>
                            {feed.lastSyncStatus && (
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                feed.lastSyncStatus === 'success'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              }`}>
                                {feed.lastSyncStatus === 'success' ? 'Synced' : 'Error'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{feed.feedUrl}</p>
                          {feed.course && (
                            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                              Linked to: {feed.course.code} - {feed.course.title}
                            </p>
                          )}
                          {feed.lastSyncAt && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              Last synced: {new Date(feed.lastSyncAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleManualSync('ics', feed._id)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Sync Now
                          </button>
                          <button
                            onClick={() => toggleICSFeed({ feedId: feed._id, isActive: !feed.isActive })}
                            className={`px-3 py-1 text-sm rounded ${
                              feed.isActive
                                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {feed.isActive ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setConfirmDialog({
                              type: 'ics',
                              id: feed._id,
                              title: 'Delete ICS Feed',
                              message: `Are you sure you want to delete ${feed.feedName}? This will not remove existing assignments.`,
                            })}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {icsFeeds?.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No ICS feeds configured. Add your first feed to get started.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Email Integration Tab */}
            {activeTab === 'email' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Integration</h3>
                  <button
                    onClick={() => setShowAddEmail(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Add Email Integration
                  </button>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-amber-800 dark:text-amber-200">Email Integration Setup Required</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Email integration requires OAuth setup with your email provider (Gmail, Outlook, etc.). 
                        This feature will be fully functional once you complete the OAuth authentication flow.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-green-800 dark:text-green-200">Smart Course Matching</h4>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Automatically recognizes that <strong>"ITEC-216-940"</strong> is the same as <strong>"ITEC216"</strong>.
                        Different course code formats are normalized for perfect matching across all sources.
                      </p>
                      <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-mono bg-green-100 dark:bg-green-800/30 px-2 py-1 rounded">
                        Examples: "ITEC-216-940" → "ITEC216" | "CS 101" → "CS101" | "MATH 205-001" → "MATH205"
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Integration List */}
                <div className="space-y-4">
                  {emailIntegrations?.map((integration) => (
                    <div key={integration._id} className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {integration.emailProvider.charAt(0).toUpperCase() + integration.emailProvider.slice(1)} Integration
                            </h4>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              integration.isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'
                            }`}>
                              {integration.isActive ? 'Active' : 'Setup Required'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Monitoring: {integration.fromFilters?.join(', ') || 'All D2L emails'}
                          </p>
                          {integration.lastSyncAt && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              Last synced: {new Date(integration.lastSyncAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {integration.isActive && (
                            <button
                              onClick={() => handleManualSync('email', integration._id)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Sync Now
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDialog({
                              type: 'email',
                              id: integration._id,
                              title: 'Delete Email Integration',
                              message: 'Are you sure you want to delete this integration? You can re-add it later.',
                            })}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {emailIntegrations?.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No email integrations configured. Add your first integration to get started.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Assignment Sources Tab */}
            {activeTab === 'sources' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assignment Sources</h3>
                  <button
                    onClick={handleProcessAllSources}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Process All Sources
                  </button>
                </div>

                {processingStats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{processingStats.total}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Sources</div>
                    </div>
                    <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{processingStats.processed}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Processed</div>
                    </div>
                    <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{processingStats.unprocessed}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
                    </div>
                    <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{processingStats.averageConfidence}%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</div>
                    </div>
                  </div>
                )}

                {/* Sources List */}
                <div className="space-y-4">
                  {assignmentSources?.slice(0, 20).map((source) => (
                    <div key={source._id} className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">{source.parsedData.title}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              source.sourceType === 'ics' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                              source.sourceType === 'email' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                              source.sourceType === 'api' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
                              'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
                            }`}>
                              {source.sourceType.toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              source.confidence >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                              source.confidence >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {source.confidence}% confidence
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              source.isProcessed 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'
                            }`}>
                              {source.isProcessed ? 'Processed' : 'Pending'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            {source.parsedData.courseCode && (
                              <p><strong>Course:</strong> {source.parsedData.courseCode}</p>
                            )}
                            {source.parsedData.dueDate && (
                              <p><strong>Due:</strong> {new Date(source.parsedData.dueDate).toLocaleString()}</p>
                            )}
                            {source.parsedData.assignmentType && (
                              <p><strong>Type:</strong> {source.parsedData.assignmentType}</p>
                            )}
                          </div>
                          {source.assignment && (
                            <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
                              <p className="text-sm text-green-800 dark:text-green-300">
                                ✅ Created assignment: {source.assignment.title}
                              </p>
                            </div>
                          )}
                        </div>
                        {!source.isProcessed && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  setProcessingSourceIds(prev => new Set(prev).add(source._id as string));
                                  const result = await manuallyProcessSource({
                                    sourceId: source._id,
                                    action: 'create',
                                  });
                                  success('Assignment created', `Source processed successfully.`);
                                } catch (e: any) {
                                  showError('Create failed', e?.message || 'Unknown error');
                                } finally {
                                  setProcessingSourceIds(prev => { const s = new Set(prev); s.delete(source._id as string); return s; });
                                }
                              }}
                              disabled={processingSourceIds.has(source._id as string)}
                              className={`px-3 py-1 text-sm rounded text-white ${processingSourceIds.has(source._id as string) ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                              {processingSourceIds.has(source._id as string) ? 'Processing…' : 'Create Assignment'}
                            </button>
                            <button
                              onClick={() => manuallyProcessSource({
                                sourceId: source._id,
                                action: 'ignore',
                              })}
                              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                              Ignore
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {assignmentSources?.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No assignment sources found. Configure ICS feeds or email integration to get started.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sync Statistics</h3>

                {syncStats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{syncStats.totalJobs}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Sync Jobs</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Last 7 days</div>
                    </div>
                    <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{syncStats.successRate}%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{syncStats.completed} completed</div>
                    </div>
                    <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{syncStats.totalAssignmentsCreated}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Assignments Created</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">From all sources</div>
                    </div>
                    <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{syncStats.averageDuration}s</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Per sync job</div>
                    </div>
                  </div>
                )}

                {/* Source Type Breakdown */}
                {processingStats && (
                  <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Sources by Type</h4>
                    <div className="space-y-4">
                      {Object.entries(processingStats.bySource).map(([sourceType, stats]) => (
                        <div key={sourceType} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded-full ${
                              sourceType === 'ics' ? 'bg-blue-500' :
                              sourceType === 'email' ? 'bg-green-500' :
                              sourceType === 'api' ? 'bg-purple-500' :
                              'bg-orange-500'
                            }`}></span>
                            <span className="font-medium text-gray-900 dark:text-white capitalize">{sourceType}</span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {stats.processed} / {stats.total} processed
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Debug Section */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-4">🧪 Debug Tools</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                    Test the sync process manually to debug any issues with pending jobs.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        if (!user?.id) return;
                        try {
                          // First trigger a manual sync
                          console.log('🔄 Triggering manual sync...');
                          await triggerManualSync({ 
                            clerkUserId: user.id,
                            integrationId: icsFeeds?.[0]?._id || '',
                            integrationType: 'ics' 
                          });
                          
                          // Wait a moment then test sync process
                          setTimeout(async () => {
                            const result = await testSyncProcess({ clerkUserId: user.id });
                            console.log('🧪 Test sync result:', result);
                            info('Sync + Test Results', JSON.stringify(result, null, 2));
                          }, 1000);
                        } catch (error) {
                          console.error('Debug test failed:', error);
                          showError('Debug test failed', error.message);
                        }
                      }}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      🔄 Force Sync + Test
                    </button>
                    <button
                      onClick={async () => {
                        if (!user?.id) return;
                        try {
                          const result = await debugICSFeed({ clerkUserId: user.id });
                          console.log('🔍 ICS Debug result:', result);
                          info('ICS Debug Results', JSON.stringify(result, null, 2));
                        } catch (error) {
                          console.error('ICS debug failed:', error);
                          showError('ICS debug failed', error.message);
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      📅 Debug ICS Feed
                    </button>
                    <button
                      onClick={async () => {
                        if (!user?.id) return;
                        try {
                          const result = await mergeDuplicateCourses({ clerkUserId: user.id });
                          console.log('🔗 Merge result:', result);
                          success('Course Merge Results', `${result.mergedGroups} course groups merged, ${result.coursesDeleted} duplicate courses deleted. Details: ${result.details.map(d => `${d.primary} (merged ${d.merged.length} duplicates)`).join(', ')}`);
                        } catch (error) {
                          console.error('Course merge failed:', error);
                          showError('Course merge failed', error.message);
                        }
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      🔗 Merge Duplicate Courses
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
