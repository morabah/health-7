'use client';

import React from 'react';
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
  Building,
  MapPin,
  Video,
} from 'lucide-react';
import { format } from 'date-fns';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';

import { useAppointmentDetails } from '@/data/adminLoaders';
import { AppointmentStatus, AppointmentType } from '@/types/enums';
import type { Appointment } from '@/types/schemas';

// Define type for API response
interface AppointmentResponse {
  success: boolean;
  appointment: Appointment;
  error?: string;
}

// Define the expected params shape
interface AppointmentPageParams {
  appointmentId: string;
}

export default function AdminAppointmentDetailsPage(props: any) {
  // Use React.use() to unwrap the params object which is now a Promise in newer Next.js versions
  const params = React.use(props.params) as AppointmentPageParams;
  const appointmentId = params.appointmentId;

  if (!appointmentId) {
    return <Alert variant="error">Missing appointment ID</Alert>;
  }

  // Fetch appointment details with type annotation
  const {
    data: appointmentData,
    isLoading,
    error,
  } = useAppointmentDetails(appointmentId) as {
    data: AppointmentResponse | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error || !appointmentData?.success) {
    return (
      <Alert variant="error">
        {error?.message || appointmentData?.error || 'Failed to load appointment details'}
      </Alert>
    );
  }

  const appointment = appointmentData.appointment as Appointment;

  // Format date for display
  const formattedDate = format(new Date(appointment.appointmentDate), 'PPPP');

  // Map for status display
  const statusMap: Record<string, string> = {
    [AppointmentStatus.PENDING]: 'Pending',
    [AppointmentStatus.CONFIRMED]: 'Confirmed',
    [AppointmentStatus.COMPLETED]: 'Completed',
    [AppointmentStatus.CANCELED]: 'Cancelled',
    [AppointmentStatus.RESCHEDULED]: 'Rescheduled',
  };

  // Map for status badge colors
  const statusColor: Record<
    string,
    'success' | 'default' | 'warning' | 'info' | 'danger' | 'pending'
  > = {
    [AppointmentStatus.PENDING]: 'pending',
    [AppointmentStatus.CONFIRMED]: 'info',
    [AppointmentStatus.COMPLETED]: 'success',
    [AppointmentStatus.CANCELED]: 'danger',
    [AppointmentStatus.RESCHEDULED]: 'warning',
  };

  // Map for appointment type display
  const appointmentTypeMap: Record<string, string> = {
    [AppointmentType.IN_PERSON]: 'In-Person Visit',
    [AppointmentType.VIDEO]: 'Video Consultation',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Appointment Details</h1>
        <Link href="/admin/appointments">
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to All Appointments
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
              href={`/admin/users/patients/${appointment.patientId}`}
              className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
            >
              View Patient Profile
            </Link>
          </div>
        </div>
      </Card>

      {/* Doctor Information */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">Doctor Information</h2>
        <div className="flex items-center mb-4">
          <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 mr-4">
            <Building className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-medium text-lg">Dr. {appointment.doctorName}</h3>
            {appointment.doctorSpecialty && (
              <p className="text-slate-600 dark:text-slate-400">{appointment.doctorSpecialty}</p>
            )}
            <Link
              href={`/admin/users/doctors/${appointment.doctorId}`}
              className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
            >
              View Doctor Profile
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
              <p className="ml-7">
                {appointment.startTime} - {appointment.endTime}
              </p>
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
              <p className="ml-7">
                {appointmentTypeMap[appointment.appointmentType] || 'In-Person Visit'}
              </p>
              {appointment.appointmentType === AppointmentType.VIDEO &&
                appointment.videoCallUrl && (
                  <a
                    href={appointment.videoCallUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-7 mt-2 inline-flex items-center text-primary-600 hover:underline"
                  >
                    <Video className="h-4 w-4 mr-1" />
                    View Video Call Link
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
    </div>
  );
}
