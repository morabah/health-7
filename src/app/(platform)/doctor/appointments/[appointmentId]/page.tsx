'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  User,
  ChevronLeft,
  CheckCircle,
  XCircle,
  FileText,
  MessageCircle,
  FileCheck,
  MapPin,
  Video,
  AlertTriangle
} from 'lucide-react';
import { useAppointmentDetails, useCompleteAppointment, useDoctorCancelAppointment } from '@/data/doctorLoaders';
import { AppointmentStatus, AppointmentType } from '@/types/enums';
import { logInfo, logValidation } from '@/lib/logger';
import CompleteAppointmentModal from '@/components/doctor/CompleteAppointmentModal';
import CancelAppointmentModal from '@/components/doctor/CancelAppointmentModal';
import type { Appointment } from '@/types/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { AppointmentErrorBoundary } from "@/components/error-boundaries";
import { ApiError, AppointmentError, SlotUnavailableError } from "@/lib/errors";

// Define response types
interface AppointmentDetailResponse {
  success: boolean;
  error?: string;
  appointment?: Appointment;
}

interface AppointmentActionResponse {
  success: boolean;
  error?: string;
}

export default function AppointmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<{title: string, description: string} | null>(null);
  
  // Simplified toast implementation
  const toast = (message: {title: string, description: string}) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  // Fetch appointment details
  const { data, isLoading, error, refetch } = useAppointmentDetails(params?.appointmentId as string);
  const completeMutation = useCompleteAppointment();
  const cancelMutation = useDoctorCancelAppointment();
  
  // Handle appointment completion
  const handleCompleteAppointment = async (appointmentId: string, notes: string) => {
    try {
      const result = await completeMutation.mutateAsync({
        appointmentId,
        notes
      }) as AppointmentActionResponse;
      
      if (!result.success) {
        throw new ApiError(result.error || 'Failed to mark appointment as completed', {
          code: 'APPOINTMENT_COMPLETION_FAILED', 
          status: 400,
          context: { appointmentId }
        });
      }
      
      setConfirmCompleteOpen(false);
      logInfo('Appointment completed', { id: appointmentId });
      logValidation('4.10', 'success', 'Doctor appointment completion fully functional');
      
      // Refetch appointment details to show updated status
      queryClient.invalidateQueries({ queryKey: ['appointmentDetails', appointmentId] });
      await refetch();
      toast({
        title: "Appointment completed",
        description: "The appointment has been marked as completed.",
      });
    } catch (err) {
      logInfo(`Error completing appointment: ${err instanceof Error ? err.message : String(err)}`);
      throw new AppointmentError(
        err instanceof Error ? err.message : "An error occurred while completing the appointment",
        { 
          appointmentId,
          code: 'APPOINTMENT_COMPLETION_ERROR',
          context: { notes, error: err }
        }
      );
    }
  };
  
  // Handle appointment cancellation
  const handleCancelAppointment = async (id: string, reason: string) => {
    setCancelError(null);
    try {
      const result = await cancelMutation.mutateAsync({
        appointmentId: id,
        reason: reason
      }) as AppointmentActionResponse;
      
      if (!result.success) {
        throw new ApiError(result.error || 'Failed to cancel appointment', {
          code: 'APPOINTMENT_CANCELLATION_FAILED',
          status: 400,
          context: { appointmentId: id, reason }
        });
      }
      
      setConfirmCancelOpen(false);
      logInfo('Appointment cancelled', { id });
      
      // Refetch appointment details to show updated status
      queryClient.invalidateQueries({ queryKey: ['appointmentDetails', id] });
      await refetch();
      toast({
        title: "Appointment cancelled",
        description: "The appointment has been cancelled successfully.",
      });
    } catch (err) {
      throw new AppointmentError(
        err instanceof Error ? err.message : 'An error occurred while cancelling the appointment',
        {
          appointmentId: id,
          code: 'APPOINTMENT_CANCELLATION_ERROR',
          context: { reason, error: err }
        }
      );
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="error" className="my-4">
        Error loading appointment: {error instanceof Error ? error.message : String(error)}
      </Alert>
    );
  }

  const typedData = data as AppointmentDetailResponse;
  const appointment = typedData?.appointment;
  if (!appointment) {
    return (
      <Alert variant="error">Appointment not found</Alert>
    );
  }

  // Format date for display
  const formattedDate = format(new Date(appointment.appointmentDate), 'PPPP');
  
  // Determine if actions are available based on status
  const isCompletable = appointment.status === AppointmentStatus.CONFIRMED;
  const isCancellable = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(appointment.status);
  const isPastAppointment = new Date(appointment.appointmentDate) < new Date();

  // Map for status display
  const statusMap: Record<string, string> = {
    [AppointmentStatus.PENDING]: 'Pending',
    [AppointmentStatus.CONFIRMED]: 'Confirmed',
    [AppointmentStatus.COMPLETED]: 'Completed',
    [AppointmentStatus.CANCELED]: 'Cancelled',
    [AppointmentStatus.RESCHEDULED]: 'Rescheduled'
  };

  // Map for status badge colors
  const statusColor: Record<string, "success" | "default" | "warning" | "info" | "danger" | "pending"> = {
    [AppointmentStatus.PENDING]: 'pending',
    [AppointmentStatus.CONFIRMED]: 'info',
    [AppointmentStatus.COMPLETED]: 'success',
    [AppointmentStatus.CANCELED]: 'danger',
    [AppointmentStatus.RESCHEDULED]: 'warning',
  };

  // Map for appointment type display
  const appointmentTypeMap: Record<string, string> = {
    [AppointmentType.IN_PERSON]: 'In-Person Visit',
    [AppointmentType.VIDEO]: 'Video Consultation'
  };

  return (
    <div className="space-y-6">
      {/* Toast message */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 border-l-4 border-primary-600 animate-fade-in">
          <h4 className="font-medium">{toastMessage.title}</h4>
          <p className="text-gray-500 dark:text-gray-300 text-sm">{toastMessage.description}</p>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Appointment Details</h1>
        <Link href="/doctor/appointments">
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to All Appointments
          </Button>
        </Link>
      </div>

      {cancelError && (
        <Alert variant="error" className="my-4">
          {cancelError}
        </Alert>
      )}

      {/* Status Card */}
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="mr-4">
            <Badge variant={statusColor[appointment.status] || 'default'}>
              {statusMap[appointment.status] || 'Unknown'}
            </Badge>
          </div>
          <div>
            <div className="text-sm text-slate-500">Appointment ID</div>
            <div className="font-mono text-xs">{appointment.id}</div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {isCompletable && !isPastAppointment && (
            <Button size="sm" variant="primary" onClick={() => setConfirmCompleteOpen(true)}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </Button>
          )}
          {isCancellable && (
            <Button size="sm" variant="danger" onClick={() => setConfirmCancelOpen(true)}>
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </Card>

      {/* Patient Information */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">Patient Information</h2>
        <div className="flex items-center mb-4">
          <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 mr-4">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-medium text-lg">{appointment.patientName}</h3>
            <Link
              href={`/patient-profile/${appointment.patientId}`}
              className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
            >
              View Profile
            </Link>
          </div>
        </div>
      </Card>

      {/* Appointment Details */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">Appointment Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center text-slate-600 dark:text-slate-300 mb-2">
                <Calendar className="h-5 w-5 mr-2" />
                <span className="font-medium">Date</span>
              </div>
              <p className="ml-7">{formattedDate}</p>
            </div>
            
            <div>
              <div className="flex items-center text-slate-600 dark:text-slate-300 mb-2">
                <Clock className="h-5 w-5 mr-2" />
                <span className="font-medium">Time</span>
              </div>
              <p className="ml-7">{appointment.startTime} - {appointment.endTime}</p>
            </div>
            
            <div>
              <div className="flex items-center text-slate-600 dark:text-slate-300 mb-2">
                {appointment.appointmentType === AppointmentType.IN_PERSON ? (
                  <MapPin className="h-5 w-5 mr-2" />
                ) : (
                  <Video className="h-5 w-5 mr-2" />
                )}
                <span className="font-medium">Type</span>
              </div>
              <p className="ml-7">{appointmentTypeMap[appointment.appointmentType] || 'In-Person Visit'}</p>
              {appointment.appointmentType === AppointmentType.VIDEO && appointment.videoCallUrl && (
                <a 
                  href={appointment.videoCallUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-7 mt-2 inline-flex items-center text-primary-600 hover:underline"
                >
                  <Video className="h-4 w-4 mr-1" />
                  Join Video Call
                </a>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            {appointment.reason && (
              <div>
                <div className="flex items-center text-slate-600 dark:text-slate-300 mb-2">
                  <FileText className="h-5 w-5 mr-2" />
                  <span className="font-medium">Reason</span>
                </div>
                <p className="ml-7">{appointment.reason}</p>
              </div>
            )}
            
            {appointment.notes && (
              <div>
                <div className="flex items-center text-slate-600 dark:text-slate-300 mb-2">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">Notes</span>
                </div>
                <p className="ml-7">{appointment.notes}</p>
              </div>
            )}
            
            <div>
              <div className="flex items-center text-slate-600 dark:text-slate-300 mb-2">
                <FileCheck className="h-5 w-5 mr-2" />
                <span className="font-medium">Created</span>
              </div>
              <p className="ml-7">{format(new Date(appointment.createdAt), 'PPpp')}</p>
              {appointment.updatedAt !== appointment.createdAt && (
                <p className="ml-7 text-sm text-slate-500">
                  Updated: {format(new Date(appointment.updatedAt), 'PPpp')}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
      
      {/* Complete Appointment Modal */}
      <CompleteAppointmentModal
        isOpen={confirmCompleteOpen}
        onClose={() => setConfirmCompleteOpen(false)}
        appt={typedData?.appointment || null}
        onConfirm={handleCompleteAppointment}
      />

      {/* Cancel Appointment Modal */}
      <CancelAppointmentModal
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        appt={typedData?.appointment || null}
        onConfirm={handleCancelAppointment}
      />
    </div>
  );
} 