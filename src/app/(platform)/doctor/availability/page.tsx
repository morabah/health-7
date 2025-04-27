'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import { Calendar, Clock, Copy, Plus, Save, Trash2, Info } from 'lucide-react';

// Sample blocked dates
const initialBlockedDates = [
  { id: '1', date: '2023-12-24', reason: 'Holiday' },
  { id: '2', date: '2023-12-25', reason: 'Christmas' },
];

// Days of the week
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Time slots (simplified for demo)
const timeSlots = [
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
];

export default function DoctorAvailabilityPage() {
  const [blockedDates, setBlockedDates] = useState(initialBlockedDates);
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');

  // In a real app, this would have state for each checkbox
  // Simplified for demo purposes with predetermined availability
  const isAvailable = (day: string, time: string) => {
    // Saturday and Sunday only available in mornings
    if (
      (day === 'Saturday' || day === 'Sunday') &&
      (time === '12:00 PM' ||
        time === '1:00 PM' ||
        time === '2:00 PM' ||
        time === '3:00 PM' ||
        time === '4:00 PM' ||
        time === '5:00 PM')
    ) {
      return false;
    }

    // No availability on Friday afternoons
    if (
      day === 'Friday' &&
      (time === '1:00 PM' ||
        time === '2:00 PM' ||
        time === '3:00 PM' ||
        time === '4:00 PM' ||
        time === '5:00 PM')
    ) {
      return false;
    }

    // Lunch break at noon
    if (time === '12:00 PM') {
      return false;
    }

    return true;
  };

  // Handle saving availability
  const handleSave = () => {
    console.log('Saving availability settings');
    // In a real app, this would save to backend
  };

  // Handle adding a blocked date
  const handleAddBlockedDate = () => {
    if (!newBlockDate) return;

    const newDate = {
      id: Date.now().toString(),
      date: newBlockDate,
      reason: newBlockReason || 'Unavailable',
    };

    setBlockedDates([...blockedDates, newDate]);
    setNewBlockDate('');
    setNewBlockReason('');
  };

  // Handle removing a blocked date
  const handleRemoveBlockedDate = (id: string) => {
    setBlockedDates(blockedDates.filter(date => date.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Availability</h1>
        <Button variant="primary" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>

      {/* Weekly Schedule */}
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-primary" />
            <h2 className="text-lg font-medium">Weekly Schedule</h2>
          </div>
          <Button variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Copy to All Weeks
          </Button>
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
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {timeSlots.map(time => (
                  <tr key={time} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2 px-4 text-sm text-slate-600 dark:text-slate-300 font-medium">
                      {time}
                    </td>
                    {weekdays.map(day => (
                      <td key={`${day}-${time}`} className="py-2 px-2 text-center">
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={isAvailable(day, time)}
                            className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-600 rounded"
                            // In a real app, this would have onChange
                            readOnly
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
          {blockedDates.length > 0 ? (
            <div className="space-y-2 mt-6">
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Currently Blocked Dates:
              </h3>
              {blockedDates.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    <Badge variant="warning">
                      {new Date(item.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Badge>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {item.reason}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveBlockedDate(item.id)}
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

      <p className="text-gray-600 mb-4">
        Here you can set your regular working hours and block specific dates when you&apos;re
        unavailable.
      </p>
    </div>
  );
}
