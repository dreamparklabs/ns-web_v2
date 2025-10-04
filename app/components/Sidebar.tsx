import { useState, useEffect, memo, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { useLocation, useNavigate, Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import SearchModal from "./SearchModal";
import AssignmentModal from "./AssignmentModal";
import EditAssignmentModal from "./EditAssignmentModal";
import AddClassModal from "./AddClassModal";
import TermSelectorModal from "./TermSelectorModal";
import SettingsModal from "./SettingsModal";
import FileViewerModal from "./FileViewerModal";
import UserDropdown from "./UserDropdown";
import type { Id } from "../../convex/_generated/dataModel";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  current?: boolean;
}

interface SidebarProps {
  currentPath?: string;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/app/v2/dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2H3a2 2 0 00-2 2v2z" />
      </svg>
    ),
  },
  {
    name: 'Calendar',
    href: '/app/v2/calendar',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: 'Assignments',
    href: '/app/v2/tasks',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    name: 'Classes',
    href: '/app/v2/classes',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    name: 'Grades',
    href: '/app/v2/grades',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
      {
        name: 'Progress',
        href: '/app/v2/analytics',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ),
      },
  {
    name: 'Files',
    href: '/app/v2/files',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const Sidebar = memo(function Sidebar({ currentPath }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Handle window resize to detect desktop vs mobile
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    // Set initial value
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Check if modals should be open based on URL search params
  const searchParams = new URLSearchParams(location.search);
  const isSearchModalOpen = searchParams.has('search');
  const isAssignmentModalOpen = searchParams.has('new-assignment');
  const isEditAssignmentModalOpen = searchParams.has('edit-assignment');
  const isAddClassModalOpen = searchParams.has('new-class');
  const isTermSelectorModalOpen = searchParams.has('term-selector');
  const isSettingsModalOpen = searchParams.has('settings');
  const isFileViewerModalOpen = searchParams.has('view-file');
  
  // Get assignment ID from URL for editing
  const editAssignmentId = searchParams.get('edit-assignment') as Id<"assignments"> | null;

  // Get file ID from URL for viewing
  const viewFileId = searchParams.get('view-file') as Id<"files"> | null;
  const isCurrentPath = useCallback((href: string) => {
    return currentPath === href;
  }, [currentPath]);

  // Helper function to preserve global parameters during navigation
  const getNavigationUrl = useCallback((href: string) => {
    const currentParams = new URLSearchParams(location.search);
    const globalTerm = currentParams.get('globalTerm');
    
    if (globalTerm) {
      return `${href}?globalTerm=${globalTerm}`;
    }
    return href;
  }, [location.search]);

  // Handle opening/closing search modal via URL search params
  const openSearchModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('search', 'true');
    navigate(`${location.pathname}?${newSearchParams.toString()}`);
  };

  const closeSearchModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.delete('search');
    newSearchParams.delete('q'); // Also clear search query
    const searchString = newSearchParams.toString();
    navigate(`${location.pathname}${searchString ? `?${searchString}` : ''}`);
  };

  // Handle opening/closing assignment modal via URL search params
  const openAssignmentModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('new-assignment', 'true');
    navigate(`${location.pathname}?${newSearchParams.toString()}`);
  };

  const closeAssignmentModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.delete('new-assignment');
    const searchString = newSearchParams.toString();
    navigate(`${location.pathname}${searchString ? `?${searchString}` : ''}`);
  };

  // Handle opening/closing edit assignment modal via URL search params
  const openEditAssignmentModal = (assignmentId: Id<"assignments">) => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('edit-assignment', assignmentId);
    navigate(`${location.pathname}?${newSearchParams.toString()}`);
  };

  const closeEditAssignmentModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.delete('edit-assignment');
    const searchString = newSearchParams.toString();
    navigate(`${location.pathname}${searchString ? `?${searchString}` : ''}`);
  };

  // Handle opening/closing add class modal via URL search params
  const openAddClassModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('new-class', 'true');
    navigate(`${location.pathname}?${newSearchParams.toString()}`);
  };

  const closeAddClassModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.delete('new-class');
    const searchString = newSearchParams.toString();
    navigate(`${location.pathname}${searchString ? `?${searchString}` : ''}`);
  };

  // Handle opening/closing term selector modal via URL search params
  const openTermSelectorModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('term-selector', 'true');
    navigate(`${location.pathname}?${newSearchParams.toString()}`);
  };

  const closeTermSelectorModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.delete('term-selector');
    const searchString = newSearchParams.toString();
    navigate(`${location.pathname}${searchString ? `?${searchString}` : ''}`);
  };

  // Handle opening/closing settings modal via URL search params
  const openSettingsModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('settings', 'true');
    navigate(`${location.pathname}?${newSearchParams.toString()}`);
  };

  const closeSettingsModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.delete('settings');
    const searchString = newSearchParams.toString();
    navigate(`${location.pathname}${searchString ? `?${searchString}` : ''}`);
  };

  const closeFileViewerModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.delete('view-file');
    const searchString = newSearchParams.toString();
    navigate(`${location.pathname}${searchString ? `?${searchString}` : ''}`);
  };

  // Handle Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearchModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname]);


  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="inline-flex items-center justify-center p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          aria-controls="mobile-menu"
          aria-expanded="false"
        >
          <span className="sr-only">Open main menu</span>
          {!isMobileMenuOpen ? (
            <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          ) : (
            <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="lg:hidden fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        animate={{ 
          width: isCollapsed ? 64 : 192,
          x: isDesktop ? 0 : (isMobileMenuOpen ? 0 : -192)
        }}
        transition={{ 
          duration: 0.5, 
          ease: [0.16, 1, 0.3, 1],
          width: { duration: 0.4 },
          x: { duration: 0.3 }
        }}
        className="fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 shadow-lg lg:translate-x-0 lg:static lg:inset-0 lg:h-screen rounded-r-3xl"
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className={`border-b border-gray-200 dark:border-gray-700 transition-all duration-500 ease-in-out ${isCollapsed ? 'px-4 py-4' : 'px-6'}`}>
            <div className={`transition-all duration-500 ease-in-out ${isCollapsed ? 'flex flex-col items-center space-y-3' : 'flex items-center justify-between h-16'}`}>
              <button onClick={openTermSelectorModal} className="flex items-center hover:opacity-75 transition-opacity">
                {/* Logo with animated transitions */}
                <div className="relative">
                  <AnimatePresence mode="wait">
                    {isCollapsed ? (
                      <motion.div
                        key="collapsed"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <img 
                          src="/logo-collapsed-light.png" 
                          alt="Northstar Logo" 
                          className="h-8 w-8 dark:hidden"
                        />
                        <img 
                          src="/logo-collapsed-dark.png" 
                          alt="Northstar Logo" 
                          className="h-8 w-8 hidden dark:block"
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="expanded"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <img 
                          src="/logo-light.png" 
                          alt="Northstar Logo" 
                          className="h-8 w-auto dark:hidden"
                        />
                        <img 
                          src="/logo-dark.png" 
                          alt="Northstar Logo" 
                          className="h-8 w-auto hidden dark:block"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </button>
              
              {/* Buttons container with animated positioning */}
              <div className={`flex items-center transition-all duration-500 ease-in-out ${isCollapsed ? 'flex-col space-y-0 mt-0' : 'space-x-2'}`}>
                {/* Collapse/Expand button with animated transform */}
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="hidden lg:block p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-500 ease-in-out"
                >
                  <svg 
                    className={`fill-none stroke-current viewBox="0 0 24 24" transition-all duration-500 ease-in-out ${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d={isCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
                      className="transition-all duration-300 ease-in-out"
                    />
                  </svg>
                </button>
                {/* Close button for mobile */}
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-opacity duration-300 ease-in-out ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          {!isCollapsed ? (
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={openSearchModal}
                className="w-full flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full px-4 py-1.5 text-sm transition-all duration-200 hover:border-purple-500 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer group"
              >
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-gray-500 dark:text-gray-400">Search</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-500">
                  <span className="font-mono font-medium text-gray-600 dark:text-gray-300">⌘+K</span>
                </div>
              </button>
            </div>
          ) : (
            <div className="py-2 border-b border-gray-200 dark:border-gray-700 flex justify-center">
              <button
                onClick={openSearchModal}
                className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full text-sm transition-all duration-200 hover:border-purple-500 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer group"
                title="Search (⌘+K)"
              >
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className={`flex-1 py-6 space-y-1 ${isCollapsed ? 'px-2' : 'px-4'}`}>
            {/* Main Menu Title */}
            {!isCollapsed && (
              <div className="px-2 mb-4">
                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Main Menu
                </h2>
              </div>
            )}
            
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={getNavigationUrl(item.href)}
                className={`
                  flex items-center font-medium rounded-lg transition-colors duration-200 group relative
                  ${isCollapsed ? 'px-2 py-2 justify-center' : 'px-2 py-1.5'}
                  ${
                    isCurrentPath(item.href)
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
                style={{ fontSize: '12px' }}
                onClick={() => setIsMobileMenuOpen(false)}
                title={isCollapsed ? item.name : undefined}
              >
                <span className={`${isCollapsed ? '' : 'mr-2'}`} style={{ fontSize: '12px' }}>
                  {item.icon}
                </span>
                {!isCollapsed && item.name}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-200 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            ))}
            
            {/* Quick Actions Section */}
            <div className={`pt-6 ${isCollapsed ? 'flex flex-col items-center space-y-2' : ''}`}>
              {!isCollapsed && (
                <div className="px-2 mb-4">
                  <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Quick Actions
                  </h2>
                </div>
              )}
              
              {/* Quick Action Items */}
              <button
                onClick={openAssignmentModal}
                className={`
                  flex items-center font-medium rounded-lg transition-colors duration-200 group relative
                  ${isCollapsed ? 'w-8 h-8 justify-center' : 'px-2 py-1.5'}
                  text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white
                `}
                style={{ fontSize: '12px' }}
                title={isCollapsed ? 'Add Task' : undefined}
              >
                <span className={`${isCollapsed ? '' : 'mr-2'}`} style={{ fontSize: '12px' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
                {!isCollapsed && 'Add Task'}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-200 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    Add Task
                  </div>
                )}
              </button>

              <button
                onClick={openAddClassModal}
                className={`
                  flex items-center font-medium rounded-lg transition-colors duration-200 group relative
                  ${isCollapsed ? 'w-8 h-8 justify-center' : 'px-2 py-1.5'}
                  text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white
                `}
                style={{ fontSize: '12px' }}
                title={isCollapsed ? 'Add Class' : undefined}
              >
                <span className={`${isCollapsed ? '' : 'mr-2'}`} style={{ fontSize: '12px' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </span>
                {!isCollapsed && 'Add Class'}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-200 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    Add Class
                  </div>
                )}
              </button>
              
              <Link
                to={getNavigationUrl("/app/v2/files/upload")}
                className={`
                  flex items-center font-medium rounded-lg transition-colors duration-200 group relative
                  ${isCollapsed ? 'w-8 h-8 justify-center' : 'px-2 py-1.5'}
                  text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white
                `}
                style={{ fontSize: '12px' }}
                onClick={() => setIsMobileMenuOpen(false)}
                title={isCollapsed ? 'Upload File' : undefined}
              >
                <span className={`${isCollapsed ? '' : 'mr-2'}`} style={{ fontSize: '12px' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </span>
                {!isCollapsed && 'Upload File'}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-200 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    Upload File
                  </div>
                )}
              </Link>
            </div>
          </nav>

          {/* User section at bottom */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <UserDropdown 
              isCollapsed={isCollapsed} 
              onOpenSettings={openSettingsModal}
            />
          </div>
        </div>
      </motion.div>

      {/* Search Modal */}
      <SearchModal 
        isOpen={isSearchModalOpen} 
        onClose={closeSearchModal} 
      />
      
      {/* Assignment Modal */}
      <AssignmentModal 
        isOpen={isAssignmentModalOpen} 
        onClose={closeAssignmentModal} 
      />
      
      {/* Edit Assignment Modal */}
      <EditAssignmentModal 
        isOpen={isEditAssignmentModalOpen} 
        onClose={closeEditAssignmentModal}
        assignmentId={editAssignmentId}
      />
      
      {/* Add Class Modal */}
      <AddClassModal 
        isOpen={isAddClassModalOpen} 
        onClose={closeAddClassModal} 
      />
      
      {/* Term Selector Modal */}
      <TermSelectorModal 
        isOpen={isTermSelectorModalOpen} 
        onClose={closeTermSelectorModal} 
      />
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={closeSettingsModal} 
      />

      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={isFileViewerModalOpen}
        onClose={closeFileViewerModal}
        fileId={viewFileId}
        fileName={undefined}
      />
    </>
  );
});

export default Sidebar;
