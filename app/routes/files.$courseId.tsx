import type { Route } from "./+types/files.$courseId";
import { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useConvex, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import FileViewerModal from "../components/FileViewerModal";
import ShareModal from "../components/ShareModal";
import { useLocation, useSearchParams } from "react-router";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Course Files - Northstar` },
    { name: "description", content: "View files for a specific course" },
  ];
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileIcon(mimeType: string, name: string) {
  if (mimeType === "application/pdf") {
    return {
      icon: (
        <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      bgColor: "bg-red-100 dark:bg-red-900",
    };
  }
  if (mimeType.startsWith("image/")) {
    return {
      icon: (
        <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      bgColor: "bg-green-100 dark:bg-green-900",
    };
  }
  return {
    icon: (
      <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    bgColor: "bg-gray-100 dark:bg-gray-700",
  };
}

export default function CourseFiles() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const params = useParams();
  const courseId = params.courseId as Id<"courses">;
  const [searchParams, setSearchParams] = useSearchParams();

  // File viewer state via URL
  const viewerFileId = searchParams.get('view-file') as Id<'files'> | null;
  const isViewerOpen = Boolean(viewerFileId);
  const shareFileId = searchParams.get('share-file') as Id<"files"> | null;
  const isShareOpen = Boolean(shareFileId);
  const handleViewFile = (id: Id<'files'>) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('view-file', id);
    setSearchParams(sp, { replace: false });
  };
  const handleCloseViewer = () => {
    const sp = new URLSearchParams(searchParams);
    sp.delete('view-file');
    setSearchParams(sp, { replace: false });
  };

  const courseFiles = useQuery(
    api.files.getCourseFiles,
    user?.id && courseId ? { clerkUserId: user.id, courseId } : "skip"
  );

  const courseDetail = useQuery(
    api.courses.getCourseById,
    user?.id && courseId ? { clerkUserId: user.id, courseId } : "skip"
  );

  // Mutations
  const toggleFileStar = useMutation(api.files.toggleFileStar);

  // Action handlers
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

  if (isLoaded && !user) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-400">Please sign in to access your files.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col space-y-4 max-w-none mx-auto px-4 xl:px-6 2xl:px-8">
      {/* Header + Breadcrumb */}
      <div className="flex-shrink-0 pt-1 pb-2">
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Link to="/app/v2/files" className="hover:text-gray-700 dark:hover:text-gray-200">Files</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {courseDetail ? (
            <span className="text-gray-900 dark:text-white">{courseDetail.courseCode}</span>
          ) : (
            <span className="text-gray-400">Course</span>
          )}
        </div>
        <h1 className="text-xl md:text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight mt-1">
          {courseDetail ? courseDetail.courseName : 'Course Files'}
        </h1>
        {courseDetail && (
          <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 mt-1">
            {courseDetail.courseCode} • {courseDetail.term?.name}
          </p>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white/90 dark:bg-gray-800/95 rounded-2xl border border-gray-200/60 dark:border-gray-700/80 p-4">
          {courseFiles && courseFiles.length > 0 ? (
            <div className="space-y-3">
              {courseFiles.map((file) => {
                const { icon, bgColor } = getFileIcon(file.mimeType, file.originalFileName);
                return (
                  <div key={file._id} className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200">
                    <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center mr-4`}>
                      {icon}
                    </div>
                    <div className="flex-1 cursor-pointer" onClick={() => handleViewFile(file._id)}>
                      <h6 className="text-sm font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors">{file.originalFileName}</h6>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.fileSize)}</p>
                        {file.assignmentTitle && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <p className="text-xs text-purple-600 dark:text-purple-400">{file.assignmentTitle}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(file.uploadedAt).toLocaleDateString()}</span>
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
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-24">
              <p className="text-sm text-gray-500 dark:text-gray-400">No files uploaded for this course yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Viewer */}
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
        fileName={courseFiles?.find(f => f._id === shareFileId)?.originalFileName}
        isShared={courseFiles?.find(f => f._id === shareFileId)?.shared}
        shareToken={courseFiles?.find(f => f._id === shareFileId)?.shareToken}
      />
    </div>
  );
}


