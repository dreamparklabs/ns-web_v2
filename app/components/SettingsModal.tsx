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
import SyncClassesModal from "./SyncClassesModal";
import ActiveDevices from "./ActiveDevices";
import PasswordChangeForm from "./PasswordChangeForm";
import EmailNotificationSettings from "./EmailNotificationSettings";
// import PushNotificationSettings from "./PushNotificationSettings";
import { useAuth } from '@clerk/clerk-react';
import { UsageStats } from "./UsageStats";
import { useClerkBilling } from "../hooks/useClerkBilling";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

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
  const navigate = useNavigate();
  const location = useLocation();

  // Billing hooks
  const { has } = useAuth();
  const { subscribeToPlan, syncSubscription, getCurrentPlan, isLoading: isBillingLoading } = useClerkBilling();
  const [searchParams] = useSearchParams();

  // Get convex user for checking onboarding status
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "billing" | "security" | "integrations">("profile");
  const [isD2LModalOpen, setIsD2LModalOpen] = useState(false);
  const [isD2LWebScrapingModalOpen, setIsD2LWebScrapingModalOpen] = useState(false);
  const [isD2LAPIModalOpen, setIsD2LAPIModalOpen] = useState(false);
  const [isAssignmentMasterModalOpen, setIsAssignmentMasterModalOpen] = useState(false);
  const [isSyncClassesModalOpen, setIsSyncClassesModalOpen] = useState(false);
  const [isCheckoutActive, setIsCheckoutActive] = useState(false);
  const [showDowngradeWarning, setShowDowngradeWarning] = useState(false);
  const [pendingDowngradePlan, setPendingDowngradePlan] = useState<string | null>(null);

  // Notification preferences state
  // Email notifications now handled by EmailNotificationSettings component

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Function to handle tab changes and update URL
  const handleTabChange = (newTab: "profile" | "preferences" | "billing" | "security" | "integrations") => {
    setActiveTab(newTab);
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('tab', newTab);
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
  };

  // Reset unsaved changes and set tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasUnsavedChanges(false);

      // Set active tab from URL parameter
      const tabParam = searchParams.get('tab') as "profile" | "preferences" | "billing" | "security" | "integrations";
      if (tabParam) {
        setActiveTab(tabParam);
      }

      // Check for sync classes modal parameter
      const syncClassesParam = searchParams.get('syncClasses');
      if (syncClassesParam === 'true') {
        setIsSyncClassesModalOpen(true);
      }

      // Check for downgrade modal parameter
      const downgradeParam = searchParams.get('downgrade');
      if (downgradeParam === 'true') {
        // Only show if user is on Pro plan
        const planInfo = getCurrentPlan();
        if (planInfo?.plan === 'northstar_pro') {
          setPendingDowngradePlan('northstar_basic');
          setShowDowngradeWarning(true);
        }
      }
    }
  }, [isOpen, searchParams, getCurrentPlan]);

  // Handle sync classes modal open/close with URL params
  const handleOpenSyncClassesModal = () => {
    setIsSyncClassesModalOpen(true);
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('syncClasses', 'true');
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
  };

  const handleCloseSyncClassesModal = () => {
    setIsSyncClassesModalOpen(false);
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.delete('syncClasses');
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
  };

  // Sync subscription when returning from successful checkout
  const hasSyncedCheckout = useRef(false);
  
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success' && isOpen && !hasSyncedCheckout.current) {
      hasSyncedCheckout.current = true;
      console.log('🎉 Checkout successful! Syncing subscription...');
      
      syncSubscription().then(async () => {
        // Only show success message if user already completed onboarding
        // (AppLayout handles the message for onboarding flow)
        if (convexUser && convexUser.hasCompletedGuidedTour) {
          success('Subscription updated successfully!');
        }

        // Force a re-render by reloading user data
        if (user) {
          user.reload().then(() => {
            console.log('✅ User reloaded after sync');
          });
        }
      }).catch((error) => {
        console.error('Failed to sync subscription:', error);
      });
    }
  }, [searchParams, isOpen, syncSubscription, success, user, convexUser]);
  
  // Reset sync flag when leaving checkout success page
  useEffect(() => {
    if (searchParams.get('checkout') !== 'success') {
      hasSyncedCheckout.current = false;
    }
  }, [searchParams]);

  // Handle keyboard shortcuts (but not when checkout is active or downgrade modal is showing)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Don't close if checkout is active, downgrade modal is showing, or sync classes modal is open
        if (isCheckoutActive || showDowngradeWarning || isSyncClassesModalOpen) {
          return;
        }
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isCheckoutActive, showDowngradeWarning, isSyncClassesModalOpen]);

  // Handle ESC key for downgrade warning modal
  useEffect(() => {
    if (!showDowngradeWarning) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelDowngrade();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showDowngradeWarning]);

  // Detect active Clerk/Stripe checkout
  useEffect(() => {
    const checkForActiveCheckout = () => {
      // Check for Clerk/Stripe iframes that indicate an active checkout
      const stripeIframes = document.querySelectorAll('iframe[src*="stripe.com"], iframe[src*="clerk"]');
      const hasActiveCheckout = stripeIframes.length > 0;
      setIsCheckoutActive(hasActiveCheckout);
    };

    if (isOpen) {
      // Check initially
      checkForActiveCheckout();

      // Check periodically while modal is open
      const interval = setInterval(checkForActiveCheckout, 500);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Handle click outside (but not when checkout is active or downgrade modal is showing)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if checkout is active, downgrade modal is showing, or sync classes modal is open
      if (isCheckoutActive || showDowngradeWarning || isSyncClassesModalOpen) {
        return;
      }

      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, isCheckoutActive, showDowngradeWarning, isSyncClassesModalOpen]);

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

  // Handle subscription - this will redirect to Clerk's checkout page
  const handleSubscribe = async (planId: string) => {
    // Check if this is a downgrade from Pro to Basic
    const planInfo = getCurrentPlan();
    const currentPlanId = planInfo?.plan;

    if (currentPlanId === 'northstar_pro' && planId === 'northstar_basic') {
      // Show downgrade warning and update URL
      setPendingDowngradePlan(planId);
      setShowDowngradeWarning(true);

      const newSearchParams = new URLSearchParams(location.search);
      newSearchParams.set('downgrade', 'true');
      navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
      return;
    }

    try {
      setIsCheckoutActive(true);
      await subscribeToPlan(planId);
      // User will be redirected to Stripe checkout, so this won't execute
      // unless there's an error
    } catch (error) {
      setIsCheckoutActive(false);
      console.error('Subscription error:', error);
      alert('Failed to start checkout. Please try again.');
    }
  };

  // Confirm downgrade after warning
  const confirmDowngrade = async () => {
    if (!pendingDowngradePlan) return;

    setShowDowngradeWarning(false);

    // Remove downgrade param from URL
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.delete('downgrade');
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });

    try {
      setIsCheckoutActive(true);
      await subscribeToPlan(pendingDowngradePlan);
    } catch (error) {
      setIsCheckoutActive(false);
      console.error('Subscription error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setPendingDowngradePlan(null);
    }
  };

  // Cancel downgrade
  const cancelDowngrade = () => {
    setShowDowngradeWarning(false);
    setPendingDowngradePlan(null);

    // Remove downgrade param from URL
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.delete('downgrade');
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
  };

  // Check for checkout completion on page load
  useEffect(() => {
    if (!isOpen) return;

    const urlParams = new URLSearchParams(window.location.search);
    const checkoutStatus = urlParams.get('checkout');

    if (checkoutStatus === 'success') {
      success('Subscription successful! Your plan has been updated.');
      // Clean up URL
      const newUrl = window.location.pathname + '?settings=true&tab=billing';
      window.history.replaceState({}, '', newUrl);
    } else if (checkoutStatus === 'cancelled') {
      alert('Checkout was cancelled. You can try again whenever you\'re ready.');
      // Clean up URL
      const newUrl = window.location.pathname + '?settings=true&tab=billing';
      window.history.replaceState({}, '', newUrl);
    }
  }, [isOpen, success]);

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

  // Get current plan from Clerk metadata (primary source of truth)
  const planInfo = getCurrentPlan();
  const currentPlan = planInfo?.plan || null;
  const isSubscribed = planInfo?.isSubscribed || false;
  const accountStatus = planInfo?.accountStatus || (currentPlan ? 'active' : 'suspended');

  console.log('🔍 SettingsModal - Current plan info:', {
    planInfo,
    currentPlan,
    isSubscribed,
    accountStatus,
    userId: user?.id
  });

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
      id: "integrations" as const,
      name: "Class Sync & Integrations",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
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
            onClick={(e) => {
              // Don't close if clicking on Stripe/Clerk iframes, downgrade modal is showing, or sync classes modal is open
              if (isCheckoutActive || showDowngradeWarning || isSyncClassesModalOpen) {
                return;
              }
              onClose();
            }}
            style={{ pointerEvents: (isCheckoutActive || showDowngradeWarning || isSyncClassesModalOpen) ? 'none' : 'auto' }}
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
                  onClick={() => handleTabChange(tab.id)}
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
          <div className="flex-1 overflow-y-auto p-6" style={{ overflowY: 'scroll !important' as any }}>
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

            {activeTab === "integrations" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Class Sync & Integrations</h3>
                  <div className="space-y-6">
                    <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Sync Classes</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Manually sync your courses and assignments from connected integrations.
                      </p>

                      <div className="space-y-4">
                        {/* ICS Calendar Feed Integration */}
                        <button
                          onClick={handleOpenSyncClassesModal}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium">ICS Calendar Feed (Recommended)</span>
                              </div>
                              <div className="text-sm opacity-90">Add your D2L calendar feed URL and manage class assignments</div>
                            </div>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>

                        {/* Manual Sync Button */}
                        <button
                          onClick={() => {
                            success('Sync started! This may take a few moments.');
                            // TODO: Implement actual sync logic
                          }}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Sync All Sources Now</span>
                          </div>
                        </button>

                        {/* Sync Status */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-600 dark:text-gray-400">Last synced:</span>
                            <span className="font-medium text-gray-900 dark:text-white">Never</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Auto-sync:</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" defaultChecked />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                            </label>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <p>💡 Auto-sync runs every 6 hours when enabled</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">What Gets Synced</h4>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• Course enrollments and details</li>
                        <li>• Assignment dropboxes with due dates</li>
                        <li>• Quizzes and exams</li>
                        <li>• Graded discussion forums</li>
                        <li>• News and announcements</li>
                        <li>• Calendar events and deadlines</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="font-medium text-blue-800 dark:text-blue-200">AI-Powered Features</h4>
                          <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                            <li>• Automatically parse announcements for hidden assignments</li>
                            <li>• Intelligent content analysis of course modules</li>
                            <li>• Smart due date extraction from text</li>
                            <li>• Assignment type classification</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Billing & Usage</h3>

                  {/* Current Subscription Status */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                          Current Subscription
                        </h4>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isSubscribed
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                        {isSubscribed ? 'ACTIVE' : 'FREE'}
                        </span>
                      </div>

                    <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Plan:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {currentPlan === 'northstar_basic' ? 'Northstar Basic' :
                           currentPlan === 'northstar_pro' ? 'Northstar Pro' :
                           accountStatus === 'suspended' ? 'No Active Subscription' : 'Unknown'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <span className={`font-medium ${
                          accountStatus === 'active' ? 'text-green-600 dark:text-green-400' :
                          accountStatus === 'suspended' ? 'text-red-600 dark:text-red-400' :
                          'text-gray-500 dark:text-gray-400'
                        }`}>
                          {accountStatus === 'active' ? 'Active' :
                           accountStatus === 'suspended' ? 'Suspended' :
                           'Unknown'}
                              </span>
                            </div>
                          </div>
                        </div>

                  {/* Usage Stats */}
                  <div className="mb-6">
                    <UsageStats currentPlan={currentPlan} />
                  </div>

                  {/* Available Plans - Custom UI since Clerk's PricingTable renders checkout outside modal */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Available Plans
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Northstar Basic Plan */}
                      <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-purple-500 transition-colors">
                        <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Northstar Basic</h5>
                        <div className="mb-4">
                          <span className="text-3xl font-bold text-gray-900 dark:text-white">$4.99</span>
                          <span className="text-gray-600 dark:text-gray-400">/month</span>
                        </div>
                        <ul className="space-y-2 mb-6">
                          <li className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            AI-Powered OCR
                          </li>
                          <li className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Smart Search
                          </li>
                          <li className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            2 Unified Dashboards
                          </li>
                          <li className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            1GB File Storage
                          </li>
                        </ul>
                        <button
                          onClick={() => handleSubscribe('northstar_basic')}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={currentPlan === 'northstar_basic' || isBillingLoading}
                        >
                          {isBillingLoading ? 'Processing...' :
                           currentPlan === 'northstar_basic' ? 'Current Plan' :
                           currentPlan === 'northstar_pro' ? 'Downgrade' :
                           'Subscribe'}
                        </button>
                      </div>

                      {/* Northstar Pro Plan */}
                      <div className="border-2 border-purple-500 rounded-lg p-6 relative">
                        <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                          POPULAR
                        </div>
                        <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Northstar Pro</h5>
                        <div className="mb-4">
                          <span className="text-3xl font-bold text-gray-900 dark:text-white">$14.99</span>
                          <span className="text-gray-600 dark:text-gray-400">/month</span>
                        </div>
                        <ul className="space-y-2 mb-6">
                          <li className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Everything in Basic
                          </li>
                          <li className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Unlimited AI Usage
                          </li>
                          <li className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Unlimited Storage
                          </li>
                          <li className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            AI Study Buddy
                          </li>
                          <li className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Academic Analytics
                          </li>
                        </ul>
                        <button
                          onClick={() => handleSubscribe('northstar_pro')}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={currentPlan === 'northstar_pro' || isBillingLoading}
                        >
                          {isBillingLoading ? 'Processing...' : currentPlan === 'northstar_pro' ? 'Current Plan' : 'Subscribe'}
                        </button>
                      </div>
                    </div>
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

      {/* Sync Classes Modal - Rendered outside main modal */}
      <SyncClassesModal
        isOpen={isSyncClassesModalOpen}
        onClose={handleCloseSyncClassesModal}
      />

      {/* Downgrade Warning Modal */}
      <AnimatePresence>
        {showDowngradeWarning && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]">
            {/* Backdrop - click to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30"
              onClick={cancelDowngrade}
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Confirm Downgrade
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  You are about to downgrade from <strong>Northstar Pro</strong> to <strong>Northstar Basic</strong>.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium mb-2">
                    ⚠️ Important: Potential Data Loss
                  </p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1 list-disc list-inside">
                    <li>Your AI usage will be limited to <strong>50,000 tokens/month</strong> (from unlimited)</li>
                    <li>Your storage will be limited to <strong>1GB</strong> (from unlimited)</li>
                    <li>If you have exceeded these limits, older files and AI history may be archived or removed</li>
                    <li>Access to <strong>AI Study Buddy</strong> and <strong>Academic Analytics</strong> will be removed</li>
                  </ul>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This change will take effect at the end of your current billing period. Are you sure you want to continue?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDowngrade}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDowngrade}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
              >
                Yes, Downgrade to Basic
              </button>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Redirecting overlay */}
      <AnimatePresence>
        {isCheckoutActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white dark:bg-gray-900 z-[100] flex items-center justify-center"
          >
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-purple-200 dark:border-purple-900 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Redirecting to Stripe...
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we set up your secure checkout
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}

