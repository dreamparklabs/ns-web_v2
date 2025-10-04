import type { Route } from "./+types/calendar";
import { useState } from "react";
import * as React from "react";
import { useUser } from "@clerk/clerk-react";
import { useSearchParams } from "react-router";
import { useGlobalTerm } from "../hooks/useGlobalTerm";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { EventDetailModal } from "../components/EventDetailModal";

// Extend window interface to prevent excessive logging
declare global {
  interface Window {
    _calendarDataWarningLogged?: boolean;
  }
}

type CalendarView = 'month' | 'week' | 'day';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Calendar - Northstar" },
    { name: "description", content: "View and manage your academic calendar and schedule" },
  ];
}

export default function Calendar() {
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const { globalTermId } = useGlobalTerm();

  // Get view from URL params, default to "month"
  const urlView = searchParams.get("view");
  const validViews: CalendarView[] = ["month", "week", "day"];
  const currentView: CalendarView = validViews.includes(urlView as CalendarView)
    ? (urlView as CalendarView)
    : "month";

  // Get date from URL params if in day view
  const urlDate = searchParams.get("date");
  const [currentDate, setCurrentDate] = useState(() => {
    if (urlDate && currentView === "day") {
      const parsedDate = new Date(urlDate);
      return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    }
    return new Date();
  });

  // Function to update view and URL
  const setCurrentView = (view: CalendarView, date?: Date) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (view === "month") {
      // Remove view and date params when showing month view (default)
      newSearchParams.delete("view");
      newSearchParams.delete("date");
    } else {
      newSearchParams.set("view", view);
      if (view === "day" && date) {
        newSearchParams.set("date", date.toISOString().split('T')[0]);
      } else if (view !== "day") {
        newSearchParams.delete("date");
      }
    }
    setSearchParams(newSearchParams);
    if (date) setCurrentDate(date);
  };

  // Function to handle date click
  const handleDateClick = (date: Date) => {
    setCurrentView("day", date);
  };

  // Function to handle event click
  const handleEventClick = (event: any, eventType: 'class' | 'assignment') => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (eventType === 'class') {
      newSearchParams.set('event-detail', event._id);
      newSearchParams.set('event-type', 'class');
    } else {
      newSearchParams.set('event-detail', event._id);
      newSearchParams.set('event-type', 'assignment');
    }
    setSearchParams(newSearchParams);
  };

  // Check if event detail modal should be open
  const eventDetailId = searchParams.get('event-detail');
  const eventType = searchParams.get('event-type') as 'class' | 'assignment';

  // Function to close event detail modal
  const closeEventDetail = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('event-detail');
    newSearchParams.delete('event-type');
    setSearchParams(newSearchParams);
  };

  // Get assignments and courses data
  const assignments = useQuery(
    api.assignments.getUserAssignments,
    user?.id ? { clerkUserId: user.id } : "skip"
  );
  
  const courses = useQuery(
    api.courses.getUserCoursesByTerm,
    user?.id ? { 
      clerkUserId: user.id,
      termId: globalTermId ? globalTermId as any : undefined
    } : "skip"
  );
  
  const terms = useQuery(api.terms.getUserTermsByClerkId, 
    user?.id ? { clerkUserId: user.id } : "skip"
  );


  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDateObj = new Date(startDate);
    
    // Calculate how many weeks we need to show the entire current month
    let weeksNeeded = 5; // Start with 5 weeks minimum
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const firstDayWeekday = firstDay.getDay();
    
    // If the month has 31 days and starts on Saturday, or has 30 days and starts on Friday/Saturday,
    // we need 6 weeks
    if ((lastDayOfMonth === 31 && firstDayWeekday >= 5) || 
        (lastDayOfMonth === 30 && firstDayWeekday === 6)) {
      weeksNeeded = 6;
    }
    
    for (let i = 0; i < weeksNeeded * 7; i++) {
      days.push(new Date(currentDateObj));
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const today = new Date();
  const numberOfWeeks = Math.ceil(calendarDays.length / 7);
  

  // Helper function to parse time string to hours and minutes
  const parseTime = (timeStr: string): { hours: number; minutes: number } => {
    if (!timeStr) return { hours: 0, minutes: 0 };
    
    // Try 12-hour format first
    const match12 = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match12) {
      let hours = parseInt(match12[1]);
      const minutes = parseInt(match12[2]);
      const period = match12[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return { hours, minutes };
    }
    
    // Try 24-hour format
    const match24 = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match24) {
      const hours = parseInt(match24[1]);
      const minutes = parseInt(match24[2]);
      return { hours, minutes };
    }
    
    return { hours: 0, minutes: 0 };
  };

  // Helper function to convert 24-hour time to 12-hour format
  const formatTimeTo12Hour = (timeStr: string): string => {
    if (!timeStr) return '';
    
    // Check if already in 12-hour format
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      return timeStr;
    }
    
    // Parse 24-hour format (e.g., "13:50" or "12:35")
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return timeStr;
    
    let hours = parseInt(match[1]);
    const minutes = match[2];
    
    const period = hours >= 12 ? 'PM' : 'AM';
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    
    return `${hours}:${minutes} ${period}`;
  };

  // Get classes for a specific date
  const getClassesForDate = (date: Date) => {
    if (!courses || !terms) {
      // Only log once to avoid spam
      if (!window._calendarDataWarningLogged) {
        console.log('No courses or terms data available');
        window._calendarDataWarningLogged = true;
      }
      return [];
    }
    
    const dayOfWeek = date.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];
    
    // Also check for common abbreviations
    const dayAbbreviations: { [key: string]: string[] } = {
      'Sunday': ['Sunday', 'Su', 'Sun'],
      'Monday': ['Monday', 'M', 'Mon'],
      'Tuesday': ['Tuesday', 'T', 'Tu', 'Tue'],
      'Wednesday': ['Wednesday', 'W', 'Wed'],
      'Thursday': ['Thursday', 'R', 'Th', 'Thu'], // R is common for Thursday
      'Friday': ['Friday', 'F', 'Fri'],
      'Saturday': ['Saturday', 'S', 'Sat']
    };
    
    const filteredCourses = courses.filter(course => {
      // Skip virtual asynchronous courses (they don't have fixed meeting times)
      if (course.deliveryFormat === 'virtual' && course.deliveryMode === 'asynchronous') {
        return false;
      }
      
      // Check if course has meeting days
      if (!course.meetingDays || course.meetingDays.length === 0) {
        return false;
      }
      
      // Check if any of the meeting days match current day
      const dayMatches = course.meetingDays.some(meetingDay => {
        // Check exact match first
        if (meetingDay === dayName) return true;
        
        // Check abbreviations
        const possibleAbbrevs = dayAbbreviations[dayName] || [];
        if (possibleAbbrevs.includes(meetingDay)) return true;
        
        // Check if the meetingDay contains the day abbreviation
        // For example, "TR" contains "T" (Tuesday) and "R" (Thursday)
        const dayAbbrev = dayName === 'Tuesday' ? 'T' : 
                         dayName === 'Thursday' ? 'R' : 
                         dayName === 'Monday' ? 'M' : 
                         dayName === 'Wednesday' ? 'W' : 
                         dayName === 'Friday' ? 'F' : 
                         dayName === 'Saturday' ? 'S' : 
                         dayName === 'Sunday' ? 'U' : '';
        
        if (dayAbbrev && meetingDay.includes(dayAbbrev)) {
          // Special case: make sure 'T' only matches Tuesday, not Thursday
          if (dayAbbrev === 'T' && meetingDay.includes('R')) {
            // This is a "TR" string, T should only match if it's the first T
            return meetingDay.indexOf('T') !== -1;
          }
          return true;
        }
        
        return false;
      });
      
      if (!dayMatches) {
        return false;
      }
      
      // Check if date falls within the term dates
      const term = terms.find(t => t._id === course.termId);
      if (!term) {
        return false;
      }
      
      const termStart = new Date(term.startDate);
      const termEnd = new Date(term.endDate);
      const currentDate = new Date(date);
      
      // Reset times to compare dates only
      termStart.setHours(0, 0, 0, 0);
      termEnd.setHours(23, 59, 59, 999);
      currentDate.setHours(12, 0, 0, 0);
      
      return currentDate >= termStart && currentDate <= termEnd;
    }).map(course => ({
      ...course,
      type: 'class' as const,
      startTime: course.meetingStart,
      endTime: course.meetingEnd
    }));
    
    return filteredCourses;
  };

  // Get assignments for a specific date
  const getAssignmentsForDate = (date: Date) => {
    if (!assignments) return [];
    return assignments.filter(assignment => {
      const dueDate = new Date(assignment.dueAt);
      return dueDate.toDateString() === date.toDateString();
    });
  };

  // Get all items (assignments + classes) for a specific date
  const getItemsForDate = (date: Date) => {
    const dayAssignments = getAssignmentsForDate(date);
    const dayClasses = getClassesForDate(date);
    return { assignments: dayAssignments, classes: dayClasses };
  };

  // Get class color based on index (matching classes page)
  const getClassColor = (courseIndex: number) => {
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
    return gradients[courseIndex % gradients.length];
  };

  // Get class color for calendar items (solid colors for small items)
  const getClassCalendarColor = (courseIndex: number) => {
    const colors = [
      "bg-purple-500",
      "bg-green-500",
      "bg-blue-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-yellow-500",
      "bg-emerald-500"
    ];
    return colors[courseIndex % colors.length];
  };

  // Get all items sorted by time for display
  const getAllItemsSortedByTime = (date: Date) => {
    const { assignments, classes } = getItemsForDate(date);

    // Convert all items to a common format with sortable time
    const allItems = [
      ...classes.map((classItem, index) => ({
        ...classItem,
        itemType: 'class' as const,
        sortTime: parseTime(classItem.startTime || ''),
        displayTime: classItem.startTime || '',
        colorIndex: courses?.findIndex(c => c._id === classItem._id) || index
      })),
      ...assignments.map(assignment => ({
        ...assignment,
        itemType: 'assignment' as const,
        sortTime: (() => {
          const dueDate = new Date(assignment.dueAt);
          return { hours: dueDate.getHours(), minutes: dueDate.getMinutes() };
        })(),
        displayTime: new Date(assignment.dueAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      }))
    ];

    // Sort all items by time
    return allItems.sort((a, b) =>
      a.sortTime.hours * 60 + a.sortTime.minutes - (b.sortTime.hours * 60 + b.sortTime.minutes)
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentView(currentView, newDate);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentView(currentView, newDate);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentView(currentView, newDate);
  };

  // Generate week view days
  const generateWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(currentDate.getDate() - day);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push(date);
    }
    return weekDays;
  };

  const weekDays = generateWeekDays();

  // Get week range for display
  const getWeekRange = () => {
    const firstDay = weekDays[0];
    const lastDay = weekDays[6];
    const firstMonth = monthNames[firstDay.getMonth()];
    const lastMonth = monthNames[lastDay.getMonth()];
    
    if (firstDay.getMonth() === lastDay.getMonth()) {
      return `${firstMonth} ${firstDay.getDate()} - ${lastDay.getDate()}, ${firstDay.getFullYear()}`;
    } else {
      return `${firstMonth} ${firstDay.getDate()} - ${lastMonth} ${lastDay.getDate()}, ${firstDay.getFullYear()}`;
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Calculate calendar statistics
  const calendarStats = React.useMemo(() => {
    if (!assignments || !courses) return { upcomingAssignments: 0, classesToday: 0, overdueAssignments: 0, totalEvents: 0 };

    const today = new Date();

    // Count upcoming assignments (assignments in next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    const upcomingAssignments = assignments.filter(assignment => {
      const dueDate = new Date(assignment.dueAt);
      return dueDate >= today && dueDate <= nextWeek;
    }).length;

    // Count classes today
    const classesToday = getClassesForDate(today).length;

    // Count overdue assignments
    const overdueAssignments = assignments.filter(assignment => {
      const dueDate = new Date(assignment.dueAt);
      return dueDate < today && assignment.status !== 'completed';
    }).length;

    // Count total events for the week (classes only, assignments are separate)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    let totalEvents = 0;
    for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
      const dayClasses = getClassesForDate(new Date(d));
      totalEvents += dayClasses.length; // Only count classes as events
    }

    return { upcomingAssignments, classesToday, overdueAssignments, totalEvents };
  }, [assignments, courses]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col space-y-4 max-w-none mx-auto px-4 xl:px-6 2xl:px-8">
      {/* Event Detail Modal */}
      <EventDetailModal
        eventId={eventDetailId}
        eventType={eventType}
        isOpen={!!eventDetailId}
        onClose={closeEventDetail}
      />

      {/* Header */}
      <div className="flex-shrink-0 pt-1 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
              Calendar
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1">
              View and manage your academic schedule and upcoming events.
            </p>
          </div>
          <button
            onClick={() => {
              // TODO: Implement add event functionality
              console.log('Add Event clicked');
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-semibold hover:bg-purple-700 hover:shadow-md transition-all duration-200 transform hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid - Dashboard Style with Dynamic Heights */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-3 md:gap-4 xl:gap-5 2xl:gap-6">
        {/* Row 1: Calendar Stats */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 h-[19vh] md:h-[16vh] lg:h-[19vh] xl:h-[18vh] 2xl:h-[16vh]">
          <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Classes Today</p>
                <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">{calendarStats.classesToday}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-3 h-[19vh] md:h-[16vh] lg:h-[19vh] xl:h-[18vh] 2xl:h-[16vh]">
          <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Upcoming Assignments</p>
                <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">{calendarStats.upcomingAssignments}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Next 7 days</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-3 h-[19vh] md:h-[16vh] lg:h-[19vh] xl:h-[18vh] 2xl:h-[16vh]">
          <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total Events</p>
                <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">{calendarStats.totalEvents}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">This week</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-3 h-[19vh] md:h-[16vh] lg:h-[19vh] xl:h-[18vh] 2xl:h-[16vh]">
          <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 xl:px-4 xl:py-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-caption text-gray-600 dark:text-gray-400 uppercase tracking-wide">Overdue</p>
                <p className="text-2xl xl:text-3xl font-semibold text-gray-900 dark:text-white mt-1">{calendarStats.overdueAssignments}</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">Assignments</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Calendar View */}
        <div className="col-span-1 md:col-span-4 lg:col-span-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
            {/* Calendar Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-heading">
                    {currentView === 'month'
                      ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                      : currentView === 'week'
                        ? getWeekRange()
                        : currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                    }
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (currentView === 'month') navigateMonth('prev');
                        else if (currentView === 'week') navigateWeek('prev');
                        else navigateDay('prev');
                      }}
                      className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentView(currentView, new Date())}
                      className="px-3 py-1 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900 dark:hover:bg-opacity-30 rounded-full transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        if (currentView === 'month') navigateMonth('next');
                        else if (currentView === 'week') navigateWeek('next');
                        else navigateDay('next');
                      }}
                      className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* View Toggle */}
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-full">
                  {(validViews).map((view) => (
                    <button
                      key={view}
                      onClick={() => setCurrentView(view)}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 capitalize ${
                        currentView === view
                          ? "text-white bg-purple-600"
                          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600"
                      }`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calendar Content */}
            <div className="p-6 min-h-[500px]">
              {currentView === 'month' && (
                <div className="h-full flex flex-col">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1 flex-shrink-0">
                    {dayNames.map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-1 flex-1 min-h-0" style={{ gridTemplateRows: `repeat(${numberOfWeeks}, 1fr)` }}>
                     {calendarDays.map((day, index) => {
                       const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                       const isToday = day.toDateString() === today.toDateString();
                       const allItems = getAllItemsSortedByTime(day);

                       return (
                         <div
                           key={index}
                           className={`p-3 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col overflow-hidden cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                             isCurrentMonth
                               ? 'bg-gray-50 dark:bg-gray-700'
                               : 'bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-500'
                           } ${isToday ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}`}
                           onClick={() => handleDateClick(day)}
                         >
                           <div className={`text-sm font-medium mb-1 flex-shrink-0 ${
                             isToday
                               ? 'text-purple-600 dark:text-purple-400'
                               : isCurrentMonth
                                 ? 'text-gray-900 dark:text-white'
                                 : 'text-gray-400 dark:text-gray-500'
                           }`}>
                             {day.getDate()}
                           </div>

                           {/* All items sorted by time */}
                           <div className="space-y-1 flex-1 overflow-hidden">
                             {allItems.slice(0, 2).map((item) => {
                               if (item.itemType === 'class') {
                                 const classColor = getClassCalendarColor(item.colorIndex);
                                 return (
                                   <div
                                     key={`${item._id}-${day.toDateString()}`}
                                     className={`text-xs px-2 py-1 rounded-full text-white ${classColor} truncate text-center font-medium cursor-pointer hover:opacity-80 transition-opacity`}
                                     title={`${item.code}: ${item.title} (${formatTimeTo12Hour(item.startTime || '')} - ${formatTimeTo12Hour(item.endTime || '')})`}
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       handleEventClick(item, 'class');
                                     }}
                                   >
                                     {item.code}
                                   </div>
                                 );
                               } else {
                                 const isOverdue = new Date(item.dueAt) < today && item.status !== 'completed';
                                 const isDueToday = new Date(item.dueAt).toDateString() === today.toDateString();

                                 return (
                                   <div
                                     key={item._id}
                                     className={`text-xs px-2 py-1 rounded-full text-white truncate text-center font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                                       isOverdue
                                         ? 'bg-red-500'
                                         : isDueToday
                                           ? 'bg-yellow-500'
                                           : 'bg-blue-500'
                                     }`}
                                     title={item.title}
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       handleEventClick(item, 'assignment');
                                     }}
                                   >
                                     {item.title}
                                   </div>
                                 );
                               }
                             })}

                             {/* Show "more" indicator if needed */}
                             {allItems.length > 2 && (
                               <div className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium pt-1">
                                 +{allItems.length - 2} more
                               </div>
                             )}
                           </div>
                         </div>
                       );
                     })}
                  </div>
                </div>
              )}

              {/* Week View */}
              {currentView === 'week' && (
                <div className="h-full flex flex-col">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1 flex-shrink-0">
                    {dayNames.map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Week Days */}
                  <div className="grid grid-cols-7 gap-1 flex-1 min-h-0">
                   {weekDays.map((day, index) => {
                     const isToday = day.toDateString() === today.toDateString();
                     const allItems = getAllItemsSortedByTime(day);
                     const isCurrentMonth = day.getMonth() === currentDate.getMonth();

                     return (
                       <div
                         key={index}
                         className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col overflow-hidden ${
                           isCurrentMonth
                             ? 'bg-gray-50 dark:bg-gray-700'
                             : 'bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-500'
                         } ${isToday ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}`}
                       >
                         <div className={`text-lg font-semibold mb-3 flex-shrink-0 ${
                           isToday
                             ? 'text-purple-600 dark:text-purple-400'
                             : isCurrentMonth
                               ? 'text-gray-900 dark:text-white'
                               : 'text-gray-400 dark:text-gray-500'
                         }`}>
                           {day.getDate()}
                         </div>

                         {/* All items sorted by time */}
                         <div className="space-y-2 flex-1 overflow-y-auto">
                           {allItems.map((item) => {
                             if (item.itemType === 'class') {
                               const classColor = getClassCalendarColor(item.colorIndex);
                               return (
                                 <div
                                   key={`${item._id}-${day.toDateString()}`}
                                   className={`text-sm p-2 rounded-lg text-white ${classColor}`}
                                   title={`${item.code}: ${item.title}`}
                                 >
                                   <div className="font-medium truncate">{item.code}</div>
                                   <div className="text-xs opacity-90 mt-1">
                                     {formatTimeTo12Hour(item.startTime || '')} - {formatTimeTo12Hour(item.endTime || '')}
                                   </div>
                                   {item.room && item.building && (
                                     <div className="text-xs opacity-75 mt-1">
                                       {item.building} {item.room}
                                     </div>
                                   )}
                                 </div>
                               );
                             } else {
                               const isOverdue = new Date(item.dueAt) < today && item.status !== 'completed';
                               const isDueToday = new Date(item.dueAt).toDateString() === today.toDateString();

                               return (
                                 <div
                                   key={item._id}
                                   className={`text-sm p-2 rounded-lg text-white ${
                                     isOverdue
                                       ? 'bg-red-500'
                                       : isDueToday
                                         ? 'bg-yellow-500'
                                         : 'bg-blue-500'
                                   }`}
                                   title={item.title}
                                 >
                                   <div className="font-medium truncate">{item.title}</div>
                                   <div className="text-xs opacity-90 mt-1">
                                     Due: {item.displayTime}
                                   </div>
                                 </div>
                               );
                             }
                           })}

                           {/* Empty state */}
                           {allItems.length === 0 && (
                             <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                               No classes or assignments
                             </div>
                           )}
                         </div>
                       </div>
                     );
                   })}
                  </div>
                </div>
              )}

              {/* Day View */}
              {currentView === 'day' && (
                <div className="h-full flex flex-col">
                  {/* Day Header */}
                  <div className="flex-shrink-0 mb-4">
                    <div className="text-center">
                      <div className={`text-6xl font-bold mb-2 ${
                        currentDate.toDateString() === today.toDateString()
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {currentDate.getDate()}
                      </div>
                      <div className="text-lg text-gray-600 dark:text-gray-400">
                        {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
                      </div>
                    </div>
                  </div>

                  {/* Day Content */}
                  <div className="flex-1 overflow-y-auto">
                    {(() => {
                      const allItems = getAllItemsSortedByTime(currentDate);

                      if (allItems.length === 0) {
                        return (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                No classes or assignments today
                              </h3>
                              <p className="text-gray-500 dark:text-gray-400">
                                Enjoy your free day or add some classes and assignments to get started!
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Today's Schedule ({allItems.length} {allItems.length === 1 ? 'item' : 'items'})
                          </h4>

                          <div className="space-y-4">
                            {allItems.map((item) => {
                              if (item.itemType === 'class') {
                                const gradientColor = getClassColor(item.colorIndex);
                                return (
                                  <div
                                    key={`${item._id}-${currentDate.toDateString()}`}
                                    onClick={() => handleEventClick(item, 'class')}
                                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-start gap-3 flex-1">
                                        <div className={`w-1 h-16 rounded-full bg-gradient-to-b ${gradientColor}`}></div>
                                        <div className="flex-1">
                                          <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                                            {item.code}: {item.title}
                                          </h5>

                                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            <div className="flex items-center gap-1">
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                              <span>{formatTimeTo12Hour(item.startTime || '')} - {formatTimeTo12Hour(item.endTime || '')}</span>
                                            </div>

                                            {item.room && item.building && (
                                              <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span>{item.building} {item.room}</span>
                                              </div>
                                            )}

                                            <div className="flex items-center gap-1">
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                              </svg>
                                              <span>{item.instructor}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                        Class
                                      </div>
                                    </div>
                                  </div>
                                );
                              } else {
                                const isOverdue = new Date(item.dueAt) < today && item.status !== 'completed';
                                const isDueToday = new Date(item.dueAt).toDateString() === today.toDateString();
                                
                                // Get the class color for this assignment's course
                                const courseColorIndex = courses?.find(course => course._id === item.courseId)?.colorIndex || 0;
                                const classGradientColor = getClassColor(courseColorIndex);
                                
                                // Get assignment type color for secondary bar
                                const getAssignmentTypeColor = (type: string) => {
                                  switch (type?.toLowerCase()) {
                                    case 'exam': return 'bg-red-500';
                                    case 'quiz': return 'bg-yellow-500';
                                    case 'project': return 'bg-purple-500';
                                    case 'homework': return 'bg-blue-500';
                                    case 'lab': return 'bg-green-500';
                                    default: return 'bg-gray-500';
                                  }
                                };

                                return (
                                  <div
                                    key={item._id}
                                    onClick={() => handleEventClick(item, 'assignment')}
                                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-start gap-3 flex-1">
                                        {/* Class color bar (primary) */}
                                        <div className={`w-1 h-16 rounded-full bg-gradient-to-b ${classGradientColor}`}></div>
                                        {/* Assignment type color bar (secondary) */}
                                        <div className={`w-0.5 h-16 rounded-full ${getAssignmentTypeColor(item.type)}`}></div>
                                        <div className="flex-1">
                                          <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                                            {item.title}
                                          </h5>

                                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            <div className="flex items-center gap-1">
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                              <span>Due: {item.displayTime}</span>
                                            </div>

                                            {item.type && (
                                              <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                </svg>
                                                <span className="capitalize">{item.type}</span>
                                              </div>
                                            )}

                                            {/* Course name */}
                                            {courses && (
                                              <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                </svg>
                                                <span>{courses.find(course => course._id === item.courseId)?.code}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Status Badge */}
                                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        item.status === 'completed'
                                          ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-300'
                                          : isOverdue
                                            ? 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-300'
                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                      }`}>
                                        {item.status === 'completed'
                                          ? 'Completed'
                                          : isOverdue
                                            ? 'Overdue'
                                            : item.type?.charAt(0).toUpperCase() + item.type?.slice(1) || 'Assignment'
                                        }
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
