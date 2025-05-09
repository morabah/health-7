'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
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
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';

import { useAppointmentDetails, useCancelAppointment } from '@/data/patientLoaders';
import { AppointmentStatus, AppointmentType } from '@/types/enums';

// Define type for appointment
interface AppointmentResponse {
  appointment: Appointment | null;
  success: boolean;
  error?: string;
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  appointmentType: AppointmentType;
  appointmentNotes?: string;
  medicalNotes?: string;
  cancellationReason?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

// Define type for API response
interface AppointmentResponse {
  success: boolean;
  appointment: Appointment;
  error?: string;
}

// Define type for cancel response
interface CancelResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Status display helpers
const statusMap = {
  [AppointmentStatus.PENDING]: 'Pending',
  [AppointmentStatus.CONFIRMED]: 'Confirmed',
  [AppointmentStatus.CANCELED]: 'Cancelled',
  [AppointmentStatus.COMPLETED]: 'Completed',
  [AppointmentStatus.RESCHEDULED]: 'Rescheduled',
};

const statusColor: Record<
  string,
  'success' | 'default' | 'warning' | 'info' | 'danger' | 'pending'
> = {
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

// Define the expected params shape
interface AppointmentPageParams {
  appointmentId: string;
}

// Define proper page props with complete typing
interface AppointmentPageProps {
  params: Promise<AppointmentPageParams>;
  searchParams: Record<string, string | string[] | undefined>;
}

export default function AppointmentDetail(props: AppointmentPageProps) {
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  
  // Use React.use() to unwrap the params object which is now a Promise in newer Next.js versions
  const params = React.use(props.params);
  const appointmentId = params.appointmentId;

  // Fetch appointment details
  const { data, isLoading, error } = useAppointmentDetails(appointmentId);
  const appointment = data?.appointment || null;

  // Hook for cancellation
  const {
    cancelAppointment,
    isLoading: isCancelling,
    error: cancelError,
    success: cancelSuccess,
  } = useCancelAppointment();

  const handleCancelAppointment = async () => {
    if (!appointment) return;
    await cancelAppointment({
      appointmentId: appointment.id,
      reason: cancellationReason,
    });
    if (!cancelError) {
      setShowCancelModal(false);
      // Refresh data or redirect
      router.refresh();
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="p-4">
        <Alert variant="danger">
          <h3 className="text-lg font-semibold">Error Loading Appointment</h3>
          <p>{error || 'Appointment not found'}</p>
          <Link href="/patient/appointments">
            <Button className="mt-4" variant="outline">
              <ChevronLeft className="mr-2" size={16} />
              Back to Appointments
            </Button>
          </Link>
        </Alert>
      </div>
    );
  }

  // Render the modal for cancellation
  const CancelModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Cancel Appointment</h2>
        <p className="mb-4">
          Are you sure you want to cancel your appointment with Dr. {appointment.doctorName} on{' '}
          {formatDate(appointment.appointmentDate)}?
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Reason for cancellation:</label>
          <textarea
            className="w-full p-2 border rounded-md"
            rows={3}
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            placeholder="Please provide a reason for cancellation"
          />
        </div>
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => setShowCancelModal(false)} disabled={isCancelling}>
            Nevermind
          </Button>
          <Button 
            variant="danger" 
            onClick={handleCancelAppointment}
            disabled={isCancelling}
          >
            {isCancelling ? <Spinner size="sm" className="mr-2" /> : <XCircle size={16} className="mr-2" />}
            Confirm Cancellation
          </Button>
        </div>
        {cancelError && (
          <Alert variant="danger" className="mt-3">
            {cancelError}
          </Alert>
        )}
      </Card>
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <Link href="/patient/appointments">
          <Button variant="ghost" className="mb-4">
            <ChevronLeft className="mr-2" size={16} />
            Back to Appointments
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Appointment Details</h1>
      </div>

      <Card className="mb-6 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            Appointment with Dr. {appointment.doctorName}
          </h2>
          <Badge variant={getBadgeVariant(appointment.status)}>
            {appointment.status}
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-4">Appointment Information</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <Calendar className="w-5 h-5 mt-0.5 mr-3 text-primary-600" />
                <div>
                  <div className="font-medium">Date</div>
                  <div>{formatDate(appointment.appointmentDate)}</div>
                </div>
              </div>
              
              <div className="flex items-start">
                <Clock className="w-5 h-5 mt-0.5 mr-3 text-primary-600" />
                <div>
                  <div className="font-medium">Time</div>
                  <div>{appointment.startTime} - {appointment.endTime}</div>
                </div>
              </div>
              
              <div className="flex items-start">
                <User className="w-5 h-5 mt-0.5 mr-3 text-primary-600" />
                <div>
                  <div className="font-medium">Doctor</div>
                  <div>Dr. {appointment.doctorName}</div>
                  <Link href={`/doctor-profile/${appointment.doctorId}`}>
                    <span className="text-primary-600 text-sm hover:underline">View Profile</span>
                  </Link>
                </div>
              </div>

              {appointment.location && (
                <div className="flex items-start">
                  <User className="w-5 h-5 mt-0.5 mr-3 text-primary-600" />
                  <div>
                    <div className="font-medium">Location</div>
                    <div>{appointment.location}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-4">Appointment Details</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <FileText className="w-5 h-5 mt-0.5 mr-3 text-primary-600" />
                <div>
                  <div className="font-medium">Type</div>
                  <div>{appointment.appointmentType}</div>
                </div>
              </div>

              {appointment.appointmentNotes && (
                <div className="flex items-start">
                  <MessageCircle className="w-5 h-5 mt-0.5 mr-3 text-primary-600" />
                  <div>
                    <div className="font-medium">Notes</div>
                    <div className="whitespace-pre-wrap">{appointment.appointmentNotes}</div>
                  </div>
                </div>
              )}

              {appointment.medicalNotes && appointment.status === AppointmentStatus.COMPLETED && (
                <div className="flex items-start">
                  <FileCheck className="w-5 h-5 mt-0.5 mr-3 text-primary-600" />
                  <div>
                    <div className="font-medium">Medical Notes</div>
                    <div className="whitespace-pre-wrap">{appointment.medicalNotes}</div>
                  </div>
                </div>
              )}

              {appointment.cancellationReason && (
                <div className="flex items-start">
                  <XCircle className="w-5 h-5 mt-0.5 mr-3 text-red-500" />
                  <div>
                    <div className="font-medium">Cancellation Reason</div>
                    <div className="whitespace-pre-wrap">{appointment.cancellationReason}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Section */}
        {appointment.status === AppointmentStatus.SCHEDULED && (
          <div className="mt-8 flex justify-end">
            <Button 
              variant="danger" 
              onClick={() => setShowCancelModal(true)}
            >
              <XCircle size={16} className="mr-2" />
              Cancel Appointment
            </Button>
          </div>
        )}
      </Card>

      {/* Conditionally render the cancel modal */}
      {showCancelModal && <CancelModal />}
    </div>
  );
}

// Helper function to determine badge variant based on status
function getBadgeVariant(status?: AppointmentStatus): 'info' | 'success' | 'danger' | 'default' {
  if (!status) return 'default';
  
  switch (status) {
    case AppointmentStatus.SCHEDULED:
      return 'info';
    case AppointmentStatus.COMPLETED:
      return 'success';
    case AppointmentStatus.CANCELLED:
      return 'danger';
    default:
      return 'default';
  }
}
