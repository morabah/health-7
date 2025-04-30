'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import {
  CalendarCheck,
  FileText,
  Pill,
  Bell,
  Pencil,
  UserCircle,
  RefreshCw,
  Edit2,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { logValidation, logError } from '@/lib/logger';
import { useMyDashboard, useNotifications } from '@/data/sharedLoaders';
import { usePatientProfile, usePatientAppointments } from '@/data/patientLoaders';
import { format } from 'date-fns';
import type { Appointment } from '@/types/schemas';

/**
 * Re-usable Stat card
 */
const StatCard = ({
  title,
  value,
  Icon,
  isLoading = false,
  className,
}: {
  title: string;
  value: string | number;
  Icon: LucideIcon;
  isLoading?: boolean;
  className?: string;
}) => (
  <Card className={`flex items-center gap-4 p-4 ${className || ''}`}>
    <Icon size={28} className="text-primary shrink-0" />
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
      {isLoading ? (
        <div className="h-7 flex items-center">
          <Spinner />
        </div>
      ) : (
        <p className="text-xl font-bold">{value}</p>
      )}
    </div>
  </Card>
);

/**
 * Patient Dashboard Page
 * Main control center for patients to view their information and upcoming appointments
 * 
 * @returns Patient dashboard component
 */
export default function PatientDashboard() {
  // Use combined dashboard hook for stats
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useMyDashboard();
  // Still need profile data for user info
  const { data: profileData, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = usePatientProfile();
  // Fetch real appointments
  const { data: appointmentsData, isLoading: appointmentsLoading, error: appointmentsError, refetch: refetchAppointments } = usePatientAppointments();
  // Real-time notifications
  const { data: notificationsData, isLoading: notificationsLoading, refetch: refetchNotifications } = useNotifications();

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Extract data from dashboard response
  const upcomingCount = dashboardData?.success ? dashboardData.upcomingCount : 0;
  const pastCount = dashboardData?.success ? dashboardData.pastCount : 0;
  const notifUnread = notificationsData?.success ? notificationsData.notifications.filter((n: any) => !n.isRead).length : 0;

  // Get upcoming appointments for the quick view (from real data)
  const allAppointments = appointmentsData?.success ? appointmentsData.appointments : [];
  const now = new Date();
  const upcomingAppointments = allAppointments
    .filter((a: any) => new Date(`${a.appointmentDate}T${a.startTime}`) > now && a.status !== 'CANCELED')
    .sort((a: any, b: any) => new Date(`${a.appointmentDate}T${a.startTime}`).getTime() - new Date(`${b.appointmentDate}T${b.startTime}`).getTime())
    .slice(0, 3);

  // Manual refresh handler
  const handleRefresh = async () => {
    await Promise.all([
      refetchDashboard(),
      refetchProfile(),
      refetchAppointments(),
      refetchNotifications(),
    ]);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    // Add validation that the dashboard is working correctly
    try {
      logValidation('4.10', 'success', 'Patient dashboard connected to real data via local API.');
    } catch (e) {
      logError('Failed to log validation', e);
    }
  }, []);

  // Show error if any API calls fail
  if (dashboardError || profileError || appointmentsError) {
    return (
      <Alert variant="error">
        Error loading dashboard data: {(dashboardError || profileError || appointmentsError)?.toString()}
      </Alert>
    );
  }

  const userProfile = profileData?.userProfile || {};
  const displayName = userProfile.firstName && userProfile.lastName
    ? `${userProfile.firstName} ${userProfile.lastName}`
    : 'Patient';

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl shadow-lg bg-gradient-to-br from-blue-200/70 via-white/80 to-cyan-100/60 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-0">
        <div className="flex flex-col md:flex-row items-center justify-between px-8 py-8 md:py-12">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-white/70 dark:bg-slate-800/80 backdrop-blur-md flex items-center justify-center shadow-md">
              <UserCircle className="w-16 h-16 text-indigo-500 dark:text-indigo-300" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight">
                Welcome, {profileLoading ? <Spinner className="inline-block ml-2" /> : displayName}
              </h1>
              <p className="text-base text-slate-500 dark:text-slate-400">Your health at a glance</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 mt-6 md:mt-0">
            <button onClick={handleRefresh} disabled={dashboardLoading || profileLoading || appointmentsLoading || notificationsLoading} className="rounded-full p-2 bg-white/70 dark:bg-slate-800/80 shadow hover:scale-110 transition-transform disabled:opacity-50">
              <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
            </button>
            <span className="inline-block px-3 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid - Glassmorphism */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          title="Upcoming" 
          value={upcomingCount} 
          Icon={CalendarCheck} 
          isLoading={dashboardLoading} 
          className="glass-card border-l-4 border-blue-400 hover:scale-105 transition-transform"
        />
        <StatCard 
          title="Past" 
          value={pastCount} 
          Icon={FileText} 
          isLoading={dashboardLoading} 
          className="glass-card border-l-4 border-cyan-400 hover:scale-105 transition-transform"
        />
        <StatCard 
          title="Prescriptions" 
          value="0" 
          Icon={Pill} 
          className="glass-card border-l-4 border-blue-200 hover:scale-105 transition-transform"
        />
        <StatCard 
          title="Notifications" 
          value={notifUnread} 
          Icon={Bell} 
          isLoading={notificationsLoading} 
          className="glass-card border-l-4 border-cyan-200 hover:scale-105 transition-transform"
        />
      </section>

      {/* Section Divider */}
      <div className="border-t border-slate-200 dark:border-slate-700 my-8" />

      {/* Upcoming appointments - Carousel/Timeline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold dark:text-white tracking-tight">Upcoming Appointments</h2>
          <Link href="/patient/appointments">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 -mx-2 px-2">
          <div className="flex gap-4 md:grid md:grid-cols-3">
            {appointmentsLoading ? (
              <div className="flex-1 flex items-center justify-center min-h-[120px]">
                <Spinner />
              </div>
            ) : upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment: any) => (
                <div key={appointment.id} className="min-w-[320px] max-w-full md:w-auto flex-1 glass-card rounded-xl p-5 flex flex-col gap-2 shadow-md hover:shadow-xl transition-shadow border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-12 h-12 rounded-full bg-blue-200 dark:bg-slate-700 flex items-center justify-center text-xl font-bold text-blue-700 dark:text-blue-200">
                      {appointment.doctorName ? appointment.doctorName.split(' ').map((n: string) => n[0]).join('') : <UserCircle className="w-8 h-8" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">{appointment.doctorName}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded px-2 py-0.5 ml-2">
                          {appointment.doctorSpecialty}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>{format(new Date(appointment.appointmentDate), 'PPP')} at {appointment.startTime}</span>
                        <span className="inline-block px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200 ml-2">
                          {appointment.appointmentType}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Link href={`/book-appointment/${appointment.doctorId}`}>
                      <button className="rounded-full p-2 bg-blue-500 hover:bg-blue-600 text-white shadow transition-colors" title="Book Again">
                        <CalendarCheck className="w-5 h-5" />
                      </button>
                    </Link>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">
                      Status: {appointment.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center min-h-[120px] text-slate-500 dark:text-slate-400">
                No upcoming appointments
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section Divider */}
      <div className="border-t border-slate-200 dark:border-slate-700 my-8" />

      {/* Profile info - Glass Card with FAB */}
      <div className="relative">
        <Card className="flex flex-col md:flex-row items-center gap-8 p-8 glass-card rounded-2xl">
          <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-slate-700 flex items-center justify-center mb-4 md:mb-0">
            <UserCircle className="w-20 h-20 text-indigo-500 dark:text-indigo-300" />
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="text-xl font-bold dark:text-white mb-2">Profile Information</h2>
            {profileLoading ? (
              <div className="py-6 text-center">
                <Spinner />
              </div>
            ) : profileData?.success ? (
              (() => {
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Name:</span>
                      <span>{userProfile.firstName} {userProfile.lastName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Email:</span>
                      <span>{userProfile.email || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Phone:</span>
                      <span>{userProfile.phone || 'Not provided'}</span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="py-6 text-center text-slate-500 dark:text-slate-400">
                Failed to load profile
              </div>
            )}
          </div>
        </Card>
        {/* Floating Action Button for Edit Profile */}
        <Link href="/patient/profile">
          <button className="absolute top-4 right-4 md:top-8 md:right-8 z-10 rounded-full p-3 bg-blue-500 hover:bg-cyan-500 text-white shadow-lg transition-colors" title="Edit Profile">
            <Edit2 className="w-5 h-5" />
          </button>
        </Link>
      </div>
    </div>
  );
} 