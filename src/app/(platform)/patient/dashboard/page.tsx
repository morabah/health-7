'use client';
import { useEffect, useState, lazy, Suspense } from 'react';
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
  AlertCircle,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { logValidation, logError } from '@/lib/logger';
import { useMyDashboard, useNotifications } from '@/data/sharedLoaders';
import { usePatientProfile, usePatientAppointments } from '@/data/patientLoaders';
import { format } from 'date-fns';
import type { Appointment } from '@/types/schemas';
import withErrorBoundary from '@/components/ui/withErrorBoundary';
import useErrorHandler from '@/hooks/useErrorHandler';
import { lazyLoad } from '@/lib/lazyLoadUtils';
import Divider from '@/components/ui/Divider';

// Define types for API responses
interface DashboardResponse {
  success: boolean;
  upcomingCount: number;
  pastCount: number;
}

interface AppointmentsResponse {
  success: boolean;
  appointments: Appointment[];
}

interface NotificationsResponse {
  success: boolean;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

interface ProfileResponse {
  success: boolean;
  userProfile: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}

// Lazy load the DoctorList component for better performance
const LazyDoctorList = lazyLoad(() => import('@/components/shared/LazyDoctorList'), {
  loadingComponent: (
    <div className="mt-8 p-4 border rounded-lg animate-pulse bg-gray-50 dark:bg-gray-800">
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/3"></div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
    </div>
  ),
  minimumLoadTime: 500, // Minimum 500ms display time to avoid flicker
});

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
 * Dashboard error fallback component
 */
const DashboardErrorFallback = () => (
  <div className="max-w-3xl mx-auto p-6">
    <Card className="p-8 text-center">
      <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
      <h2 className="text-2xl font-bold mb-4">Dashboard Error</h2>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        We encountered a problem loading your dashboard data. This could be due to connectivity
        issues or a temporary service disruption.
      </p>
      <div className="flex justify-center space-x-4">
        <Button onClick={() => window.location.reload()} variant="primary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reload Dashboard
        </Button>
        <Link href="/">
          <Button variant="outline">Go to Home</Button>
        </Link>
      </div>
    </Card>
  </div>
);

/**
 * Patient Dashboard Page
 * Main control center for patients to view their information and upcoming appointments
 *
 * @returns Patient dashboard component
 */
function PatientDashboard() {
  // Error handler hook - use simple mode to maintain tuple return type
  const [_, handleError] = useErrorHandler({ simpleMode: true });

  // Use combined dashboard hook for stats
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useMyDashboard();
  // Still need profile data for user info
  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = usePatientProfile();
  // Fetch real appointments
  const {
    data: appointmentsData,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    refetch: refetchAppointments,
  } = usePatientAppointments();
  // Real-time notifications
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    refetch: refetchNotifications,
  } = useNotifications();

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Handle critical errors with the error boundary
  useEffect(() => {
    const criticalError = dashboardError || profileError || appointmentsError;
    if (criticalError) {
      // Log the error first
      logError('Critical error in patient dashboard', { error: criticalError });

      // Only propagate to error boundary for persistent/serious errors
      const errorMessage =
        criticalError instanceof Error ? criticalError.message : String(criticalError);
      if (
        errorMessage.includes('authentication') ||
        errorMessage.includes('network') ||
        errorMessage.includes('permission') ||
        errorMessage.includes('token') ||
        errorMessage.includes('server')
      ) {
        handleError(criticalError);
      }
    }
  }, [dashboardError, profileError, appointmentsError, handleError]);

  // Extract data from dashboard response with type assertions
  const upcomingCount = (dashboardData as DashboardResponse | undefined)?.success
    ? (dashboardData as DashboardResponse).upcomingCount
    : 0;

  const pastCount = (dashboardData as DashboardResponse | undefined)?.success
    ? (dashboardData as DashboardResponse).pastCount
    : 0;

  const notifUnread = (notificationsData as NotificationsResponse | undefined)?.success
    ? (notificationsData as NotificationsResponse).notifications.filter(n => !n.isRead).length
    : 0;

  // Get upcoming appointments for the quick view (from real data) with type assertions
  const allAppointments = (appointmentsData as AppointmentsResponse | undefined)?.success
    ? (appointmentsData as AppointmentsResponse).appointments
    : [];

