'use client';

import React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { DateSelectorProps } from '@/types/booking/booking.types';

/**
 * DateSelector Component
 * 
 * Displays available appointment dates in a calendar-like grid format.
 * Users can select from available dates for booking appointments.
 * Extracted from the monolithic BookAppointmentPage for better maintainability.
 */
export default function DateSelector({
  selectedDate,
  availableDates,
  onDateSelect,
  isLoading
}: DateSelectorProps) {
  // Generate a proper calendar grid for the current month
  const generateCalendarGrid = () => {
    if (availableDates.length === 0) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Start from the beginning of the current month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Find the first Sunday of the calendar (may be in previous month)
    const firstSunday = new Date(startOfMonth);
    firstSunday.setDate(startOfMonth.getDate() - startOfMonth.getDay());
    
    // Generate 6 weeks (42 days) for a complete calendar view
    const calendarDates: (Date | null)[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(firstSunday);
      date.setDate(firstSunday.getDate() + i);
      
      // Only include dates that are in the current month or future
      if (date >= today && date.getMonth() === today.getMonth()) {
        calendarDates.push(date);
      } else {
        calendarDates.push(null); // Empty cell for proper grid alignment
      }
    }
    
    return calendarDates;
  };

  const isDateSelectable = (date: Date) => {
    return availableDates.some(availableDate => 
      availableDate.toDateString() === date.toDateString()
    );
  };

  const calendarGrid = generateCalendarGrid();

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
        <div className="border-b border-slate-200 dark:border-slate-700 p-4 bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary/20 dark:to-slate-700">
          <div className="flex items-center justify-between">
            <div className="h-6 w-40 bg-slate-200 dark:bg-slate-600 rounded animate-pulse"></div>
            <div className="flex space-x-2">
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-600 rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-600 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={index} className="h-8 w-8 bg-slate-200 dark:bg-slate-600 rounded animate-pulse"></div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array(21).fill(0).map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 dark:bg-slate-600 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const currentDate = new Date();
  const monthName = format(currentDate, 'MMMM yyyy');

  return (
    <Card className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700">
      {/* Enhanced Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 p-6 bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary/20 dark:to-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Select Appointment Date
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Choose from available dates
              </p>
            </div>
          </div>
          
          {/* Month navigation */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="p-2"
              disabled // For now, disable navigation - could add month switching later
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[120px] text-center">
              {monthName}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="p-2"
              disabled // For now, disable navigation - could add month switching later
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Enhanced calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarGrid.map((date, index) => {
            if (!date) {
              return <div key={index} className="h-16"></div>; // Empty cell
            }

            const isAvailable = isDateSelectable(date);
            const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
            const isToday = new Date().toDateString() === date.toDateString();
            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <button
                key={date.toISOString()}
                onClick={() => isAvailable && onDateSelect(date)}
                disabled={!isAvailable || isPast}
                aria-selected={isSelected ? 'true' : undefined}
                aria-label={`Select date ${format(date, 'EEEE, MMMM d, yyyy')}`}
                className={`
                  relative h-16 rounded-xl border-2 transition-all duration-200 ease-in-out
                  flex flex-col items-center justify-center text-sm font-medium
                  hover:scale-105 active:scale-95
                  ${
                    isSelected
                      ? 'border-primary bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg scale-105'
                      : isAvailable
                      ? 'border-green-200 bg-green-50 text-green-800 hover:border-green-300 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200 dark:hover:bg-green-900/50'
                      : isPast
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }
                `}
              >
                {/* Date number */}
                <span className={`text-lg font-bold ${isSelected ? 'text-white' : ''}`}>
                  {date.getDate()}
                </span>
                
                {/* Day abbreviation for mobile */}
                <span className={`text-xs ${isSelected ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'} sm:hidden`}>
                  {format(date, 'EEE')}
                </span>

                {/* Availability indicator */}
                {isAvailable && !isSelected && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}

                {/* Today indicator */}
                {isToday && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                )}

                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/20 rounded-full p-1">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Enhanced legend */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-slate-600 dark:text-slate-400">Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span className="text-slate-600 dark:text-slate-400">Selected</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-slate-600 dark:text-slate-400">Today</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-slate-300"></div>
            <span className="text-slate-600 dark:text-slate-400">Unavailable</span>
          </div>
        </div>

        {/* Selection summary */}
        {selectedDate && (
          <div className="mt-4 p-4 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Selected Date</p>
              <p className="text-lg font-semibold text-primary">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
} 