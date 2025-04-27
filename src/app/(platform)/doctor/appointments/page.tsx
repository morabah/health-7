'use client';

import React, { useState } from 'react';
import Link from 'next/link';
// import { Tab } from '@headlessui/react'; // Removed unused import
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import {
  Calendar,
  ClipboardList,
  Clock,
  User,
  CheckCircle,
  XCircle,
  ChevronRight,
  Filter,
} from 'lucide-react';
import CompleteAppointmentModal from '@/components/doctor/CompleteAppointmentModal';

// Sample data - would come from API in real implementation
const sampleAppointments = [
  {
    id: 'appt-123',
    patientId: 'pat-123',
    patientName: 'James Wilson',
    date: '2023-12-15T00:00:00.000Z',
    time: '10:30 AM',
    status: 'scheduled',
    reason: 'Annual check-up',
  },
  {
    id: 'appt-124',
    patientId: 'pat-456',
    patientName: 'Emily Johnson',
    date: '2023-12-15T00:00:00.000Z',
    time: '2:00 PM',
    status: 'scheduled',
    reason: 'Follow-up consultation',
  },
];

export default function DoctorAppointmentsPage() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [dateFilter, setDateFilter] = useState('today');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState<
    null | (typeof sampleAppointments)[0]
  >(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Handle appointment completion
  const handleCompleteAppointment = async (id: string, notes: string) => {
    try {
      // In a real app, this would call an API endpoint
      console.log(`Completing appointment ${id} with notes: ${notes}`);

      // Would update local state in a real implementation
      setShowCompleteModal(false);

      // Would show a success toast in a real implementation
    } catch (error) {
      console.error('Error completing appointment:', error);
      throw error; // Let the modal handle the error display
    }
  };

  // Open complete modal with the selected appointment
  const openCompleteModal = (appointment: (typeof sampleAppointments)[0]) => {
    setSelectedAppointment(appointment);
    setShowCompleteModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Appointments</h1>

        {/* View Toggle */}
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button
            className={clsx(
              'px-3 py-1.5 rounded-md flex items-center text-sm font-medium',
              view === 'list'
                ? 'bg-white dark:bg-slate-700 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            )}
            onClick={() => setView('list')}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            List
          </button>
          <button
            className={clsx(
              'px-3 py-1.5 rounded-md flex items-center text-sm font-medium',
              view === 'calendar'
                ? 'bg-white dark:bg-slate-700 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            )}
            onClick={() => setView('calendar')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-auto">
            <Select
              id="date-filter"
              label="Date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="w-full sm:w-40"
            >
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </Select>
          </div>
          <div className="w-full sm:w-auto">
            <Select
              id="status-filter"
              label="Status"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full sm:w-40"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
          <div className="flex-grow" />
          <Button variant="outline" size="sm" className="mt-4 sm:mt-0">
            <Filter className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
        </div>
      </Card>

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-4">
          {sampleAppointments.map(appointment => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onCompleteClick={() => openCompleteModal(appointment)}
            />
          ))}
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <Card className="p-4">
          <div className="text-center p-8 text-slate-400 dark:text-slate-500">
            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p>Calendar view is not implemented in this static prototype.</p>
            <p className="text-sm mt-2">
              Would display a monthly calendar with daily appointment slots.
            </p>
          </div>
        </Card>
      )}

      {/* Complete Appointment Modal */}
      <CompleteAppointmentModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        appt={selectedAppointment}
        onConfirm={handleCompleteAppointment}
      />
    </div>
  );
}

// Appointment Card Component
function AppointmentCard({
  appointment,
  onCompleteClick,
}: {
  appointment: (typeof sampleAppointments)[0];
  onCompleteClick: () => void;
}) {
  // Format date nicely
  const formattedDate = new Date(appointment.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card className="p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Patient Info & Time */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 mr-3">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">{appointment.patientName}</h3>
              <Link
                href={`/patient/${appointment.patientId}`}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                View Profile
              </Link>
            </div>
          </div>

          <div className="flex items-center md:ml-6">
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-300 mr-4">
              <Calendar className="h-4 w-4 mr-2" />
              {formattedDate}
            </div>
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
              <Clock className="h-4 w-4 mr-2" />
              {appointment.time}
            </div>
          </div>
        </div>

        {/* Status Badge and Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant="info">Scheduled</Badge>

          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline">
              <ChevronRight className="h-4 w-4 mr-1" />
              Details
            </Button>
            <Button size="sm" variant="primary" onClick={onCompleteClick}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </Button>
            <Button size="sm" variant="danger">
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
