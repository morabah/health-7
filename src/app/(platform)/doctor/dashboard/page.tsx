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
  Settings,
  Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react'; // Import LucideIcon type
import {
  format,
  isValid,
  parseISO,
} from 'date-fns';
import { AppointmentStatus, VerificationStatus, AppointmentType } from '@/types/enums';
import { logValidation } from '@/lib/logger';
import type { Notification, UserProfile } from '@/types/schemas'; // Assuming UserProfile type exists
import Avatar from '@/components/ui/Avatar';
import { z } from 'zod';
import { AppointmentSchema } from '@/types/schemas';
import { useAuth } from '@/context/AuthContext';
import { useSafeBatchData } from '@/hooks/useSafeBatchData';
import { logInfo } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';
import { useDashboardBatch } from '@/data/dashboardLoaders';
import { Tab } from '@headlessui/react'; // Import Tab
import clsx from 'clsx'; // Import clsx for conditional classes

type Appointment = z.infer<typeof AppointmentSchema> & { id: string };

// Helper to safely format dates
const safeFormat = (dateStr: string | undefined, formatStr: string): string => {
  if (!dateStr) return 'Invalid Date';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return 'Invalid Date';
    return format(date, formatStr);
  } catch (e) {
    return 'Invalid Date';
  }
};

// Helper for badge variant
const getStatusVariant = (status?: AppointmentStatus): 'info' | 'success' | 'danger' | 'default' => {
  switch (status) {
    case AppointmentStatus.CONFIRMED:
    case AppointmentStatus.PENDING:
      return 'info';
    case AppointmentStatus.COMPLETED:
      return 'success';
    case AppointmentStatus.CANCELED:
      return 'danger';
    default:
      return 'default';
  }
};

// Stat Card component (similar to Patient Dashboard)
const StatCard = ({
  title,
  value,
  Icon,
  isLoading = false,
  className,
  href,
}: {
  title: string;
  value: number;
  Icon: LucideIcon;
  isLoading?: boolean;
  className?: string;
  href?: string;
}) => (
  <Card className={`flex items-center gap-4 p-5 transition-colors hover:shadow-md ${href ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''} ${className || ''}`}>
    <div className={`p-3 rounded-full bg-primary-100 dark:bg-primary-900/30`}>
        <Icon size={22} className="text-primary" />
    </div>
    <div className="flex-1">
      <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">{title}</p>
      {isLoading ? (
        <div className="h-8 mt-1 flex items-center">
          <Spinner size="sm" />
        </div>
      ) : (
        <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-100">{value}</p>
      )}
    </div>
    {href && (
      <Link href={href} className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
          <ChevronRight size={24} />
      </Link>
    )}
  </Card>
);

/**
 * Doctor Dashboard Page using Batch API
 */
