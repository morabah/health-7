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
  MapPin
} from 'lucide-react';
import { AppointmentStatus, UserType } from '@/types/enums';
import { logInfo } from '@/lib/logger';
import type { Appointment } from '@/types/schemas';
import { useAuth } from '@/context/AuthContext';
import { useErrorSystem, isOnline } from '@/hooks/useErrorSystem';
import AppErrorBoundary from '@/components/error/AppErrorBoundary';
import PageTitle from '@/components/ui/PageTitle';
import Toast from '@/components/ui/Toast';

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

export default function AppointmentDetailPage({ params }: AppointmentDetailPageProps) {
  // Fix: Don't use React.use() - directly access the appointmentId from params
  const appointmentId = params.appointmentId;
  
  return (
    <AppErrorBoundary componentName="AppointmentDetailPage">
      <AppointmentDetail appointmentId={appointmentId} />
    </AppErrorBoundary>
  );
}

function useCleanupEffect(
  effect: (signal: AbortSignal) => Promise<void> | void, 
  deps: React.DependencyList
) {
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    
    const runEffect = async () => {
      try {
        await effect(controller.signal);
      } catch (error) {
        // Ignore abort errors
        if (!(error instanceof DOMException && error.name === 'AbortError') && isMounted) {
          throw error;
        }
      }
    };
    
    runEffect();
    
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, deps);
}

