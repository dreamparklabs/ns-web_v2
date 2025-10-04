import React from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import DashboardWidget from './DashboardWidget';
import { useNavigate } from 'react-router';

interface ProgressData {
  currentGPA: number;
  targetGPA: number;
  completedAssignments: number;
  totalAssignments: number;
  completedCredits: number;
  totalCredits: number;
  weeklyProgress: {
    week: string;
    gpa: number;
    assignments: number;
  }[];
}

export default function ProgressTrackerWidget() {
  // This will need to be implemented in Convex
  const progressData = useQuery(api.users.getProgressData) as ProgressData | undefined;
  const navigate = useNavigate();

  const navigateToAnalytics = () => {
    navigate('/app/v2/analytics');
  };

  const data = progressData;

  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.7) return 'text-green-600 dark:text-green-400';
    if (gpa >= 3.0) return 'text-blue-600 dark:text-blue-400';
    if (gpa >= 2.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-purple-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const assignmentProgress = data ? (data.totalAssignments > 0 ? (data.completedAssignments / data.totalAssignments) * 100 : 0) : 0;
  const creditProgress = data ? (data.totalCredits > 0 ? (data.completedCredits / data.totalCredits) * 100 : 0) : 0;
  const gpaProgress = data ? (data.targetGPA > 0 ? (data.currentGPA / data.targetGPA) * 100 : 0) : 0;

  return (
    <DashboardWidget
      title="Progress"
      headerAction={
                <button
                  onClick={navigateToAnalytics}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-2 py-1 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 font-semibold"
                >
                  Analytics
                </button>
      }
    >
      {data ? (
        <div className="h-full flex flex-col space-y-2">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-base md:text-lg xl:text-xl 2xl:text-2xl font-bold text-gray-900 dark:text-white">
                <span className={getGPAColor(data.currentGPA)}>{data.currentGPA}</span>
                <span className="text-xs md:text-sm xl:text-base text-gray-500 dark:text-gray-400">/{data.targetGPA}</span>
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">GPA</p>
            </div>

          <div className="text-center">
                    <p className="text-base md:text-lg xl:text-xl 2xl:text-2xl font-bold text-gray-900 dark:text-white">
                      {data.completedAssignments}<span className="text-xs md:text-sm xl:text-base text-gray-500 dark:text-gray-400">/{data.totalAssignments}</span>
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Assignments</p>
          </div>

          <div className="text-center">
            <p className="text-base md:text-lg xl:text-xl 2xl:text-2xl font-bold text-gray-900 dark:text-white">
              {data.completedCredits}<span className="text-xs md:text-sm xl:text-base text-gray-500 dark:text-gray-400">/{data.totalCredits}</span>
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Credits</p>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-1.5">
          {/* GPA Progress */}
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">GPA Goal</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{isNaN(gpaProgress) ? '0' : gpaProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(gpaProgress)}`}
                style={{ width: `${Math.min(isNaN(gpaProgress) ? 0 : gpaProgress, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Assignment Progress */}
          <div>
            <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Assignments</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{isNaN(assignmentProgress) ? '0' : assignmentProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(assignmentProgress)}`}
                style={{ width: `${Math.min(isNaN(assignmentProgress) ? 0 : assignmentProgress, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Credit Progress */}
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Credits</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{isNaN(creditProgress) ? '0' : creditProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(creditProgress)}`}
                style={{ width: `${Math.min(isNaN(creditProgress) ? 0 : creditProgress, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Weekly Trend - Flex grow to fill remaining space */}
        <div className="flex-1 pt-2 border-t border-gray-200 dark:border-gray-700 min-h-0 flex flex-col">
          <h5 className="text-xs font-medium text-gray-900 dark:text-white mb-2 flex-shrink-0">Weekly Trend</h5>
          <div className="flex-1 flex flex-col justify-end min-h-0">
            <div className="flex items-end justify-between space-x-1 h-16">
              {data.weeklyProgress.map((week, index) => {
                const height = (week.gpa / 4.0) * 100; // Assuming 4.0 scale
                return (
                  <div key={week.week} className="flex-1 flex flex-col items-center h-full justify-end">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t relative mb-1" style={{ height: '32px' }}>
                      <div
                        className="bg-purple-500 rounded-t transition-all duration-300 absolute bottom-0 w-full"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      ></div>
                    </div>
                    <div className="text-center flex-shrink-0">
                      <p className="text-[9px] text-gray-500 dark:text-gray-400">{week.week}</p>
                      <p className="text-[9px] font-medium text-gray-900 dark:text-white">{week.gpa}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">No progress data available</p>
          </div>
        </div>
      )}
    </DashboardWidget>
  );
}
