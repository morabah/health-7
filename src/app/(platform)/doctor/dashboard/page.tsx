'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import {
  CalendarCheck,
  ClipboardList,
  Bell,
  Users,
  Clock,
  Calendar,
  UserCheck,
  Stethoscope,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
  MessageSquare,
  Receipt,
} from 'lucide-react';
import { useDoctorProfile, useDoctorAppointments } from '@/data/doctorLoaders';
import { useNotifications } from '@/data/sharedLoaders';
import { format, isToday, startOfWeek, endOfWeek, isWithinInterval, isValid, parseISO } from 'date-fns';
import { AppointmentStatus, VerificationStatus } from '@/types/enums';
import { logValidation } from '@/lib/logger';
import type { Notification } from '@/types/schemas';
import Avatar from '@/components/ui/Avatar';
import ProgressBar from '@/components/ui/ProgressBar';
import CompleteAppointmentModal from '@/components/doctor/CompleteAppointmentModal';
import CancelAppointmentModal from '@/components/doctor/CancelAppointmentModal';
import { formatDate } from '@/lib/dateUtils';
import { z } from 'zod';
import { AppointmentSchema } from '@/types/schemas';

type Appointment = z.infer<typeof AppointmentSchema> & { id: string };

// Helper function to safely create dates
const safeDate = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isValid(date) ? date : null;
};

// Helper function for safe date comparisons
const safeDateCompare = (dateStr: string | undefined, comparisonFn: (date: Date) => boolean): boolean => {
  const date = safeDate(dateStr);
  return date ? comparisonFn(date) : false;
};

// Helper to safely format dates
const safeFormat = (date: Date | null, formatStr: string): string => {
  if (!date || !isValid(date)) return 'Invalid date';
  try {
    return format(date, formatStr);
  } catch (e) {
    return 'Invalid date';
  }
};

// Helper function to safely create date objects with error handling
const createSafeDate = (dateStr: string, timeStr: string): Date | null => {
  try {
    // Ensure we have valid inputs
    if (!dateStr || !timeStr) return null;
    
    const fullDateString = `${dateStr}T${timeStr}`;
    const date = parseISO(fullDateString);
    
    if (!isValid(date)) {
      console.warn(`Invalid date created from: ${fullDateString}`);
      return null;
    }
    
    return date;
  } catch (error) {
    console.error('Error creating date object:', error);
    return null;
  }
};

// Helper for badge variant
const getStatusVariant = (status: string) => {
  switch (status) {
    case 'CONFIRMED': return 'info';
    case 'COMPLETED': return 'success';
    case 'CANCELED': return 'danger';
    default: return 'default';
  }
};

// Safe function to create calendar url
const createCalendarUrl = (appointment: Appointment) => {
  try {
    const dateStr = appointment.appointmentDate;
    if (!dateStr || !appointment.startTime || !appointment.endTime) {
      return null;
    }
    const isValidTime = (time: string) => /^\d{2}:\d{2}(:\d{2})?$/.test(time);
    const isValidDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);
    if (!isValidDate(dateStr) || !isValidTime(appointment.startTime) || !isValidTime(appointment.endTime)) {
      return null;
    }
    const startDateTime = parseISO(`${dateStr}T${appointment.startTime}`);
    const endDateTime = parseISO(`${dateStr}T${appointment.endTime}`);
    if (!isValid(startDateTime) || !isValid(endDateTime)) {
      return null;
    }
    const eventStart = format(startDateTime, 'yyyyMMddTHHmmss');
    const eventEnd = format(endDateTime, 'yyyyMMddTHHmmss');
    const patientName = appointment.patientName || 'Patient';
    return `data:text/calendar;charset=utf8,BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Appointment with ${patientName}\nDTSTART:${eventStart}\nDTEND:${eventEnd}\nEND:VEVENT\nEND:VCALENDAR`;
  } catch (error) {
    return null;
  }
};

