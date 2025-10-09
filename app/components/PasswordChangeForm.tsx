import React, { useState } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";

export default function PasswordChangeForm() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [needsReauth, setNeedsReauth] = useState(false);

  const handlePasswordChange = async () => {
    if (!user) return;
    
    // Clear previous errors and success messages
    setErrors({});
    setSuccessMessage("");
    setNeedsReauth(false);
    
    // Validate password requirements
    const passwordErrors: {[key: string]: string} = {};
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      passwordErrors.confirmPassword = "Passwords do not match.";
    }

    if (passwordData.newPassword.length < 8) {
      passwordErrors.newPassword = "Password must be at least 8 characters long.";
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      passwordErrors.newPassword = "Password must contain at least one uppercase letter, one lowercase letter, and one number.";
    }

    if (Object.keys(passwordErrors).length > 0) {
      setErrors(passwordErrors);
      return;
    }

    setIsChangingPassword(true);
    try {
      await user.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordSection(false);
      setSuccessMessage("Password updated successfully!");
      setTimeout(() => setSuccessMessage(""), 5000); // Clear success message after 5 seconds
    } catch (error: any) {
      console.error("Error updating password:", error);
      
      // Handle specific Clerk error codes
      if (error?.errors?.[0]?.code === "form_password_incorrect") {
        setErrors({ currentPassword: "Current password is incorrect." });
      } else if (error?.errors?.[0]?.code === "form_password_pwned") {
        setErrors({ newPassword: "This password has been found in a data breach. Please choose a different password." });
      } else if (error?.errors?.[0]?.code === "reverification_required" || 
                 error?.message?.includes("additional verification") ||
                 error?.message?.includes("provide additional verification")) {
        // Handle reverification requirement
        setNeedsReauth(true);
        setErrors({ 
          general: "For security reasons, you need to sign in again before changing your password." 
        });
      } else if (error?.errors?.[0]?.longMessage?.includes("verification")) {
        // Alternative check for verification errors
        setNeedsReauth(true);
        setErrors({ 
          general: "Additional verification is required. Please sign in again to change your password." 
        });
      } else {
        setErrors({ general: "Failed to update password. Please try again." });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePasswordCancel = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setErrors({});
    setSuccessMessage("");
    setNeedsReauth(false);
    setShowPasswordSection(false);
  };

  const handleReauthenticate = async () => {
    // Sign out and redirect to sign-in to refresh authentication state
    try {
      await signOut({
        redirectUrl: window.location.href,
      });
    } catch (error) {
      console.error("Error signing out:", error);
      // Fallback: refresh the page
      window.location.reload();
    }
  };

  if (!isLoaded) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-6"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-32"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400 text-lg mb-2">No User Data Available</div>
          <p className="text-gray-400 dark:text-gray-500">Please refresh the page or contact support if this issue persists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Password & Security</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Change your password to keep your account secure</p>
        </div>
        {!showPasswordSection && (
          <button
            onClick={() => setShowPasswordSection(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/30"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Change Password
          </button>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* General Error Message */}
      {errors.general && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-red-800 dark:text-red-200">{errors.general}</p>
              {needsReauth && (
                <div className="mt-3">
                  <button
                    onClick={handleReauthenticate}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign In Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPasswordSection && (
        <div className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              className={`block w-full px-4 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white dark:focus:bg-gray-600 transition-colors duration-200 ${
                errors.currentPassword 
                  ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Enter your current password"
            />
            {errors.currentPassword && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.currentPassword}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className={`block w-full px-4 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white dark:focus:bg-gray-600 transition-colors duration-200 ${
                  errors.newPassword 
                    ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder="Enter new password"
              />
              {errors.newPassword && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.newPassword}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className={`block w-full px-4 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white dark:focus:bg-gray-600 transition-colors duration-200 ${
                  errors.confirmPassword 
                    ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder="Confirm new password"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Password must be at least 8 characters long and should include a mix of letters, numbers, and special characters.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handlePasswordCancel}
              disabled={isChangingPassword}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handlePasswordChange}
              disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isChangingPassword ? "Changing Password..." : "Change Password"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
