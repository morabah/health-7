'use client';

import React from 'react';
import { Clock, Sun, CloudSun, Moon, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Card from '@/components/ui/Card';
import { TimeSlotGridProps, TimeSlotGroup } from '@/types/booking/booking.types';

/**
 * TimeSlotGrid Component
 * 
 * Displays available time slots organized by time periods (morning, afternoon, evening).
 * Users can select from available time slots for their appointment.
 * Extracted from the monolithic BookAppointmentPage for better maintainability.
 */
export default function TimeSlotGrid({
  selectedDate,
  selectedTimeSlot,
  selectedEndTime,
  availableTimeSlots,
  onTimeSlotSelect,
  isLoading
}: TimeSlotGridProps) {
  // Group time slots by time period
  const groupTimeSlotsByPeriod = (): TimeSlotGroup[] => {
    const morningSlots = availableTimeSlots.filter(slot => {
      const hour = parseInt(slot.startTime.split(':')[0]);
      return hour >= 6 && hour < 12;
    });

    const afternoonSlots = availableTimeSlots.filter(slot => {
      const hour = parseInt(slot.startTime.split(':')[0]);
      return hour >= 12 && hour < 17;
    });

    const eveningSlots = availableTimeSlots.filter(slot => {
      const hour = parseInt(slot.startTime.split(':')[0]);
      return hour >= 17 && hour < 22;
    });

    return [
      {
        title: 'Morning',
        slots: morningSlots,
        icon: <Sun className="h-5 w-5" />,
        bgColor: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20'
      },
      {
        title: 'Afternoon', 
        slots: afternoonSlots,
        icon: <CloudSun className="h-5 w-5" />,
        bgColor: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20'
      },
      {
        title: 'Evening',
        slots: eveningSlots,
        icon: <Moon className="h-5 w-5" />,
        bgColor: 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20'
      }
    ].filter(group => group.slots.length > 0);
  };

  const formatTimeString = (timeString: string): string => {
    try {
      // Handle both HH:mm format and ISO string format
      if (timeString.includes('T')) {
        return format(parseISO(timeString), 'h:mm a');
      } else {
        // For HH:mm format, create a date object
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return format(date, 'h:mm a');
      }
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  };

  const isSlotSelected = (startTime: string, endTime: string) => {
    return selectedTimeSlot === startTime && selectedEndTime === endTime;
  };

  if (!selectedDate) {
    return (
      <Card className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
        <div className="border-b border-slate-200 dark:border-slate-700 p-6 bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary/20 dark:to-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Select Time Slot
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Please select a date first
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 text-center">
          <div className="text-slate-400 dark:text-slate-500 mb-4">
            <Clock className="h-12 w-12 mx-auto mb-2" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Choose an appointment date to see available time slots
          </p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
        <div className="border-b border-slate-200 dark:border-slate-700 p-6 bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary/20 dark:to-slate-700">
          <div className="h-6 w-40 bg-slate-200 dark:bg-slate-600 rounded animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {[1, 2, 3].map((section) => (
              <div key={section}>
                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-600 rounded animate-pulse mb-3"></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-16 bg-slate-200 dark:bg-slate-600 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const timeSlotGroups = groupTimeSlotsByPeriod();

  return (
    <Card className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700">
      {/* Enhanced Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 p-6 bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary/20 dark:to-slate-700">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Select Time Slot
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Available slots for {format(selectedDate, 'EEEE, MMMM d')}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {timeSlotGroups.length === 0 ? (
          // No slots available
          <div className="text-center py-12">
            <div className="text-slate-400 dark:text-slate-500 mb-4">
              <Clock className="h-12 w-12 mx-auto mb-2" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No Available Time Slots
            </h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              There are no available appointments for the selected date. 
              Please choose a different date or contact the office directly.
            </p>
          </div>
        ) : (
          // Render time slot groups
          <div className="space-y-8">
            {timeSlotGroups.map((group) => (
              <div key={group.title}>
                {/* Section header */}
                <div className={`rounded-lg p-4 mb-4 bg-gradient-to-r ${group.bgColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-white/50 dark:bg-slate-800/50">
                        {group.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                          {group.title} Appointments
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {group.slots.length} slot{group.slots.length !== 1 ? 's' : ''} available
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time slots grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {group.slots.map((slot) => {
                    const isSelected = isSlotSelected(slot.startTime, slot.endTime);
                    
                    return (
                      <button
                        key={`${slot.startTime}-${slot.endTime}`}
                        onClick={() => onTimeSlotSelect(slot.startTime, slot.endTime)}
                        className={`
                          relative p-4 rounded-xl border-2 text-center transition-all duration-200 ease-in-out
                          hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                          ${
                            isSelected
                              ? 'border-primary bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg scale-105'
                              : 'border-slate-200 bg-white hover:border-primary/50 hover:bg-primary/5 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary/50 dark:hover:bg-primary/10'
                          }
                        `}
                        aria-label={`Select time slot from ${formatTimeString(slot.startTime)} to ${formatTimeString(slot.endTime)}`}
                      >
                        {/* Time display */}
                        <div className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {formatTimeString(slot.startTime)}
                        </div>
                        <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                          to {formatTimeString(slot.endTime)}
                        </div>

                        {/* Selected overlay */}
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-white/20 rounded-full p-1">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}

                        {/* Hover effect indicator */}
                        {!isSelected && (
                          <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 hover:opacity-100 transition-opacity duration-200"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selection summary */}
        {selectedTimeSlot && selectedEndTime && (
          <div className="mt-6 p-4 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Selected Time</p>
              <p className="text-lg font-semibold text-primary">
                {formatTimeString(selectedTimeSlot)} - {formatTimeString(selectedEndTime)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Duration: {(() => {
                  try {
                    const start = new Date(`2000-01-01T${selectedTimeSlot}`);
                    const end = new Date(`2000-01-01T${selectedEndTime}`);
                    const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
                    return `${diffMinutes} minutes`;
                  } catch {
                    return 'Duration unavailable';
                  }
                })()}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
} 