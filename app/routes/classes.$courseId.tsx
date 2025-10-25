import type { Route } from "./+types/classes.$courseId";
import { useState, useMemo, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useSearchParams, useLocation, useNavigate, useParams, Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import AssignmentDetailsModal from "../components/AssignmentDetailsModal";
import EditAssignmentModal from "../components/EditAssignmentModal";
import EditClassModal from "../components/EditClassModal";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Class Details - Northstar` },
    { name: "description", content: "View detailed information about your class" },
  ];
}

type AssignmentFilter = "all" | "upcoming" | "completed" | "overdue";

export default function ClassDetail() {
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const courseId = params.courseId as Id<"courses">;
  
  // State for assignment modals
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<Id<"assignments"> | null>(null);
  const [isAssignmentDetailsModalOpen, setIsAssignmentDetailsModalOpen] = useState(false);
  const [isEditAssignmentModalOpen, setIsEditAssignmentModalOpen] = useState(false);

  // State for class edit modal
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);

  // State for class menu dropdown
  const [isClassMenuOpen, setIsClassMenuOpen] = useState(false);
  const classMenuRef = useRef<HTMLDivElement>(null);

  // Check for edit-assignment URL parameter
  const editAssignmentId = searchParams.get('edit-assignment') as Id<"assignments"> | null;

  // Get assignment filter from URL params
  const urlFilter = searchParams.get("assignments");
  const validFilters: AssignmentFilter[] = ["all", "upcoming", "completed", "overdue"];
  const activeFilter: AssignmentFilter = validFilters.includes(urlFilter as AssignmentFilter)
    ? (urlFilter as AssignmentFilter)
    : "all";

  // Function to update filter and URL
  const setActiveFilter = (filter: AssignmentFilter) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (filter === "all") {
      newSearchParams.delete("assignments");
    } else {
      newSearchParams.set("assignments", filter);
    }
    setSearchParams(newSearchParams);
  };

  // Get course data from Convex
  const course = useQuery(
    api.courses.getCourseById,
    user?.id ? {
      courseId: courseId,
      clerkUserId: user.id
    } : "skip"
  );

  // Get all courses to determine the correct gradient index
  const allCourses = useQuery(
    api.courses.getUserCourses,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  // Filter assignments based on active filter
  const filteredAssignments = useMemo(() => {
    if (!course?.assignments) return [];

    const now = Date.now();

    switch (activeFilter) {
      case "upcoming":
        return course.assignments.filter(a =>
          a.status !== "completed" && a.dueAt && a.dueAt > now
        );
      case "completed":
        return course.assignments.filter(a => a.status === "completed");
      case "overdue":
        return course.assignments.filter(a =>
          a.status !== "completed" && a.dueAt && a.dueAt < now
        );
      default:
        return course.assignments;
    }
  }, [course?.assignments, activeFilter]);

  // Function to open assignment modal
  const openAssignmentModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('new-assignment', 'true');
    navigate(`${location.pathname}?${newSearchParams.toString()}`);
  };

  // Function to open assignment details modal
  const openAssignmentDetailsModal = (assignmentId: Id<"assignments">) => {
    setSelectedAssignmentId(assignmentId);
    setIsAssignmentDetailsModalOpen(true);
  };

  // Function to close assignment details modal
  const closeAssignmentDetailsModal = () => {
    setIsAssignmentDetailsModalOpen(false);
    setSelectedAssignmentId(null);
  };

  // Function to open edit assignment modal
  const openEditAssignmentModal = () => {
    setIsAssignmentDetailsModalOpen(false);
    setIsEditAssignmentModalOpen(true);
  };

  // Function to close edit assignment modal
  const closeEditAssignmentModal = () => {
    setIsEditAssignmentModalOpen(false);
    setSelectedAssignmentId(null);
    // Remove edit-assignment parameter from URL
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('edit-assignment');
    setSearchParams(newSearchParams);
  };

  // Handle clicks outside the class menu dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (classMenuRef.current && !classMenuRef.current.contains(event.target as Node)) {
        setIsClassMenuOpen(false);
      }
    };

    if (isClassMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isClassMenuOpen]);

  // Function to handle edit class
  const handleEditClass = () => {
    setIsClassMenuOpen(false);
    setIsEditClassModalOpen(true);
  };

  // Function to close edit class modal
  const closeEditClassModal = () => {
    setIsEditClassModalOpen(false);
  };

  // Function to handle delete class
  const handleDeleteClass = () => {
    setIsClassMenuOpen(false);
    const confirmed = window.confirm('Are you sure you want to delete this class? This will also delete all assignments associated with it. This action cannot be undone.');
    if (confirmed) {
      // TODO: Implement delete class functionality
      console.log('Delete class:', courseId);
      navigate('/app/v2/classes');
    }
  };

  // Handle edit-assignment URL parameter
  useEffect(() => {
    if (editAssignmentId) {
      setSelectedAssignmentId(editAssignmentId);
      setIsEditAssignmentModalOpen(true);
    }
  }, [editAssignmentId]);

  // Loading state
  if (course === undefined) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading class details...</p>
        </div>
      </div>
    );
  }

  // Course not found
  if (course === null) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Class not found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            The class you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link
            to="/app/v2/classes"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Classes</span>
          </Link>
        </div>
      </div>
    );
  }

  // Get gradient color (cycling through the same colors as the classes page)
  const gradients = [
    "from-purple-500 to-blue-500",
    "from-green-500 to-teal-500",
    "from-blue-500 to-cyan-500",
    "from-orange-500 to-red-500",
    "from-pink-500 to-rose-500",
    "from-indigo-500 to-purple-500",
    "from-yellow-500 to-orange-500",
    "from-emerald-500 to-green-500"
  ];
  // Find the index of this course in the user's course list to match the gradient on the classes page
  const courseIndex = allCourses?.findIndex(c => c._id === courseId) ?? 0;
  const gradient = gradients[courseIndex % gradients.length];

  return (
    <div className="h-full flex flex-col max-w-none mx-auto px-4 xl:px-6 2xl:px-8 pt-4 xl:pt-6 2xl:pt-8 pb-4 gap-4 xl:gap-5 2xl:gap-6">
      {/* Header with breadcrumb */}
      <div className="flex-shrink-0 pb-3 xl:pb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Link to="/app/v2/classes" className="hover:text-gray-700 dark:hover:text-gray-200">
            Classes
          </Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 dark:text-white">{course.code}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
              {course.title}
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1">
              {course.code} • {course.instructor} • {course.creditHours} credit{course.creditHours !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={openAssignmentModal}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-semibold hover:bg-purple-700 hover:shadow-md transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Assignment</span>
            </button>
            <div className="relative" ref={classMenuRef}>
              <button
                onClick={() => setIsClassMenuOpen(!isClassMenuOpen)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="More options"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isClassMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={handleEditClass}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={handleDeleteClass}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Course Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 xl:gap-5 2xl:gap-6 flex-shrink-0">
        {/* Course Header Card */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl h-full">
            <div className={`h-20 bg-gradient-to-r rounded-t-xl ${gradient}`}></div>
            <div className="p-4">
              <div className="space-y-3">
                {course.meetingSchedule && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {course.meetingSchedule}
                  </div>
                )}
                {course.deliveryFormat === 'virtual' && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Virtual ({course.deliveryMode || 'synchronous'})
                  </div>
                )}
                {(course.deliveryFormat === 'in-person' || !course.deliveryFormat) && course.room && course.building && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {course.building} {course.room}
                  </div>
                )}
                {course.term && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {course.term.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">Current Grade</p>
              <p className={`text-2xl font-semibold mt-1 ${
                course.averageGrade
                  ? course.averageGrade >= 90 ? 'text-green-600 dark:text-green-400'
                  : course.averageGrade >= 80 ? 'text-blue-600 dark:text-blue-400'
                  : course.averageGrade >= 70 ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {course.averageGrade
                  ? `${course.averageGrade >= 90 ? 'A' : course.averageGrade >= 80 ? 'B' : course.averageGrade >= 70 ? 'C' : course.averageGrade >= 60 ? 'D' : 'F'} (${course.averageGrade}%)`
                  : 'No Grade'
                }
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">Assignments</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {course.completedAssignments}/{course.totalAssignments}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments Section */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl flex flex-col">
        {/* Header with filters */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Assignments
            </h3>

            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-full">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  activeFilter === "all"
                    ? "text-white bg-purple-600"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600"
                }`}
              >
                All ({course.totalAssignments})
              </button>
              <button
                onClick={() => setActiveFilter("upcoming")}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  activeFilter === "upcoming"
                    ? "text-white bg-purple-600"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600"
                }`}
              >
                Upcoming ({course.upcomingAssignments})
              </button>
              <button
                onClick={() => setActiveFilter("overdue")}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  activeFilter === "overdue"
                    ? "text-white bg-purple-600"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600"
                }`}
              >
                Overdue ({course.overdueAssignments})
              </button>
              <button
                onClick={() => setActiveFilter("completed")}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  activeFilter === "completed"
                    ? "text-white bg-purple-600"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600"
                }`}
              >
                Completed ({course.completedAssignments})
              </button>
            </div>
          </div>
        </div>

        {/* Assignments List */}
        <div className="p-6 flex-1 overflow-y-auto">
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No {activeFilter !== "all" ? activeFilter : ""} assignments
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {activeFilter === "all"
                  ? "No assignments have been added to this class yet."
                  : `No ${activeFilter} assignments found.`
                }
              </p>
              {activeFilter === "all" && (
                <button
                  onClick={openAssignmentModal}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add First Assignment</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((assignment) => {
                const isOverdue = assignment.dueAt && assignment.dueAt < Date.now() && assignment.status !== "completed";
                const isCompleted = assignment.status === "completed";

                return (
                  <div
                    key={assignment._id}
                    onClick={() => openAssignmentDetailsModal(assignment._id)}
                    className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer hover:scale-[1.02] ${
                      isCompleted
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : isOverdue
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                            {assignment.title}
                          </h4>
                          {assignment.type && (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full">
                              {assignment.type}
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            isCompleted
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : isOverdue
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Pending'}
                          </span>
                        </div>

                        {assignment.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {assignment.notes}
                          </p>
                        )}

                        <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                          {assignment.dueAt && (
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Due {new Date(assignment.dueAt).toLocaleDateString()}
                            </div>
                          )}
                          {assignment.maxPoints && (
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              {assignment.pointsEarned !== undefined ? assignment.pointsEarned : '—'}/{assignment.maxPoints} pts
                            </div>
                          )}
                          {assignment.grade && (
                            <div className={`flex items-center font-medium ${
                              assignment.grade >= 90 ? 'text-green-600 dark:text-green-400'
                              : assignment.grade >= 80 ? 'text-blue-600 dark:text-blue-400'
                              : assignment.grade >= 70 ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                            }`}>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {assignment.grade}%
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Assignment Details Modal */}
      <AssignmentDetailsModal
        isOpen={isAssignmentDetailsModalOpen}
        onClose={closeAssignmentDetailsModal}
        assignmentId={selectedAssignmentId}
        onEdit={openEditAssignmentModal}
      />

      {/* Edit Assignment Modal */}
      <EditAssignmentModal
        isOpen={isEditAssignmentModalOpen}
        onClose={closeEditAssignmentModal}
        assignmentId={selectedAssignmentId}
      />

      {/* Edit Class Modal */}
      <EditClassModal
        isOpen={isEditClassModalOpen}
        onClose={closeEditClassModal}
        courseId={courseId}
      />
    </div>
  );
}
