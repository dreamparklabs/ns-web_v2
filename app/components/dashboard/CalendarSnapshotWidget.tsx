import React, { useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import DashboardWidget from './DashboardWidget';
import { useNavigate } from 'react-router';

interface Event {
  _id: string;
  title: string;
  startTime: number;
  endTime: number;
  color: string;
  type: string;
}

export default function CalendarSnapshotWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const navigate = useNavigate();

  const navigateToCalendar = () => {
    navigate('/app/v2/calendar');
  };

  // This will need to be implemented in Convex
  const events = useQuery(api.events.getEventsForMonth, {
    month: currentDate.getMonth(),
    year: currentDate.getFullYear()
  }) as Event[] | undefined;

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const hasEventOnDay = (day: number) => {
    if (!events) return false;
    const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    return events.some(event =>
      event.startTime >= dayStart && event.startTime < dayEnd
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day &&
           today.getMonth() === currentDate.getMonth() &&
           today.getFullYear() === currentDate.getFullYear();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-6"></div>);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const hasEvent = hasEventOnDay(day);
    const todayClass = isToday(day) ? 'bg-purple-600 text-white shadow-sm' : '';
    const eventClass = hasEvent && !isToday(day) ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : '';
    const hoverClass = isToday(day) ? 'hover:bg-purple-700' : hasEvent ? 'hover:bg-purple-100 dark:hover:bg-purple-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700';
    const roundingClass = isToday(day) ? 'rounded-full' : 'rounded';

    days.push(
      <div
        key={day}
        className={`h-6 w-6 flex items-center justify-center text-[10px] ${roundingClass} cursor-pointer transition-all duration-200 ${todayClass} ${eventClass} ${hoverClass} relative font-medium`}
      >
        {day}
        {hasEvent && !isToday(day) && (
          <div className="absolute w-1 h-1 bg-purple-600 dark:bg-purple-400 rounded-full bottom-0.5"></div>
        )}
      </div>
    );
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <DashboardWidget
      title="Calendar"
      headerAction={
        <button
          onClick={navigateToCalendar}
          className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-2 py-1 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 font-semibold"
        >
          Full Calendar
        </button>
      }
    >
      <div className="space-y-3">
        {/* Month/Year Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="p-1.5 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200 hover:scale-110"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <h4 className="text-xs font-semibold text-gray-900 dark:text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h4>

          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="p-1.5 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200 hover:scale-110"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekDays.map(day => (
            <div key={day} className="text-[10px] font-medium text-gray-500 dark:text-gray-400 h-5 flex items-center justify-center">
              {day.substring(0, 1)}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 relative">
          {days}
        </div>

        {/* Today's Events */}
        {events && events.filter(event => {
          const today = new Date();
          const eventDate = new Date(event.startTime);
          return eventDate.toDateString() === today.toDateString();
        }).length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Today's Events</p>
            <div className="space-y-1">
              {events.filter(event => {
                const today = new Date();
                const eventDate = new Date(event.startTime);
                return eventDate.toDateString() === today.toDateString();
              }).slice(0, 2).map(event => (
                <div key={event._id} className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: event.color }}></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {event.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
}
