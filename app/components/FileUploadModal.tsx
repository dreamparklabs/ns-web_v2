import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from './FileUpload';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUploaded?: (fileId: Id<"files">) => void;
}

interface Course {
  _id: Id<"courses">;
  courseCode: string;
  courseName: string;
}

interface Assignment {
  _id: Id<"assignments">;
  title: string;
  courseId: Id<"courses">;
  status: string;
}

export default function FileUploadModal({ 
  isOpen, 
  onClose, 
  onFileUploaded 
}: FileUploadModalProps) {
  const { user } = useUser();
  const [selectedCourseId, setSelectedCourseId] = useState<Id<"courses"> | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<Id<"assignments"> | null>(null);
  const [step, setStep] = useState<'course' | 'assignment' | 'upload'>('course');

  // Fetch user's courses
  const courses = useQuery(api.courses.getUserCourses, 
    user?.id ? { clerkUserId: user.id } : "skip"
  ) as Course[] | undefined;

  // Fetch assignments for selected course
  const assignments = useQuery(api.assignments.getUserAssignments,
    user?.id && selectedCourseId ? { clerkUserId: user.id } : "skip"
  ) as Assignment[] | undefined;

  // Filter assignments by selected course
  const courseAssignments = assignments?.filter(
    assignment => assignment.courseId === selectedCourseId
  ) || [];

  const selectedCourse = courses?.find(course => course._id === selectedCourseId);
  const selectedAssignment = courseAssignments.find(assignment => assignment._id === selectedAssignmentId);

  const handleCourseSelect = (courseId: Id<"courses">) => {
    setSelectedCourseId(courseId);
    setSelectedAssignmentId(null);
    setStep('assignment');
  };

  const handleAssignmentSelect = (assignmentId: Id<"assignments">) => {
    setSelectedAssignmentId(assignmentId);
    setStep('upload');
  };

  const handleBack = () => {
    if (step === 'assignment') {
      setStep('course');
      setSelectedCourseId(null);
      setSelectedAssignmentId(null);
    } else if (step === 'upload') {
      setStep('assignment');
      setSelectedAssignmentId(null);
    }
  };

  const handleClose = () => {
    setSelectedCourseId(null);
    setSelectedAssignmentId(null);
    setStep('course');
    onClose();
  };

  const handleFileUploaded = (fileId: Id<"files">) => {
    if (onFileUploaded) {
      onFileUploaded(fileId);
    }
    // Optionally close modal after successful upload
    // handleClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Upload File
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {step === 'course' && 'Select a course to upload files to'}
                  {step === 'assignment' && 'Select an assignment (optional)'}
                  {step === 'upload' && 'Upload your files'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Progress Indicator */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center ${step === 'course' ? 'text-purple-600' : 'text-green-600'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step === 'course' ? 'bg-purple-100 dark:bg-purple-900' : 'bg-green-100 dark:bg-green-900'
                    }`}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="ml-2 text-sm font-medium">Course</span>
                  </div>
                  
                  <div className={`w-8 h-0.5 ${step === 'assignment' || step === 'upload' ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  
                  <div className={`flex items-center ${step === 'assignment' ? 'text-purple-600' : step === 'upload' ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step === 'assignment' ? 'bg-purple-100 dark:bg-purple-900' : 
                      step === 'upload' ? 'bg-green-100 dark:bg-green-900' : 
                      'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="ml-2 text-sm font-medium">Assignment</span>
                  </div>
                  
                  <div className={`w-8 h-0.5 ${step === 'upload' ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  
                  <div className={`flex items-center ${step === 'upload' ? 'text-purple-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step === 'upload' ? 'bg-purple-100 dark:bg-purple-900' : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="ml-2 text-sm font-medium">Upload</span>
                  </div>
                </div>
              </div>

              {/* Step Content */}
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 'course' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Select Course
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {courses && courses.length > 0 ? (
                        courses.map((course) => (
                          <button
                            key={course._id}
                            onClick={() => handleCourseSelect(course._id)}
                            className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">
                              {course.courseCode}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {course.courseName}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No courses found. Please add courses first.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 'assignment' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Select Assignment (Optional)
                      </h3>
                      <button
                        onClick={() => setStep('upload')}
                        className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                      >
                        Skip - Upload to Course
                      </button>
                    </div>
                    
                    {selectedCourse && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Selected Course:</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {selectedCourse.courseCode} - {selectedCourse.courseName}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {courseAssignments.length > 0 ? (
                        courseAssignments.map((assignment) => (
                          <button
                            key={assignment._id}
                            onClick={() => handleAssignmentSelect(assignment._id)}
                            className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">
                              {assignment.title}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Status: {assignment.status}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                          No assignments found for this course.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 'upload' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Upload Files
                    </h3>
                    
                    {/* Upload Summary */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Uploading to:</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {selectedCourse?.courseCode} - {selectedCourse?.courseName}
                      </div>
                      {selectedAssignment && (
                        <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                          Assignment: {selectedAssignment.title}
                        </div>
                      )}
                    </div>

                    {/* File Upload Component */}
                    <FileUpload
                      courseId={selectedCourseId}
                      assignmentId={selectedAssignmentId}
                      onFileUploaded={handleFileUploaded}
                    />
                  </div>
                )}
              </motion.div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleBack}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    step === 'course'
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  disabled={step === 'course'}
                >
                  Back
                </button>

                <div className="flex space-x-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  
                  {step === 'upload' && (
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
