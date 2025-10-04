import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useConvex } from "convex/react";
import { useSearchParams, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: Id<"files"> | null;
  fileName?: string;
}

export default function FileViewerModal({ isOpen, onClose, fileId, fileName }: FileViewerModalProps) {
  const { user } = useUser();
  const convex = useConvex();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [fileData, setFileData] = useState<{
    url: string;
    mimeType: string;
    fileName: string;
    fileSize: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch file data when modal opens
  useEffect(() => {
    if (isOpen && fileId && user?.id) {
      loadFile();
    } else {
      setFileData(null);
      setError(null);
    }
  }, [isOpen, fileId, user?.id]);

  const loadFile = async () => {
    if (!fileId || !user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Use the secure Convex query to verify access and get file URL
      const fileAccess = await convex.query(api.files.verifyFileAccess, {
        fileId,
        clerkUserId: user.id,
      });

      if (!fileAccess.hasAccess || !fileAccess.downloadUrl) {
        throw new Error(fileAccess.error || 'Access denied');
      }

      setFileData({
        url: fileAccess.downloadUrl,
        mimeType: fileAccess.mimeType,
        fileName: fileAccess.fileName,
        fileSize: fileAccess.fileSize,
      });
    } catch (err) {
      console.error("Failed to load file:", err);
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!fileData) return;

    try {
      const response = await fetch(fileData.url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileData.fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderFileContent = () => {
    if (!fileData) return null;

    const { url, mimeType } = fileData;

    // PDF files
    if (mimeType === 'application/pdf') {
      return (
        <div className="w-full h-full">
          <iframe
            src={url}
            className="w-full h-full border-0 rounded-lg"
            title={fileData.fileName}
          />
        </div>
      );
    }

    // Image files
    if (mimeType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full">
          <img
            src={url}
            alt={fileData.fileName}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      );
    }

    // Text files
    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      return (
        <div className="w-full h-full">
          <iframe
            src={url}
            className="w-full h-full border-0 rounded-lg bg-white"
            title={fileData.fileName}
          />
        </div>
      );
    }

    // Unsupported file types
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Preview not available
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          This file type cannot be previewed in the browser.
        </p>
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Download File
        </button>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1], // Custom cubic bezier for smooth motion
              scale: { duration: 0.35 },
              y: { duration: 0.4 }
            }}
            className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col"
          >
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {fileName || fileData?.fileName || 'File Viewer'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {fileData ? formatFileSize(fileData.fileSize) : 'View and download your file'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Press</span>
                <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded border">
                  <span className="font-mono font-medium">ESC</span>
                </div>
                
                {/* Download Button */}
                {fileData && (
                  <button
                    onClick={handleDownload}
                    className="ml-2 p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                    title="Download file"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading file...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Failed to load file
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {error}
                  </p>
                </div>
              </div>
            ) : (
              renderFileContent()
            )}
          </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