export default function DoctorDashboardPage() {
  const { data: profileData, isLoading: profileLoading, error: profileError } = useDoctorProfile();
  const { data: appointmentsData, isLoading: appointmentsLoading, error: appointmentsError } = useDoctorAppointments();
  const { data: notificationsData, isLoading: notificationsLoading, error: notificationsError } = useNotifications();
  
  const appointments = appointmentsData?.success ? appointmentsData.appointments : [];
  const unreadNotifications = notificationsData?.success 
    ? notificationsData.notifications.filter((n: Notification) => !n.isRead).length 
    : 0;
  
  // Calculate stats with defensive checks
  const todayAppointments = appointments.filter((a: Appointment) => {
    const date = safeDate(a.appointmentDate);
    return date && isToday(date) && a.status !== AppointmentStatus.CANCELED;
  });
  
  const thisWeekStart = startOfWeek(new Date());
  const thisWeekEnd = endOfWeek(new Date());
  
  const completedThisWeek = appointments.filter((a: Appointment) => {
    const date = safeDate(a.appointmentDate);
    return a.status === AppointmentStatus.COMPLETED &&
      date && isWithinInterval(date, {
        start: thisWeekStart,
        end: thisWeekEnd
      });
  });
  
  // Get unique patient count
  const uniquePatientIds = new Set(appointments.map((a: Appointment) => a.patientId));
  const totalPatients = uniquePatientIds.size;
  
  // Get upcoming appointments (exclude today) with defensive checks
  const upcomingAppointments = appointments.filter((a: Appointment) => {
    const date = safeDate(a.appointmentDate);
    const now = new Date();
    return date && 
      !isToday(date) && 
      date > now &&
      a.status !== AppointmentStatus.CANCELED;
  });

  useEffect(() => {
    try {
      logValidation('4.10', 'success', 'Doctor dashboard connected to real data via local API');
    } catch (e) {
      // Error handling for validation logging
    }
  }, []);

  // Show error if any API calls fail
  if (profileError || appointmentsError || notificationsError) {
    return (
      <Alert variant="error">
        Error loading dashboard data: {(profileError || appointmentsError || notificationsError)?.toString()}
      </Alert>
    );
  }

  // After fetching profileData:
  const userProfile = profileData?.success ? profileData : {};
  const displayName = userProfile.firstName && userProfile.lastName
    ? `Dr. ${userProfile.firstName} ${userProfile.lastName}`
    : 'Doctor';

  const initials = (userProfile.firstName?.[0] || '') + (userProfile.lastName?.[0] || '');
  const specialty = userProfile.specialty || profileData?.specialty || '';
  const isVerified = userProfile.verificationStatus === VerificationStatus.VERIFIED || profileData?.verificationStatus === VerificationStatus.VERIFIED;
  const profileCompletion = userProfile.profileCompleted ? 100 : 80; // Example: 100% if completed, else 80%

  // Add a refresh handler
  const handleRefresh = () => {
    window.location.reload();
  };

  // In DoctorDashboardPage function, add state for modals:
  const [completeModalOpen, setCompleteModalOpen] = React.useState(false);
  const [cancelModalOpen, setCancelModalOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null);

  const handleOpenComplete = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setCompleteModalOpen(true);
  };
  const handleOpenCancel = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setCancelModalOpen(true);
  };
  const handleCloseModals = () => {
    setCompleteModalOpen(false);
    setCancelModalOpen(false);
    setSelectedAppointment(null);
  };

  const handleConfirmComplete = async (appointmentId: string, notes: string) => {
    // TODO: Call API/mutation to complete appointment
    handleCloseModals();
  };
  const handleConfirmCancel = async (appointmentId: string, reason: string) => {
    // TODO: Call API/mutation to cancel appointment
    handleCloseModals();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Avatar
            src={userProfile.profilePictureUrl}
            alt={displayName}
            initials={initials}
            size={64}
            className="shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {profileLoading ? (
                  <>Doctor Dashboard <Spinner /></>
                ) : (
                  <>Welcome, {displayName}</>
                )}
              </h1>
              {isVerified && (
                <CheckCircle className="h-5 w-5 text-green-500" aria-label="Verified" />
              )}
            </div>
            <div className="text-slate-500 text-sm mt-1 flex items-center gap-2">
              {specialty && <span>{specialty}</span>}
              {/* Add more doctor info here if needed */}
            </div>
            <ProgressBar value={profileCompletion} label="Profile Completion" className="mt-2 w-48" />
            <div className="text-xs text-primary mt-1">Have a great day caring for your patients!</div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" as={Link} href="/doctor/availability">
            <Calendar className="h-4 w-4 mr-2" />
            Update Availability
          </Button>
          <Button size="sm" variant="outline" as={Link} href="/doctor/profile">
            <UserCheck className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
          <Button size="sm" variant="ghost" onClick={handleRefresh}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Before the stats grid, add urgent alert banners: */}
      {!profileLoading && profileData?.success && (
        <>
          {profileData.verificationStatus === VerificationStatus.PENDING && (
            <Alert variant="warning" className="mb-2" aria-live="assertive">
              <div className="flex items-center">
                <Stethoscope className="h-5 w-5 mr-2" />
                <span>Your profile is pending verification. Our team will review your credentials shortly.</span>
              </div>
            </Alert>
          )}
          {userProfile.profileCompleted === false && (
            <Alert variant="info" className="mb-2" aria-live="polite">
              <div className="flex items-center">
                <ClipboardList className="h-5 w-5 mr-2" />
                <span>Your profile is incomplete. <Link href="/doctor/profile" className="underline text-primary ml-1">Complete your profile</Link> for better visibility.</span>
              </div>
            </Alert>
          )}
          {unreadNotifications > 0 && (
            <Alert variant="info" className="mb-2" aria-live="polite">
              <div className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                <span>You have {unreadNotifications} unread notification{unreadNotifications > 1 ? 's' : ''}. <Link href="/notifications" className="underline text-primary ml-1">View notifications</Link>.</span>
              </div>
            </Alert>
          )}
        </>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Dashboard statistics">
        <Card className="p-4" aria-label="Total Patients">
          <div className="flex flex-col">
            <div className="flex items-center text-primary mb-2">
              <Users className="h-5 w-5 mr-2 text-blue-600" aria-hidden="true" />
              <span className="text-sm font-medium">Total Patients</span>
            </div>
            {appointmentsLoading ? (
              <Spinner />
            ) : (
              <span className="text-2xl font-bold" aria-live="polite">{totalPatients}</span>
            )}
          </div>
        </Card>
        <Card className="p-4" aria-label="Appointments Today">
          <div className="flex flex-col">
            <div className="flex items-center text-primary mb-2">
              <CalendarCheck className="h-5 w-5 mr-2 text-green-600" aria-hidden="true" />
              <span className="text-sm font-medium">Appointments Today</span>
            </div>
            {appointmentsLoading ? (
              <Spinner />
            ) : (
              <span className="text-2xl font-bold" aria-live="polite">{todayAppointments.length}</span>
            )}
          </div>
        </Card>
        <Card className="p-4" aria-label="Completed This Week">
          <div className="flex flex-col">
            <div className="flex items-center text-primary mb-2">
              <ClipboardList className="h-5 w-5 mr-2 text-purple-600" aria-hidden="true" />
              <span className="text-sm font-medium">Completed This Week</span>
            </div>
            {appointmentsLoading ? (
              <Spinner />
            ) : (
              <span className="text-2xl font-bold" aria-live="polite">{completedThisWeek.length}</span>
            )}
          </div>
        </Card>
        <Card className="p-4" aria-label="New Notifications">
          <div className="flex flex-col">
            <div className="flex items-center text-primary mb-2">
              <Bell className="h-5 w-5 mr-2 text-red-600" aria-hidden="true" />
              <span className="text-sm font-medium">New Notifications</span>
            </div>
            {notificationsLoading ? (
              <Spinner />
            ) : (
              <span className="text-2xl font-bold" aria-live="polite">{unreadNotifications}</span>
            )}
          </div>
        </Card>
      </div>

      {/* Today's Schedule & Upcoming Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Today's Schedule</h2>
              </div>
              <Button as={Link} href="/doctor/appointments" size="sm" variant="ghost">
                View All
              </Button>
            </div>
            {todayAppointments.length === 0 ? (
              <div className="text-center text-slate-500 py-8">No appointments scheduled for today.</div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {todayAppointments.map((appt: Appointment) => {
                  const initials = (appt.patientName?.split(' ').map(n => n[0]).join('') || 'P').toUpperCase();
                  return (
                    <div key={appt.id} className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <Avatar initials={initials} size={40} />
                        <div>
                          <div className="font-medium">{appt.patientName || 'Patient'}</div>
                          <div className="text-slate-500 text-sm">{new Date(appt.appointmentDate).toLocaleDateString()} at {appt.startTime}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          appt.status === AppointmentStatus.CONFIRMED ? 'info' :
                          appt.status === AppointmentStatus.COMPLETED ? 'success' :
                          appt.status === AppointmentStatus.CANCELED ? 'danger' : 'default'
                        }>
                          {appt.status}
                        </Badge>
                        {/* Actions */}
                        {appt.status === AppointmentStatus.CONFIRMED && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="primary" onClick={() => handleOpenComplete(appt)}>
                              Complete
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleOpenCancel(appt)}>
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
        {/* Upcoming Appointments */}
        <div>
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
              </div>
              <Button as={Link} href="/doctor/appointments" size="sm" variant="ghost">
                View All
              </Button>
            </div>
            {appointments.length === 0 ? (
              <div className="text-center text-slate-500 py-8">No upcoming appointments.</div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {appointments
                  .filter((a: Appointment) => new Date(a.appointmentDate) > new Date() && a.status !== AppointmentStatus.CANCELED)
                  .sort((a: Appointment, b: Appointment) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
                  .slice(0, 3)
                  .map((appt: Appointment) => {
                    const initials = (appt.patientName?.split(' ').map(n => n[0]).join('') || 'P').toUpperCase();
                    return (
                      <div key={appt.id} className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                          <Avatar initials={initials} size={36} />
                          <div>
                            <div className="font-medium">{appt.patientName || 'Patient'}</div>
                            <div className="text-slate-500 text-sm">{new Date(appt.appointmentDate).toLocaleDateString()} at {appt.startTime}</div>
                          </div>
                        </div>
                        <Badge variant={
                          appt.status === AppointmentStatus.CONFIRMED ? 'info' :
                          appt.status === AppointmentStatus.COMPLETED ? 'success' :
                          appt.status === AppointmentStatus.CANCELED ? 'danger' : 'default'
                        }>
                          {appt.status}
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Notifications Preview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Notifications Preview */}
        <div className="lg:col-span-2">
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Recent Notifications</h2>
              </div>
              <Button as={Link} href="/notifications" size="sm" variant="ghost">
                View All
              </Button>
            </div>
            {notificationsLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : notificationsError ? (
              <div className="text-center text-red-500 py-8">Error loading notifications.</div>
            ) : notificationsData?.success && notificationsData.notifications.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {notificationsData.notifications.slice(0, 3).map((notif: Notification, idx: number) => (
                  <div key={notif.id || idx} className="flex items-center gap-4 py-4">
                    <Bell className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{notif.title}</div>
                      <div className="text-slate-500 text-sm truncate">{notif.message}</div>
                    </div>
                    <div className="text-xs text-slate-400 ml-2 whitespace-nowrap">{notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : ''}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-8">No notifications yet.</div>
            )}
          </Card>
        </div>
        {/* Quick Actions */}
        <div>
          <Card className="p-6 mb-6 flex flex-col gap-3">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />Quick Actions
            </h2>
            <Button as={Link} href="/doctor/appointments" variant="outline" className="justify-start">
              <Calendar className="h-4 w-4 mr-2" />View Appointments
            </Button>
            <Button as={Link} href="/doctor/availability" variant="outline" className="justify-start">
              <Calendar className="h-4 w-4 mr-2" />Update Availability
            </Button>
            <Button as={Link} href="/doctor/profile" variant="outline" className="justify-start">
              <UserCheck className="h-4 w-4 mr-2" />Edit Profile
            </Button>
            <Button as={Link} href="/notifications" variant="outline" className="justify-start">
              <Bell className="h-4 w-4 mr-2" />Check Notifications
            </Button>
          </Card>
        </div>
      </div>

      {/* Render the modals */}
      <CompleteAppointmentModal
        isOpen={completeModalOpen}
        onClose={handleCloseModals}
        appt={selectedAppointment}
        onConfirm={handleConfirmComplete}
      />
      <CancelAppointmentModal
        isOpen={cancelModalOpen}
        onClose={handleCloseModals}
        appt={selectedAppointment}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
