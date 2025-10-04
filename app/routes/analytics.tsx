import type { Route } from "./+types/analytics";
import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useSearchParams } from "react-router";
import { useGlobalTerm } from "../hooks/useGlobalTerm";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Progress - Northstar" },
    { name: "description", content: "Track your academic progress and productivity trends" },
  ];
}

export default function Analytics() {
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const { globalTermId, isFilteringByTerm } = useGlobalTerm();
  
  // Get period from URL params, default to "week"
  const urlPeriod = searchParams.get("period");
  const validPeriods: ('week' | 'month' | 'semester' | 'year')[] = ["week", "month", "semester", "year"];
  const selectedPeriod: 'week' | 'month' | 'semester' | 'year' = validPeriods.includes(urlPeriod as any) 
    ? (urlPeriod as 'week' | 'month' | 'semester' | 'year') 
    : "week";
  
  // Function to update period and URL
  const setSelectedPeriod = (period: 'week' | 'month' | 'semester' | 'year') => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (period === "week") {
      // Remove period param when showing week view (default)
      newSearchParams.delete("period");
    } else {
      newSearchParams.set("period", period);
    }
    setSearchParams(newSearchParams);
  };

  // Get user data for analytics
  const userStats = useQuery(api.grades.getUserStats);
  const assignments = useQuery(
    api.assignments.getUserAssignments,
    user?.id ? { clerkUserId: user.id } : "skip"
  );
  const courseGrades = useQuery(api.grades.getCourseGrades, {});

  // Calculate analytics data
  const calculateAnalytics = () => {
    if (!assignments || !courseGrades) return null;

    // Get time range based on selected period
    const now = new Date();
    const getTimeRange = () => {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      
      switch (selectedPeriod) {
        case 'week':
          const startOfWeek = new Date(startOfDay);
          startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay()); // Start of current week (Sunday)
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          return { start: startOfWeek.getTime(), end: endOfWeek.getTime() };
          
        case 'month':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          endOfMonth.setHours(23, 59, 59, 999);
          return { start: startOfMonth.getTime(), end: endOfMonth.getTime() };
          
        case 'semester':
          // Approximate semester: 4 months back
          const startOfSemester = new Date(now.getFullYear(), now.getMonth() - 4, 1);
          const endOfSemester = new Date(now);
          endOfSemester.setHours(23, 59, 59, 999);
          return { start: startOfSemester.getTime(), end: endOfSemester.getTime() };
          
        case 'year':
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const endOfYear = new Date(now.getFullYear(), 11, 31);
          endOfYear.setHours(23, 59, 59, 999);
          return { start: startOfYear.getTime(), end: endOfYear.getTime() };
          
        default:
          return { start: 0, end: now.getTime() };
      }
    };

    const timeRange = getTimeRange();
    
    // Filter assignments based on selected time period
    const filteredAssignments = assignments.filter(a => {
      const assignmentDate = new Date(a.dueAt).getTime();
      return assignmentDate >= timeRange.start && assignmentDate <= timeRange.end;
    });

    const completedAssignments = filteredAssignments.filter(a => a.status === 'completed');
    const overdue = filteredAssignments.filter(a => new Date(a.dueAt) < new Date() && a.status !== 'completed');
    const upcoming = assignments.filter(a => {
      const dueDate = new Date(a.dueAt);
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dueDate >= now && dueDate <= weekFromNow && a.status !== 'completed';
    });

    // Grade distribution
    const gradeDistribution = courseGrades.reduce((acc, course) => {
      const grade = course.letterGrade;
      if (grade.startsWith('A')) acc.A++;
      else if (grade.startsWith('B')) acc.B++;
      else if (grade.startsWith('C')) acc.C++;
      else if (grade.startsWith('D')) acc.D++;
      else if (grade.startsWith('F')) acc.F++;
      return acc;
    }, { A: 0, B: 0, C: 0, D: 0, F: 0 });

    // Generate productivity data based on selected period
    const generateProductivityData = () => {
      if (selectedPeriod === 'week') {
        // Weekly view: show daily breakdown
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days.map(day => {
          const dayIndex = days.indexOf(day);
          const dayAssignments = filteredAssignments.filter(a => {
            const assignmentDay = new Date(a.dueAt).getDay();
            return assignmentDay === dayIndex;
          });
          const completed = dayAssignments.filter(a => a.status === 'completed').length;
          return { day, completed, total: dayAssignments.length };
        });
      } else if (selectedPeriod === 'month') {
        // Monthly view: show weekly breakdown
        const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        return weeks.map((week, index) => {
          const weekStart = new Date(now.getFullYear(), now.getMonth(), index * 7 + 1);
          const weekEnd = new Date(now.getFullYear(), now.getMonth(), (index + 1) * 7);
          const weekAssignments = filteredAssignments.filter(a => {
            const assignmentDate = new Date(a.dueAt);
            return assignmentDate >= weekStart && assignmentDate <= weekEnd;
          });
          const completed = weekAssignments.filter(a => a.status === 'completed').length;
          return { day: week, completed, total: weekAssignments.length };
        });
      } else if (selectedPeriod === 'semester') {
        // Semester view: show monthly breakdown
        const months = [];
        for (let i = 4; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
          
          const monthAssignments = filteredAssignments.filter(a => {
            const assignmentDate = new Date(a.dueAt);
            return assignmentDate >= monthStart && assignmentDate <= monthEnd;
          });
          const completed = monthAssignments.filter(a => a.status === 'completed').length;
          months.push({ day: monthName, completed, total: monthAssignments.length });
        }
        return months;
      } else {
        // Year view: show quarterly breakdown
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        return quarters.map((quarter, index) => {
          const quarterStart = new Date(now.getFullYear(), index * 3, 1);
          const quarterEnd = new Date(now.getFullYear(), (index + 1) * 3, 0);
          const quarterAssignments = filteredAssignments.filter(a => {
            const assignmentDate = new Date(a.dueAt);
            return assignmentDate >= quarterStart && assignmentDate <= quarterEnd;
          });
          const completed = quarterAssignments.filter(a => a.status === 'completed').length;
          return { day: quarter, completed, total: quarterAssignments.length };
        });
      }
    };

    const productivityData = generateProductivityData();

    return {
      completionRate: filteredAssignments.length > 0 ? Math.round((completedAssignments.length / filteredAssignments.length) * 100) : 0,
      totalAssignments: filteredAssignments.length,
      completedAssignments: completedAssignments.length,
      overdueCount: overdue.length,
      upcomingCount: upcoming.length,
      averageGrade: courseGrades.length > 0 ? 
        (courseGrades.reduce((sum, course) => sum + course.averageGrade, 0) / courseGrades.length).toFixed(1) : '0.0',
      gpa: userStats?.gpa || 0,
      gradeDistribution,
      productivityData,
      selectedPeriod
    };
  };

  const analytics = calculateAnalytics();

  const StatCard = ({ title, value, subtitle, icon, color = 'purple' }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ReactNode;
    color?: 'purple' | 'blue' | 'green' | 'yellow' | 'red';
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {value}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {subtitle}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          color === 'purple' ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400' :
          color === 'blue' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' :
          color === 'green' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' :
          color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400' :
          'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
        }`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col space-y-4 max-w-none mx-auto px-4 xl:px-6 2xl:px-8">
      {/* Header */}
      <div className="flex-shrink-0 pt-1 pb-2">
        <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Progress
                </h1>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1">
                  Track your academic progress and productivity trends for the current {selectedPeriod}.
                </p>
              </div>
          
              {/* Time Period Toggle */}
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-full">
                {validPeriods.map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-2 text-sm font-medium rounded-full transition-all duration-200 capitalize ${
                  selectedPeriod === period
                    ? "text-white bg-purple-600"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600"
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>


          {/* Progress Content */}
      {analytics ? (
        <div className="flex-1 space-y-6 overflow-y-auto">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Completion Rate"
              value={`${analytics.completionRate}%`}
              subtitle={`${selectedPeriod} completion rate`}
              color="green"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Current GPA"
              value={analytics.gpa.toFixed(2)}
              subtitle="Overall performance"
              color="purple"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
            <StatCard
              title="Overdue Items"
              value={analytics.overdueCount}
              subtitle={`From ${selectedPeriod} period`}
              color="red"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Upcoming"
              value={analytics.upcomingCount}
              subtitle="Due this week"
              color="yellow"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          </div>

            {/* Charts and Detailed Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Productivity Trends */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {selectedPeriod === 'week' ? 'Daily' : 
                 selectedPeriod === 'month' ? 'Weekly' : 
                 selectedPeriod === 'semester' ? 'Monthly' : 'Quarterly'} Productivity
              </h3>
              <div className="space-y-4">
                {analytics.productivityData.map((day) => {
                  const percentage = day.total > 0 ? (day.completed / day.total) * 100 : 0;
                  const displayPercentage = Math.min(Math.max(percentage, 0), 100); // Ensure 0-100 range
                  
                  return (
                    <div key={day.day} className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-12">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {day.day}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 min-w-0">
                          <div
                            className="bg-purple-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                            style={{ 
                              width: `${displayPercentage}%`,
                              minWidth: day.total > 0 && day.completed > 0 ? '2%' : '0%' // Ensure visible bar for any completion
                            }}
                          ></div>
                        </div>
                        <div className="flex-shrink-0 w-12 text-right">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {day.completed}/{day.total}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {analytics.productivityData.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No productivity data available</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Complete assignments to see your productivity trends
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Grade Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Grade Distribution
              </h3>
              <div className="space-y-4">
                {Object.entries(analytics.gradeDistribution).map(([grade, count]) => {
                  const total = Object.values(analytics.gradeDistribution).reduce((sum, c) => sum + c, 0);
                  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                  const colors = {
                    A: 'bg-green-600',
                    B: 'bg-blue-600',
                    C: 'bg-yellow-600',
                    D: 'bg-orange-600',
                    F: 'bg-red-600'
                  };
                  
                  return (
                    <div key={grade} className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-16">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {grade} grades
                        </span>
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 min-w-0">
                          <div
                            className={`${colors[grade as keyof typeof colors]} h-2.5 rounded-full transition-all duration-500 ease-out`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="flex-shrink-0 w-10 text-right">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Assignment Status Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Assignment Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {analytics.completedAssignments}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {analytics.totalAssignments - analytics.completedAssignments - analytics.overdueCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Overdue</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {analytics.overdueCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Performance Insights
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {selectedPeriod === 'week' ? 'Daily' : 
                       selectedPeriod === 'month' ? 'Weekly' : 
                       selectedPeriod === 'semester' ? 'Monthly' : 'Quarterly'} Pattern
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {(() => {
                      const bestPeriod = analytics.productivityData.reduce((best, current) => {
                        const bestRate = best.total > 0 ? (best.completed / best.total) * 100 : 0;
                        const currentRate = current.total > 0 ? (current.completed / current.total) * 100 : 0;
                        return currentRate > bestRate ? current : best;
                      });
                      const bestRate = bestPeriod.total > 0 ? Math.round((bestPeriod.completed / bestPeriod.total) * 100) : 0;
                      return `Your most productive period is ${bestPeriod.day} with a ${bestRate}% completion rate.`;
                    })()}
                  </p>
                </div>
                
                <div className="p-3 bg-green-50 dark:bg-green-900 dark:bg-opacity-30 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Strong Performance
                    </span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Your current GPA of {analytics.gpa.toFixed(2)} shows consistent academic performance.
                  </p>
                </div>
                
                {analytics.overdueCount > 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-900 dark:bg-opacity-30 rounded-lg border border-red-200 dark:border-red-700">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">
                        Attention Needed
                      </span>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      You have {analytics.overdueCount} overdue assignment{analytics.overdueCount !== 1 ? 's' : ''} that need immediate attention.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      )}
    </div>
  );
}
