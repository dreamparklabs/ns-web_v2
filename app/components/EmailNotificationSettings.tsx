import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from '@clerk/clerk-react';

interface EmailPreferences {
  assignments: boolean;
  events: boolean;
  dailyUpdates: boolean;
  weeklyDigest: boolean;
  urgentNotifications: boolean;
}

interface EmailNotificationSettingsProps {
  className?: string;
}

export default function EmailNotificationSettings({ className = '' }: EmailNotificationSettingsProps) {
  const { user } = useUser();
  const [preferences, setPreferences] = useState<EmailPreferences>({
    assignments: true,
    events: true,
    dailyUpdates: true,
    weeklyDigest: false,
    urgentNotifications: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isTestSending, setIsTestSending] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Get current user's Convex user ID
  const convexUser = useQuery(api.users.getUserByClerkId, { 
    clerkUserId: user?.id || '' 
  });

  // Get current email preferences
  const currentPreferences = useQuery(
    api.emailNotifications.getUserEmailPreferences,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  // Update preferences mutation
  const updatePreferences = useMutation(api.emailNotifications.updateUserEmailPreferences);
  
  // Send test email action
  const sendTestEmail = useAction(api.emailNotifications.sendTestEmail);

  // Update local state when preferences are loaded
  useEffect(() => {
    if (currentPreferences) {
      setPreferences(currentPreferences);
    }
  }, [currentPreferences]);

  const handlePreferenceChange = (key: keyof EmailPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!convexUser) {
      setSaveStatus('error');
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await updatePreferences({
        userId: convexUser._id,
        preferences,
      });
      setSaveStatus('success');
      
      // Clear success status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save email preferences:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPreferences({
      assignments: true,
      events: true,
      dailyUpdates: true,
      weeklyDigest: false,
      urgentNotifications: true,
    });
  };

  const handleSendTestEmail = async (emailType: 'assignment' | 'event' | 'daily') => {
    if (!convexUser) {
      setTestStatus('error');
      return;
    }

    setIsTestSending(true);
    setTestStatus('idle');

    try {
      const result = await sendTestEmail({
        userId: convexUser._id,
        emailType,
      });

      if (result.success) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 5000);
      } else {
        setTestStatus('error');
        setTimeout(() => setTestStatus('idle'), 5000);
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 5000);
    } finally {
      setIsTestSending(false);
    }
  };

  const hasChanges = currentPreferences && JSON.stringify(preferences) !== JSON.stringify(currentPreferences);

  if (isLoading) {
    return (
      <div className={`p-4 border border-gray-200 dark:border-gray-600 rounded-lg ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border border-gray-200 dark:border-gray-600 rounded-lg ${className}`}>
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Email Notification Preferences</h4>
      
      <div className="space-y-4">
        {/* Assignment Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-sm font-medium text-gray-900 dark:text-white">Assignment Reminders</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">Get notified about upcoming assignment due dates</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={preferences.assignments}
              onChange={(e) => handlePreferenceChange('assignments', e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {/* Event Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-sm font-medium text-gray-900 dark:text-white">Event Reminders</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">Get notified about upcoming classes and events</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={preferences.events}
              onChange={(e) => handlePreferenceChange('events', e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {/* Daily Updates */}
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-sm font-medium text-gray-900 dark:text-white">Daily Updates</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">Receive daily summaries of assignments and events</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={preferences.dailyUpdates}
              onChange={(e) => handlePreferenceChange('dailyUpdates', e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {/* Weekly Digest */}
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-sm font-medium text-gray-900 dark:text-white">Weekly Digest</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">Receive weekly summaries of your academic progress</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={preferences.weeklyDigest}
              onChange={(e) => handlePreferenceChange('weeklyDigest', e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {/* Urgent Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-sm font-medium text-gray-900 dark:text-white">Urgent Notifications</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">Receive immediate notifications for urgent updates</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={preferences.urgentNotifications}
              onChange={(e) => handlePreferenceChange('urgentNotifications', e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      {/* Test Email Buttons */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Test Email Notifications</h5>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Send test emails to verify your notification settings are working correctly.
          <br />
          <span className="text-xs text-yellow-600 dark:text-yellow-400">
            Note: Test emails are sent to cameron.mccullough@siu.edu (testing mode)
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSendTestEmail('assignment')}
            disabled={isTestSending}
            className="px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTestSending ? 'Sending...' : '📚 Test Assignment Email'}
          </button>
          <button
            onClick={() => handleSendTestEmail('event')}
            disabled={isTestSending}
            className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTestSending ? 'Sending...' : '📅 Test Event Email'}
          </button>
          <button
            onClick={() => handleSendTestEmail('daily')}
            disabled={isTestSending}
            className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTestSending ? 'Sending...' : '📊 Test Daily Update'}
          </button>
        </div>
      </div>

      {/* Test Email Status */}
      {testStatus === 'success' && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-green-800 dark:text-green-200">Test email sent successfully to cameron.mccullough@siu.edu! Check that inbox.</p>
          </div>
        </div>
      )}

      {testStatus === 'error' && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800 dark:text-red-200">Failed to send test email. Please check your settings and try again.</p>
          </div>
        </div>
      )}

      {/* Save Status */}
      {saveStatus === 'success' && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-green-800 dark:text-green-200">Email preferences saved successfully!</p>
          </div>
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800 dark:text-red-200">Failed to save email preferences. Please try again.</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {hasChanges && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Email notifications are sent using Resend's secure email system. 
              You can change these preferences at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
