import { useState, useEffect, useRef } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// Recent searches storage key
const RECENT_SEARCHES_KEY = 'northstar-recent-searches';

interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
}

interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  icon: React.ReactNode;
  category: "Navigation" | "Quick Actions" | "Recent" | "Assignments" | "Courses" | "Recent Searches" | "Files";
  onClick?: () => void;
  type?: "assignment" | "course" | "navigation" | "file";
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Quick actions for the home screen
const quickActions: SearchItem[] = [
  {
    id: "add-assignment",
    title: "Add Assignment",
    subtitle: "Create a new assignment or task",
    type: "navigation",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    category: "Quick Actions"
  },
  {
    id: "add-class",
    title: "Add Class",
    subtitle: "Enroll in a new course",
    type: "navigation",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    category: "Quick Actions"
  },
  {
    id: "view-calendar",
    title: "View Calendar",
    subtitle: "See your schedule and events",
    type: "navigation",
    href: "/app/v2/calendar",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    category: "Quick Actions"
  },
  {
    id: "view-grades",
    title: "View Grades",
    subtitle: "Check your academic performance",
    type: "navigation",
    href: "/app/v2/grades",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    category: "Quick Actions"
  }
];

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Get query from URL params
  const query = searchParams.get('q') || '';

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentSearch[];
        // Sort by timestamp (most recent first) and limit to 5
        const sorted = parsed.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
        setRecentSearches(sorted);
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  }, []);

  // Save a search to recent searches
  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    try {
      const newSearch: RecentSearch = {
        id: Date.now().toString(),
        query: searchQuery.trim(),
        timestamp: Date.now()
      };

      const updatedSearches = [
        newSearch,
        ...recentSearches.filter(search => search.query !== searchQuery.trim())
      ].slice(0, 5); // Keep only the 5 most recent unique searches

      setRecentSearches(updatedSearches);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  };

  // Clear all recent searches
  const clearRecentSearches = () => {
    try {
      setRecentSearches([]);
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  };

  // Perform a recent search
  const performRecentSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    saveRecentSearch(searchQuery);
  };

  // Search for dynamic content from Convex
  const searchResults = useQuery(
    api.assignments.searchContent,
    user?.id && query.trim()
      ? { clerkUserId: user.id, query: query.trim(), limit: 8 }
      : "skip"
  );
  // Update URL when query changes
  const setQuery = (newQuery: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (newQuery.trim()) {
      newSearchParams.set('q', newQuery);
    } else {
      newSearchParams.delete('q');
    }
    setSearchParams(newSearchParams);
  };

  // Helper function to open assignment modal
  const openAssignmentModal = (assignmentId: Id<"assignments">) => {
    const newSearchParams = new URLSearchParams(location.search);
    // Remove search modal parameters
    newSearchParams.delete('search');
    newSearchParams.delete('q');
    // Add edit assignment modal parameter
    newSearchParams.set('edit-assignment', assignmentId);
    const searchString = newSearchParams.toString();
    navigate(`${location.pathname}${searchString ? `?${searchString}` : ''}`);
    // Don't call onClose() - let the URL parameter change handle modal closing
  };

  // Helper function to open new assignment modal
  const openNewAssignmentModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    // Remove search modal parameters
    newSearchParams.delete('search');
    newSearchParams.delete('q');
    // Add assignment modal parameter
    newSearchParams.set('new-assignment', 'true');
    const searchString = newSearchParams.toString();
    navigate(`${location.pathname}${searchString ? `?${searchString}` : ''}`);
    // Don't call onClose() - let the URL parameter change handle modal closing
  };

  // Helper function to open add class modal
  const openAddClassModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    // Remove search modal parameters
    newSearchParams.delete('search');
    newSearchParams.delete('q');
    // Add class modal parameter
    newSearchParams.set('new-class', 'true');
    const searchString = newSearchParams.toString();
    navigate(`${location.pathname}${searchString ? `?${searchString}` : ''}`);
    // Don't call onClose() - let the URL parameter change handle modal closing
  };

  // Convert dynamic search results to SearchItem format
  const searchResultItems: SearchItem[] = [];

  if (searchResults && query.trim()) {
    // Add assignments
    searchResults.assignments.forEach((assignment: any) => {
      searchResultItems.push({
        id: `assignment-${assignment._id}`,
        title: assignment.title,
        subtitle: `${assignment.courseName || assignment.courseCode} • ${assignment.status === 'completed' ? 'Completed' : assignment.dueAt ? `Due ${new Date(assignment.dueAt).toLocaleDateString()}` : 'No due date'}`,
        type: "assignment",
        onClick: () => openAssignmentModal(assignment._id),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8l2 2 4-4" />
          </svg>
        ),
        category: "Assignments" as const
      });
    });

    // Add courses
    searchResults.courses.forEach((course: any) => {
      searchResultItems.push({
        id: `course-${course._id}`,
        title: `${course.code} - ${course.title}`,
        subtitle: `${course.instructor} • ${course.creditHours} credits`,
        type: "course",
        onClick: () => {
          // Close search modal and navigate to course page
          const newSearchParams = new URLSearchParams(location.search);
          newSearchParams.delete('search');
          newSearchParams.delete('q');
          const searchString = newSearchParams.toString();
          const currentUrl = `${location.pathname}${searchString ? `?${searchString}` : ''}`;
          navigate(currentUrl);
          // Small delay to ensure search modal closes before navigation
          setTimeout(() => navigate(`/app/v2/classes/${course._id}`), 50);
        },
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
        category: "Courses" as const
      });
    });

    // Add files
    searchResults.files.forEach((file: any) => {
      const getFileIcon = () => {
        if (file.mimeType.startsWith('image/')) {
          return (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          );
        }

        if (file.mimeType === 'application/pdf') {
          return (
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          );
        }

        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      };

      let subtitle = `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB`;
      if (file.assignmentInfo) {
        subtitle += ` • ${file.assignmentInfo.title}`;
        if (file.assignmentInfo.courseCode) {
          subtitle += ` (${file.assignmentInfo.courseCode})`;
        }
      } else if (file.courseInfo) {
        subtitle += ` • ${file.courseInfo.code}`;
      }

      searchResultItems.push({
        id: `file-${file._id}`,
        title: file.originalFileName,
        subtitle: subtitle,
        type: "file",
        onClick: () => {
          // Close search modal and open file viewer
          const newSearchParams = new URLSearchParams(location.search);
          newSearchParams.delete('search');
          newSearchParams.delete('q');
          // Add file viewer parameter
          newSearchParams.set('view-file', file._id);
          const searchString = newSearchParams.toString();
          navigate(`${location.pathname}${searchString ? `?${searchString}` : ''}`);
        },
        icon: getFileIcon(),
        category: "Files" as const
      });
    });
  }

  // Convert recent searches to SearchItem format
  const recentSearchItems: SearchItem[] = recentSearches.map(search => ({
    id: `recent-${search.id}`,
    title: search.query,
    subtitle: `Searched ${new Date(search.timestamp).toLocaleDateString()}`,
    type: "navigation",
    onClick: () => performRecentSearch(search.query),
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    category: "Recent Searches" as const
  }));

  // Create quick actions with proper handlers
  const quickActionsWithHandlers: SearchItem[] = [
    {
      ...quickActions[0], // Add Assignment
      onClick: openNewAssignmentModal
    },
    {
      ...quickActions[1], // Add Class
      onClick: openAddClassModal
    },
    ...quickActions.slice(2) // Calendar and Grades (already have href)
  ];

  // Determine what to show based on query
  const filteredItems = query.trim()
    ? searchResultItems // Show search results when there's a query
    : [...quickActionsWithHandlers, ...recentSearchItems]; // Show home screen when no query

  // Group items by category
  const groupedItems = filteredItems.reduce((groups, item) => {
    const category = item.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, SearchItem[]>);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSelectedIndex(0);
      // Clear query when opening fresh
      if (!query) {
        setQuery("");
      }
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            const item = filteredItems[selectedIndex];
            // Save search if it's a search result (not a quick action)
            if (query.trim() && (item.type === "assignment" || item.type === "course")) {
              saveRecentSearch(query);
            }
            if (item.onClick) {
              item.onClick();
            } else if (item.href) {
              // For navigation items, close search modal and navigate
              const newSearchParams = new URLSearchParams(location.search);
              newSearchParams.delete('search');
              newSearchParams.delete('q');
              const searchString = newSearchParams.toString();
              const currentUrl = `${location.pathname}${searchString ? `?${searchString}` : ''}`;
              navigate(currentUrl);
              // Small delay to ensure search modal closes before navigation
              setTimeout(() => navigate(item.href!), 50);
            }
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, filteredItems, selectedIndex]);

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

  let currentIndex = 0;

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
            className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
          >
        {/* Search Input */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
          <div className="flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 gap-3">
            <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assignments, courses, and files..."
              className="flex-1 border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-base"
            />
            <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded border">
              <span className="font-mono font-medium">ESC</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 dark:text-gray-400">
              <svg className="w-8 h-8 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-base font-medium text-gray-900 dark:text-white mb-2">No results found for "{query}"</p>
              <span className="text-sm">Try searching for assignments or courses</span>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700 mb-1 flex items-center justify-between">
                    <span>{category}</span>
                    {category === "Recent Searches" && recentSearches.length > 0 && (
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {items.map((item) => {
                    const isSelected = currentIndex === selectedIndex;
                    const itemIndex = currentIndex++;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          // Save search if it's a search result (not a quick action)
                          if (query.trim() && (item.type === "assignment" || item.type === "course")) {
                            saveRecentSearch(query);
                          }
                          if (item.onClick) {
                            item.onClick();
                          } else if (item.href) {
                            // For navigation items, close search modal and navigate
                            const newSearchParams = new URLSearchParams(location.search);
                            newSearchParams.delete('search');
                            newSearchParams.delete('q');
                            const searchString = newSearchParams.toString();
                            const currentUrl = `${location.pathname}${searchString ? `?${searchString}` : ''}`;
                            navigate(currentUrl);
                            // Small delay to ensure search modal closes before navigation
                            setTimeout(() => navigate(item.href!), 50);
                          }
                        }}
                        className={`w-full text-left flex items-center px-4 py-3 gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-100 border-l-2 border-transparent ${
                          isSelected ? 'bg-purple-50 dark:bg-purple-900 dark:bg-opacity-20 border-l-purple-500' : ''
                        }`}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                      >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg border flex-shrink-0 ${
                          isSelected
                            ? 'bg-purple-500 border-purple-500 text-white'
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                        }`}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.title}
                          </div>
                          {item.subtitle && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                        <div className={`flex-shrink-0 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:bg-opacity-50 flex-shrink-0">
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <kbd className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-1 py-0.5 rounded text-xs font-mono border border-gray-200 dark:border-gray-500">↑</kbd>
              <kbd className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-1 py-0.5 rounded text-xs font-mono border border-gray-200 dark:border-gray-500">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-1 py-0.5 rounded text-xs font-mono border border-gray-200 dark:border-gray-500">↵</kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-1 py-0.5 rounded text-xs font-mono border border-gray-200 dark:border-gray-500">ESC</kbd>
              to close
            </span>
          </div>
        </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
