'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { format, isValid, parseISO } from 'date-fns';
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { AppointmentStatus, UserType } from '@/types/enums';
import { logInfo } from '@/lib/logger';
import type { Appointment } from '@/types/schemas';
import { useAuth } from '@/context/AuthContext';
import { useErrorSystem, isOnline } from '@/hooks/useErrorSystem';
import AppErrorBoundary from '@/components/error/AppErrorBoundary';
import PageTitle from '@/components/ui/PageTitle';
import Toast from '@/components/ui/Toast';

// Restore original props interface
interface AppointmentDetailPageProps {
  params: {
    appointmentId: string;
  };
}

// Define the expected API response type
interface AppointmentResponse {
  success: boolean;
  appointment: Appointment;
  error?: string;
}

// Keep original data type
interface AppointmentData {
  id: string;
  patientId: string;
  doctorId: string;
  dateTime: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
}

// --- Restore Original Default Export (Client Component) ---
export default function AppointmentDetailPage({ params }: AppointmentDetailPageProps) {
  // Reverted to direct access for Client Component props.
  const appointmentId = params.appointmentId;

  // State and logic moved back into the main component
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const { user } = useAuth();
  const router = useRouter();

  const { handleError, clearError, error } = useErrorSystem({
    component: 'AppointmentDetailPage', // Restored original name
    defaultCategory: 'appointment',
    autoDismiss: true,
    autoDismissTimeout: 5000,
  });

  const isOwner = appointment?.doctorId === user?.uid;

  // Fetch appointment details - useEffect remains appropriate here
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchDetails = async (signal: AbortSignal) => {
      if (!user?.uid || !appointmentId) return;

      setLoading(true);

      try {
        if (!isOnline()) {
          setToastMessage('You are offline. Some features may be limited.');
          setToastType('warning');
        }

        const { queryClient } = await import('@/lib/queryClient');

        // Fetch fresh data using React Query
        const result = await queryClient.fetchQuery<AppointmentResponse>({
          queryKey: ['appointmentDetails', appointmentId, user?.uid],
          queryFn: async ({ signal: querySignal }): Promise<AppointmentResponse> => {
            if (!user?.uid) throw new Error('Not authenticated');

            const { doctorGetAppointmentById } = await import('@/data/doctorLoaders');
            const response = await doctorGetAppointmentById(
              {
                uid: user.uid,
                role: user.role,
              },
              appointmentId
            );

            return response as AppointmentResponse;
          },
          staleTime: 5 * 60 * 1000, // 5 minutes
        });

        if (isMounted && result.success && result.appointment) {
          setAppointment(result.appointment as unknown as AppointmentData);
          logInfo('Appointment details loaded successfully', { appointmentId });
        }
      } catch (err) {
        if (isMounted) {
          handleError(err, {
            category: 'appointment',
            message: 'Failed to load appointment details',
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDetails(controller.signal);

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [appointmentId, user, handleError]);

  // Complete appointment
  const handleComplete = async () => {
    if (!isOwner) {
      handleError(new Error('You are not authorized to complete this appointment'), {
        category: 'permission',
        message: 'You do not have permission to complete this appointment',
        severity: 'warning',
      });
      return;
    }

    setActionInProgress(true);

    try {
      if (!isOnline()) {
        setToastMessage('Cannot complete appointment while offline');
        setToastType('error');
        setActionInProgress(false);
        return;
      }

      const { callApi } = await import('@/lib/apiClient');
      await callApi('completeAppointment', { appointmentId });

      setAppointment(prev => (prev ? { ...prev, status: 'completed' } : null));
      setToastMessage('Appointment marked as completed successfully');
      setToastType('success');
      clearError();
    } catch (err) {
      handleError(err, {
        category: 'appointment',
        message: 'Failed to complete appointment',
      });
      setToastMessage('Failed to complete appointment');
      setToastType('error');
    } finally {
      setActionInProgress(false);
    }
  };

  // Cancel appointment
  const handleCancel = async () => {
    if (!isOwner) {
      handleError(new Error('You are not authorized to cancel this appointment'), {
        category: 'permission',
        message: 'You do not have permission to cancel this appointment',
        severity: 'warning',
      });
      return;
    }

    setActionInProgress(true);

    try {
      if (!isOnline()) {
        setToastMessage('Cannot cancel appointment while offline');
        setToastType('error');
        setActionInProgress(false);
        return;
      }

      const { callApi } = await import('@/lib/apiClient');
      await callApi('cancelAppointment', { appointmentId, reason: 'Cancelled by doctor' });

      setAppointment(prev => (prev ? { ...prev, status: 'cancelled' } : null));
      setToastMessage('Appointment cancelled successfully');
      setToastType('success');
      clearError();
    } catch (err) {
      handleError(err, {
        category: 'appointment',
        message: 'Failed to cancel appointment',
      });
      setToastMessage('Failed to cancel appointment');
      setToastType('error');
    } finally {
      setActionInProgress(false);
    }
  };

  // Close toast
  const handleCloseToast = () => {
    setToastMessage(null);
  };

  // --- Rendering Logic ---

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  // Error Boundary will catch major render errors
  // Handle specific data loading errors here
  if (!appointment && error) {
    // Show error if loading failed and we have an error object
    return (
      <Alert variant={'severity' in error && error.severity === 'warning' ? 'warning' : 'error'}>
        <div>
          <h3 className="font-bold">Error Loading Appointment</h3>
          <p>
            {'message' in error && error.message
              ? error.message
              : 'Could not load appointment details.'}
          </p>
        </div>
      </Alert>
    );
  }

  if (!appointment && !loading) {
    // Handle case where loading finished but appointment is still null (e.g., not found)
    return (
      <Alert variant="warning">
        <div>
          <h3 className="font-bold">Appointment Not Found</h3>
          <p>The appointment (ID: {appointmentId}) doesn't exist or you lack permission.</p>
        </div>
      </Alert>
    );
  }

  // Add final null check to satisfy TypeScript before accessing appointment properties
  if (!appointment) {
    // This case should ideally be caught by the checks above,
    // but this satisfies TypeScript and handles unexpected states.
    return (
      <Alert variant="error">Could not display appointment data. Please try refreshing.</Alert>
    );
  }

  // If appointment exists, render details
  return (
    <AppErrorBoundary componentName="AppointmentDetailPageContent">
      <div className="space-y-6">
        {toastMessage && (
          <Toast
            message={toastMessage}
            variant={toastType}
            onClose={handleCloseToast}
            autoClose={5000}
          />
        )}

        {/* Display error from useErrorSystem if it exists (e.g., from failed actions) */}
        {error && (
          <Alert
            variant={'severity' in error && error.severity === 'warning' ? 'warning' : 'error'}
          >
            <div>
              <h3 className="font-bold">
                {'category' in error && error.category === 'permission'
                  ? 'Access Denied'
                  : 'Action Failed'}
              </h3>
              <p>{'message' in error && error.message ? error.message : 'An error occurred.'}</p>
            </div>
          </Alert>
        )}

        {/* Not owner warning */}
        {!isOwner && (
          <Alert variant="warning">
            <div>
              <h3 className="font-bold">Notice</h3>
              <p>
                You are viewing an appointment that is not assigned to you. You cannot modify it.
              </p>
            </div>
          </Alert>
        )}

        <PageTitle title="Appointment Details" subtitle={`Appointment #${appointment.id}`} />

        <div className="grid md:grid-cols-2 gap-6">
          {/* Appointment Info Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Appointment Information</h2>
            <div className="space-y-4">
              <InfoRow
                Icon={Calendar}
                label="Date"
                value={formatDateTime(appointment.dateTime, 'MMMM dd, yyyy')}
              />
              <InfoRow
                Icon={Clock}
                label="Time"
                value={formatDateTime(appointment.dateTime, 'h:mm a')}
              />
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary-600 mt-0.5" />
                <div>
                  <p className="font-medium">Status</p>
                  <StatusBadge status={appointment.status} />
                </div>
              </div>
              {appointment.notes && (
                <InfoRow Icon={FileText} label="Notes" value={appointment.notes} />
              )}
              {appointment.cancellationReason && (
                <InfoRow
                  Icon={XCircle}
                  label="Cancellation Reason"
                  value={appointment.cancellationReason}
                  className="text-red-500"
                  iconClassName="text-red-500"
                />
              )}
            </div>
          </Card>

          {/* Patient Info Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Patient Information</h2>
            {appointment.patient ? (
              <div className="space-y-4">
                <InfoRow Icon={User} label="Name" value={appointment.patient.name} />
                <InfoRow Icon={Mail} label="Email" value={appointment.patient.email} />
                {appointment.patient.phone && (
                  <InfoRow Icon={Phone} label="Phone" value={appointment.patient.phone} />
                )}
                {appointment.patient.address && (
                  <InfoRow Icon={MapPin} label="Address" value={appointment.patient.address} />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <div className="text-center text-gray-500">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Patient information not available</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Action Buttons */}
        {appointment.status === 'scheduled' && (
          <div className="flex flex-wrap gap-4 mt-6">
            <Button
              variant="primary"
              onClick={handleComplete}
              disabled={actionInProgress || !isOwner}
              isLoading={actionInProgress}
            >
              Mark as Completed
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              disabled={actionInProgress || !isOwner}
              isLoading={actionInProgress}
            >
              Cancel Appointment
            </Button>
          </div>
        )}
      </div>
    </AppErrorBoundary>
  );
}

// Helper component for displaying info rows
function InfoRow({
  Icon,
  label,
  value,
  className = 'text-gray-600 dark:text-gray-300',
  iconClassName = 'text-primary-600',
}: {
  Icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  className?: string;
  iconClassName?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className={`w-5 h-5 ${iconClassName} mt-0.5`} />
      <div>
        <p className="font-medium">{label}</p>
        <p className={className}>{value}</p>
      </div>
    </div>
  );
}

// Helper to format date/time safely
function formatDateTime(dateTimeString: string | null | undefined, formatString: string): string {
  if (!dateTimeString) return 'Not available';
  try {
    const date = parseISO(dateTimeString);
    if (isValid(date)) {
      return format(date, formatString);
    } else {
      return 'Invalid date/time';
    }
  } catch (e) {
    return 'Invalid date/time format';
  }
}

// Helper component for Status Badge
function StatusBadge({ status }: { status: string }) {
  let bgColor = '';
  let textColor = '';
  let icon = null;
  let displayStatus = status;

  switch (status?.toLowerCase()) {
    case 'scheduled':
    case 'pending':
    case 'confirmed':
      bgColor = 'bg-blue-100 dark:bg-blue-900/30';
      textColor = 'text-blue-800 dark:text-blue-300';
      icon = <Calendar className="w-4 h-4" />;
      displayStatus = 'Scheduled';
      break;
    case 'completed':
      bgColor = 'bg-green-100 dark:bg-green-900/30';
      textColor = 'text-green-800 dark:text-green-300';
      icon = <CheckCircle className="w-4 h-4" />;
      displayStatus = 'Completed';
      break;
    case 'cancelled':
    case 'canceled':
      bgColor = 'bg-red-100 dark:bg-red-900/30';
      textColor = 'text-red-800 dark:text-red-300';
      icon = <XCircle className="w-4 h-4" />;
      displayStatus = 'Cancelled';
      break;
    default:
      bgColor = 'bg-gray-100 dark:bg-gray-700';
      textColor = 'text-gray-800 dark:text-gray-300';
      displayStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
      icon = <AlertCircle className="w-4 h-4" />;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium ${bgColor} ${textColor}`}
    >
      {icon}
      {displayStatus}
    </span>
  );
}
