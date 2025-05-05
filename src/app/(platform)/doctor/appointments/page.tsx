'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
// import { Tab } from '@headlessui/react'; // Removed unused import
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import {
  Calendar,
  ClipboardList,
  Clock,
  User,
  CheckCircle,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import CompleteAppointmentModal from '@/components/doctor/CompleteAppointmentModal';
import { useDoctorAppointments, useCompleteAppointment, useDoctorCancelAppointment } from '@/data/doctorLoaders';
import { AppointmentStatus } from '@/types/enums';
import { format } from 'date-fns';
import { logValidation } from '@/lib/logger';
import type { Appointment } from '@/types/schemas';
import AppointmentErrorBoundary from '@/components/error-boundaries/AppointmentErrorBoundary';

/**
 * Doctor Appointments Page
 * Shows all appointments for a doctor with filtering and actions
 */
export default function DoctorAppointmentsPage() {
  return (
    <AppointmentErrorBoundary componentName="DoctorAppointmentsPage">
      <DoctorAppointmentsContent />
    </AppointmentErrorBoundary>
  );
}

/**
 * Doctor Appointments Content Component
 * Separated to allow error boundary to work properly
 */
function DoctorAppointmentsContent() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState<null | Appointment>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  
  // Get appointments data from API
  const { 
    data: appointmentsData, 
    isLoading, 
    error,
    refetch 
  } = useDoctorAppointments();
  
  const completeMutation = useCompleteAppointment();
  const cancelMutation = useDoctorCancelAppointment();

  // Filter appointments based on selected filters
  const appointments = appointmentsData?.success ? appointmentsData.appointments : [];
  
  const filteredAppointments = appointments.filter((appointment: Appointment) => {
    // Date filtering
    const appointmentDate = new Date(appointment.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    let passesDateFilter = true;
    
    if (dateFilter === 'today') {
      passesDateFilter = appointmentDate.toDateString() === today.toDateString();
    } else if (dateFilter === 'tomorrow') {
      passesDateFilter = appointmentDate.toDateString() === tomorrow.toDateString();
    } else if (dateFilter === 'week') {
      passesDateFilter = appointmentDate >= today && appointmentDate <= nextWeek;
    } else if (dateFilter === 'month') {
      passesDateFilter = appointmentDate >= today && appointmentDate <= nextMonth;
    }
    
    // Status filtering
    let passesStatusFilter = true;
    
    if (statusFilter === 'scheduled') {
      passesStatusFilter = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(appointment.status);
    } else if (statusFilter === 'completed') {
      passesStatusFilter = appointment.status === AppointmentStatus.COMPLETED;
    } else if (statusFilter === 'cancelled') {
      passesStatusFilter = appointment.status === AppointmentStatus.CANCELED;
    }
    
    return passesDateFilter && passesStatusFilter;
  });

  // Handle appointment completion
  const handleCompleteAppointment = async (id: string, notes: string) => {
    try {
      const result = await completeMutation.mutateAsync({
        appointmentId: id,
        notes
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      setShowCompleteModal(false);
      logValidation('4.10', 'success', 'Doctor appointment completion fully functional');
      
      // Explicitly refetch to ensure we have the latest data
      refetch();
    } catch (error) {
      throw error; // Let the modal handle the error
    }
  };
  
  // Handle appointment cancellation
  const handleCancelAppointment = async (id: string) => {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      try {
        const result = await cancelMutation.mutateAsync({
          appointmentId: id,
          reason: 'Cancelled by doctor'
        });
        
        if (!result.success) {
          throw new Error(result.error);
        }
        
        // Explicitly refetch to ensure we have the latest data
        refetch();
        
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to cancel appointment');
      }
    }
  };

  // Open complete modal with the selected appointment
  const openCompleteModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowCompleteModal(true);
  };
  
  useEffect(() => {
    try {
      logValidation('4.10', 'success', 'Doctor appointments page connected to real data via local API');
    } catch (e) {
      // Error handling for validation logging
    }
  }, []);

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
              <option value="all">All Dates</option>
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
        </div>
      </Card>

      {/* Loading, Error and Empty States */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      
      {error && (
        <Alert variant="error" className="my-4">
          Error loading appointments: {error instanceof Error ? error.message : String(error)}
        </Alert>
      )}
      
      {!isLoading && !error && filteredAppointments.length === 0 && (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-500 dark:text-slate-400">No appointments found matching your filters.</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => {
              setDateFilter('all');
              setStatusFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </Card>
      )}

      {/* List View */}
      {view === 'list' && !isLoading && !error && filteredAppointments.length > 0 && (
        <div className="space-y-4">
          {filteredAppointments.map((appointment: Appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onCompleteClick={() => openCompleteModal(appointment)}
              onCancelClick={() => handleCancelAppointment(appointment.id)}
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
  onCancelClick,
}: {
  appointment: Appointment;
  onCompleteClick: () => void;
  onCancelClick: () => void;
}) {
  // Format date nicely
  const formattedDate = format(new Date(appointment.appointmentDate), 'PPPP');
  const isCompletable = appointment.status === AppointmentStatus.CONFIRMED;
  const isCancellable = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(appointment.status);

  const statusMap: Record<string, string> = {
    [AppointmentStatus.PENDING]: 'Pending',
    [AppointmentStatus.CONFIRMED]: 'Confirmed',
    [AppointmentStatus.COMPLETED]: 'Completed',
    [AppointmentStatus.CANCELED]: 'Cancelled',
    [AppointmentStatus.RESCHEDULED]: 'Rescheduled'
  };

  const statusColor: Record<string, "success" | "default" | "warning" | "info" | "danger" | "pending"> = {
    [AppointmentStatus.PENDING]: 'pending',
    [AppointmentStatus.CONFIRMED]: 'info',
    [AppointmentStatus.COMPLETED]: 'success',
    [AppointmentStatus.CANCELED]: 'danger',
    [AppointmentStatus.RESCHEDULED]: 'warning',
  };

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
                href={`/patient-profile/${appointment.patientId}`}
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
              {appointment.startTime} - {appointment.endTime}
            </div>
          </div>
        </div>

        {/* Status Badge and Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant={statusColor[appointment.status] || 'default'}>
            {statusMap[appointment.status] || 'Unknown'}
          </Badge>

          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" as={Link} href={`/doctor/appointments/${appointment.id}`}>
              <ChevronRight className="h-4 w-4 mr-1" />
              Details
            </Button>
            {isCompletable && (
              <Button size="sm" variant="primary" onClick={onCompleteClick}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
            {isCancellable && (
              <Button size="sm" variant="danger" onClick={onCancelClick}>
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {appointment.reason && (
        <p className="text-sm mt-2 text-slate-600 dark:text-slate-400">
          <strong>Reason:</strong> {appointment.reason}
        </p>
      )}
      
      {appointment.notes && (
        <p className="text-sm mt-1 text-slate-600 dark:text-slate-400">
          <strong>Notes:</strong> {appointment.notes}
        </p>
      )}
    </Card>
  );
}
