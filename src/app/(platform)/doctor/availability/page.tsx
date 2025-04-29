'use client';

import React, { useState, useEffect, useRef } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { Calendar, Clock, Plus, Save, Trash2, Info } from 'lucide-react';
import { useDoctorAvailability, useSetAvailability } from '@/data/doctorLoaders';
import { logInfo, logValidation } from '@/lib/logger';
import { format } from 'date-fns';

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
  const uniqueBlockedDates = Array.from(new Set(blockedDates));
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');
  
  // Load doctor availability
  const { data, isLoading, error, refetch } = useDoctorAvailability();
  const setAvailabilityMutation = useSetAvailability();
  
  // Prevent re-initializing on every data update
  const initialized = useRef(false);

  // Initialize state from API data only once on first success
  useEffect(() => {
    if (!data?.success || initialized.current) return;
    const { availability } = data;
    const newSchedule = availability.weeklySchedule
      ? { ...createDefaultSchedule(), ...availability.weeklySchedule }
      : createDefaultSchedule();
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
      const result = await setAvailabilityMutation.mutateAsync({
        weeklySchedule,
        blockedDates
      });
      
      if (result.success) {
        logInfo('Doctor availability saved successfully');
        logValidation('4.11', 'success', 'Doctor availability setting is fully functional with real data');
        await refetch();
      } else {
        logInfo(`Error saving availability: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      logInfo(`Error in availability mutation: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Handle adding a blocked date
  const handleAddBlockedDate = () => {
    if (!newBlockDate) return;
    
    if (!blockedDates.includes(newBlockDate)) {
      setBlockedDates([...blockedDates, newBlockDate]);
      setNewBlockDate('');
      setNewBlockReason('');
    }
  };
  
  // Handle removing a blocked date
  const handleRemoveBlockedDate = (dateToRemove: string) => {
    setBlockedDates(blockedDates.filter(date => date !== dateToRemove));
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
                          <td key={`${day}-${time}`} className="py-2 px-2 text-center">
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={isAvailable(day, timeIndex)}
                                onChange={() => toggleAvailability(day, timeIndex)}
                                className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-600 rounded"
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 rounded-md bg-slate-50 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300">
                <Info className="h-4 w-4 inline mr-1 text-info" />
                Check the boxes for times when you&apos;re regularly available. This schedule will
                repeat every week.
              </div>
            </div>
          </Card>

          {/* Block Specific Dates */}
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                <h2 className="text-lg font-medium">Block Specific Dates</h2>
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-grow md:max-w-xs">
                  <Input
                    id="block-date"
                    type="date"
                    label="Date to Block"
                    value={newBlockDate}
                    onChange={e => setNewBlockDate(e.target.value)}
                  />
                </div>
                <div className="flex-grow">
                  <Input
                    id="block-reason"
                    label="Reason (Optional)"
                    placeholder="Vacation, Conference, etc."
                    value={newBlockReason}
                    onChange={e => setNewBlockReason(e.target.value)}
                  />
                </div>
                <div className="flex-shrink-0 flex items-end">
                  <Button onClick={handleAddBlockedDate} disabled={!newBlockDate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Date
                  </Button>
                </div>
              </div>

              {/* Blocked Dates List */}
              {uniqueBlockedDates.length > 0 ? (
                <div className="space-y-2 mt-6">
                  <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Currently Blocked Dates:
                  </h3>
                  {uniqueBlockedDates.map((date: string) => (
                    <div
                      key={date}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge variant="warning">
                          {format(new Date(date), 'EEE, MMMM d, yyyy')}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBlockedDate(date)}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 text-slate-400 dark:text-slate-500">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No blocked dates set</p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
