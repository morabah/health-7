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
  RefreshCw,
  ArrowRight,
  Clipboard,
  PieChart,
  Star,
  User,
  UserPlus,
  Activity,
  CalendarDays,
  AlarmClock,
} from 'lucide-react';
import { useDoctorProfile, useDoctorAppointments, useCompleteAppointment, useDoctorCancelAppointment } from '@/data/doctorLoaders';
import { useNotifications } from '@/data/sharedLoaders';
import { format, isToday, startOfWeek, endOfWeek, isWithinInterval, isValid, parseISO, isFuture, isAfter, addDays } from 'date-fns';
import { AppointmentStatus, VerificationStatus } from '@/types/enums';
import { logValidation } from '@/lib/logger';
import type { Notification } from '@/types/schemas';
import Avatar from '@/components/ui/Avatar';
import ProgressBar from '@/components/ui/ProgressBar';
import CompleteAppointmentModal from '@/components/doctor/CompleteAppointmentModal';
import CancelAppointmentModal from '@/components/doctor/CancelAppointmentModal';
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

export default function DoctorDashboardPage() {
  const { data: profileData, isLoading: profileLoading, error: profileError } = useDoctorProfile();
  const { data: appointmentsData, isLoading: appointmentsLoading, error: appointmentsError, refetch: refetchAppointments } = useDoctorAppointments();
  const { data: notificationsData, isLoading: notificationsLoading, error: notificationsError, refetch: refetchNotifications } = useNotifications();
  const completeAppointmentMutation = useCompleteAppointment();
  const cancelAppointmentMutation = useDoctorCancelAppointment();
  
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
  }).sort((a, b) => {
    const dateA = safeDate(a.appointmentDate);
    const dateB = safeDate(b.appointmentDate);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  // Upcoming week appointments
  const nextWeekAppointments = appointments.filter((a: Appointment) => {
    const date = safeDate(a.appointmentDate);
    const now = new Date();
    const oneWeekFromNow = addDays(now, 7);
    return date && 
      date > now &&
      date <= oneWeekFromNow &&
      a.status !== AppointmentStatus.CANCELED;
  }).sort((a, b) => {
    const dateA = safeDate(a.appointmentDate);
    const dateB = safeDate(b.appointmentDate);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
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

  // After fetching profileData
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
    refetchAppointments();
    refetchNotifications();
  };

  // State for modals
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
    try {
      await completeAppointmentMutation.mutateAsync({ appointmentId, notes });
      handleCloseModals();
    } catch (error) {
      console.error("Error completing appointment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleConfirmCancel = async (appointmentId: string, reason: string) => {
    setIsSubmitting(true);
    try {
      await cancelAppointmentMutation.mutateAsync({ appointmentId, reason });
      handleCloseModals();
    } catch (error) {
      console.error("Error canceling appointment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to format dates for display
  const formatAppointmentDate = (dateStr: string) => {
    const date = safeDate(dateStr);
    if (!date) return 'Invalid date';
    
    if (isToday(date)) {
      return 'Today';
    }
    
    return format(date, 'EEE, MMM d');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{displayName}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {specialty ? specialty : 'Welcome to your dashboard'}
              {isVerified && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </span>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            className="text-slate-600 dark:text-slate-300"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Dashboard
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="p-5 border-l-4 border-blue-500 shadow-sm hover:shadow transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-slate-500">Total Patients</h3>
              {appointmentsLoading ? (
                <Spinner size="sm" />
              ) : (
                <p className="text-2xl font-bold mt-1">{totalPatients}</p>
              )}
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </Card>
        
        <Card className="p-5 border-l-4 border-green-500 shadow-sm hover:shadow transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-slate-500">Today's Appointments</h3>
              {appointmentsLoading ? (
                <Spinner size="sm" />
              ) : (
                <p className="text-2xl font-bold mt-1">{todayAppointments.length}</p>
              )}
            </div>
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-full">
              <CalendarCheck className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </Card>
        
        <Card className="p-5 border-l-4 border-purple-500 shadow-sm hover:shadow transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-slate-500">This Week</h3>
              {appointmentsLoading ? (
                <Spinner size="sm" />
              ) : (
                <p className="text-2xl font-bold mt-1">{completedThisWeek.length}</p>
              )}
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-full">
              <CheckCircle className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </Card>
        
        <Card className="p-5 border-l-4 border-red-500 shadow-sm hover:shadow transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-slate-500">Notifications</h3>
              {notificationsLoading ? (
                <Spinner size="sm" />
              ) : (
                <p className="text-2xl font-bold mt-1">{unreadNotifications}</p>
              )}
            </div>
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-full">
              <Bell className="h-5 w-5 text-red-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule - Expanded */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm h-full">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlarmClock className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Today's Schedule</h2>
              </div>
              <Button as={Link} href="/doctor/appointments" size="sm" variant="outline" className="flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="p-5">
              {appointmentsLoading ? (
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              ) : todayAppointments.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Calendar className="h-10 w-10 mx-auto mb-3 text-slate-400" />
                  <p>No appointments scheduled for today.</p>
                  <Button as={Link} href="/doctor/availability" variant="link" size="sm" className="mt-2">
                    Update your availability
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {todayAppointments.map((appt: Appointment) => {
                    const initials = (appt.patientName?.split(' ').map(n => n[0]).join('') || 'P').toUpperCase();
                    return (
                      <div key={appt.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar initials={initials} size={44} />
                          <div>
                            <div className="font-medium">{appt.patientName || 'Patient'}</div>
                            <div className="text-slate-500 text-sm flex flex-wrap items-center gap-2">
                              <span className="whitespace-nowrap">{appt.startTime} - {appt.endTime}</span>
                              <Badge variant={getStatusVariant(appt.status)}>
                                {appt.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {appt.status === AppointmentStatus.CONFIRMED && (
                          <div className="flex flex-wrap gap-2 ml-12 sm:ml-0">
                            <Button size="sm" variant="primary" onClick={() => handleOpenComplete(appt)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Complete
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleOpenCancel(appt)}>
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
        
        {/* Right Column: Upcoming & Notifications */}
        <div className="space-y-6">
          {/* Upcoming Appointments */}
          <Card className="shadow-sm">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Upcoming Week</h2>
              </div>
            </div>
            
            <div className="p-5">
              {appointmentsLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : nextWeekAppointments.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <p>No upcoming appointments for the next 7 days.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {nextWeekAppointments.slice(0, 5).map((appt: Appointment) => {
                    const initials = (appt.patientName?.split(' ').map(n => n[0]).join('') || 'P').toUpperCase();
                    return (
                      <div key={appt.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                        <Avatar initials={initials} size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{appt.patientName || 'Patient'}</div>
                          <div className="text-slate-500 text-sm">
                            {formatAppointmentDate(appt.appointmentDate)} • {appt.startTime}
                          </div>
                        </div>
                        <Badge variant={getStatusVariant(appt.status)} size="sm">
                          {appt.status}
                        </Badge>
                      </div>
                    );
                  })}
                  
                  {nextWeekAppointments.length > 5 && (
                    <div className="text-center mt-2">
                      <Button as={Link} href="/doctor/appointments" variant="link" size="sm">
                        View {nextWeekAppointments.length - 5} more
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button as={Link} href="/doctor/appointments" variant="outline" size="sm" className="w-full justify-center">
                  View Full Schedule
                </Button>
              </div>
            </div>
          </Card>
          
          {/* Quick Actions Card */}
          <Card className="shadow-sm">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Quick Actions
              </h2>
            </div>
            
            <div className="p-4 grid grid-cols-1 gap-3">
              <Button as={Link} href="/doctor/profile" variant="outline" className="justify-start">
                <User className="h-4 w-4 mr-2" />Update Profile
              </Button>
              <Button as={Link} href="/doctor/availability" variant="outline" className="justify-start">
                <Calendar className="h-4 w-4 mr-2" />Set Availability
              </Button>
              <Button as={Link} href="/notifications" variant="outline" className="justify-start">
                <Bell className="h-4 w-4 mr-2" />
                Check Notifications
                {unreadNotifications > 0 && (
                  <Badge variant="danger" size="sm" className="ml-auto">{unreadNotifications}</Badge>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Notifications List */}
      <Card className="shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Recent Notifications</h2>
          </div>
          <Button as={Link} href="/notifications" size="sm" variant="outline" className="flex items-center gap-1">
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="p-5">
          {notificationsLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : notificationsError ? (
            <div className="text-center text-red-500 py-6">Error loading notifications.</div>
          ) : notificationsData?.success && notificationsData.notifications.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notificationsData.notifications.slice(0, 6).map((notif: Notification, idx: number) => (
                <div 
                  key={notif.id || idx} 
                  className={`p-4 rounded-lg border ${notif.isRead ? 'border-slate-200 bg-white' : 'border-primary/20 bg-primary/5'} shadow-sm`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${notif.isRead ? 'bg-slate-100' : 'bg-primary/10'}`}>
                      <Bell className={`h-4 w-4 ${notif.isRead ? 'text-slate-500' : 'text-primary'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{notif.title}</h3>
                      <p className="text-slate-500 text-sm line-clamp-2 mt-1">{notif.message}</p>
                      <div className="text-xs text-slate-400 mt-2">
                        {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-500 py-8">No notifications yet.</div>
          )}
        </div>
      </Card>

      {/* Render the modals */}
      <CompleteAppointmentModal
        isOpen={completeModalOpen}
        onClose={handleCloseModals}
        appt={selectedAppointment}
        onConfirm={handleConfirmComplete}
        isSubmitting={isSubmitting}
      />
      <CancelAppointmentModal
        isOpen={cancelModalOpen}
        onClose={handleCloseModals}
        appt={selectedAppointment}
        onConfirm={handleConfirmCancel}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
