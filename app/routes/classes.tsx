import type { Route } from "./+types/classes";
import { useState, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { useSearchParams, useLocation, useNavigate, Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useGlobalTerm } from "../hooks/useGlobalTerm";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Classes - Northstar" },
    { name: "description", content: "Manage your academic classes and courses" },
  ];
}

type FilterType = "all" | "current" | "completed";

export default function Classes() {
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { globalTermId } = useGlobalTerm();

  // Get filter from URL params, default to "all"
  const urlFilter = searchParams.get("filter");
  const validFilters: FilterType[] = ["all", "current", "completed"];
  const activeFilter: FilterType = validFilters.includes(urlFilter as FilterType)
    ? (urlFilter as FilterType)
    : "all";

  // Function to update filter and URL
  const setActiveFilter = (filter: FilterType) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (filter === "all") {
      // Remove filter param when showing all classes
      newSearchParams.delete("filter");
    } else {
      newSearchParams.set("filter", filter);
    }
    setSearchParams(newSearchParams);
  };

  // Get courses data from Convex
  const courses = useQuery(
    api.courses.getUserCoursesByTerm,
    user?.id ? {
      clerkUserId: user.id,
      termId: globalTermId ? globalTermId as any : undefined
    } : "skip"
  );

  // Calculate statistics
  const stats = useMemo(() => {
    if (!courses) return { activeClasses: 0, totalCredits: 0, averageGPA: 0 };

    const activeClasses = courses.length;
    const totalCredits = courses.reduce((sum, course) => sum + course.creditHours, 0);

    // Calculate average GPA from course grades
    const coursesWithGrades = courses.filter(course => course.averageGrade !== null);
    const averageGPA = coursesWithGrades.length > 0
      ? coursesWithGrades.reduce((sum, course) => sum + (course.averageGrade || 0), 0) / coursesWithGrades.length / 25 * 4 // Convert percentage to 4.0 scale
      : 0;

    return {
      activeClasses,
      totalCredits,
      averageGPA: Math.round(averageGPA * 10) / 10 // Round to 1 decimal place
    };
  }, [courses]);

  // Filter courses based on active filter
  const filteredCourses = useMemo(() => {
    if (!courses) return [];

    switch (activeFilter) {
      case "current":
        return courses; // All courses are considered current for now
      case "completed":
        return []; // No completed courses logic yet
      default:
        return courses;
    }
  }, [courses, activeFilter]);

  // Function to open add class modal
  const openAddClassModal = () => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('new-class', 'true');
    navigate(`${location.pathname}?${newSearchParams.toString()}`);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col space-y-4 max-w-none mx-auto px-4 xl:px-6 2xl:px-8">
        {/* Header */}
        <div className="flex-shrink-0 pt-1 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                Classes
              </h1>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1">
                Manage your enrolled courses and class schedules.
              </p>
            </div>
            <button
              onClick={openAddClassModal}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-semibold hover:bg-purple-700 hover:shadow-md transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Class</span>
            </button>
          </div>
        </div>

        {/* Class Grid - Dashboard Style with Dynamic Heights */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-3 md:gap-4 xl:gap-5 2xl:gap-6">
          {/* Row 1: Class Stats */}
          <div className="col-span-1 md:col-span-4 lg:col-span-4 h-[19vh] md:h-[16vh] lg:h-[19vh] xl:h-[18vh] 2xl:h-[16vh]">
            <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Active Classes</p>
                  <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">{stats.activeClasses}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 lg:col-span-4 h-[19vh] md:h-[16vh] lg:h-[19vh] xl:h-[18vh] 2xl:h-[16vh]">
            <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total Credits</p>
                  <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">{stats.totalCredits}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 lg:col-span-4 h-[19vh] md:h-[16vh] lg:h-[19vh] xl:h-[18vh] 2xl:h-[16vh]">
            <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Average GPA</p>
                  <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">{stats.averageGPA || '—'}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Filter Controls and Classes List */}
          <div className="col-span-1 md:col-span-4 lg:col-span-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
              {/* Filter Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-heading">
                    My Classes
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
                      onClick={() => setActiveFilter("current")}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                        activeFilter === "current"
                          ? "text-white bg-purple-600"
                          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600"
                      }`}
                    >
                      Current
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
                  </div>
                </div>
              </div>

              {/* Classes Grid */}
              <div className="p-6">
                {filteredCourses.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No classes found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      {globalTermId ? "No classes found for the selected term." : "You haven't added any classes yet."}
                    </p>
                    <button
                      onClick={openAddClassModal}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Add Your First Class</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredCourses.map((course, index) => {
                      // Cycle through gradient colors
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
                      const gradient = gradients[index % gradients.length];

                      // Format grade display
                      const gradeDisplay = course.averageGrade
                        ? `${course.averageGrade >= 90 ? 'A' : course.averageGrade >= 80 ? 'B' : course.averageGrade >= 70 ? 'C' : course.averageGrade >= 60 ? 'D' : 'F'} (${course.averageGrade}%)`
                        : 'No Grade';

                      const gradeColor = course.averageGrade
                        ? course.averageGrade >= 90 ? 'text-green-600 dark:text-green-400'
                        : course.averageGrade >= 80 ? 'text-blue-600 dark:text-blue-400'
                        : course.averageGrade >= 70 ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-400';

                      return (
                        <Link
                          key={course._id}
                          to={`/app/v2/classes/${course._id}`}
                          className="block bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]"
                        >
                          <div className={`h-20 bg-gradient-to-r ${gradient}`}></div>
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{course.title}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{course.code}</p>
                              </div>
                              <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                                {course.creditHours} Credit{course.creditHours !== 1 ? 's' : ''}
                              </span>
                            </div>

                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {course.instructor}
                              </div>
                              {course.meetingSchedule && (
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {course.meetingSchedule}
                                </div>
                              )}
                              {course.deliveryFormat === 'virtual' && (
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  Virtual ({course.deliveryMode || 'synchronous'})
                                </div>
                              )}
                              {!course.deliveryFormat && course.room && course.building && (
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {course.building} {course.room}
                                </div>
                              )}
                              {course.deliveryFormat === 'in-person' && course.room && course.building && (
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {course.building} {course.room}
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Current Grade</span>
                                <span className={`text-sm font-medium ${gradeColor}`}>{gradeDisplay}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
