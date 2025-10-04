import React, { useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import DashboardWidget from './DashboardWidget';
import { useNavigate } from 'react-router';

interface WeekEvent {
  _id: string;
  title: string;
  startTime: number;
  endTime: number;
  color: string;
  type: 'class' | 'assignment' | 'event';
  courseCode?: string;
}

export default function WeekOverviewWidget() {
  // This will need to be implemented in Convex
  const weekEvents = useQuery(api.events.getWeekEvents) as WeekEvent[] | undefined;
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const navigate = useNavigate();

  const navigateToCalendar = () => {
    navigate('/app/v2/calendar');
  };

  const getWeekDays = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1); // Get Monday of current week

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getEventsForDay = (date: Date) => {
    if (!weekEvents) return [];

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return weekEvents.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate >= dayStart && eventDate <= dayEnd;
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'class':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'assignment':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      default:
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const weekDays = getWeekDays();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const displayEvents = weekEvents || [];

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-100/50 dark:border-gray-700/50 p-3 md:p-4 xl:p-5 2xl:p-6 w-full h-full transition-all duration-200 hover:shadow-md hover:shadow-gray-100/25 dark:hover:shadow-black/10 hover:border-gray-200/60 dark:hover:border-gray-600/60 group flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 md:mb-3 xl:mb-4 flex-shrink-0">
        <h3 className="text-xs md:text-sm xl:text-base font-medium text-gray-800 dark:text-gray-100 tracking-wide">
          Week Overview
        </h3>
        <button
          onClick={navigateToCalendar}
          className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-2 py-1 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 font-semibold"
        >
          Full Schedule
        </button>
      </div>

      {/* Content - Ultra compact to fit everything */}
      <div className="flex-1 flex flex-col space-y-2 min-h-0 overflow-hidden">
        {/* Week Navigation - Minimal */}
        <div className="flex items-center justify-center bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-1.5 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentWeekOffset(prev => prev - 1)}
              className="p-0.5 rounded-full hover:bg-white dark:hover:bg-gray-600 transition-all duration-200 hover:scale-110"
            >
              <svg className="w-2 h-2 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white tracking-tight">
                {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </h4>
            </div>
            <button
              onClick={() => setCurrentWeekOffset(prev => prev + 1)}
              className="p-0.5 rounded-full hover:bg-white dark:hover:bg-gray-600 transition-all duration-200 hover:scale-110"
            >
              <svg className="w-2 h-2 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Ultra Compact Week Grid */}
        <div className="grid grid-cols-7 gap-1 flex-shrink-0">
          {weekDays.map((day, index) => {
            const dayEvents = displayEvents.filter(event => {
              const eventDate = new Date(event.startTime);
              return eventDate.toDateString() === day.toDateString();
            });
            const today = isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => navigateToCalendar()}
                className={`relative p-1 rounded-md transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-md ${
                  today
                    ? 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 border border-purple-300 dark:border-purple-600 hover:from-purple-200 hover:to-purple-300 dark:hover:from-purple-800/60 dark:hover:to-purple-700/60'
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-600'
                }`}
              >
                {/* Today indicator */}
                {today && (
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                )}

                {/* Day Header - Ultra compact */}
                <div className="text-center">
                  <p className={`text-[8px] font-bold uppercase tracking-wide ${
                    today ? 'text-purple-700 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {dayNames[index]}
                  </p>
                  <p className={`text-xs font-bold ${
                    today ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'
                  }`}>
                    {day.getDate()}
                  </p>
                  {/* Event Count directly below date */}
                  {dayEvents.length > 0 ? (
                    <div className={`inline-flex items-center justify-center w-3 h-3 text-[7px] font-bold rounded-full mt-0.5 ${
                      today
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                      {dayEvents.length}
                    </div>
                  ) : (
                    <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Condensed Week Summary */}
        <div className="flex-1 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-700 min-h-0 flex flex-col">
          {/* Stats Only - No header */}
          <div className="grid grid-cols-3 gap-1 text-center flex-shrink-0">
            <div className="p-1.5 bg-white/60 dark:bg-gray-800/60 rounded-lg">
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {displayEvents.filter(e => e.type === 'class').length}
              </p>
              <p className="text-[8px] text-gray-500 dark:text-gray-400 font-medium">Classes</p>
            </div>
            <div className="p-1.5 bg-white/60 dark:bg-gray-800/60 rounded-lg">
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {displayEvents.filter(e => e.type === 'assignment').length}
              </p>
              <p className="text-[8px] text-gray-500 dark:text-gray-400 font-medium">Due</p>
            </div>
            <div className="p-1.5 bg-white/60 dark:bg-gray-800/60 rounded-lg">
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {displayEvents.filter(e => e.type === 'event').length}
              </p>
              <p className="text-[8px] text-gray-500 dark:text-gray-400 font-medium">Events</p>
            </div>
          </div>

          {/* Next Event - Only if there's one today */}
          {(() => {
            const todayEvents = displayEvents.filter(event => {
              const today = new Date();
              const eventDate = new Date(event.startTime);
              return eventDate.toDateString() === today.toDateString() && event.startTime > Date.now();
            });

            if (todayEvents.length > 0) {
              const nextEvent = todayEvents[0];
              return (
                <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-700 flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: nextEvent.color }}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-900 dark:text-white truncate">
                        Next: {nextEvent.title}
                      </p>
                      <p className="text-[8px] text-gray-500 dark:text-gray-400">
                        {formatTime(nextEvent.startTime)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-700 flex-shrink-0">
                <p className="text-[9px] text-center text-gray-500 dark:text-gray-400">
                  {displayEvents.length === 0 ? "No events this week" : "No more events today"}
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
