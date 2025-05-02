'use client';

import React, { useState, useEffect, useRef } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { Save, Calendar, Check, Info, X } from 'lucide-react';
import { useDoctorAvailability, useSetAvailability } from '@/data/doctorLoaders';
import { logInfo, logValidation } from '@/lib/logger';
import Badge from '@/components/ui/Badge';

// Days of the week
const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Full day names for better UI
const dayNames = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

// Short day names for compact UI
const shortDayNames = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

// Time slots (hourly for simplicity)
const timeSlots = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
];

type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
type WeeklySchedule = Record<
  Weekday,
  Array<{ startTime: string; endTime: string; isAvailable: boolean }>
>;

const getNextTimeSlot = (time: string): string => {
  const [hours] = time.split(':');
  const nextHour = (parseInt(hours, 10) + 1) % 24;
  return `${nextHour.toString().padStart(2, '0')}:00`;
};

const createDefaultSchedule = (): WeeklySchedule => {
  const schedule = {} as WeeklySchedule;
  weekdays.forEach(day => {
    schedule[day as Weekday] = timeSlots.map(time => ({
      startTime: time,
      endTime: getNextTimeSlot(time),
      isAvailable: false,
    }));
  });
  return schedule;
};

export default function DoctorAvailabilityPage() {
  // State for the weekly schedule
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(createDefaultSchedule());

  // State for blocked dates
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  // State for active tab
  const [activeTab, setActiveTab] = useState<string>('weekly');

  // State to track changes (to enable/disable save button)
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Add success/error message state
  const [saveMessage, setSaveMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Load doctor availability
  const { data, isLoading, error, refetch } = useDoctorAvailability();
  const setAvailabilityMutation = useSetAvailability();

  // Prevent re-initializing on every data update
  const initialized = useRef(false);

  // Force refetch data on mount to always get latest
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Initialize state from API data only once on first success
  useEffect(() => {
    if (!data?.success || initialized.current) return;

    const { availability } = data;

    // Create a fresh default schedule
    const defaultSchedule = createDefaultSchedule();

    // Map server data properly
    const newSchedule: WeeklySchedule = { ...defaultSchedule };

    // Make sure we're actually using the availability data from the server
    if (availability.weeklySchedule) {
      // Loop through all weekdays to ensure complete data structure
      weekdays.forEach(day => {
        const dayKey = day as Weekday;
        // Get server data for this day if it exists
        const dayData = availability.weeklySchedule[dayKey] || [];

        if (dayData.length > 0) {
          // Map each time slot
          newSchedule[dayKey] = timeSlots.map((time, index) => {
            // Look for a matching slot by startTime
            const existingSlot = dayData.find(
              (slot: { startTime: string; endTime: string; isAvailable: boolean }) =>
                slot.startTime === time
            );
            if (existingSlot) {
              return {
                startTime: existingSlot.startTime,
                endTime: existingSlot.endTime || getNextTimeSlot(existingSlot.startTime),
                isAvailable: existingSlot.isAvailable === true,
              };
            }
            // Use default if no matching slot
            return defaultSchedule[dayKey][index];
          });
        }
      });
    }

    const dedupedDates = Array.isArray(availability.blockedDates)
      ? Array.from(new Set(availability.blockedDates))
      : [];

    setWeeklySchedule(newSchedule);
    setBlockedDates(dedupedDates.map(date => String(date)));
    setHasChanges(false);

    initialized.current = true;
    logValidation('4.10', 'success', 'Doctor availability component successfully loads real data');
  }, [data]);

  // Toggle availability for a time slot
  const toggleAvailability = (day: Weekday, timeIndex: number) => {
    setWeeklySchedule(prev => {
      const newSchedule = { ...prev };
      if (!newSchedule[day]) {
        newSchedule[day] = [];
      }
      const updatedSlots = [...(newSchedule[day] || [])];
      updatedSlots[timeIndex] = {
        ...updatedSlots[timeIndex],
        isAvailable: !updatedSlots[timeIndex]?.isAvailable,
      };
      newSchedule[day] = updatedSlots;
      return newSchedule;
    });
    setHasChanges(true);
  };

  // Set all slots in a day to available/unavailable
  const setDayAvailability = (day: Weekday, available: boolean) => {
    setWeeklySchedule(prev => {
      const newSchedule = { ...prev };
      newSchedule[day] = newSchedule[day].map(slot => ({
        ...slot,
        isAvailable: available,
      }));
      return newSchedule;
    });
    setHasChanges(true);
  };

  // Handle saving availability
  const handleSave = async () => {
    try {
      setSaveMessage(null); // Clear previous messages

      // Clean the weeklySchedule to remove any slots missing startTime or endTime
      const cleanWeeklySchedule: WeeklySchedule = weekdays.reduce((acc, day) => {
        // Make sure all weekdays have their arrays initialized, even if empty
        acc[day as Weekday] = (weeklySchedule[day as Weekday] || [])
          .filter(slot => typeof slot.startTime === 'string' && typeof slot.endTime === 'string')
          // Only keep slots that are marked as available
          .filter(slot => slot.isAvailable === true)
          .map(slot => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: true,
          }));
        return acc;
      }, {} as WeeklySchedule);

      const result = await setAvailabilityMutation.mutateAsync({
        weeklySchedule: cleanWeeklySchedule,
        blockedDates: blockedDates || [],
      });

      if (result.success) {
        logInfo('Doctor availability saved successfully');
        logValidation(
          '4.11',
          'success',
          'Doctor availability setting is fully functional with real data'
        );
        setSaveMessage({
          text: 'Your availability has been saved successfully!',
          type: 'success',
        });
        initialized.current = false;
        setHasChanges(false);
        await refetch();
      } else {
        setSaveMessage({
          text: `Error saving availability: ${result.error || 'Unknown error'}`,
          type: 'error',
        });
        logInfo(`Error saving availability: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      setSaveMessage({
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        type: 'error',
      });
      logInfo(
        `Error in availability mutation: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  // Count available slots for a day
  const countAvailableSlotsForDay = (day: Weekday) => {
    return weeklySchedule[day]?.filter(slot => slot.isAvailable).length || 0;
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}${minutes === '00' ? '' : `:${minutes}`} ${period}`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Manage Availability</h1>
          <p className="text-slate-500 text-sm">
            Set your regular weekly schedule and manage your availability
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={setAvailabilityMutation.isPending}
          disabled={setAvailabilityMutation.isPending || !hasChanges}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Success/Error Messages */}
      {saveMessage && (
        <Alert variant={saveMessage.type === 'success' ? 'success' : 'error'} className="mb-4">
          {saveMessage.text}
        </Alert>
      )}

      {error && (
        <Alert variant="error" className="mb-4">
          Error loading availability: {error instanceof Error ? error.message : String(error)}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="w-8 h-8" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              className={`px-4 py-3 font-medium text-sm border-b-2 ${
                activeTab === 'weekly'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setActiveTab('weekly')}
            >
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Weekly Schedule
              </div>
            </button>
            <button
              className={`px-4 py-3 font-medium text-sm border-b-2 ${
                activeTab === 'blocked-dates'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setActiveTab('blocked-dates')}
            >
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Off Days
              </div>
            </button>
          </div>

          {activeTab === 'weekly' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase border-b border-r border-slate-200 dark:border-slate-700 w-20">
                      Time
                    </th>
                    {weekdays.map(day => (
                      <th
                        key={day}
                        className="px-2 py-3 text-center border-b border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-medium text-slate-500 uppercase">
                            {shortDayNames[day as Weekday]}
                          </span>
                          <div className="flex gap-1 mt-1">
                            <button
                              onClick={() => setDayAvailability(day as Weekday, true)}
                              className="p-1 rounded text-xs text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                              title={`Select all for ${dayNames[day as Weekday]}`}
                            >
                              All
                            </button>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <button
                              onClick={() => setDayAvailability(day as Weekday, false)}
                              className="p-1 rounded text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title={`Clear all for ${dayNames[day as Weekday]}`}
                            >
                              None
                            </button>
                          </div>
                          <Badge
                            variant={
                              countAvailableSlotsForDay(day as Weekday) > 0 ? 'success' : 'default'
                            }
                            className="mt-1"
                          >
                            {countAvailableSlotsForDay(day as Weekday)} slots
                          </Badge>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((time, timeIndex) => (
                    <tr
                      key={time}
                      className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                        {formatTime(time)}
                      </td>
                      {weekdays.map(day => {
                        const dayKey = day as Weekday;
                        const isAvailable =
                          weeklySchedule[dayKey]?.[timeIndex]?.isAvailable || false;

                        return (
                          <td key={`${day}-${timeIndex}`} className="p-1 text-center">
                            <button
                              className={`w-full h-10 rounded-md transition-colors ${
                                isAvailable
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700'
                              }`}
                              onClick={() => toggleAvailability(dayKey, timeIndex)}
                              aria-label={`Set ${dayNames[dayKey]} at ${formatTime(time)} as ${isAvailable ? 'unavailable' : 'available'}`}
                            >
                              {isAvailable ? (
                                <Check className="w-5 h-5 mx-auto" />
                              ) : (
                                <X className="w-5 h-5 mx-auto" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'blocked-dates' && (
            <div className="p-6">
              <div className="flex items-start space-x-2 mb-6">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  This feature will be available soon. You&apos;ll be able to mark specific dates
                  when you&apos;re unavailable (vacation days, conferences, personal time off).
                  Currently, please use your weekly schedule to manage availability.
                </p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
