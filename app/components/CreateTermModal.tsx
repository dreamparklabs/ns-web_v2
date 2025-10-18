import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFeatureGate } from "../hooks/useFeatureGate";
import FeatureUpgradePrompt from "./FeatureUpgradePrompt";

interface CreateTermModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTermCreated?: (termId: string) => void;
}

export default function CreateTermModal({ isOpen, onClose, onTermCreated }: CreateTermModalProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"active" | "upcoming" | "completed">("active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useUser();
  const { hasAccess, checkAccess, trackUsage, currentPlan } = useFeatureGate();

  // Get accessible terms info to show user their limit status
  const accessibleTerms = useQuery(
    api.terms.getAccessibleUserTerms,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  // Mutation to create term
  const createTerm = useMutation(api.terms.createTermByClerkId);

  // Check if user can create more terms
  const canCreateTerm = currentPlan === 'northstar_pro' || (accessibleTerms && accessibleTerms.totalCount < 2);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName("");
      setStartDate("");
      setEndDate("");
      setStatus("active");
      setIsSubmitting(false);
      setErrorMessage(null);
      nameInputRef.current?.focus();
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !startDate || !endDate || !user?.id) return;

    // Check if user has access to create more terms
    if (!canCreateTerm) {
      setShowUpgradePrompt(true);
      trackUsage('2_unified_dashboards', { action: 'term_limit_reached' });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Track feature usage
      if (currentPlan === 'northstar_basic') {
        trackUsage('2_unified_dashboards', { action: 'term_created' });
      } else if (currentPlan === 'northstar_pro') {
        trackUsage('unlimited_unified_dashboards', { action: 'term_created' });
      }

      const termId = await createTerm({
        clerkUserId: user.id,
        name: name.trim(),
        startDate,
        endDate,
        status,
      });
      
      onTermCreated?.(termId);
      onClose();
    } catch (error) {
      console.error("Failed to create term:", error);

      // Check if error is a term limit error
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('TERM_LIMIT_REACHED')) {
        setShowUpgradePrompt(true);
        trackUsage('2_unified_dashboards', { action: 'term_limit_reached' });
      } else {
        setErrorMessage('Failed to create term. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Generate suggested term names based on current date
  const getSuggestedTermNames = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Determine current academic year and season
    let academicYear = currentYear;
    let season = "";
    
    if (currentMonth >= 8) { // August onwards is Fall semester
      season = "Fall";
      academicYear = currentYear;
    } else if (currentMonth >= 5) { // May-July is Summer
      season = "Summer";
      academicYear = currentYear;
    } else if (currentMonth >= 0) { // January-April is Spring
      season = "Spring";
      academicYear = currentYear;
    }
    
    return [
      `${season} ${academicYear}`,
      `${season} ${academicYear + 1}`,
      `Spring ${academicYear + 1}`,
      `Summer ${academicYear + 1}`,
      `Fall ${academicYear + 1}`,
    ];
  };

  const suggestedNames = getSuggestedTermNames();

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
            className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
          >
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Term</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Add a new academic term to track</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded border">
              <span className="font-mono font-medium">ESC</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* Term Limit Warning for Basic Users */}
          {currentPlan === 'northstar_basic' && accessibleTerms && (
            <div className={`p-4 rounded-lg border ${
              accessibleTerms.totalCount >= 2
                ? 'bg-orange-50 dark:bg-orange-900 dark:bg-opacity-20 border-orange-200 dark:border-orange-800'
                : 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-start gap-3">
                <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  accessibleTerms.totalCount >= 2
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    accessibleTerms.totalCount >= 2
                      ? 'text-orange-900 dark:text-orange-200'
                      : 'text-blue-900 dark:text-blue-200'
                  }`}>
                    {accessibleTerms.totalCount >= 2
                      ? `You've reached your ${accessibleTerms.limit}-term limit`
                      : `Term Usage: ${accessibleTerms.totalCount} / ${accessibleTerms.limit}`
                    }
                  </p>
                  <p className={`text-xs mt-1 ${
                    accessibleTerms.totalCount >= 2
                      ? 'text-orange-700 dark:text-orange-300'
                      : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    {accessibleTerms.totalCount >= 2
                      ? 'Upgrade to Pro for unlimited terms'
                      : 'Upgrade to Pro to create unlimited terms'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border-red-200 dark:border-red-800">
              <p className="text-sm text-red-900 dark:text-red-200">{errorMessage}</p>
            </div>
          )}

          {/* Term Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Term Name *
            </label>
            <input
              ref={nameInputRef}
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Fall 2025"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              required
            />
            
            {/* Quick suggestions */}
            {!name && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedNames.slice(0, 3).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setName(suggestion)}
                      className="px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900 dark:bg-opacity-30 border border-purple-200 dark:border-purple-700 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900 dark:hover:bg-opacity-50 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date *
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date *
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Status *
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={status === "active"}
                  onChange={(e) => setStatus(e.target.value as "active")}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-400 dark:bg-green-500"></div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Active</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Currently in progress</p>
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="status"
                  value="upcoming"
                  checked={status === "upcoming"}
                  onChange={(e) => setStatus(e.target.value as "upcoming")}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400 dark:bg-blue-500"></div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Upcoming</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Starts in the future</p>
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="status"
                  value="completed"
                  checked={status === "completed"}
                  onChange={(e) => setStatus(e.target.value as "completed")}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Completed</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Already finished</p>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-700 dark:bg-opacity-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-1 py-0.5 rounded text-xs font-mono border border-gray-200 dark:border-gray-500">ESC</kbd>
                to close
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={
                  !name.trim() || 
                  !startDate || 
                  !endDate || 
                  !user?.id ||
                  isSubmitting
                }
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-purple-600 rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  "Create Term"
                )}
              </button>
            </div>
          </div>
        </div>
        </motion.div>
        </div>
      )}

      {/* Upgrade Prompt Modal */}
      <FeatureUpgradePrompt
        featureId="unlimited_unified_dashboards"
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
      />
    </AnimatePresence>
  );
}
