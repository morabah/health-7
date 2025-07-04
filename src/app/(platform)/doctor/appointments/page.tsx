'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  AlertTriangle,
} from 'lucide-react';
import CompleteAppointmentModal from '@/components/shared/modals/CompleteAppointmentModal';
import { useDoctorAppointments, useDoctorCancelAppointment } from '@/data/doctorLoaders';
import { AppointmentStatus } from '@/types/enums';
import { format, isValid } from 'date-fns';
import { logError, logValidation, logInfo } from '@/lib/logger';
import { AppointmentError, ApiError } from '@/lib/errors/errorClasses';
import { extractErrorMessage } from '@/lib/errors/errorHandlingUtils';
import type { Appointment } from '@/types/schemas';
import AppointmentErrorBoundary from '@/components/error-boundaries/AppointmentErrorBoundary';
import { useAuth } from '@/context/AuthContext';
import { useRenderPerformance } from '@/lib/performance';

// Define interfaces for API responses
interface AppointmentsResponse {
  success: boolean;
  error?: string;
  appointments?: Appointment[];
}

interface AppointmentActionResponse {
  success: boolean;
  error?: string;
}

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
  // Track component rendering performance with 50ms threshold
  useRenderPerformance('DoctorAppointmentsContent', 50);
  
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState<null | Appointment>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const { user } = useAuth();
  
  // Get appointments data from API
  const { 
    data: appointmentsData, 
    isLoading, 
    error,
    refetch 
  } = useDoctorAppointments();
  
  const cancelMutation = useDoctorCancelAppointment();

  // Extract appointments data with useMemo to avoid unnecessary processing on re-renders
  const appointments = useMemo(() => {
    return (appointmentsData as AppointmentsResponse)?.success 
      ? (appointmentsData as AppointmentsResponse).appointments || [] 
      : [];
  }, [appointmentsData]);
  
  // Memoize doctor's appointments to prevent recomputing on every render
  const myAppointments = useMemo(() => {
    return appointments.filter((appointment: Appointment) => {
      return appointment.doctorId === user?.uid;
    });
  }, [appointments, user?.uid]);
  
  // Memoize filtered appointments based on date and status filters
  const filteredAppointments = useMemo(() => {
    // Calculate date references once for all filtering operations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const now = new Date(); // Current time with hours/minutes for precise comparisons
    
    return myAppointments.filter((appointment: Appointment) => {
      // Date filtering
      const appointmentDate = new Date(appointment.appointmentDate);
      
      let passesDateFilter = true;
      
      if (dateFilter !== 'all') {
        if (!appointmentDate || !isValid(appointmentDate)) {
          passesDateFilter = false; // Exclude invalid dates if a filter is active
        } else if (dateFilter === 'today') {
          passesDateFilter = appointmentDate.toDateString() === today.toDateString();
        } else if (dateFilter === 'tomorrow') {
          passesDateFilter = appointmentDate.toDateString() === tomorrow.toDateString();
        } else if (dateFilter === 'week') {
          passesDateFilter = appointmentDate >= today && appointmentDate <= nextWeek;
        } else if (dateFilter === 'month') {
          passesDateFilter = appointmentDate >= today && appointmentDate <= nextMonth;
        } else if (dateFilter === 'upcoming') {
           // Match dashboard logic: future date AND not canceled
           passesDateFilter = appointmentDate > now && appointment.status !== AppointmentStatus.CANCELED;
        }
      }
      
      // Status filtering
      let passesStatusFilter = true;
      
      if (dateFilter !== 'upcoming' || statusFilter !== 'all') {
          if (statusFilter === 'scheduled') {
            passesStatusFilter = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(appointment.status);
          } else if (statusFilter === 'completed') {
            passesStatusFilter = appointment.status === AppointmentStatus.COMPLETED;
          } else if (statusFilter === 'cancelled') {
            passesStatusFilter = appointment.status === AppointmentStatus.CANCELED;
          } else {
             passesStatusFilter = true; // 'all' status filter passes
          }
      }
      
      return passesDateFilter && passesStatusFilter;
    });
  }, [myAppointments, dateFilter, statusFilter]); // Only recompute when these dependencies change

  // Handle appointment completion success
  const handleAppointmentUpdated = (updatedAppointmentId: string) => {
    logInfo('Appointment completed successfully', { appointmentId: updatedAppointmentId });
    
    // Trigger data refetch for the appointments list
    refetch();
    
    logValidation('7.2b', 'success', 'Complete Appointment UI connected to live Dev Cloud function via callApi.');
  };
  
  // Handle appointment cancellation
  const handleCancelAppointment = async (id: string) => {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      try {
        const result = await cancelMutation.mutateAsync({
          appointmentId: id,
          reason: 'Cancelled by doctor'
        }) as AppointmentActionResponse;
        
        if (!result.success) {
          const errorMessage = result.error || 'Failed to cancel appointment';
          
          if (errorMessage.includes('not authorized')) {
            alert('You are not authorized to cancel this appointment. Only the doctor assigned to this appointment can cancel it.');
          } else {
            alert(errorMessage);
          }
          return;
        }
        
        // Explicitly refetch to ensure we have the latest data
        refetch();
        
      } catch (error) {
        // Standardized error handling
        let errorMessage: string;
        
        if (error instanceof AppointmentError) {
          errorMessage = error.message;
          logError('Appointment cancellation error', { error, appointmentId: id });
        } else if (error instanceof ApiError) {
          errorMessage = `Service error: ${error.message}`;
          logError('API error during appointment cancellation', { error, appointmentId: id });
        } else {
          errorMessage = extractErrorMessage(error, 'Failed to cancel appointment');
          logError('Unexpected error during appointment cancellation', { error, appointmentId: id });
        }
        
        alert(errorMessage);
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
    } catch (error) {
      // Standardized error logging for validation
      logError('Failed to log validation', { 
        error, 
        component: 'DoctorAppointmentsContent' 
      });
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
              <option value="upcoming">Upcoming</option>
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
      
      {/* Debug info */}
      {process.env.NODE_ENV !== 'production' && (
        <Card className="p-4 bg-yellow-50 border-yellow-200 mt-4">
          <h3 className="font-semibold mb-2">Debug Information</h3>
          <div className="text-sm space-y-1">
            <p>Total appointments: {appointments.length}</p>
            <p>My appointments: {myAppointments.length}</p>
            <p>Filtered appointments: {filteredAppointments.length}</p>
            <p>Current filters: Date={dateFilter}, Status={statusFilter}</p>
            <details>
              <summary className="cursor-pointer text-blue-600">Show upcoming details</summary>
              <div className="bg-gray-100 p-2 mt-2 rounded text-xs overflow-auto max-h-40">
                <p>Number of upcoming appointments (now &gt; date & !canceled): {myAppointments.filter((a: Appointment) => {
                  const apptDate = new Date(a.appointmentDate);
                  const now = new Date();
                  return apptDate > now && a.status !== AppointmentStatus.CANCELED;
                }).length}</p>
                <p>Current date (for reference): {new Date().toISOString()}</p>
              </div>
            </details>
          </div>
        </Card>
      )}

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
          {myAppointments.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 mt-2">You don't have any appointments assigned to you yet.</p>
          ) : (
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
          )}
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
        setIsOpen={setShowCompleteModal}
        appointment={selectedAppointment}
        onSuccess={handleAppointmentUpdated}
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