export default function DoctorDashboardPage() {
  // Start performance tracking
  useEffect(() => {
    const perf = trackPerformance('DoctorDashboardPage-render');
    return () => {
      perf.stop();
    };
  }, []);

  // Fetch all dashboard data in a single batch request
  const batchResult = useDashboardBatch();

  // Extract and process data from batch response
  const {
    data,
    isLoading,
    error
  } = useSafeBatchData(
    batchResult,
    ['userProfile', 'notifications', 'todayAppointments', 'upcomingAppointments', 'stats', 'availability']
  );

  // Log insights about the batch operation
  useEffect(() => {
    if (!isLoading && !error) {
      const successKeys = Object.keys(data).filter(key => data[key]?.success);
      logInfo('Doctor dashboard batch data loaded', {
        totalKeys: Object.keys(data).length,
        successKeys,
        errorKeys: Object.keys(data).filter(key => !data[key]?.success)
      });
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
  const todayAppointments = data.todayAppointments?.success
    ? data.todayAppointments.appointments || []
    : [];
  const upcomingAppointments = data.upcomingAppointments?.success
    ? (data.upcomingAppointments.appointments || []) as Appointment[]
    : [] as Appointment[];
  const statsData = data.stats?.success ? data.stats : null;
  const availability = data.availability?.success ? data.availability : null;

  // Filter upcoming appointments to exclude those already covered in todayAppointments
  const todayAppointmentIds = new Set(todayAppointments.map((a: Appointment) => a.id));
  const filteredUpcoming = upcomingAppointments.filter((a: Appointment) => !todayAppointmentIds.has(a.id));

  // Derived states for easier access
  const profile = userProfileData?.user as UserProfile | null;
  const upcomingCount = statsData?.upcomingCount ?? 0;
  const pastCount = statsData?.pastCount ?? 0;
  const unreadNotifications = statsData?.notifUnread ?? 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Doctor Dashboard</h1>

      {profile && (
        <DoctorProfileSummary profile={profile} />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard title="Today's Appointments" value={todayAppointments.length} Icon={CalendarCheck} isLoading={isLoading} href="/doctor/appointments?filter=today" />
          {/* We use upcomingCount from stats, as todayAppointments might not include future ones today */}
          <StatCard title="Upcoming Appointments" value={upcomingCount as number} Icon={AlarmClock} isLoading={isLoading} href="/doctor/appointments?filter=upcoming" />
          <StatCard title="Unread Notifications" value={unreadNotifications as number} Icon={Bell} isLoading={isLoading} href="/notifications" />
          {/* Example: Past Count - Consider if this is useful here */}
          {/* <StatCard title="Past Appointments" value={pastCount} Icon={ClipboardList} isLoading={isLoading} href="/doctor/appointments?filter=past" /> */}
      </div>
      
      {/* Debug info */}
      {process.env.NODE_ENV !== 'production' && (
        <Card className="p-4 bg-yellow-50 border-yellow-200 mb-4">
          <h3 className="font-semibold mb-2">Debug Information</h3>
          <div className="text-sm space-y-1">
            <p>Stats API upcomingCount: {upcomingCount}</p>
            <p>Upcoming appointments from API: {upcomingAppointments.length}</p>
            <p>Filtered upcoming appointments: {filteredUpcoming.length}</p>
            <details>
              <summary className="cursor-pointer text-blue-600">Show api payload</summary>
              <pre className="bg-gray-100 p-2 mt-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify({stats: statsData, upcomingApptsPayload: data.upcomingAppointments}, null, 2)}
              </pre>
            </details>
          </div>
        </Card>
      )}

      {/* Main Content Area - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (Wider) - Appointments & Availability */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appointments Tab Section */}
          <Card>
            <Tab.Group>
              <Tab.List className="flex space-x-1 rounded-t-lg bg-slate-100 dark:bg-slate-800 p-1">
                <Tab className={({ selected }) =>
                    clsx(
                      'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                      'ring-white/60 ring-offset-2 ring-offset-primary-400 focus:outline-none focus:ring-2',
                      selected
                        ? 'bg-white dark:bg-slate-700 text-primary shadow'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/[0.12] hover:text-primary'
                    )
                  }>
                  Today ({todayAppointments.length})
                </Tab>
                <Tab className={({ selected }) =>
                    clsx(
                      'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                      'ring-white/60 ring-offset-2 ring-offset-primary-400 focus:outline-none focus:ring-2',
                      selected
                        ? 'bg-white dark:bg-slate-700 text-primary shadow'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/[0.12] hover:text-primary'
                    )
                  }>
                  Upcoming ({filteredUpcoming.length})
                </Tab>
              </Tab.List>
              <Tab.Panels className="mt-2 p-4">
                <Tab.Panel>
                  <AppointmentsList
                      appointments={todayAppointments}
                      emptyMessage="No appointments scheduled for today."
                  />
                  <div className="mt-4 text-right">
                     <Link href="/doctor/appointments?filter=today">
                        <Button variant="link" size="sm">View All Today's</Button>
                     </Link>
                  </div>
                </Tab.Panel>
                <Tab.Panel>
                  <AppointmentsList
                      appointments={filteredUpcoming}
                      emptyMessage="No other upcoming appointments scheduled."
                  />
                   <div className="mt-4 text-right">
                     <Link href="/doctor/appointments?filter=upcoming">
                        <Button variant="link" size="sm">View All Upcoming</Button>
                     </Link>
                  </div>
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </Card>

          {availability && (
             <Card>
                 <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                     <h2 className="text-lg font-semibold">Your Availability</h2>
                     <Link href="/doctor/availability">
                         <Button variant="ghost" size="sm">
                             Manage
                             <ArrowRight className="ml-1 h-4 w-4" />
                         </Button>
                     </Link>
                 </div>
                 <div className="p-4">
                     <AvailabilitySummary availability={availability} />
                 </div>
             </Card>
          )}
        </div>

        {/* Right Column - Notifications & Quick Actions */}
        <div className="space-y-6">
           <Card>
               <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                   <h2 className="text-lg font-semibold">Recent Notifications</h2>
                   <Link href="/notifications">
                       <Button variant="ghost" size="sm">
                           View All
                           <ArrowRight className="ml-1 h-4 w-4" />
                       </Button>
                   </Link>
               </div>
               <div className="p-4">
                   <NotificationsList
                       notifications={notifications.slice(0, 5)} // Show limited notifications
                       emptyMessage="No new notifications."
                   />
               </div>
           </Card>

           <Card>
               <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                   <h2 className="text-lg font-semibold">Quick Actions</h2>
               </div>
               <div className="p-4 space-y-3">
                   <Link href="/doctor/availability" className="block">
                       <Button variant="outline" className="w-full justify-start">
                           <CalendarDays className="mr-2 h-4 w-4" /> Manage Availability
                       </Button>
                   </Link>
                   <Link href="/doctor/appointments" className="block">
                       <Button variant="outline" className="w-full justify-start">
                           <ClipboardList className="mr-2 h-4 w-4" /> View All Appointments
                       </Button>
                   </Link>
                   <Link href="/doctor/profile" className="block">
                       <Button variant="outline" className="w-full justify-start">
                           <User className="mr-2 h-4 w-4" /> Edit Profile
                       </Button>
                   </Link>
                   {/* Add more actions as needed, e.g., Messages */}
                   {/* <Link href="/doctor/messages" className="block">
                       <Button variant="outline" className="w-full justify-start">
                           <MessageSquare className="mr-2 h-4 w-4" /> View Messages
                       </Button>
                   </Link> */} 
               </div>
           </Card>
        </div>

      </div>
    </div>
  );
}

// --- Updated Components ---

function DoctorProfileSummary({ profile }: { profile: UserProfile | null }) {
  if (!profile) return null;

  return (
    <Card className="p-4 mb-6 flex items-center gap-4 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/30 dark:to-secondary-900/30">
      <Avatar
        src={profile.profilePictureUrl ?? undefined}
        initials={`${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`}
        alt={`${profile.firstName || ''} ${profile.lastName || ''}`}
        size={64}
      />
      <div className="flex-1">
        <h2 className="text-xl font-semibold">
          Welcome back, Dr. {profile.lastName || profile.firstName}!
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          {profile.email || 'Email not set'}
        </p>
      </div>
      <Link href="/doctor/profile">
           <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1"/> Profile Settings</Button>
      </Link>
    </Card>
  );
}

// Removed DashboardStats - replaced by StatCard grid

function AppointmentsList({ appointments, emptyMessage }: { appointments: Appointment[]; emptyMessage: string }) {
  if (appointments.length === 0) {
    return <p className="text-slate-500 text-sm p-4 text-center">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {appointments.map(appointment => (
        <Card key={appointment.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex-shrink-0">
                 {appointment.appointmentType === AppointmentType.VIDEO ? 
                     <Video className="h-5 w-5 text-primary"/> : 
                     <User className="h-5 w-5 text-secondary"/>
                 }
            </div>
            <div className="flex-1">
                <p className="font-medium">
                  {appointment.patientName || 'Patient Name Missing'}
                </p>
                <p className="text-sm text-slate-500">
                  {safeFormat(appointment.appointmentDate, 'hh:mm a')} ({appointment.appointmentType})
                </p>
            </div>
             <Badge variant={getStatusVariant(appointment.status)} size="sm">{appointment.status}</Badge>
            <Link href={`/doctor/appointments/${appointment.id}`}>
                <Button size="sm" variant="ghost">
                  Details <ChevronRight className="h-4 w-4 ml-1"/>
                </Button>
            </Link>
        </Card>
      ))}
    </div>
  );
}

function NotificationsList({ notifications, emptyMessage }: { notifications: Notification[]; emptyMessage: string }) {
  if (notifications.length === 0) {
    return <p className="text-slate-500 text-sm p-4 text-center">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {notifications.map(notification => (
        <Card key={notification.id} className={`p-3 border-l-4 ${notification.isRead ? 'border-transparent' : 'border-primary'} hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`}>
          <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                  <p className={`font-medium text-sm ${!notification.isRead ? 'text-primary-700 dark:text-primary-300' : ''}`}>
                      {notification.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {notification.message}
                  </p>
              </div>
              {!notification.isRead && <div className="w-2 h-2 bg-primary rounded-full mt-1 flex-shrink-0"></div>}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
            {safeFormat(notification.createdAt, 'MMM d, hh:mm a')}
          </p>
          {/* Add Link/Button if notifications are actionable */} 
          {/* <Button size="xs" variant="link" className="mt-1">View Details</Button> */} 
        </Card>
      ))}
    </div>
  );
}

function AvailabilitySummary({ availability }: { availability: any }) {
  if (!availability?.weeklySchedule) {
       return <p className="text-slate-500 text-sm">Availability not set up.</p>;
  }
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {days.map(day => {
            const daySchedule = availability.weeklySchedule[day];
            const isActive = Array.isArray(daySchedule) && daySchedule.length > 0;
            return (
              <div key={day} className={`p-2 rounded border ${isActive ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20'}`}>
                <p className={`text-sm font-medium capitalize mb-1 ${isActive ? 'text-green-800 dark:text-green-200' : 'text-slate-600 dark:text-slate-300'}`}>{day}</p>
                {isActive ? (
                    <div className="space-y-0.5">
                        {daySchedule.map((slot: any, index: number) => (
                            <p key={index} className="text-xs text-green-700 dark:text-green-300">
                                {slot.startTime} - {slot.endTime}
                            </p>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500">Unavailable</p>
                )}
              </div>
            );
        })}
      </div>
  );
}
