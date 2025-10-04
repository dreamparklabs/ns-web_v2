import { useUser } from "@clerk/clerk-react";
import type { Route } from "./+types/dashboard";
import { useGlobalTerm } from "../hooks/useGlobalTerm";
import { useSearchParams } from "react-router";
import RecentGradesWidget from "../components/dashboard/RecentGradesWidget";
import CalendarSnapshotWidget from "../components/dashboard/CalendarSnapshotWidget";
import UpcomingDeadlinesWidget from "../components/dashboard/UpcomingDeadlinesWidget";
import RecentFilesWidget from "../components/dashboard/RecentFilesWidget";
import FocusTimerWidget from "../components/dashboard/FocusTimerWidget";
import WeekOverviewWidget from "../components/dashboard/WeekOverviewWidget";
import ProgressTrackerWidget from "../components/dashboard/ProgressTrackerWidget";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard - Northstar" },
    { name: "description", content: "Your personalized academic dashboard with widgets" },
  ];
}

export default function Dashboard() {
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const { globalTermId, isFilteringByTerm } = useGlobalTerm();

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col space-y-4 max-w-none mx-auto px-4 xl:px-6 2xl:px-8">
            {/* Header */}
            <div className="flex-shrink-0 pt-1 pb-2">
              <h1 className="text-xl md:text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                Dashboard
              </h1>
              <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 mt-1">
                Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! Here's your academic overview.
              </p>
            </div>


            {/* Widget Grid - Dynamic Viewport-based */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-3 md:gap-4 xl:gap-5 2xl:gap-6 min-h-0">
              {/* Row 1: Schedule & Tools - Dynamic Heights */}
              <div className="col-span-1 md:col-span-4 lg:col-span-6 h-[40vh] md:h-[35vh] lg:h-[45vh] xl:h-[40vh] 2xl:h-[35vh]">
                <WeekOverviewWidget />
              </div>
              <div className="col-span-1 md:col-span-2 lg:col-span-3 h-[40vh] md:h-[35vh] lg:h-[45vh] xl:h-[40vh] 2xl:h-[35vh]">
                <FocusTimerWidget />
              </div>
              <div className="col-span-1 md:col-span-2 lg:col-span-3 h-[40vh] md:h-[35vh] lg:h-[45vh] xl:h-[40vh] 2xl:h-[35vh]">
                <CalendarSnapshotWidget />
              </div>
              
              {/* Row 2: Academic Performance */}
              <div className="col-span-1 md:col-span-2 lg:col-span-4 h-[35vh] md:h-[30vh] lg:h-[35vh] xl:h-[32vh] 2xl:h-[30vh]">
                <RecentGradesWidget />
              </div>
              <div className="col-span-1 md:col-span-2 lg:col-span-4 h-[35vh] md:h-[30vh] lg:h-[35vh] xl:h-[32vh] 2xl:h-[30vh]">
                <UpcomingDeadlinesWidget />
              </div>
              
              {/* Progress - Spans both Row 2 and Row 3 height */}
              <div className="col-span-1 md:col-span-4 lg:col-span-4 row-span-2 h-[79vh] md:h-[70vh] lg:h-[69vh] xl:h-[72vh] 2xl:h-[74vh]">
                <ProgressTrackerWidget />
              </div>
              
              {/* Row 3: Files - Expanded to fill remaining space */}
              <div className="col-span-1 md:col-span-4 lg:col-span-8 h-[40vh] md:h-[36vh] lg:h-[30vh] xl:h-[36vh] 2xl:h-[40vh]">
                <RecentFilesWidget />
              </div>
            </div>
    </div>
  );
}
