'use client';

import React from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { 
  CalendarCheck, 
  Stethoscope, 
  ArrowRight, 
  Clock, 
  MapPin,
  Phone,
  Video
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { UpcomingAppointmentsProps } from '@/types/dashboard/dashboard.types';
import type { Appointment } from '@/types/schemas';

/**
 * AppointmentCard Component
 * Individual appointment card with appointment details and status
 */
const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getAppointmentTypeIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'VIDEO':
        return <Video className="h-4 w-4" />;
      case 'PHONE':
      case 'PHONE_CALL':
        return <Phone className="h-4 w-4" />;
      case 'IN_PERSON':
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    try {
      const date = parseISO(dateString);
      if (timeString) {
        const [hours, minutes] = timeString.split(':');
        date.setHours(parseInt(hours), parseInt(minutes));
      }
      return {
        date: format(date, 'EEE, MMM d'),
        time: format(date, 'h:mm a')
      };
    } catch (error) {
      console.error('Error formatting date:', error);
      return {
        date: 'Invalid Date',
        time: 'Invalid Time'
      };
    }
  };

  const { date, time } = formatDateTime(appointment.appointmentDate, appointment.startTime);

  return (
    <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Appointment Info */}
        <div className="flex items-center flex-1">
          <div className="p-2 rounded-full bg-primary/10 dark:bg-primary/20 mr-3">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-slate-900 dark:text-white truncate">
              Dr. {appointment.doctorName}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
              {appointment.doctorSpecialty || 'General Consultation'}
            </p>
            {appointment.reason && (
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 truncate">
                {appointment.reason}
              </p>
            )}
          </div>
        </div>

        {/* Appointment Details */}
        <div className="flex flex-col sm:items-end space-y-2">
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
            <Clock className="h-4 w-4 mr-1" />
            <span>{date} at {time}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Appointment type */}
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-500">
              {getAppointmentTypeIcon(appointment.appointmentType)}
              <span className="ml-1 capitalize">
                {appointment.appointmentType?.replace('_', ' ') || 'In Person'}
              </span>
            </div>
            
            {/* Status badge */}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
              {appointment.status || 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
        <Link href={`/patient/appointments/${appointment.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            View Details
          </Button>
        </Link>
        
        {appointment.status === 'confirmed' && appointment.appointmentType === 'VIDEO' && (
          <Button size="sm" className="flex-1">
            Join Call
          </Button>
        )}
      </div>
    </Card>
  );
};

/**
 * AppointmentCardSkeleton Component
 * Loading skeleton for appointment cards
 */
const AppointmentCardSkeleton = () => (
  <Card className="p-4 border border-gray-200 dark:border-gray-700">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
      <div className="flex items-center">
        <div className="rounded-full h-10 w-10 bg-gray-200 dark:bg-gray-700"></div>
        <div className="ml-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
      </div>
    </div>
  </Card>
);

/**
 * UpcomingAppointments Component
 * 
 * Displays a list of upcoming appointments with appointment details,
 * status indicators, and quick actions.
 * Extracted from the monolithic PatientDashboardPage for better maintainability.
 */
export default function UpcomingAppointments({
  appointments,
  isLoading,
  error,
  maxDisplay = 3
}: UpcomingAppointmentsProps) {
  const displayedAppointments = appointments.slice(0, maxDisplay);

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700">
        <div className="text-center">
          <CalendarCheck className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">
            Unable to Load Appointments
          </h3>
          <p className="text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 p-6 bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary/20 dark:to-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CalendarCheck className="text-primary-500 mr-2" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Upcoming Appointments
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} scheduled
              </p>
            </div>
          </div>
          
          <Link href="/patient/appointments">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(maxDisplay)].map((_, i) => (
              <AppointmentCardSkeleton key={i} />
            ))}
          </div>
        ) : appointments.length > 0 ? (
          <div className="space-y-4">
            {displayedAppointments.map((appointment) => (
              <AppointmentCard 
                key={appointment.id} 
                appointment={appointment} 
              />
            ))}
            
            {appointments.length > maxDisplay && (
              <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
                <Link href="/patient/appointments">
                  <Button variant="outline" size="sm">
                    View {appointments.length - maxDisplay} more appointment{appointments.length - maxDisplay !== 1 ? 's' : ''}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          // Empty state
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
              <CalendarCheck className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No Upcoming Appointments
            </h4>
            <p className="text-slate-600 dark:text-slate-400 mb-4 max-w-md mx-auto">
              You don't have any appointments scheduled. Book an appointment with your healthcare provider.
            </p>
            <Link href="/find-doctors">
              <Button className="inline-flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" />
                Book Appointment
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
} 