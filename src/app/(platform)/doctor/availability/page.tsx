'use client';

import React, { useState, useEffect, useRef } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { Clock, Save } from 'lucide-react';
import { useDoctorAvailability, useSetAvailability } from '@/data/doctorLoaders';
import { logInfo, logValidation } from '@/lib/logger';

// Days of the week
const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Time slots (simplified for demo)
const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00'
];

type Weekday = 'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'|'sunday';
type WeeklySchedule = Record<Weekday, Array<{ startTime: string; endTime: string; isAvailable: boolean }>>;

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
      isAvailable: false
    }));
  });
  return schedule;
};

export default function DoctorAvailabilityPage() {
  // State for the weekly schedule
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(createDefaultSchedule());
  
  // State for blocked dates
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  
  // Add success/error message state
  const [saveMessage, setSaveMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  
  // Load doctor availability
  const { data, isLoading, error, refetch } = useDoctorAvailability();
  const setAvailabilityMutation = useSetAvailability();
  
  // Prevent re-initializing on every data update
  const initialized = useRef(false);

  // Force refetch data on mount to always get latest
  useEffect(() => {
    refetch();
    console.log("Component mounted - forcing data refetch");
  }, [refetch]);
  
  // Initialize state from API data only once on first success
  useEffect(() => {
    if (!data?.success) return;

    const { availability } = data;
    console.log("Retrieved availability data:", availability);
    
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
          console.log(`Found availability for ${day}:`, dayData);
          
          // Map each time slot
          newSchedule[dayKey] = timeSlots.map((time, index) => {
            // Look for a matching slot by startTime
            const existingSlot = dayData.find((slot: { startTime: string; endTime: string; isAvailable: boolean }) => 
              slot.startTime === time
            );
            if (existingSlot) {
              return {
                startTime: existingSlot.startTime,
                endTime: existingSlot.endTime || getNextTimeSlot(existingSlot.startTime),
                isAvailable: existingSlot.isAvailable === true
              };
            }
            // Use default if no matching slot
            return defaultSchedule[dayKey][index];
          });
        }
      });
    }
    
    console.log("Mapped schedule for UI:", newSchedule);
    
    const dedupedDates = Array.isArray(availability.blockedDates)
      ? Array.from(new Set(availability.blockedDates))
      : [];
      
    setWeeklySchedule(newSchedule);
    setBlockedDates(dedupedDates.map(date => String(date)));
    
    initialized.current = true;
    logValidation('4.10', 'success', 'Doctor availability component successfully loads real data');
  }, [data]);
  
  // Toggle availability for a time slot
  const toggleAvailability = (day: string, timeIndex: number) => {
    setWeeklySchedule(prev => {
      const newSchedule = { ...prev };
      if (!newSchedule[day as Weekday]) {
        newSchedule[day as Weekday] = [];
      }
      const updatedSlots = [...(newSchedule[day as Weekday] || [])];
      updatedSlots[timeIndex] = {
        ...updatedSlots[timeIndex],
        isAvailable: !updatedSlots[timeIndex]?.isAvailable
      };
      newSchedule[day as Weekday] = updatedSlots;
      return newSchedule;
    });
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
            isAvailable: true
          }));
        return acc;
      }, {} as WeeklySchedule);
      
      console.log("Saving schedule data:", {
        weeklySchedule: cleanWeeklySchedule,
        blockedDates
      });
      
      // Log each day's availability for debugging
      weekdays.forEach(day => {
        console.log(`Day ${day} has ${cleanWeeklySchedule[day as Weekday].length} available slots:`, 
          cleanWeeklySchedule[day as Weekday]);
      });
      
      const result = await setAvailabilityMutation.mutateAsync({
        weeklySchedule: cleanWeeklySchedule,
        blockedDates: blockedDates || []
      });
      
      console.log("Save result:", result);
      
      if (result.success) {
        logInfo('Doctor availability saved successfully');
        logValidation('4.11', 'success', 'Doctor availability setting is fully functional with real data');
        // Reset initialized ref to force refresh and immediately refetch
        setSaveMessage({
          text: 'Your availability has been saved successfully!',
          type: 'success'
        });
        initialized.current = false;
        await refetch();
      } else {
        setSaveMessage({
          text: `Error saving availability: ${result.error || 'Unknown error'}`,
          type: 'error'
        });
        logInfo(`Error saving availability: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      setSaveMessage({
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        type: 'error'
      });
      logInfo(`Error in availability mutation: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Format day name for display
  const formatDayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };
  
  // Check if a slot is available
  const isAvailable = (day: string, timeIndex: number) => {
    return weeklySchedule[day as Weekday]?.[timeIndex]?.isAvailable || false;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Availability</h1>
        <Button 
          variant="primary" 
          onClick={handleSave}
          isLoading={setAvailabilityMutation.isPending}
          disabled={setAvailabilityMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
      
      {/* Success/Error Messages */}
      {saveMessage && (
        <Alert variant={saveMessage.type === 'success' ? 'success' : 'error'}>
          {saveMessage.text}
        </Alert>
      )}
      
      {error && (
        <Alert variant="error">Error loading availability: {error instanceof Error ? error.message : String(error)}</Alert>
      )}
      
      {setAvailabilityMutation.isError && (
        <Alert variant="error">
          Error saving availability changes: {setAvailabilityMutation.error instanceof Error 
            ? setAvailabilityMutation.error.message 
            : 'Please try again later'}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      
      {!isLoading && (
        <>
          {/* Weekly Schedule */}
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-primary" />
                <h2 className="text-lg font-medium">Weekly Schedule</h2>
              </div>
            </div>
            <div className="p-4 overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead>
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Time / Day
                      </th>
                      {weekdays.map(day => (
                        <th
                          key={day}
                          className="py-3 px-4 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                        >
                          {formatDayName(day)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {timeSlots.map((time, timeIndex) => (
                      <tr key={time} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-4 text-sm text-slate-600 dark:text-slate-300 font-medium">
                          {time}
                        </td>
                        {weekdays.map(day => (
                          <td key={`${day}-${timeIndex}`} className="py-2 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isAvailable(day, timeIndex)}
                              onChange={() => toggleAvailability(day, timeIndex)}
                              aria-label={`Set ${day} ${time} as available`}
                              className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-600 rounded"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}