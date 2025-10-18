import type { Route } from "./+types/tasks";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router";
import type { Id } from "../../convex/_generated/dataModel";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Assignments - Northstar" },
    { name: "description", content: "Manage your academic assignments and deadlines" },
  ];
}

type FilterType = "all" | "completed" | "overdue" | "todo";

export default function Tasks() {
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  
  // Get filter from URL params, default to "all"
  const urlFilter = searchParams.get("filter");
  const validFilters: FilterType[] = ["all", "completed", "overdue", "todo"];
  const activeFilter: FilterType = validFilters.includes(urlFilter as FilterType) 
    ? (urlFilter as FilterType) 
    : "all";
  
  // Function to update filter and URL
  const setActiveFilter = (filter: FilterType) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (filter === "all") {
      // Remove filter param when showing all assignments
      newSearchParams.delete("filter");
    } else {
      newSearchParams.set("filter", filter);
    }
    setSearchParams(newSearchParams);
  };

  // Function to open assignment modal
  const openAssignmentModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('new-assignment', 'true');
    navigate(`${location.pathname}?${newSearchParams.toString()}`);
  };

  // Function to open edit modal via URL
  const openEditModal = (assignmentId: Id<"assignments">) => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('edit-assignment', assignmentId);
    navigate(`${location.pathname}?${newSearchParams.toString()}`);
  };

  // Mutations
  const deleteAssignment = useMutation(api.assignments.deleteAssignment);
  const updateOverdueStatuses = useMutation(api.assignments.updateOverdueAssignmentStatuses);

  // Function to handle delete
  const handleDelete = async (assignmentId: Id<"assignments">) => {
    const confirmed = window.confirm("Are you sure you want to delete this assignment? This action cannot be undone.");
    if (!confirmed) return;
    
    try {
      await deleteAssignment({ assignmentId });
    } catch (error) {
      console.error("Failed to delete assignment:", error);
    }
  };
  
  // Get user's assignments
  const assignments = useQuery(
    api.assignments.getUserAssignments,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  // Update overdue assignments when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      updateOverdueStatuses().catch(console.error);
    }
  }, [user?.id, updateOverdueStatuses]);

  // Filter assignments based on active filter
  const filteredAssignments = assignments?.filter((assignment) => {
    switch (activeFilter) {
      case "completed":
        return assignment.status === "completed";
      case "overdue":
        return assignment.status === "overdue";
      case "todo":
        return assignment.status === "todo";
      case "all":
      default:
        return true;
    }
  }) || [];

  // Calculate statistics
  const totalAssignments = assignments?.length || 0;
  const completedAssignments = assignments?.filter(a => a.status === "completed").length || 0;
  const overdueAssignments = assignments?.filter(a => a.status === "overdue").length || 0;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "todo":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "overdue":
        return "Overdue";
      case "todo":
        return "To Do";
      default:
        return "Unknown";
    }
  };

  const getFilterTitle = (filter: FilterType) => {
    switch (filter) {
      case "all":
        return "All Assignments";
      case "completed":
        return "Completed Assignments";
      case "overdue":
        return "Overdue Assignments";
      case "todo":
        return "To Do Assignments";
      default:
        return "All Assignments";
    }
  };

  return (
    <>
      <div className="h-[calc(100vh-4rem)] flex flex-col max-w-none mx-auto px-4 xl:px-6 2xl:px-8 pt-4 xl:pt-6 2xl:pt-8">
        {/* Header */}
        <div className="flex-shrink-0 pb-3 xl:pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                Assignments
              </h1>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1">
                Keep track of your assignments, deadlines, and academic goals.
              </p>
            </div>
            <button 
              onClick={openAssignmentModal}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-semibold hover:bg-purple-700 hover:shadow-md transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Assignment</span>
            </button>
          </div>
        </div>

        {/* Assignment Grid - Dashboard Style with Dynamic Heights */}
        <div className="flex-1 flex flex-col gap-4 xl:gap-5 2xl:gap-6 pb-4">
          {/* Row 1: Assignment Stats - Flex row that distributes space evenly */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 xl:gap-5 2xl:gap-6 flex-shrink-0" style={{ height: '120px' }}>
            {/* Total Assignments Card */}
            <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total Assignments</p>
                  <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">{totalAssignments}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
            </div>

            {/* Completed Card */}
            <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Completed</p>
                  <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">{completedAssignments}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>
            </div>

            {/* Overdue Card */}
            <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Overdue</p>
                  <p className="text-2xl xl:text-3xl font-semibold text-red-600 dark:text-red-400 mt-1">{overdueAssignments}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01" />
                  </svg>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Row 2: Filter Controls and Assignment List */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl h-full flex flex-col">
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
                      onClick={() => setActiveFilter("todo")}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                        activeFilter === "todo"
                          ? "text-white bg-purple-600"
                          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600"
                      }`}
                    >
                      To Do
                    </button>
                    <button 
                      onClick={() => setActiveFilter("completed")}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                        activeFilter === "completed"
                          ? "text-white bg-purple-600"
                          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600"
                      }`}
                    >
                      Completed
                    </button>
                    <button 
                      onClick={() => setActiveFilter("overdue")}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                        activeFilter === "overdue"
                          ? "text-white bg-purple-600"
                          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600"
                      }`}
                    >
                      Overdue
                    </button>
                  </div>
                </div>
              </div>

              {/* Assignment List */}
              <div className="flex-1 overflow-y-auto scrollbar-modern">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAssignments && filteredAssignments.length > 0 ? (
                    filteredAssignments.map((assignment, index) => (
                      <div key={assignment._id} className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 interactive animate-fade-in-up`} style={{animationDelay: `${(index % 5) * 100}ms`}}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white text-body">
                                {assignment.title}
                              </h4>
                              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                                {getStatusText(assignment.status)}
                              </span>
                              {assignment.grade && (
                                <span className="px-3 py-1 text-xs font-medium accent-purple text-white rounded-full">
                                  {assignment.grade.toFixed(2)}%
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                {assignment.courseCode}
                              </span>
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2V9a2 2 0 00-2-2" />
                                </svg>
                                Due {formatDate(assignment.dueAt)}
                              </span>
                            </div>
                            {assignment.notes && (
                              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 text-body">
                                {assignment.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={() => openEditModal(assignment._id)}
                              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                              title="Edit assignment"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleDelete(assignment._id)}
                              className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                              title="Delete assignment"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-body text-gray-500 dark:text-gray-400">
                        {activeFilter === "all" ? "No assignments found" : `No ${activeFilter} assignments`}
                      </p>
                      <p className="text-caption text-gray-400 dark:text-gray-500 mt-2">
                        {activeFilter === "all" ? "Create your first assignment to get started" : `No assignments match the ${activeFilter} filter`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}