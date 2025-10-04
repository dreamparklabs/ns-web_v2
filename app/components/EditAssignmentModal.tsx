import { useState, useEffect, useRef } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router";
import { useMutation, useQuery, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Id } from "../../convex/_generated/dataModel";
import FileUpload from "./FileUpload";
import FileViewerModal from "./FileViewerModal";

interface EditAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: Id<"assignments"> | null;
}

export default function EditAssignmentModal({ isOpen, onClose, assignmentId }: EditAssignmentModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("23:59");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [assignmentType, setAssignmentType] = useState("assignment");
  const [maxPoints, setMaxPoints] = useState("");
  const [gradeReceived, setGradeReceived] = useState("");
  const [status, setStatus] = useState("todo");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // URL-based file viewer state
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const viewerFileId = searchParams.get('view-file') as Id<"files"> | null;
  const isViewerOpen = Boolean(viewerFileId);

  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const { user } = useUser();
  

  // Get user's courses for the dropdown
  const courses = useQuery(
    api.courses.getUserCourses,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  // Get assignment data for editing
  const assignment = useQuery(
    api.assignments.getAssignment,
    assignmentId ? { assignmentId } : "skip"
  );

  // Get files for this assignment
  const assignmentFiles = useQuery(
    api.files.getAssignmentFiles,
    assignmentId && user?.id ? { assignmentId, clerkUserId: user.id } : "skip"
  );

  // Mutations
  const updateAssignment = useMutation(api.assignments.updateAssignment);
  const deleteAssignment = useMutation(api.assignments.deleteAssignment);
  const deleteFile = useMutation(api.files.deleteFile);
  const resetAssignmentProtection = useMutation(api.assignments.resetAssignmentProtection);

  // Get Convex client for direct queries
  const convex = useConvex();

  // Populate form when assignment data loads
  useEffect(() => {
    if (assignment && isOpen) {
      setTitle(assignment.title);
      setDescription(assignment.notes || "");

      // Convert timestamp to date and time - handle null/undefined dueAt
      if (assignment.dueAt) {
        const dueDateTime = new Date(assignment.dueAt);
        if (!isNaN(dueDateTime.getTime())) {
          setDueDate(dueDateTime.toISOString().split('T')[0]);
          setDueTime(dueDateTime.toTimeString().slice(0, 5));
        } else {
          // Invalid date, set defaults
          setDueDate("");
          setDueTime("23:59"); // Default to 11:59 PM
        }
      } else {
        // No due date set
        setDueDate("");
        setDueTime("23:59"); // Default to 11:59 PM
      }

      setSelectedCourseId(assignment.courseId);
      setAssignmentType(assignment.type || "assignment");
      setMaxPoints(assignment.maxPoints?.toString() || "");
      setGradeReceived(assignment.pointsEarned?.toString() || "");
      setStatus(assignment.status);
    }
  }, [assignment, isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && !assignment) {
      setTitle("");
      setDescription("");
      setDueDate("");
      setDueTime("23:59");
      setSelectedCourseId("");
      setAssignmentType("assignment");
      setMaxPoints("");
      setGradeReceived("");
      setStatus("todo");
      setIsSubmitting(false);
      titleInputRef.current?.focus();
    }
  }, [isOpen, assignment]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedCourseId || !assignmentId) return;

    setIsSubmitting(true);

    try {
      // Handle optional due date
      let dueDateTimestamp = undefined;
      if (dueDate && dueTime) {
        const dueDateTimeString = `${dueDate}T${dueTime}:00`;
        const dueDateTimeLocal = new Date(dueDateTimeString);
        if (!isNaN(dueDateTimeLocal.getTime())) {
          dueDateTimestamp = dueDateTimeLocal.getTime();
        }
      }

      await updateAssignment({
        assignmentId,
        title: title.trim(),
        description: description.trim() || undefined,
        type: assignmentType,
        dueDate: dueDateTimestamp,
        maxPoints: maxPoints ? parseFloat(maxPoints) : undefined,
        pointsEarned: gradeReceived ? parseFloat(gradeReceived) : undefined,
        status: status
      });

      onClose();
    } catch (error) {
      console.error("Failed to update assignment:", error);
      alert("Failed to update assignment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!assignmentId) return;

    const confirmed = window.confirm("Are you sure you want to delete this assignment? This action cannot be undone.");
    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      await deleteAssignment({ assignmentId });
      onClose();
    } catch (error) {
      console.error("Failed to delete assignment:", error);
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

  const today = new Date().toISOString().split('T')[0];

  const handleFileUploaded = () => {
    // File uploaded successfully - the query will automatically refetch
    console.log("File uploaded successfully");
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

  const handleResetProtection = async (fields?: string[]) => {
    if (!assignmentId) return;

    const confirmed = window.confirm(
      fields
        ? `Allow D2L sync to update the ${fields.join(', ')} field${fields.length > 1 ? 's' : ''} for this assignment?`
        : "Allow D2L sync to update all fields for this assignment? This will remove all protection from your manual changes."
    );

    if (!confirmed) return;

    try {
      await resetAssignmentProtection({ assignmentId, fields });
      // The assignment data will automatically refresh via the query
    } catch (error) {
      console.error("Failed to reset assignment protection:", error);
      alert("Failed to reset protection. Please try again.");
    }
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
      return (
        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }

    switch (extension) {
      case 'pdf':
        return (
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  // Helper functions for field protection
  const isFieldProtected = (fieldName: string) => {
    return assignment?.userModifiedFields?.includes(fieldName) || false;
  };

  const getProtectedFields = () => {
    return assignment?.userModifiedFields || [];
  };

  const hasAnyProtectedFields = () => {
    return getProtectedFields().length > 0;
  };

  const renderFieldProtectionIcon = (fieldName: string) => {
    if (!isFieldProtected(fieldName)) return null;

    return (
      <div className="flex items-center gap-1 ml-2" title="This field is protected from D2L sync">
        <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        <span className="text-xs text-amber-600 dark:text-amber-400">Protected</span>
      </div>
    );
  };

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

        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Assignment</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Update assignment details, add grades, or upload files</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Press</span>
              <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded border">
                <span className="font-mono font-medium">ESC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Assignment Title *
              </label>
              {renderFieldProtectionIcon('title')}
            </div>
            <input
              ref={titleInputRef}
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter assignment title..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              required
            />
          </div>

          {/* Course Selection */}
          <div>
            <label htmlFor="course" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Course *
            </label>
            <select
              id="course"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              required
            >
              <option value="">Select a course...</option>
              {courses?.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.code} - {course.title}
                </option>
              ))}
            </select>
          </div>

          {/* Assignment Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <select
              id="type"
              value={assignmentType}
              onChange={(e) => setAssignmentType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            >
              <option value="assignment">Assignment</option>
              <option value="quiz">Quiz</option>
              <option value="exam">Exam</option>
              <option value="project">Project</option>
              <option value="homework">Homework</option>
              <option value="lab">Lab</option>
            </select>
          </div>

          {/* Due Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Due Date */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Due Date *
                </label>
                {renderFieldProtectionIcon('dueAt')}
              </div>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                required
              />
            </div>

            {/* Due Time */}
            <div>
              <label htmlFor="dueTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Time *
              </label>
              <input
                id="dueTime"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Grade Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Grade Received */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="gradeReceived" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Grade Received (Optional)
                </label>
                {renderFieldProtectionIcon('pointsEarned')}
              </div>
              <input
                id="gradeReceived"
                type="number"
                min="0"
                step="0.1"
                value={gradeReceived}
                onChange={(e) => setGradeReceived(e.target.value)}
                placeholder="Points earned..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Max Points */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="maxPoints" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Max Points (Optional)
                </label>
                {renderFieldProtectionIcon('maxPoints')}
              </div>
              <input
                id="maxPoints"
                type="number"
                min="0"
                step="0.1"
                value={maxPoints}
                onChange={(e) => setMaxPoints(e.target.value)}
                placeholder="Total possible..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Status */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                {renderFieldProtectionIcon('status')}
              </div>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              >
                <option value="todo">To Do</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Grade Percentage Display */}
          {gradeReceived && maxPoints && parseFloat(maxPoints) > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Calculated Grade: {((parseFloat(gradeReceived) / parseFloat(maxPoints)) * 100).toFixed(2)}%
                </span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                This percentage will be saved automatically when you update the assignment.
              </p>
            </div>
          )}

          {/* Protected Fields Notification */}
          {hasAnyProtectedFields() && (
            <div className="bg-amber-50 dark:bg-amber-900 dark:bg-opacity-30 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Protected Fields
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    The following fields are protected from D2L sync because you've manually modified them: <strong>{getProtectedFields().join(', ')}</strong>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleResetProtection()}
                      className="text-xs bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-3 py-1 rounded-full hover:bg-amber-200 dark:hover:bg-amber-700 transition-colors"
                    >
                      Allow sync for all fields
                    </button>
                    {getProtectedFields().map((field) => (
                      <button
                        key={field}
                        type="button"
                        onClick={() => handleResetProtection([field])}
                        className="text-xs bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600 px-3 py-1 rounded-full hover:bg-amber-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        Allow sync for {field}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description (Optional)
              </label>
              {renderFieldProtectionIcon('notes')}
            </div>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional notes or description..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Files
            </label>

            {/* Existing Files */}
            {assignmentFiles && assignmentFiles.length > 0 && (
              <div className="mb-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Uploaded Files</h4>
                {assignmentFiles.map((file) => (
                  <div key={file._id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-shrink-0">
                      {getFileIcon(file.mimeType, file.originalFileName)}
                    </div>

                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleViewFile(file._id)}>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                        {file.originalFileName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.fileSize)} • {new Date(file.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewFile(file._id)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1"
                        title="View file"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleSecureDownload(file._id, file.originalFileName)}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 p-1"
                        title="Download file"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file._id)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1"
                        title="Delete file"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* File Upload Component */}
            <FileUpload
              assignmentId={assignmentId}
              onFileUploaded={handleFileUploaded}
              maxFiles={10}
              maxSize={100 * 1024 * 1024} // 100MB to support larger PDFs
              acceptedTypes={['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp', '.doc', '.docx', '.txt']}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
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
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Delete
              </button>
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
                disabled={!title.trim() || !selectedCourseId || isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-purple-600 rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Updating...
                  </>
                ) : (
                  "Update Assignment"
                )}
              </button>
            </div>
          </div>
        </div>
          </motion.div>
        </div>
      )}

      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
        fileId={viewerFileId}
        fileName={undefined}
      />
    </AnimatePresence>
  );
}
