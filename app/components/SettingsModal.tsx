import { useState, useEffect, useRef } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useLanguage, useTranslation } from "../contexts/LanguageContext";
import D2LOAuthSettings from "./D2LOAuthSettings";
import D2LWebScrapingSettings from "./D2LWebScrapingSettings";
import D2LAPISettings from "./D2LAPISettings";
import AssignmentMasterSettings from "./AssignmentMasterSettings";
import ActiveDevices from "./ActiveDevices";
import PasswordChangeForm from "./PasswordChangeForm";
import EmailNotificationSettings from "./EmailNotificationSettings";
// import PushNotificationSettings from "./PushNotificationSettings";
import { useClerkBilling, usePlanAccess, useFeatureAccess } from "../hooks/useClerkBilling";
import { PricingTable } from "./ClerkBillingComponents";
import { UsageDashboard } from "./UsageDashboard";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const { success } = useNotifications();
  const { language, setLanguage, availableLanguages } = useLanguage();
  const t = useTranslation();

  // Billing hooks
  const { cancelSubscription, subscribeToPlan } = useClerkBilling();
  const { currentPlan, isSubscribed } = usePlanAccess();
  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "billing" | "security" | "d2l" | "master">("profile");
  const [isD2LModalOpen, setIsD2LModalOpen] = useState(false);
  const [isD2LWebScrapingModalOpen, setIsD2LWebScrapingModalOpen] = useState(false);
  const [isD2LAPIModalOpen, setIsD2LAPIModalOpen] = useState(false);
  const [isAssignmentMasterModalOpen, setIsAssignmentMasterModalOpen] = useState(false);

  // Notification preferences state
  // Email notifications now handled by EmailNotificationSettings component

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset unsaved changes when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasUnsavedChanges(false);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Handle theme change
  const handleThemeChange = (newTheme: "system" | "light" | "dark") => {
    setTheme(newTheme);
    setHasUnsavedChanges(true);
  };

  // Handle language change
  const handleLanguageChange = (newLanguage: "en" | "es" | "fr" | "de") => {
    setLanguage(newLanguage);
    setHasUnsavedChanges(true);
  };

  // Save preferences
  const savePreferences = () => {
    setHasUnsavedChanges(false);
    // Show success notification
    success(t('messages.settingsSaved'), t('messages.settingsSavedDesc'));
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setTheme("system");
    setLanguage("en");
    setHasUnsavedChanges(true);
  };

  // Billing handlers
  const handleCancelSubscription = async () => {
    if (window.confirm(t('messages.cancelSubscriptionConfirm'))) {
      try {
        await cancelSubscription();
        success(t('messages.subscriptionCanceled'), t('messages.subscriptionCanceledDesc'));
      } catch (error) {
        console.error('Failed to cancel subscription:', error);
        alert(t('messages.subscriptionFailed'));
      }
    }
  };

  const handleSubscribeToPlan = async (planId: string) => {
    try {
      await subscribeToPlan(planId);
      success(t('messages.subscriptionCreated'), t('messages.subscriptionCreatedDesc'));
    } catch (error) {
      console.error('Failed to subscribe to plan:', error);
      alert(t('messages.subscribeFailed'));
    }
  };

  const handleSaveSettings = () => {
    // Save all settings
    savePreferences();

      console.log("Saving settings:", {
        theme,
        language,
      });

    onClose();
  };

  const tabs = [
    {
      id: "profile" as const,
      name: t('settings.tabs.profile'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: "preferences" as const,
      name: t('settings.tabs.preferences'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      id: "billing" as const,
      name: t('settings.tabs.billing'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    {
      id: "security" as const,
      name: "Security",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      id: "d2l" as const,
      name: t('settings.tabs.d2lIntegration'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    },
    {
      id: "master" as const,
      name: t('settings.tabs.assignmentMaster'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      )
    }
  ];

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
            className="fixed inset-0 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1], // Custom cubic bezier for smooth motion
              scale: { duration: 0.35 },
              y: { duration: 0.4 }
            }}
            className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
          >
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded border">
              <span className="font-mono font-medium">ESC</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex">
          {/* Sidebar Navigation */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 dark:bg-opacity-50">
            <nav className="p-4 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? "bg-purple-50 dark:bg-purple-900 dark:bg-opacity-30 text-purple-700 dark:text-purple-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  }`}
                >
                  {tab.icon}
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Not provided'}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={user?.emailAddresses[0]?.emailAddress || 'Not provided'}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        User ID
                      </label>
                      <input
                        type="text"
                        value={user?.id || 'Not provided'}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}


            {activeTab === "preferences" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.preferences.title')}</h3>
                  <div className="space-y-6">
                    <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('settings.preferences.theme')}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('settings.preferences.themeDesc')}</p>
                      <select
                        value={theme}
                        onChange={(e) => handleThemeChange(e.target.value as "system" | "light" | "dark")}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      >
                        <option value="system">{t('settings.preferences.themeOptions.system')}</option>
                        <option value="light">{t('settings.preferences.themeOptions.light')}</option>
                        <option value="dark">{t('settings.preferences.themeOptions.dark')}</option>
                      </select>
                    </div>

                    <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('settings.preferences.language')}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('settings.preferences.languageDesc')}</p>
                      <select
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value as "en" | "es" | "fr" | "de")}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      >
                        {availableLanguages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.nativeName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Email Notification Settings */}
                    <EmailNotificationSettings />

                    {/* Push Notification Settings */}
                    {/* <PushNotificationSettings /> */}

                    {hasUnsavedChanges && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">{t('settings.preferences.unsavedChanges')}</span>
                          </div>
                          <button
                            onClick={resetToDefaults}
                            className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
                          >
                            {t('settings.preferences.resetToDefaults')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Billing & Usage</h3>

                  {/* Current Subscription */}
                  {isSubscribed && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                          Current Subscription
                        </h4>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          currentPlan?.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {(currentPlan?.status || 'active').replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Plan Details
                          </h5>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Plan:</span>
                              <span className="font-medium text-gray-900 dark:text-white capitalize">
                                {currentPlan?.plan || 'free'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Status:</span>
                              <span className="font-medium text-gray-900 dark:text-white capitalize">
                                {currentPlan?.status?.replace('_', ' ') || 'active'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Actions
                          </h5>
                          <div className="space-y-3">
                            <button
                              onClick={() => alert('Payment method update coming soon!')}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                            >
                              Update Payment Method
                            </button>
                            <button
                              onClick={handleCancelSubscription}
                              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                            >
                              Cancel Subscription
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Usage Dashboard */}
                  <div className="mb-6">
                    <UsageDashboard />
                  </div>

                  {/* Available Plans */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Available Plans
                    </h4>
                    <PricingTable />
                  </div>

                  {/* Billing Information */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Billing Information
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                      <p>
                        • All subscriptions are billed monthly and automatically renew
                      </p>
                      <p>
                        • You can cancel your subscription at any time
                      </p>
                      <p>
                        • Cancellations take effect at the end of your current billing period
                      </p>
                      <p>
                        • Usage is calculated monthly and resets on your billing date
                      </p>
                      <p>
                        • All prices are in USD and exclude applicable taxes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

    {activeTab === "security" && (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Security Settings</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Manage your account security, active devices, and login sessions.
          </p>

          {/* Password Change Section */}
          <div className="mb-6">
            <PasswordChangeForm />
          </div>

          {/* Active Devices Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <ActiveDevices />
          </div>
        </div>
      </div>
    )}

            {activeTab === "d2l" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">D2L Brightspace Integration</h3>
                  <div className="space-y-6">
                    <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Integration Methods</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Choose how to connect your D2L Brightspace account:
                      </p>

                      <div className="space-y-3">
                        <button
                          onClick={() => setIsD2LAPIModalOpen(true)}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">🔗 D2L API Integration (Best)</div>
                              <div className="text-xs opacity-80">Official D2L API with real-time sync</div>
                            </div>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>

                        <button
                          onClick={() => setIsD2LModalOpen(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">SSO Integration (Legacy)</div>
                              <div className="text-xs opacity-80">Uses your school's login system</div>
                            </div>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                        <button
                          onClick={() => setIsD2LWebScrapingModalOpen(true)}
                          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Web Scraping (Alternative)</div>
                              <div className="text-xs opacity-80">When OAuth is not available</div>
                            </div>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>

                        <button
                          onClick={() => setIsAssignmentMasterModalOpen(true)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">📅 ICS Calendar Feed (Instant)</div>
                              <div className="text-xs opacity-80">Paste your D2L calendar feed URL for immediate sync</div>
                            </div>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">AI-Powered Features</h4>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• Automatically parse announcements for hidden assignments</li>
                        <li>• Intelligent content analysis of course modules</li>
                        <li>• Smart due date extraction from text</li>
                        <li>• Assignment type classification</li>
                      </ul>
                    </div>

                    <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Sync Features</h4>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• Course enrollments and details</li>
                        <li>• Assignment dropboxes with due dates</li>
                        <li>• Quizzes and exams</li>
                        <li>• Graded discussion forums</li>
                        <li>• News and announcements</li>
                        <li>• Calendar events</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "master" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assignment Master Database</h3>
                  <div className="space-y-6">
                    <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Universal Assignment Collection</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Automatically collect assignments from multiple sources without requiring API access:
                      </p>

                      <div className="space-y-3">
                        <button
                          onClick={() => setIsAssignmentMasterModalOpen(true)}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">🗄️ Manage Assignment Master Database</div>
                              <div className="text-xs opacity-80">ICS feeds, email parsing, and source consolidation</div>
                            </div>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">📅 ICS Calendar Feeds</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Export calendar from D2L</li>
                          <li>• Automatic assignment detection</li>
                          <li>• Smart due date parsing</li>
                          <li>• Course auto-linking</li>
                        </ul>
                      </div>

                      <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">📧 Email Integration</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Parse D2L notifications</li>
                          <li>• Grade update alerts</li>
                          <li>• New assignment notifications</li>
                          <li>• Announcement parsing</li>
                        </ul>
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">🔗 Smart Conflict Resolution</h4>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• Automatic duplicate detection</li>
                        <li>• Intelligent data merging</li>
                        <li>• Source confidence scoring</li>
                        <li>• Manual review interface</li>
                        <li>• Priority-based resolution</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="font-medium text-blue-800 dark:text-blue-200">Works Without API Access</h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            The Assignment Master Database uses exported calendar feeds and email notifications,
                            so it works at any institution without requiring special API permissions.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-700 dark:bg-opacity-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-1 py-0.5 rounded text-xs font-mono border border-gray-200 dark:border-gray-500">ESC</kbd>
                {t('ui.escToClose').replace('ESC ', '')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={!hasUnsavedChanges}
                className={`px-4 py-2 text-sm font-medium text-white border rounded-full transition-colors flex items-center gap-2 ${
                  hasUnsavedChanges
                    ? 'bg-purple-600 border-purple-600 hover:bg-purple-700'
                    : 'bg-gray-400 border-gray-400 cursor-not-allowed'
                }`}
              >
                {hasUnsavedChanges && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                {t('ui.saveChanges')}
              </button>
            </div>
          </div>
        </div>
        </motion.div>
        </div>
      )}

      {/* D2L OAuth Modal - Rendered outside main modal */}
      <D2LOAuthSettings
        isOpen={isD2LModalOpen}
        onClose={() => setIsD2LModalOpen(false)}
      />

      {/* D2L Web Scraping Modal - Rendered outside main modal */}
      <D2LWebScrapingSettings
        isOpen={isD2LWebScrapingModalOpen}
        onClose={() => setIsD2LWebScrapingModalOpen(false)}
      />

      {/* D2L API Modal - Rendered outside main modal */}
      <D2LAPISettings
        isOpen={isD2LAPIModalOpen}
        onClose={() => setIsD2LAPIModalOpen(false)}
      />

      {/* Assignment Master Modal - Rendered outside main modal */}
      <AssignmentMasterSettings
        isOpen={isAssignmentMasterModalOpen}
        onClose={() => setIsAssignmentMasterModalOpen(false)}
      />
    </AnimatePresence>
  );
}