function AppointmentDetail({ appointmentId }: { appointmentId: string }) {
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const { user } = useAuth();
  const router = useRouter();
  
  // Use our error system
  const { handleError, clearError, error } = useErrorSystem({
    component: 'AppointmentDetail',
    defaultCategory: 'appointment',
    autoDismiss: true,
    autoDismissTimeout: 5000
  });

  const isOwner = appointment?.doctorId === user?.uid;
  
  // Fetch appointment details
  useCleanupEffect(async (signal) => {
    if (!user?.uid || !appointmentId) return;
    
    setLoading(true);
    
    try {
      if (!isOnline()) {
        setToastMessage('You are offline. Some features may be limited.');
        setToastType('warning');
      }
      
      // Import the useAppointmentDetails hook from doctorLoaders to leverage React Query caching
      const { queryClient } = await import('@/lib/queryClient');
      
      // Use the queryClient to fetch the data once
      const cachedData = queryClient.getQueryData<AppointmentResponse>(['appointmentDetails', appointmentId, user?.uid]);
      
      if (cachedData) {
        // Use cached data if available
        setAppointment(cachedData.appointment as unknown as AppointmentData);
        logInfo('Using cached appointment details', { appointmentId });
      } else {
        // Fetch fresh data if not in cache
        const result = await queryClient.fetchQuery<AppointmentResponse>({
          queryKey: ['appointmentDetails', appointmentId, user?.uid],
          queryFn: async ({ signal }): Promise<AppointmentResponse> => {
            if (!user?.uid) throw new Error('Not authenticated');
            
            // Call the existing API method with proper context
            const { doctorGetAppointmentById } = await import('@/data/doctorLoaders');
            const response = await doctorGetAppointmentById({ 
              uid: user.uid, 
              role: user.role 
            }, appointmentId);
            
            // Ensure we're returning the expected type
            return response as AppointmentResponse;
          },
          staleTime: 5 * 60 * 1000 // 5 minutes
        });
        
        if (result.success && result.appointment) {
          setAppointment(result.appointment as unknown as AppointmentData);
          logInfo('Appointment details loaded successfully', { appointmentId });
        }
      }
    } catch (error) {
      handleError(error, {
        category: 'appointment',
        message: 'Failed to load appointment details'
      });
    } finally {
      setLoading(false);
    }
  }, [appointmentId, user, handleError]);

  // Complete appointment
  const handleComplete = async () => {
    if (!isOwner) {
      handleError(new Error('You are not authorized to complete this appointment'), {
        category: 'permission',
        message: 'You do not have permission to complete this appointment',
        severity: 'warning'
      });
      return;
    }

    setActionInProgress(true);
    
    try {
      // Check if we're online
      if (!isOnline()) {
        setToastMessage('Cannot complete appointment while offline');
        setToastType('error');
        setActionInProgress(false);
        return;
      }

      const { callApi } = await import('@/lib/apiClient');
      await callApi('doctorCompleteAppointment', { appointmentId });
      
      // Update the local appointment state
      setAppointment(prev => prev ? { ...prev, status: 'completed' } : null);
      
      setToastMessage('Appointment marked as completed successfully');
      setToastType('success');
      
      // Clear any existing errors
      clearError();
    } catch (error) {
      handleError(error, {
        category: 'appointment',
        message: 'Failed to complete appointment'
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
        severity: 'warning'
      });
      return;
    }

    setActionInProgress(true);
    
    try {
      // Check if we're online
      if (!isOnline()) {
        setToastMessage('Cannot cancel appointment while offline');
        setToastType('error');
        setActionInProgress(false);
        return;
      }
      
      const { callApi } = await import('@/lib/apiClient');
      await callApi('doctorCancelAppointment', { appointmentId, reason: 'Cancelled by doctor' });
      
      // Update the local appointment state
      setAppointment(prev => prev ? { ...prev, status: 'cancelled' } : null);
      
      setToastMessage('Appointment cancelled successfully');
      setToastType('success');
      
      // Clear any existing errors
      clearError();
    } catch (error) {
      handleError(error, {
        category: 'appointment',
        message: 'Failed to cancel appointment'
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (!appointment && !error) {
    return (
      <Alert variant="warning">
        <div>
          <h3 className="font-bold">Appointment Not Found</h3>
          <p>The appointment you're looking for doesn't exist or you don't have permission to view it.</p>
        </div>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast message */}
      {toastMessage && (
        <Toast 
          message={toastMessage} 
          variant={toastType} 
          onClose={handleCloseToast} 
          autoClose={5000}
        />
      )}
      
      {/* Error handling */}
      {error && (
        <Alert variant={
          typeof error === 'object' && 'severity' in error && error.severity === 'warning' 
            ? 'warning' 
            : 'error'
        }>
          <div>
            <h3 className="font-bold">
              {typeof error === 'object' && 'category' in error && error.category === 'permission' 
                ? 'Access Denied' 
                : 'Error'}
            </h3>
            <p>
              {typeof error === 'object' && 'message' in error 
                ? error.message 
                : 'An error occurred while loading the appointment details.'}
            </p>
      </div>
        </Alert>
      )}

      {/* Not owner warning */}
      {appointment && !isOwner && (
        <Alert variant="warning">
          <div>
            <h3 className="font-bold">Notice</h3>
            <p>You are viewing an appointment that is not assigned to you. You cannot modify it.</p>
          </div>
        </Alert>
      )}
      
      {appointment && (
        <>
          <PageTitle 
            title="Appointment Details" 
            subtitle={`Appointment #${appointment.id}`}
          />
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Appointment Info Card */}
      <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Appointment Information</h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary-600 mt-0.5" />
          <div>
                    <p className="font-medium">Date</p>
                    <p className="text-gray-600 dark:text-gray-300">
                      {appointment.dateTime && typeof appointment.dateTime === 'string' && isValid(parseISO(appointment.dateTime))
                        ? format(parseISO(appointment.dateTime), 'MMMM dd, yyyy')
                        : 'Invalid date'}
                    </p>
          </div>
        </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary-600 mt-0.5" />
            <div>
                    <p className="font-medium">Time</p>
                    <p className="text-gray-600 dark:text-gray-300">
                      {appointment.dateTime && typeof appointment.dateTime === 'string' && isValid(parseISO(appointment.dateTime))
                        ? format(parseISO(appointment.dateTime), 'h:mm a')
                        : 'Invalid time'}
                    </p>
              </div>
            </div>
            
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-primary-600 mt-0.5" />
            <div>
                    <p className="font-medium">Status</p>
                    <StatusBadge status={appointment.status} />
              </div>
            </div>
            
                {appointment.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Notes</p>
                      <p className="text-gray-600 dark:text-gray-300">{appointment.notes}</p>
                    </div>
                  </div>
                )}
                
                {appointment.cancellationReason && (
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
                      <p className="font-medium">Cancellation Reason</p>
                      <p className="text-gray-600 dark:text-gray-300">{appointment.cancellationReason}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
            
            {/* Patient Info Card */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Patient Information</h2>
              
              {appointment.patient ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Name</p>
                      <p className="text-gray-600 dark:text-gray-300">{appointment.patient.name || 'Not available'}</p>
                    </div>
                  </div>
                
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-gray-600 dark:text-gray-300">{appointment.patient.email || 'Not available'}</p>
                    </div>
                  </div>
                  
                  {appointment.patient.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-primary-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Phone</p>
                        <p className="text-gray-600 dark:text-gray-300">{appointment.patient.phone}</p>
                      </div>
                    </div>
                  )}
                
                  {appointment.patient.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Address</p>
                        <p className="text-gray-600 dark:text-gray-300">{appointment.patient.address}</p>
                      </div>
                    </div>
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
                isLoading={actionInProgress && toastType !== 'success'}
              >
                Mark as Completed
              </Button>
              
              <Button
                variant="danger"
                onClick={handleCancel}
                disabled={actionInProgress || !isOwner}
                isLoading={actionInProgress && toastType !== 'success'}
              >
                Cancel Appointment
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let bgColor = '';
  let textColor = '';
  let icon = null;
  
  switch (status) {
    case 'scheduled':
      bgColor = 'bg-blue-100 dark:bg-blue-900/30';
      textColor = 'text-blue-800 dark:text-blue-300';
      icon = <Calendar className="w-4 h-4" />;
      break;
    case 'completed':
      bgColor = 'bg-green-100 dark:bg-green-900/30';
      textColor = 'text-green-800 dark:text-green-300';
      icon = <CheckCircle className="w-4 h-4" />;
      break;
    case 'cancelled':
      bgColor = 'bg-red-100 dark:bg-red-900/30';
      textColor = 'text-red-800 dark:text-red-300';
      icon = <XCircle className="w-4 h-4" />;
      break;
    default:
      bgColor = 'bg-gray-100 dark:bg-gray-700';
      textColor = 'text-gray-800 dark:text-gray-300';
  }
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium ${bgColor} ${textColor}`}>
      {icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
} 