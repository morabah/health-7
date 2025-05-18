'use client';

import React, { useState, useEffect } from 'react';
import { useMyAppointments } from '@/data/sharedLoaders';
import { UserType, AppointmentStatus } from '@/types/enums';
import { ApiErrorBoundary } from '@/components/error-boundaries';
import useStandardErrorHandling from '@/hooks/useStandardErrorHandling';
import { logInfo } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar, Clock, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

// Helper to safely format dates
const safeFormat = (dateStr: string | undefined, formatStr: string): string => {
  if (!dateStr) return 'Invalid Date';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return 'Invalid Date';
    return format(date, formatStr);
  } catch (e) {
    return 'Invalid Date';
  }
};

// Helper for badge variant
const getStatusVariant = (
  status?: AppointmentStatus
): 'info' | 'success' | 'danger' | 'default' => {
  switch (status) {
    case AppointmentStatus.CONFIRMED:
    case AppointmentStatus.PENDING:
      return 'info';
    case AppointmentStatus.COMPLETED:
      return 'success';
    case AppointmentStatus.CANCELED:
      return 'danger';
    default:
      return 'default';
  }
};

interface DoctorAppointmentListProps {
  limit?: number;
  showHeader?: boolean;
  filter?: 'upcoming' | 'today' | 'past' | 'all';
}

/**
 * Doctor Appointment List Component
 * 
 * Displays a list of appointments for a doctor with standardized error handling.
 * Uses ApiErrorBoundary for API-related errors and useStandardErrorHandling for
 * component-level error handling.
 */
async function DoctorAppointmentList({
  limit = 5,
  showHeader = true,
  filter = 'upcoming',
}: DoctorAppointmentListProps) {
  // Use our standard error handling hook
  const { handleError, withErrorHandling } = useStandardErrorHandling({
    componentName: 'DoctorAppointmentList',
    defaultCategory: 'data',
    defaultSeverity: 'warning',
    defaultMessage: 'Failed to load your appointments. Please try again later.',
  });

  // Fetch appointments with React Query
  const { 
    data, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useMyAppointments(UserType.DOCTOR);
  
  // Define a type for the appointment data
  type AppointmentData = {
    appointments?: any[];
    success?: boolean;
  };

  // Process appointments with error handling
  const processAppointments = withErrorHandling(async () => {
    const appointmentData = data as AppointmentData;
    if (!appointmentData || !appointmentData.appointments) {
      throw new Error('No appointment data available');
    }
    
    // Log successful data retrieval
    const appointments = appointmentData.appointments || [];
    logInfo('Doctor appointments loaded successfully', { 
      count: appointments.length,
      filter
    });
    
    // Filter appointments based on the filter prop
    let filteredAppointments = [...appointments];
    
    if (filter === 'upcoming') {
      filteredAppointments = filteredAppointments.filter(
        (apt) => apt.status !== AppointmentStatus.COMPLETED && apt.status !== AppointmentStatus.CANCELED
      );
    } else if (filter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filteredAppointments = filteredAppointments.filter(
        (apt) => apt.appointmentDate?.split('T')[0] === today
      );
    } else if (filter === 'past') {
      filteredAppointments = filteredAppointments.filter(
        (apt) => apt.status === AppointmentStatus.COMPLETED || apt.status === AppointmentStatus.CANCELED
      );
    }
    
    // Sort appointments by date (most recent first)
    filteredAppointments.sort((a, b) => {
      const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
      const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
      return dateB - dateA;
    });
    
    // Apply limit
    return filteredAppointments.slice(0, limit);
  }, {
    message: `Failed to process ${filter} appointments`,
    category: 'data',
  });

  // Track performance
  useEffect(() => {
    const tracker = trackPerformance('DoctorAppointmentList_render');
    return () => {
      tracker.stop();
    };
  }, []);

  // Handle manual retry
  const handleRetry = () => {
    refetch().catch(error => {
      handleError(error, {
        message: 'Failed to refresh appointments',
        category: 'api',
      });
    });
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[200px]">
        <Spinner size="md" />
        <p className="mt-2 text-slate-600 dark:text-slate-400">Loading appointments...</p>
      </div>
    );
  }

  // Render error state (this should be caught by the ApiErrorBoundary)
  if (isError) {
    throw error; // Let the error boundary handle this
  }

  // Process appointments with error handling
  let appointments: any[] = [];
  try {
    appointments = await processAppointments();
  } catch (error) {
    // This error will be caught by the ApiErrorBoundary
    throw error;
  }

  // Render empty state
  if (!appointments || appointments.length === 0) {
    return (
      <div className="p-6 text-center border rounded-lg bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
        <Calendar className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500 mb-2" />
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No appointments found</h3>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          {filter === 'upcoming'
            ? 'You have no upcoming appointments scheduled.'
            : filter === 'today'
            ? 'You have no appointments scheduled for today.'
            : filter === 'past'
            ? 'You have no past appointments.'
            : 'No appointments found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
            {filter === 'upcoming'
              ? 'Upcoming Appointments'
              : filter === 'today'
              ? 'Today\'s Appointments'
              : filter === 'past'
              ? 'Past Appointments'
              : 'All Appointments'}
          </h3>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Refresh
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="p-4 border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-slate-800 dark:text-slate-200">
                  {appointment.patientName || 'Unknown Patient'}
                </h4>
                <div className="mt-1 flex items-center text-sm text-slate-600 dark:text-slate-400">
                  <Calendar className="w-4 h-4 mr-1" />
                  {safeFormat(appointment.appointmentDate, 'MMM d, yyyy')}
                  <span className="mx-1">•</span>
                  <Clock className="w-4 h-4 mr-1" />
                  {safeFormat(appointment.appointmentDate, 'h:mm a')}
                </div>
                {appointment.reason && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    {appointment.reason.length > 100
                      ? `${appointment.reason.substring(0, 100)}...`
                      : appointment.reason}
                  </p>
                )}
              </div>
              <Badge variant={getStatusVariant(appointment.status)}>
                {appointment.status}
              </Badge>
            </div>
            
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <User className="w-4 h-4 mr-1" />
                {appointment.patientId ? `Patient ID: ${appointment.patientId.substring(0, 8)}...` : 'No patient ID'}
              </div>
              <div className="flex space-x-2">
                {appointment.status === AppointmentStatus.PENDING && (
                  <>
                    <Button size="sm" variant="success">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Confirm
                    </Button>
                    <Button size="sm" variant="danger">
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </>
                )}
                {appointment.status === AppointmentStatus.CONFIRMED && (
                  <Button size="sm" variant="primary">
                    View Details
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Wrapped DoctorAppointmentList with ApiErrorBoundary
 * 
 * This ensures that any API-related errors are properly caught and displayed
 * with a consistent UI.
 */
export default function DoctorAppointmentListWithErrorHandling(props: DoctorAppointmentListProps) {
  return (
    <ApiErrorBoundary componentName="DoctorAppointmentList">
      {/* @ts-ignore - TypeScript doesn't handle async components well */}
      <DoctorAppointmentList {...props} />
    </ApiErrorBoundary>
  );
}
