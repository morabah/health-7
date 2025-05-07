'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import {
  Users,
  UserRound,
  Stethoscope,
  ShieldAlert,
  ArrowRight,
  Calendar,
  Activity,
  Clock,
  AlertCircle,
  BarChart3,
  Bell,
  CheckCircle,
  Link as LinkIcon,
  Settings,
} from 'lucide-react';
import {
  useAdminDashboardData,
  useAllUsers,
  useAllDoctors,
  useAllAppointments,
} from '@/data/adminLoaders';
import { VerificationStatus, UserType, AppointmentStatus } from '@/types/enums';
import { logInfo, logValidation } from '@/lib/logger';
import ProgressBar from '@/components/ui/ProgressBar';
import { formatDistanceToNow } from 'date-fns';
import Badge from '@/components/ui/Badge';
import AdminDashboardErrorBoundary from '@/components/error-boundaries/AdminDashboardErrorBoundary';

// Stat component for dashboard statistics with trend indicator
function Stat({
  title,
  value,
  Icon,
  isLoading = false,
  trend = null, // Can be positive, negative, or null
  subtitle = '',
  onClick = null,
}: {
  title: string;
  value: number | string;
  Icon: React.ElementType;
  isLoading?: boolean;
  trend?: 'positive' | 'negative' | null;
  subtitle?: string;
  onClick?: (() => void) | null;
}) {
  return (
    <Card
      className={`p-6 ${onClick ? 'cursor-pointer transition-transform hover:scale-[1.02]' : ''}`}
      onClick={onClick || undefined}
    >
      <div className="flex items-center space-x-3 mb-3">
        <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-full">
          <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </div>
        <h3 className="font-medium text-slate-600 dark:text-slate-300">{title}</h3>
      </div>
      {isLoading ? (
        <div className="flex items-center h-8">
          <Spinner className="h-4 w-4" />
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <span
                className={`text-sm ${trend === 'positive' ? 'text-success' : 'text-danger'} font-medium`}
              >
                {trend === 'positive' ? '↑' : '↓'} {subtitle}
              </span>
            )}
          </div>
          {subtitle && !trend && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </>
      )}
    </Card>
  );
}

