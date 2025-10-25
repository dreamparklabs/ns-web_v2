import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "../contexts/NotificationContext";

interface SyncClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SyncClassesModal({ isOpen, onClose }: SyncClassesModalProps) {
  const { success, error } = useNotifications();
  const [feedUrl, setFeedUrl] = useState("");
  const [feedName, setFeedName] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [autoCreateCourses, setAutoCreateCourses] = useState(true);
  const [assignmentKeywords, setAssignmentKeywords] = useState("assignment, homework, quiz, exam");
  const [excludeKeywords, setExcludeKeywords] = useState("class, lecture, meeting");

  // Handle ESC key to close modal
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

  const handleAddFeed = () => {
    if (!feedUrl.trim()) {
      error('Please enter a valid ICS feed URL');
      return;
    }

    // TODO: Implement actual feed save logic
    success('ICS feed added successfully! Syncing courses and assignments...');
    
    // Reset form
    setFeedUrl("");
    setFeedName("");
    setSelectedCourse("");
    setAutoCreateCourses(true);
    
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sync Classes</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Add your D2L calendar feed to automatically sync courses and assignments
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                    <span className="font-mono font-medium">ESC</span>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* ICS Feed URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    ICS Feed URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                    placeholder="https://d2l.yourschool.edu/d2l/le/calendar/feed/user_feed.ics?token=..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    💡 <strong>SIU Students:</strong> Go to D2L Calendar → Settings → Export → Copy the "All Courses" ICS feed URL
                  </p>
                </div>

                {/* Feed Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Feed Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={feedName}
                    onChange={(e) => setFeedName(e.target.value)}
                    placeholder="My D2L Calendar"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Course Assignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Link to Course (Optional)
                  </label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    disabled={autoCreateCourses}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Auto-detect from calendar</option>
                    <option value="cs101">CS 101 - Intro to Programming</option>
                    <option value="math200">MATH 200 - Calculus I</option>
                    <option value="eng101">ENG 101 - English Composition</option>
                  </select>

                  <div className="mt-3 flex items-center">
                    <input
                      type="checkbox"
                      id="autoCreateCourses"
                      checked={autoCreateCourses}
                      onChange={(e) => setAutoCreateCourses(e.target.checked)}
                      className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="autoCreateCourses" className="ml-2 text-sm text-gray-900 dark:text-gray-300">
                      Auto-create courses from calendar
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    When enabled, Northstar will automatically create courses based on calendar events
                  </p>
                </div>

                {/* Assignment Keywords */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Assignment Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={assignmentKeywords}
                    onChange={(e) => setAssignmentKeywords(e.target.value)}
                    placeholder="assignment, homework, quiz, exam"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Events containing these keywords will be imported as assignments
                  </p>
                </div>

                {/* Exclude Keywords */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Exclude Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={excludeKeywords}
                    onChange={(e) => setExcludeKeywords(e.target.value)}
                    placeholder="class, lecture, meeting"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Events containing these keywords will be excluded from import
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">How it works</h4>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Paste your D2L calendar feed URL from your school's LMS</li>
                        <li>• Northstar will automatically detect courses and assignments</li>
                        <li>• New assignments are synced every 6 hours automatically</li>
                        <li>• You can manually sync anytime from the main sync button</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFeed}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  Add ICS Feed
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