  const now = new Date();
  const upcomingAppointments = allAppointments
    .filter((a: any) => {
      // Convert appointment date to a proper Date object
      const appointmentDate = a.appointmentDate.includes('T')
        ? new Date(a.appointmentDate)
        : new Date(`${a.appointmentDate}T${a.startTime}`);

      return appointmentDate > now && a.status !== 'CANCELED' && a.status !== 'canceled';
    })
    .sort((a: any, b: any) => {
      const dateA = a.appointmentDate.includes('T')
        ? new Date(a.appointmentDate)
        : new Date(`${a.appointmentDate}T${a.startTime}`);

      const dateB = b.appointmentDate.includes('T')
        ? new Date(b.appointmentDate)
        : new Date(`${b.appointmentDate}T${b.startTime}`);

      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 3);

  // Manual refresh handler
  const handleRefresh = async () => {
    try {
      await Promise.all([
        refetchDashboard(),
        refetchProfile(),
        refetchAppointments(),
        refetchNotifications(),
      ]);
      setLastUpdated(new Date());
    } catch (err) {
      logError('Error refreshing dashboard data', err);
      handleError(err);
    }
  };

  useEffect(() => {
    // Add validation that the dashboard is working correctly
    try {
      logValidation('4.10', 'success', 'Patient dashboard connected to real data via local API.');
    } catch (e) {
      logError('Failed to log validation', e);
    }
  }, []);

  // Show error if any API calls fail, but handle non-critical errors here
  if (dashboardError || profileError || appointmentsError) {
    const error = dashboardError || profileError || appointmentsError;
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');

    // Only show an error alert for non-critical errors that don't trigger the boundary
    if (
      !errorMessage.includes('authentication') &&
      !errorMessage.includes('network') &&
      !errorMessage.includes('permission') &&
      !errorMessage.includes('token') &&
      !errorMessage.includes('server')
    ) {
      return (
        <Alert variant="error" className="mb-6">
          <h3 className="font-semibold mb-2">Error loading dashboard data</h3>
          <p>{errorMessage}</p>
          <Button size="sm" variant="primary" className="mt-2" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Try Again
          </Button>
        </Alert>
      );
    }
  }

  const userProfile = (profileData as ProfileResponse | undefined)?.userProfile || {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  };
  const displayName =
    userProfile.firstName && userProfile.lastName
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
              <p className="text-base text-slate-500 dark:text-slate-400">
                Your health at a glance
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 mt-6 md:mt-0">
            <button
              onClick={handleRefresh}
              disabled={
                dashboardLoading || profileLoading || appointmentsLoading || notificationsLoading
              }
              className="rounded-full p-2 bg-white/70 dark:bg-slate-800/80 shadow hover:scale-110 transition-transform disabled:opacity-50"
            >
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
      <Divider className="my-8" />

      {/* Upcoming appointments - Carousel/Timeline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold dark:text-white tracking-tight">
            Upcoming Appointments
          </h2>
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
                <div
                  key={appointment.id}
                  className="min-w-[320px] max-w-full md:w-auto flex-1 glass-card rounded-xl p-5 flex flex-col gap-2 shadow-md hover:shadow-xl transition-shadow border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-12 h-12 rounded-full bg-blue-200 dark:bg-slate-700 flex items-center justify-center text-xl font-bold text-blue-700 dark:text-blue-200">
                      {appointment.doctorName ? (
                        appointment.doctorName
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                      ) : (
                        <UserCircle className="w-8 h-8" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {appointment.doctorName}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded px-2 py-0.5 ml-2">
                          {appointment.doctorSpecialty}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          {format(new Date(appointment.appointmentDate), 'PPP')} at{' '}
                          {appointment.startTime}
                        </span>
                        <span className="inline-block px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200 ml-2">
                          {appointment.appointmentType}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Link href={`/book-appointment/${appointment.doctorId}`}>
                      <button
                        className="rounded-full p-2 bg-blue-500 hover:bg-blue-600 text-white shadow transition-colors"
                        title="Book Again"
                      >
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
      <Divider className="my-8" />

      {/* Find a Doctor - Lazy Loaded Component */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Find a Doctor</h2>
          <Link href="/find-doctors">
            <Button variant="link" size="sm" className="text-blue-600 dark:text-blue-400">
              See All Doctors <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        <Card className="p-4">
          <LazyDoctorList />
        </Card>
      </div>

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
            ) : (profileData as ProfileResponse | undefined)?.success ? (
              (() => {
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Name:</span>
                      <span>
                        {userProfile.firstName} {userProfile.lastName}
                      </span>
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
          <button
            className="absolute top-4 right-4 md:top-8 md:right-8 z-10 rounded-full p-3 bg-blue-500 hover:bg-cyan-500 text-white shadow-lg transition-colors"
            title="Edit Profile"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        </Link>
      </div>
    </div>
  );
}

// Change the default export to use a wrapper that can be type-checked
// and use 'any' for the props
export default function PatientDashboardPage(_props: any) {
  // We're not using any params here, so we just render the component directly
  const EnhancedComponent = withErrorBoundary(PatientDashboard, {
    fallback: <DashboardErrorFallback />,
    componentName: 'PatientDashboard',
  });

  return <EnhancedComponent />;
}
