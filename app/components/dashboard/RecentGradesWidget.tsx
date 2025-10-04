import React from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import DashboardWidget from './DashboardWidget';
import { useNavigate, useLocation } from 'react-router';

interface Grade {
  _id: string;
  title: string;
  grade: number;
  courseCode: string;
  dueAt: number;
  status: string;
}

export default function RecentGradesWidget() {
  // This will need to be implemented in Convex
  const recentGrades = useQuery(api.assignments.getRecentGrades) as Grade[] | undefined;
  const navigate = useNavigate();
  const location = useLocation();

  const openAssignmentModal = (assignmentId: string) => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('edit-assignment', assignmentId);
    const searchString = newSearchParams.toString();
    navigate(`${location.pathname}${searchString ? `?${searchString}` : ''}`);
  };

  const navigateToGrades = () => {
    navigate('/app/v2/grades');
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
    if (grade >= 80) return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900';
    if (grade >= 70) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900';
    return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900';
  };

  const getLetterGrade = (grade: number) => {
    if (grade >= 97) return 'A+';
    if (grade >= 93) return 'A';
    if (grade >= 90) return 'A-';
    if (grade >= 87) return 'B+';
    if (grade >= 83) return 'B';
    if (grade >= 80) return 'B-';
    if (grade >= 77) return 'C+';
    if (grade >= 73) return 'C';
    if (grade >= 70) return 'C-';
    if (grade >= 67) return 'D+';
    if (grade >= 63) return 'D';
    if (grade >= 60) return 'D-';
    return 'F';
  };

  return (
    <DashboardWidget
      title="Recent Grades"
      headerAction={
        <button
          onClick={navigateToGrades}
          className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-2 py-1 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 font-semibold"
        >
          View All
        </button>
      }
    >
      <div className="space-y-2">
        {recentGrades && recentGrades.length > 0 ? (
          recentGrades.slice(0, 4).map((grade) => (
            <div
              key={grade._id}
              onClick={() => openAssignmentModal(grade._id)}
              className="flex items-center justify-between p-2 rounded border border-gray-200 dark:border-slate-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white text-xs truncate">
                  {grade.title}
                </p>
                <p className="text-[10px] text-gray-600 dark:text-gray-300">
                  {grade.courseCode}
                </p>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-semibold ${getGradeColor(grade.grade)}`}>
                {grade.grade.toFixed(2)}%
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">No recent grades</p>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
}
