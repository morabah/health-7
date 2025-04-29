'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  MessageCircle, 
  ChevronLeft, 
  FileCheck,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';

import { useAppointmentDetails, useCancelAppointment } from '@/data/patientLoaders';
import { AppointmentStatus, AppointmentType } from '@/types/enums';

// Status display helpers
const statusMap = {
  [AppointmentStatus.PENDING]: 'Pending',
  [AppointmentStatus.CONFIRMED]: 'Confirmed',
  [AppointmentStatus.CANCELED]: 'Cancelled',
  [AppointmentStatus.COMPLETED]: 'Completed',
  [AppointmentStatus.RESCHEDULED]: 'Rescheduled',
};

const statusColor: Record<string, "success" | "default" | "warning" | "info" | "danger" | "pending"> = {
  [AppointmentStatus.PENDING]: 'pending',
  [AppointmentStatus.CONFIRMED]: 'info',
  [AppointmentStatus.CANCELED]: 'danger',
  [AppointmentStatus.COMPLETED]: 'success',
  [AppointmentStatus.RESCHEDULED]: 'warning',
};

const typeMap = {
  [AppointmentType.IN_PERSON]: 'In-Person',
  [AppointmentType.VIDEO]: 'Video Call',
};

export default function PatientAppointmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.appointmentId as string;
  
  // State for cancellation
  const [cancellationReason, setCancellationReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Fetch appointment details
  const { 
    data: appointmentData, 
    isLoading, 
    error, 
    refetch 
  } = useAppointmentDetails(appointmentId);
  
  const cancelMutation = useCancelAppointment();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error || !appointmentData?.success) {
    return (
      <Alert variant="danger">
        {error?.message || appointmentData?.error || 'Failed to load appointment details'}
      </Alert>
    );
  }

  const appointment = appointmentData.appointment;
  
  // Determine if appointment can be cancelled
  const isCancellable = 
    appointment.status === AppointmentStatus.PENDING || 
    appointment.status === AppointmentStatus.CONFIRMED;
  
  // Check if appointment is in the past
  const isPast = new Date(appointment.appointmentDate) < new Date();

  const handleCancelAppointment = async () => {
    try {
      const result = await cancelMutation.mutateAsync({ 
        appointmentId, 
        reason: 'Cancelled by patient' 
      });
      
      if (result.success) {
        // Refresh appointment data
        refetch();
        setShowCancelConfirm(false);
      } else {
        alert('Failed to cancel appointment: ' + result.error);
      }
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      alert('An error occurred while cancelling your appointment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Appointment Details</h1>
        <Link href="/patient/appointments">
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to My Appointments
          </Button>
        </Link>
      </div>

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
        
        {isCancellable && !isPast && (
          <div>
            <Button 
              size="sm" 
              variant="danger" 
              onClick={() => setShowCancelConfirm(true)}
              disabled={cancelMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancel Appointment
            </Button>
          </div>
        )}
      </Card>

      {/* Doctor Information */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">Doctor Information</h2>
        <div className="flex items-center mb-4">
          <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 mr-4">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-medium text-lg">{appointment.doctorName}</h3>
            <p className="text-sm text-slate-500">{appointment.doctorSpecialty}</p>
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
              <p className="ml-7">{format(new Date(appointment.appointmentDate), 'PPP')}</p>
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
                <span className="font-medium">Type</span>
              </div>
              <p className="ml-7">{typeMap[appointment.appointmentType] || appointment.appointmentType}</p>
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
              <p className="ml-7">{format(new Date(appointment.createdAt), 'PPp')}</p>
              {appointment.updatedAt !== appointment.createdAt && (
                <p className="ml-7 text-sm text-slate-500">
                  Updated: {format(new Date(appointment.updatedAt), 'PPp')}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Cancel confirmation modal would go here */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Cancel Appointment</h3>
            <p className="mb-4">Are you sure you want to cancel this appointment?</p>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelMutation.isPending}
              >
                No, Keep It
              </Button>
              <Button
                variant="danger"
                onClick={handleCancelAppointment}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Cancelling...
                  </>
                ) : (
                  'Yes, Cancel'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
} 