// Card header with link component
function HeaderWithLink({
  title,
  href,
  linkText = 'View all',
}: {
  title: string;
  href: string;
  linkText?: string;
}) {
  return (
    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
      <h2 className="text-lg font-medium">{title}</h2>
      <Link href={href}>
        <Button variant="ghost" size="sm">
          {linkText}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

// Activity item component
function ActivityItem({
  title,
  time,
  status,
  icon: Icon,
  statusColor,
}: {
  title: string;
  time: string;
  status: string;
  icon: React.ElementType;
  statusColor: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3">
      <div className={`p-2 rounded-full mt-1 ${statusColor}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-500">{time}</span>
          <span className="text-xs font-medium">{status}</span>
        </div>
      </div>
    </div>
  );
}

// API response types
interface AdminStatsResponse {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  pendingVerifications: number;
  // Add other stats as needed
}

interface DashboardDataResponse {
  success: boolean;
  adminStats?: AdminStatsResponse;
  error?: string;
}

interface UsersDataResponse {
  success: boolean;
  users: User[];
  error?: string;
}

interface DoctorsDataResponse {
  success: boolean;
  doctors: Doctor[];
  error?: string;
}

interface AppointmentsDataResponse {
  success: boolean;
  appointments: Appointment[];
  totalCount: number;
  error?: string;
}

// For TypeScript
type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: UserType;
  createdAt: string;
};

type Doctor = User & {
  specialty: string;
  verificationStatus: VerificationStatus;
};

type Appointment = {
  id: string;
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  status: AppointmentStatus;
};

// Define the type for the activity feed item
interface ActivityFeedItem {
  id: string;
  title: string;
  time: string;
  status: string;
  icon: React.ElementType;
  statusColor: string;
  timestamp: number;
}

export default function AdminDashboard() {
  return (
    <AdminDashboardErrorBoundary>
      <AdminDashboardContent />
    </AdminDashboardErrorBoundary>
  );
}

function AdminDashboardContent() {
  // Use unified dashboard data loader
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useAdminDashboardData() as {
    data: DashboardDataResponse | undefined;
    isLoading: boolean;
    error: unknown;
  };

  // Still need these for the user and doctor lists
  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = useAllUsers() as {
    data: UsersDataResponse | undefined;
    isLoading: boolean;
    error: unknown;
  };

  const {
    data: doctorsData,
    isLoading: doctorsLoading,
    error: doctorsError,
  } = useAllDoctors() as {
    data: DoctorsDataResponse | undefined;
    isLoading: boolean;
    error: unknown;
  };

  const {
    data: appointmentsData,
    isLoading: appointmentsLoading,
    error: appointmentsError,
  } = useAllAppointments() as {
    data: AppointmentsDataResponse | undefined;
    isLoading: boolean;
    error: unknown;
  };

  // Get stats from dashboard data
  const totalUsers = dashboardData?.success ? dashboardData.adminStats?.totalUsers || 0 : 0;
  const totalPatients = dashboardData?.success ? dashboardData.adminStats?.totalPatients || 0 : 0;
  const totalDoctors = dashboardData?.success ? dashboardData.adminStats?.totalDoctors || 0 : 0;
  const pendingVerifications = dashboardData?.success
    ? dashboardData.adminStats?.pendingVerifications || 0
    : 0;
  const totalAppointments = appointmentsData?.success ? appointmentsData.totalCount || 0 : 0;

  // Get derived statistics - memoize to prevent infinite render loops
  const verifiedDoctorsCount = useMemo(
    () =>
      doctorsData?.success
        ? doctorsData.doctors.filter(
            (doctor: Doctor) => doctor.verificationStatus === VerificationStatus.VERIFIED
          ).length
        : 0,
    [doctorsData]
  );

  const doctorVerificationRate = useMemo(
    () => (totalDoctors > 0 ? Math.round((verifiedDoctorsCount / totalDoctors) * 100) : 0),
    [totalDoctors, verifiedDoctorsCount]
  );

  // Get recent users and pending doctors - memoize to prevent infinite render loops
  const recentUsers = useMemo(
    () =>
      usersData?.success
        ? usersData.users
            .sort(
              (a: User, b: User) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .slice(0, 5)
        : [],
    [usersData]
  );

  const pendingDoctors = useMemo(
    () =>
      doctorsData?.success
        ? doctorsData.doctors
            .filter((doctor: Doctor) => doctor.verificationStatus === VerificationStatus.PENDING)
            .slice(0, 5)
        : [],
    [doctorsData]
  );

  // Get upcoming appointments - memoize to prevent infinite render loops
  const upcomingAppointments = useMemo(
    () =>
      appointmentsData?.success
        ? appointmentsData.appointments
            .filter((appt: Appointment) => appt.status === AppointmentStatus.CONFIRMED)
            .sort(
              (a: Appointment, b: Appointment) =>
                new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
            )
            .slice(0, 5)
        : [],
    [appointmentsData]
  );

  // Combined error state
  const hasError = dashboardError || usersError || doctorsError || appointmentsError;
  const errorMessage = dashboardError
    ? String(dashboardError)
    : usersError
      ? String(usersError)
      : doctorsError
        ? String(doctorsError)
        : appointmentsError
          ? String(appointmentsError)
          : '';

  // Activity feed data (combined from various sources)
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);

  // Use effect to generate activity feed from various sources
  useEffect(() => {
    const activities: ActivityFeedItem[] = [];

    // Only proceed if we have data and no errors
    if (hasError || dashboardLoading || usersLoading || doctorsLoading || appointmentsLoading) {
      return;
    }

    // Add recent users
    const userActivities = recentUsers.map((user: User) => {
      const createdAt = new Date(user.createdAt);
      return {
        id: `user-${user.id}`,
        title: `New ${user.userType.toLowerCase()}: ${user.firstName} ${user.lastName}`,
        time: formatDistanceToNow(createdAt, { addSuffix: true }),
        status: 'Registered',
        icon: user.userType === UserType.DOCTOR ? Stethoscope : UserRound,
        statusColor: 'bg-blue-500',
        timestamp: createdAt.getTime(),
      };
    });

    // Add pending doctors
    const doctorActivities = pendingDoctors.map((doctor: Doctor) => {
      const createdAt = new Date(doctor.createdAt);
      return {
        id: `doctor-${doctor.id}`,
        title: `${doctor.firstName} ${doctor.lastName} (${doctor.specialty})`,
        time: formatDistanceToNow(createdAt, { addSuffix: true }),
        status: 'Pending Verification',
        icon: ShieldAlert,
        statusColor: 'bg-yellow-500',
        timestamp: createdAt.getTime(),
      };
    });

    // Add upcoming appointments
    const appointmentActivities = upcomingAppointments.map((appt: Appointment) => {
      const apptDate = new Date(appt.appointmentDate);
      return {
        id: `appointment-${appt.id}`,
        title: `${appt.patientName} with ${appt.doctorName}`,
        time: formatDistanceToNow(apptDate, { addSuffix: true }),
        status: appt.status,
        icon: Calendar,
        statusColor: 'bg-green-500',
        timestamp: apptDate.getTime(),
      };
    });

    // Combine and sort by timestamp (newest first)
    activities.push(...userActivities, ...doctorActivities, ...appointmentActivities);
    activities.sort((a, b) => b.timestamp - a.timestamp);

    // Take the most recent 8 activities
    setActivityFeed(activities.slice(0, 8));
  }, [
    hasError,
    dashboardLoading,
    usersLoading,
    doctorsLoading,
    appointmentsLoading,
    recentUsers,
    pendingDoctors,
    upcomingAppointments,
  ]);

  // Handle error display
  if (hasError) {
    return (
      <div className="p-8">
        <Alert variant="error" className="mb-4">
          {errorMessage}
        </Alert>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // Handle loading state
  if (dashboardLoading || usersLoading || doctorsLoading || appointmentsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Manage users, appointments, and system health.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat
          title="Total Users"
          value={totalUsers}
          Icon={Users}
          onClick={() => (window.location.href = '/admin/users')}
        />
        <Stat
          title="Patients"
          value={totalPatients}
          Icon={UserRound}
          onClick={() => (window.location.href = '/admin/users?type=patient')}
        />
        <Stat
          title="Doctors"
          value={totalDoctors}
          Icon={Stethoscope}
          onClick={() => (window.location.href = '/admin/doctors')}
        />
        <Stat
          title="Pending Verifications"
          value={pendingVerifications}
          Icon={ShieldAlert}
          trend={pendingVerifications > 5 ? 'negative' : null}
          subtitle={pendingVerifications > 5 ? 'Needs attention' : ''}
          onClick={() => (window.location.href = '/admin/doctors?status=PENDING')}
        />
      </div>

      {/* Stats Grid Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat
          title="Total Appointments"
          value={totalAppointments}
          Icon={Calendar}
          onClick={() => (window.location.href = '/admin/appointments')}
        />
        <Stat
          title="Doctor Verification Rate"
          value={`${doctorVerificationRate}%`}
          Icon={CheckCircle}
          subtitle={`${verifiedDoctorsCount} of ${totalDoctors} doctors`}
        />
        <Stat
          title="System Status"
          value="Healthy"
          Icon={Activity}
          trend="positive"
          subtitle="All systems operational"
        />
        <Stat
          title="API Response Time"
          value="280ms"
          Icon={Clock}
          subtitle="Last 24 hours average"
        />
      </div>

      {/* Content cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Users */}
        <Card className="col-span-1">
          <HeaderWithLink title="Recent Users" href="/admin/users" />
          <div className="divide-y">
            {recentUsers.map((user: User) => (
              <div key={user.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <Badge variant={user.userType === UserType.DOCTOR ? 'info' : 'success'}>
                    {user.userType}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Registered {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Pending Verifications */}
        <Card className="col-span-1">
          <HeaderWithLink title="Pending Verifications" href="/admin/doctors?status=PENDING" />
          <div className="divide-y">
            {pendingDoctors.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No pending verifications</div>
            ) : (
              pendingDoctors.map((doctor: Doctor) => (
                <div key={doctor.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {doctor.firstName} {doctor.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{doctor.specialty}</p>
                    </div>
                    <Link href={`/admin/doctor-verification/${doctor.id}`}>
                      <Button size="sm" variant="outline">
                        Verify
                      </Button>
                    </Link>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Applied {formatDistanceToNow(new Date(doctor.createdAt), { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Activity Feed */}
        <Card className="col-span-1">
          <HeaderWithLink title="Activity Feed" href="/admin/activity" />
          <div className="divide-y">
            {activityFeed.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No recent activity</div>
            ) : (
              activityFeed.map(activity => (
                <ActivityItem
                  key={activity.id}
                  title={activity.title}
                  time={activity.time}
                  status={activity.status}
                  icon={activity.icon}
                  statusColor={activity.statusColor}
                />
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="mb-8">
        <Card>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-medium">Quick Actions</h2>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/users" className="block">
              <div className="p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <span className="text-sm font-medium">Manage Users</span>
              </div>
            </Link>
            <Link href="/admin/doctors?status=PENDING" className="block">
              <div className="p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-center">
                <ShieldAlert className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                <span className="text-sm font-medium">Verify Doctors</span>
              </div>
            </Link>
            <Link href="/admin/appointments" className="block">
              <div className="p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <span className="text-sm font-medium">Appointments</span>
              </div>
            </Link>
            <Link href="/admin/settings" className="block">
              <div className="p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-center">
                <Settings className="h-6 w-6 mx-auto mb-2 text-gray-500" />
                <span className="text-sm font-medium">Settings</span>
              </div>
            </Link>
          </div>
        </Card>
      </div>

      {/* System Health Section */}
      <div className="mb-8">
        <Card>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-medium">System Health</h2>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Database</span>
                  <span className="text-sm text-success">Operational</span>
                </div>
                <ProgressBar value={92} className="bg-success-500" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">API Services</span>
                  <span className="text-sm text-success">Operational</span>
                </div>
                <ProgressBar value={98} className="bg-success-500" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Storage</span>
                  <span className="text-sm text-warning">65% Used</span>
                </div>
                <ProgressBar value={65} className="bg-warning-500" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Memory</span>
                  <span className="text-sm text-success">Optimal</span>
                </div>
                <ProgressBar value={30} className="bg-success-500" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
