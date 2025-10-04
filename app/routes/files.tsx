import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useSearchParams, useLocation, useNavigate } from "react-router";
import type { Route } from "./+types/files";
import { useGlobalTerm } from "../hooks/useGlobalTerm";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import FileUpload from "../components/FileUpload";
import FileViewerModal from "../components/FileViewerModal";
import ShareModal from "../components/ShareModal";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Files - Northstar" },
    { name: "description", content: "Manage your academic files and documents" },
  ];
}

type FilterType = "all" | "recent" | "shared" | "starred";

export default function Files() {
  const { user, isLoaded } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { globalTermId, isFilteringByTerm } = useGlobalTerm();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Check URL parameters for modal state
  const viewerFileId = searchParams.get('view-file') as Id<"files"> | null;
  const isViewerOpen = Boolean(viewerFileId);
  const shareFileId = searchParams.get('share-file') as Id<"files"> | null;
  const isShareOpen = Boolean(shareFileId);

  // Security: Redirect unauthenticated users
  if (isLoaded && !user) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please sign in to access your files.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (!isLoaded) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Get user files
  const userFiles = useQuery(
    api.files.getUserFiles,
    user?.id ? { clerkUserId: user.id, limit: 50 } : "skip"
  );

  // Get courses with files to display as folders
  const coursesWithFiles = useQuery(
    api.files.getCoursesWithFiles,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  // Mutations
  const deleteFile = useMutation(api.files.deleteFile);
  const toggleFileStar = useMutation(api.files.toggleFileStar);

  // Get Convex client for direct queries
  const convex = useConvex();

  const getFilterTitle = (filter: FilterType) => {
    switch (filter) {
      case "all":
        return "All Files";
      case "recent":
        return "Recent Files";
      case "shared":
        return "Shared Files";
      case "starred":
        return "Starred Files";
      default:
        return "All Files";
    }
  };

  const handleDeleteFile = async (fileId: Id<"files">) => {
    if (!user?.id) return;

    const confirmed = window.confirm("Are you sure you want to delete this file? This action cannot be undone.");
    if (!confirmed) return;

    try {
      await deleteFile({ fileId, clerkUserId: user.id });
    } catch (error) {
      console.error("Failed to delete file:", error);
      alert("Failed to delete file. Please try again.");
    }
  };

  const handleToggleStar = async (fileId: Id<"files">) => {
    if (!user?.id) return;

    try {
      await toggleFileStar({ fileId, clerkUserId: user.id });
    } catch (error) {
      console.error("Failed to toggle star:", error);
      alert(`Failed to toggle star: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleOpenShareModal = (fileId: Id<"files">) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('share-file', fileId);
    setSearchParams(newSearchParams);
  };

  const handleCloseShareModal = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('share-file');
    setSearchParams(newSearchParams);
  };

  const handleSecureDownload = async (fileId: Id<"files">, fileName: string) => {
    if (!user?.id) return;

    try {
      // Use the secure Convex query to verify access and get download URL
      const fileAccess = await convex.query(api.files.verifyFileAccess, {
        fileId,
        clerkUserId: user.id,
      });

      if (!fileAccess.hasAccess || !fileAccess.downloadUrl) {
        throw new Error(fileAccess.error || 'Access denied');
      }

      // Fetch the file content from the secure Convex storage URL
      const response = await fetch(fileAccess.downloadUrl);

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      // Get the file content as blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download file:", error);
      alert(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleViewFile = (fileId: Id<"files">) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('view-file', fileId);
    navigate(`${location.pathname}?${newSearchParams.toString()}`);
  };

  const handleCloseViewer = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('view-file');
    const searchString = newSearchParams.toString();
    navigate(`${location.pathname}${searchString ? `?${searchString}` : ''}`);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string, fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (mimeType.startsWith('image/')) {
      return {
        icon: (
          <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        bgColor: 'bg-green-100 dark:bg-green-900'
      };
    }

    switch (extension) {
      case 'pdf':
        return {
          icon: (
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          ),
          bgColor: 'bg-red-100 dark:bg-red-900'
        };
      case 'doc':
      case 'docx':
        return {
          icon: (
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          bgColor: 'bg-blue-100 dark:bg-blue-900'
        };
      default:
        return {
          icon: (
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          ),
          bgColor: 'bg-gray-100 dark:bg-gray-700'
        };
    }
  };

  const getFilteredFiles = () => {
    if (!userFiles) return [];

    switch (activeFilter) {
      case "recent":
        return userFiles.filter(file => {
          const daysSinceUpload = (Date.now() - file.uploadedAt) / (1000 * 60 * 60 * 24);
          return daysSinceUpload <= 7; // Files from last 7 days
        });
      case "shared":
        return userFiles.filter(file => file.shared);
      case "starred":
        return userFiles.filter(file => file.starred);
      default:
        return userFiles;
    }
  };

  const filteredFiles = getFilteredFiles();
  const totalFiles = userFiles?.length || 0;
  const totalSize = userFiles?.reduce((acc, file) => acc + file.fileSize, 0) || 0;
  const recentFiles = userFiles?.filter(file => {
    const daysSinceUpload = (Date.now() - file.uploadedAt) / (1000 * 60 * 60 * 24);
    return daysSinceUpload <= 7;
  }).length || 0;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col space-y-4 max-w-none mx-auto px-4 xl:px-6 2xl:px-8">
      {/* Header */}
      <div className="flex-shrink-0 pt-1 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
              Files
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1">
              Store, organize, and access your academic documents and files.
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md transition-all duration-200 transform hover:scale-105">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>New Folder</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-semibold hover:bg-purple-700 hover:shadow-md transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload Files</span>
            </button>
          </div>
        </div>
      </div>


      {/* Files Grid - Dashboard Style with Dynamic Heights */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-3 md:gap-4 xl:gap-5 2xl:gap-6 min-h-0">
        {/* Row 1: File Stats */}
        <div className="col-span-1 md:col-span-1 lg:col-span-3 h-[19vh] md:h-[16vh] lg:h-[19vh] xl:h-[18vh] 2xl:h-[16vh]">
          <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total Files</p>
                <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">{totalFiles}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-1 lg:col-span-3 h-[19vh] md:h-[16vh] lg:h-[19vh] xl:h-[18vh] 2xl:h-[16vh]">
          <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Storage Used</p>
                <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">{formatFileSize(totalSize)}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-1 lg:col-span-3 h-[19vh] md:h-[16vh] lg:h-[19vh] xl:h-[18vh] 2xl:h-[16vh]">
          <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Shared Files</p>
                <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">0</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-1 lg:col-span-3 h-[19vh] md:h-[16vh] lg:h-[19vh] xl:h-[18vh] 2xl:h-[16vh]">
          <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Recent Files</p>
                <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">{recentFiles}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Filter Controls and File List */}
        <div className="col-span-1 md:col-span-4 lg:col-span-12 h-[45vh] md:h-[50vh] lg:h-[45vh] xl:h-[48vh] 2xl:h-[50vh]">
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden h-full flex flex-col">
            {/* Filter Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-heading">
                  {getFilterTitle(activeFilter)}
                </h3>

                {/* Filter Tabs - Inline with Header */}
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-full">
                  <button
                    onClick={() => setActiveFilter("all")}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                      activeFilter === "all"
                        ? "text-white bg-purple-600"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveFilter("recent")}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                      activeFilter === "recent"
                        ? "text-white bg-purple-600"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600"
                    }`}
                  >
                    Recent
                  </button>
                  <button
                    onClick={() => setActiveFilter("shared")}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                      activeFilter === "shared"
                        ? "text-white bg-purple-600"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600"
                    }`}
                  >
                    Shared
                  </button>
                  <button
                    onClick={() => setActiveFilter("starred")}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                      activeFilter === "starred"
                        ? "text-white bg-purple-600"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600"
                    }`}
                  >
                    Starred
                  </button>
                </div>
              </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto scrollbar-modern min-h-0">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">


                {/* Folders by Course */}
                <div className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Folders</h4>
                  <div className="space-y-3">
                    {coursesWithFiles && coursesWithFiles.length > 0 ? (
                      coursesWithFiles.map((c) => (
                        <div
                          key={c.courseId}
                          className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 rounded-lg cursor-pointer hover:shadow-md hover:scale-[1.02]"
                          onClick={() => navigate(`/app/v2/files/${c.courseId}`)}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 bg-blue-100 dark:bg-blue-900`}>
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h4l2 2h10a1 1 0 011 1v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.code} - {c.title}</h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{c.fileCount} {c.fileCount === 1 ? 'file' : 'files'}</p>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(c.lastUpdated).toLocaleDateString()}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No folders yet. Upload files to assignments to see course folders here.</p>
                    )}
                  </div>
                </div>

                {/* Files Section */}
                <div className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Files</h4>
                  <div className="space-y-3">
                        {filteredFiles && filteredFiles.length > 0 ? (
                          filteredFiles.map((file) => {
                            const { icon, bgColor } = getFileIcon(file.mimeType, file.originalFileName);
                            const timeAgo = new Date(file.uploadedAt).toLocaleDateString();

                            return (
                              <div key={file._id} className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 rounded-lg">
                                <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center mr-4`}>
                                  {icon}
                                </div>
                                <div className="flex-1 cursor-pointer" onClick={() => handleViewFile(file._id)}>
                                  <h5 className="text-sm font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors">{file.originalFileName}</h5>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.fileSize)}</p>
                                    {file.assignmentInfo && (
                                      <>
                                        <span className="text-xs text-gray-400">•</span>
                                        <p className="text-xs text-purple-600 dark:text-purple-400">{file.assignmentInfo.title}</p>
                                      </>
                                    )}
                                    {file.courseInfo && !file.assignmentInfo && (
                                      <>
                                        <span className="text-xs text-gray-400">•</span>
                                        <p className="text-xs text-blue-600 dark:text-blue-400">{file.courseInfo.code}</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</span>
                                  <button
                                    onClick={() => handleViewFile(file._id)}
                                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                                    title="View file"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleToggleStar(file._id)}
                                    className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 ${
                                      file.starred
                                        ? 'text-yellow-500 hover:text-yellow-600'
                                        : 'text-gray-400 hover:text-yellow-500'
                                    }`}
                                    title={file.starred ? "Remove from favorites" : "Add to favorites"}
                                  >
                                    <svg className="w-4 h-4" fill={file.starred ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleOpenShareModal(file._id)}
                                    className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 ${
                                      file.shared
                                        ? 'text-green-500 hover:text-green-600'
                                        : 'text-gray-400 hover:text-green-500'
                                    }`}
                                    title="Share file"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleSecureDownload(file._id, file.originalFileName)}
                                    className="p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                                    title="Download file"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFile(file._id)}
                                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                                    title="Delete file"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            );
                          })
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No files found</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Upload files through assignments or use the upload button above</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowUploadModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Files</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <FileUpload
                onFileUploaded={() => {
                  console.log("File uploaded successfully");
                  // The query will automatically refetch
                }}
                maxFiles={10}
                maxSize={100 * 1024 * 1024} // 100MB
              />
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
        fileId={viewerFileId}
        fileName={undefined}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={handleCloseShareModal}
        fileId={shareFileId}
        fileName={userFiles?.find(f => f._id === shareFileId)?.originalFileName}
        isShared={userFiles?.find(f => f._id === shareFileId)?.shared}
        shareToken={userFiles?.find(f => f._id === shareFileId)?.shareToken}
      />
    </div>
  );
}
