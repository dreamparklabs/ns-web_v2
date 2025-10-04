import React from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import DashboardWidget from './DashboardWidget';
import { useNavigate, useLocation } from 'react-router';

interface Assignment {
  _id: string;
  title: string;
  dueAt: number;
  courseId: string;
  courseCode?: string;
  status: string;
  priority?: 'high' | 'medium' | 'low';
}

export default function UpcomingDeadlinesWidget() {
  // This will need to be implemented in Convex
  const upcomingAssignments = useQuery(api.assignments.getUpcomingDeadlines) as Assignment[] | undefined;
  const navigate = useNavigate();
  const location = useLocation();

  const openAssignmentModal = (assignmentId: string) => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('edit-assignment', assignmentId);
    const searchString = newSearchParams.toString();
    navigate(`${location.pathname}${searchString ? `?${searchString}` : ''}`);
  };

  const navigateToTasks = () => {
    navigate('/app/v2/tasks');
  };

  const getDaysUntilDue = (dueDate: number) => {
    const now = Date.now();
    const diffInMs = dueDate - now;
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    return diffInDays;
  };

  const getPriorityInfo = (daysUntil: number) => {
    if (daysUntil <= 1) {
      return {
        priority: 'high' as const,
        color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        textColor: 'text-red-600 dark:text-red-400',
        badge: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      };
    } else if (daysUntil <= 3) {
      return {
        priority: 'medium' as const,
        color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        textColor: 'text-yellow-600 dark:text-yellow-400',
        badge: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      };
    } else {
      return {
        priority: 'low' as const,
        color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        textColor: 'text-green-600 dark:text-green-400',
        badge: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      };
    }
  };

  const formatDueDate = (daysUntil: number) => {
    if (daysUntil === 0) return 'Due Today';
    if (daysUntil === 1) return 'Due Tomorrow';
    if (daysUntil < 0) return `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) > 1 ? 's' : ''}`;
    return `Due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;
  };

  return (
    <DashboardWidget
      title="Deadlines"
      headerAction={
        <button
          onClick={navigateToTasks}
          className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-2 py-1 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 font-semibold"
        >
          View Assignments
        </button>
      }
    >
      <div className="space-y-2">
        {upcomingAssignments && upcomingAssignments.length > 0 ? (
          upcomingAssignments.slice(0, 5).map((assignment) => {
            const daysUntil = getDaysUntilDue(assignment.dueAt);
            const priorityInfo = getPriorityInfo(daysUntil);

            return (
              <div
                key={assignment._id}
                onClick={() => openAssignmentModal(assignment._id)}
                className={`p-2 rounded border ${priorityInfo.color} cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-xs truncate">
                      {assignment.title}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      {assignment.courseCode && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          {assignment.courseCode}
                        </span>
                      )}
                      <span className={`text-[10px] ${priorityInfo.textColor}`}>
                        {formatDueDate(daysUntil)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-1 py-0.5 text-[10px] font-medium rounded ${priorityInfo.badge}`}>
                      {priorityInfo.priority.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming deadlines</p>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
}
