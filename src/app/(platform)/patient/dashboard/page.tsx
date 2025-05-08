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
  Clipboard,
  Heart,
  Activity,
  User,
  ChevronRight,
  AlertCircle,
  Stethoscope,
  PlusCircle,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { logValidation, logError, logInfo } from '@/lib/logger';
import { useMyDashboard, useNotifications } from '@/data/sharedLoaders';
import { usePatientProfile, usePatientAppointments } from '@/data/patientLoaders';
import { format, parseISO } from 'date-fns';
import type { Appointment } from '@/types/schemas';
import withErrorBoundary from '@/components/ui/withErrorBoundary';
import useErrorHandler from '@/hooks/useErrorHandler';
import { lazyLoad } from '@/lib/lazyLoadUtils';
import Divider from '@/components/ui/Divider';
import { useDashboardBatch } from '@/data/dashboardLoaders';
import { useSafeBatchData } from '@/hooks/useSafeBatchData';
import { trackPerformance } from '@/lib/performance';
import { useAuth } from '@/context/AuthContext';

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
  userProfile: UserProfileType;
  roleProfile?: {
    id: string;
    // ...other fields
  } | null;
}

// Define user profile interface
interface UserProfileType {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  profilePictureUrl?: string;
}

// Define notification interface
interface NotificationType {
  id: string; 
  title: string; 
  message: string; 
  isRead: boolean; 
  createdAt?: string;
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
  href,
}: {
  title: string;
  value: string | number;
  Icon: LucideIcon;
  isLoading?: boolean;
  className?: string;
  href?: string;
}) => (
  <Card className={`flex items-center gap-4 p-5 hover:shadow-md transition-shadow ${className || ''}`}>
    <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900/30">
      <Icon size={24} className="text-primary" />
    </div>
    <div className="flex-1">
      <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">{title}</p>
      {isLoading ? (
        <div className="h-7 flex items-center">
          <Spinner size="sm" />
        </div>
      ) : (
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
      )}
    </div>
    {href && (
      <Link href={href} className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
        <ChevronRight size={20} />
      </Link>
    )}
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
          Reload Dashboard
        </Button>
        <Link href="/">
          <Button variant="outline">Go to Home</Button>
        </Link>
      </div>
    </Card>
  </div>
);

// Define the keys array outside or memoize it
const patientDashboardKeys = ['userProfile', 'notifications', 'upcomingAppointments', 'stats'];

/**
 * Patient Dashboard Page using Batch API
 * 
 * This page demonstrates using the Batch API to fetch all dashboard
 * data in a single request for improved performance.
 */
export default function PatientDashboardPage() {
  // Start performance tracking
  useEffect(() => {
    const perf = trackPerformance('PatientDashboardPage-render');
    // Properly handle the cleanup function
    return () => {
      perf.stop();
    };
  }, []);
  
  // Fetch all dashboard data in a single batch request
  const batchResult = useDashboardBatch();
  
  // Extract and process data from batch response - using the new safe implementation
  const { 
    data, 
    isLoading, 
    error 
  } = useSafeBatchData(
    batchResult, 
    patientDashboardKeys
  );
  
  // Log insights about the batch operation
  useEffect(() => {
    if (!isLoading && !error) {
      const successKeys = Object.keys(data).filter(key => data[key]?.success);
      logInfo('Dashboard batch data loaded', { 
        totalKeys: Object.keys(data).length,
        successKeys,
        errorKeys: Object.keys(data).filter(key => !data[key]?.success)
      });
      
      // Debug the userProfile structure
      if (data.userProfile) {
        logInfo('User profile debug', { 
          userProfileData: data.userProfile,
          hasUserProfile: !!data.userProfile?.userProfile,
          userProfileKeys: Object.keys(data.userProfile)
        });
      }
    }
  }, [isLoading, error, data]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="error">
        <div>
          <h3 className="font-medium">{error.message}</h3>
          <p>Error loading dashboard</p>
        </div>
      </Alert>
    );
  }
  
  // Extract data for components
  const userProfileData = data.userProfile?.success ? data.userProfile : null;
  const notifications = data.notifications?.success ? data.notifications.notifications || [] : [];
  const appointmentsData = data.upcomingAppointments?.success ? data.upcomingAppointments : null;
  const statsData = data.stats?.success ? data.stats : null;
  
  // Derived states - fix profile extraction from user profile data
  const profile = userProfileData?.userProfile || null;
  const upcomingAppointments = appointmentsData?.appointments || [];
  
  // Simulated health stats - in a real app, these would come from actual patient data
  const healthStats = {
    upcomingAppointments: upcomingAppointments.length,
    pastAppointments: statsData?.pastCount || 0,
    completedCheckups: 2,
    medications: 1,
  };
  
  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Welcome to Your Dashboard</h1>
      
      <div className="mb-6">
        {profile ? (
          <UserProfileSummary profile={profile} />
        ) : (
          <Card className="p-4 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700">
            <div className="flex items-center">
              <AlertCircle className="text-yellow-500 mr-2" size={20} />
              <p className="text-yellow-700 dark:text-yellow-300">Your profile information could not be loaded. Please try refreshing or contact support.</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Card>
        )}
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Your Health Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Upcoming Appointments" 
            value={healthStats.upcomingAppointments} 
            Icon={CalendarCheck} 
            href="/patient/appointments?filter=upcoming" 
          />
          <StatCard 
            title="Past Visits" 
            value={healthStats.pastAppointments} 
            Icon={Clipboard} 
            href="/patient/appointments?filter=past" 
          />
          <StatCard 
            title="Health Records" 
            value={healthStats.completedCheckups} 
            Icon={FileText} 
            href="/patient/health-records" 
          />
          <StatCard 
            title="Medications" 
            value={healthStats.medications} 
            Icon={Pill} 
            href="/patient/medications" 
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Upcoming Appointments</h3>
                <Link href="/patient/appointments">
                  <Button variant="ghost" size="sm" className="flex items-center gap-1">
                    View All <ArrowRight size={16} />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="p-6">
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment: Appointment) => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Stethoscope className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No upcoming appointments</p>
                  <Link href="/find-doctors">
                    <Button variant="outline" size="sm" className="mt-4 flex items-center mx-auto gap-1">
                      <PlusCircle size={16} /> Book An Appointment
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>
          
          <Card>
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Health Reminders</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-start p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Activity className="text-blue-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="font-medium text-blue-700 dark:text-blue-300">Annual Checkup</h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      It's been 10 months since your last checkup. Consider scheduling your annual physical.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Heart className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="font-medium text-green-700 dark:text-green-300">Healthy Reminder</h4>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      Don't forget to take your daily medication and stay hydrated!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Right column (1/3 width) */}
        <div className="space-y-6">
          <Card>
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recent Notifications</h3>
                <Link href="/notifications">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </div>
            <div className="p-6">
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((notification: NotificationType) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No new notifications</p>
                </div>
              )}
            </div>
          </Card>
          
          <Card>
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Quick Actions</h3>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 gap-3">
                <Link href="/find-doctors">
                  <Button variant="outline" className="w-full justify-start">
                    <Stethoscope className="mr-2" size={16} />
                    Find a Doctor
                  </Button>
                </Link>
                <Link href="/patient/profile">
                  <Button variant="outline" className="w-full justify-start">
                    <User className="mr-2" size={16} />
                    Update Profile
                  </Button>
                </Link>
                <Link href="/patient/health-records">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2" size={16} />
                    View Health Records
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Enhanced user profile summary component
function UserProfileSummary({ profile }: { profile: UserProfileType | null }) {
  if (!profile) {
    return (
      <Card className="p-4 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700">
        <p className="text-yellow-700 dark:text-yellow-300">User profile data is missing.</p>
      </Card>
    );
  }
  
  return (
    <Card className="p-6 border border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/30 dark:to-secondary-900/30">
      <div className="flex items-center">
        <div className="h-16 w-16 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300">
          <User size={28} />
        </div>
        <div className="ml-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {profile.firstName} {profile.lastName}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            {profile.email || 'No email provided'}
          </p>
        </div>
        <div className="ml-auto">
          <Link href="/patient/profile">
            <Button variant="outline" size="sm">
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

// Enhanced appointment card component
function AppointmentCard({ appointment }: { appointment: Appointment }) {
  // Format the appointment date
  const formattedDate = appointment.appointmentDate.includes('T')
    ? format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy')
    : appointment.appointmentDate;
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'canceled': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default: return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };
  
  return (
    <Card className="p-4 hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center">
          <div className="rounded-full h-10 w-10 bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-500">
            <Stethoscope size={18} />
          </div>
          <div className="ml-3">
            <h4 className="font-medium text-slate-800 dark:text-slate-100">{appointment.doctorName}</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">{appointment.doctorSpecialty}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-sm text-slate-600 dark:text-slate-400">{formattedDate}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">{appointment.startTime} - {appointment.endTime}</div>
          <span className={`text-xs px-2 py-1 rounded-full mt-1 ${getStatusColor(appointment.status)}`}>
            {appointment.status}
          </span>
        </div>
      </div>
    </Card>
  );
}

// Enhanced notification card
function NotificationCard({ notification }: { notification: NotificationType }) {
  // Format the notification date if it exists
  const formattedDate = notification.createdAt 
    ? format(new Date(notification.createdAt), 'MMM d, yyyy')
    : '';
    
  return (
    <Card className={`p-4 border ${notification.isRead ? 'border-gray-200 dark:border-gray-700' : 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20'}`}>
      <div className="flex items-start">
        <Bell className="text-primary-500 mt-0.5 flex-shrink-0" size={16} />
        <div className="ml-3">
          <h4 className="font-medium text-slate-800 dark:text-slate-100">{notification.title}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{notification.message}</p>
          {formattedDate && (
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">{formattedDate}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
