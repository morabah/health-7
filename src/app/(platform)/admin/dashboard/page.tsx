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
  useDashboardBatch
} from '@/data/dashboardLoaders';
import { useSafeBatchData } from '@/hooks/useSafeBatchData';
import { VerificationStatus, UserType, AppointmentStatus } from '@/types/enums';
import { logInfo, logValidation } from '@/lib/logger';
import ProgressBar from '@/components/ui/ProgressBar';
import { formatDistanceToNow } from 'date-fns';
import Badge from '@/components/ui/Badge';
import AdminDashboardErrorBoundary from '@/components/error-boundaries/AdminDashboardErrorBoundary';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// Stat component for dashboard statistics with trend indicator
function Stat({
  title,
  value,
  Icon,
  isLoading = false,
  trend = null, // Can be positive, negative, or null
  subtitle = '',
  onClick: customOnClick = null,
  href = null,
}: {
  title: string;
  value: number | string;
  Icon: React.ElementType;
  isLoading?: boolean;
  trend?: 'positive' | 'negative' | null;
  subtitle?: string;
  onClick?: (() => void) | null;
  href?: string | null;
}) {
  const router = useRouter();
  const handleClick = () => {
    if (customOnClick) {
      customOnClick();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <Card
      className={`p-6 ${(customOnClick || href) ? 'cursor-pointer transition-transform hover:scale-[1.02]' : ''}`}
      onClick={handleClick}
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

// Define the keys array outside for AdminDashboardContent for stability
const adminDashboardKeys = [
  'adminStats',
  'allUsers',
  'allDoctors',
  'allAppointments',
  'pendingDoctors'
];

function AdminDashboardContent() {
  const { user } = useAuth();
  const batchResult = useDashboardBatch();

  const {
    data: extractedData,
    isLoading: batchLoading,
    error: batchError,
  } = useSafeBatchData(batchResult, adminDashboardKeys); // Use the new safe version

  // Extracted data pieces
  const adminStats = extractedData?.adminStats?.adminStats;
  const usersData = extractedData?.allUsers?.users;
  const doctorsData = extractedData?.allDoctors?.doctors;
  const appointmentsData = extractedData?.allAppointments?.appointments;
  const pendingDoctorsData = extractedData?.pendingDoctors?.doctors;

  // Consolidate loading and error states
  const isLoading = batchLoading;
  const error = batchError;

  // Derived states (examples, adjust as per actual data structure)
  const totalUsers = adminStats?.totalUsers ?? 0;
  const totalPatients = adminStats?.totalPatients ?? 0;
  const totalDoctors = adminStats?.totalDoctors ?? 0;
  const pendingVerifications = adminStats?.pendingVerifications ?? 0;
  
  const recentUsers = usersData?.slice(0, 5) ?? [];
  const recentDoctors = doctorsData?.slice(0, 5) ?? [];
  const recentAppointments = appointmentsData?.slice(0, 5) ?? [];
  const doctorsToVerify = pendingDoctorsData?.slice(0, 5) ?? [];

  // Example activity feed generation (replace with actual logic)
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);

  useEffect(() => {
    const newFeed: ActivityFeedItem[] = [];
    if (usersData) {
      usersData.slice(0, 2).forEach((u: any) => 
        newFeed.push({
          id: `user-${u.id}`,
          title: `New user registered: ${u.firstName} ${u.lastName}`,
          time: formatDistanceToNow(new Date(u.createdAt), { addSuffix: true }),
          status: u.userType === UserType.DOCTOR ? 'Doctor' : 'Patient',
          icon: UserRound,
          statusColor: 'bg-blue-500',
          timestamp: new Date(u.createdAt).getTime(),
        })
      );
    }
    if (appointmentsData) {
      appointmentsData.slice(0, 2).forEach((appt: any) => 
        newFeed.push({
          id: `appt-${appt.id}`,
          title: `New appointment: ${appt.patientName} with ${appt.doctorName}`,
          time: formatDistanceToNow(new Date(appt.appointmentDate), { addSuffix: true }),
          status: appt.status,
          icon: Calendar,
          statusColor: 'bg-green-500',
          timestamp: new Date(appt.appointmentDate).getTime(),
        })
      );
    }
    if (pendingDoctorsData) {
        pendingDoctorsData.slice(0,1).forEach((doc:any) => 
            newFeed.push({
                id: `verify-${doc.id}`,
                title: `Doctor pending verification: ${doc.firstName} ${doc.lastName}`,
                time: formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true }),
                status: 'Pending',
                icon: ShieldAlert,
                statusColor: 'bg-orange-500',
                timestamp: new Date(doc.createdAt).getTime(),
            })
        );
    }
    setActivityFeed(newFeed.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5));
  }, [usersData, appointmentsData, pendingDoctorsData]);
  
  // Log data for validation - MOVED UP
  useEffect(() => {
    if (!isLoading && !error) { 
      logInfo('Admin Dashboard Data Loaded', { adminStats, usersData, doctorsData, appointmentsData, pendingDoctorsData });

      // Collect missing keys for better diagnostics
      const missing: string[] = [];
      if (!adminStats) missing.push('adminStats');
      if (!usersData) missing.push('allUsers');
      if (!doctorsData) missing.push('allDoctors');
      if (!appointmentsData) missing.push('allAppointments');
      if (!pendingDoctorsData) missing.push('pendingDoctors');

      if (missing.length > 0) {
        logValidation(
          `Admin dashboard missing some data from batch after load: missing [${missing.join(', ')}]`,
          'failure',
          `ExtractedData: ${JSON.stringify(extractedData)}`
        );
      }
    }
  }, [adminStats, usersData, doctorsData, appointmentsData, pendingDoctorsData, isLoading, error]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" title="Error Loading Dashboard">
        {(error as Error).message || 'An unexpected error occurred.'}
      </Alert>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Stat title="Total Users" value={totalUsers} Icon={Users} isLoading={isLoading} href="/admin/users" />
        <Stat title="Total Patients" value={totalPatients} Icon={UserRound} isLoading={isLoading} href="/admin/users?type=patient" />
        <Stat title="Total Doctors" value={totalDoctors} Icon={Stethoscope} isLoading={isLoading} href="/admin/doctors" />
        <Stat
          title="Pending Verifications"
          value={pendingVerifications}
          Icon={ShieldAlert}
          isLoading={isLoading}
          href="/admin/doctor-verification"
        />
      </div>

      {/* Main Content Area - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Activity Feed & Quick Actions) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity Feed */}
          <Card>
            <HeaderWithLink title="Recent Activity" href="/admin/audit-log" linkText="View Audit Log" />
            <div className="p-4 space-y-3">
              {activityFeed.length > 0 ? (
                activityFeed.map((item) => (
                  <ActivityItem key={item.id} {...item} />
                ))
              ) : (
                <p className="text-slate-500 text-sm p-4 text-center">No recent activity.</p>
              )}
            </div>
          </Card>

          {/* Quick Actions or Key Metrics */}
          <Card>
            <HeaderWithLink title="System Health Overview" href="/admin/system-status" />
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-semibold mb-2">Database Status</h3>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success mr-2" />
                  <span>Operational</span>
                </div>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-2">API Response Time</h3>
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-primary mr-2" />
                  <span>Avg. 80ms</span>
                </div>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-2">Active Sessions</h3>
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-primary mr-2" />
                  <span>125</span>
                </div>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-2">Error Rate</h3>
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-warning mr-2" />
                  <span>0.5%</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (Key Lists like Pending Verifications, Recent Users) */}
        <div className="space-y-6">
          {/* Doctors Pending Verification */}
          {doctorsToVerify.length > 0 && (
            <Card>
              <HeaderWithLink title="Doctors Pending Verification" href="/admin/doctor-verification" />
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {doctorsToVerify.map((doctor: any) => (
                  <Link
                    key={doctor.id}
                    href={`/admin/doctor-verification/${doctor.id}`}
                    className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {doctor.firstName} {doctor.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{doctor.specialty}</p>
                      </div>
                      <Badge variant={doctor.verificationStatus === VerificationStatus.PENDING ? 'warning' : 'default'}>
                        {doctor.verificationStatus}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Recently Registered Users */}
          <Card>
            <HeaderWithLink title="Recently Registered Users" href="/admin/users" />
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {recentUsers.map((userItem: any) => (
                <Link
                  key={userItem.id}
                  href={`/admin/users/${userItem.id}`}
                  className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {userItem.firstName} {userItem.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{userItem.email}</p>
                    </div>
                    <Badge variant={userItem.userType === UserType.DOCTOR ? 'info' : 'secondary'}>
                      {userItem.userType}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
           {/* Recent Appointments (Simplified) */}
          <Card>
            <HeaderWithLink title="Recent Appointments" href="/admin/appointments" />
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {recentAppointments.map((appt: any) => (
                <Link 
                  key={appt.id} 
                  href={`/admin/appointments/${appt.id}`}
                  className="block p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium">{appt.patientName} with Dr. {appt.doctorName}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(appt.appointmentDate).toLocaleDateString()} - {new Date(appt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <Badge variant={ appt.status === AppointmentStatus.CONFIRMED ? 'success' : (appt.status === AppointmentStatus.CANCELED ? 'danger' : 'default') }>
                        {appt.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Links/Management Sections */}
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-medium">Quick Management</h2>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link href="/admin/users">
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" /> User Management
            </Button>
          </Link>
          <Link href="/admin/doctors">
            <Button variant="outline" className="w-full justify-start">
              <Stethoscope className="mr-2 h-4 w-4" /> Doctor Management
            </Button>
          </Link>
          <Link href="/admin/appointments">
            <Button variant="outline" className="w-full justify-start">
              <Calendar className="mr-2 h-4 w-4" /> Appointment Logs
            </Button>
          </Link>
          <Link href="/cms">
            <Button variant="outline" className="w-full justify-start">
              <LinkIcon className="mr-2 h-4 w-4" /> CMS Portal
            </Button>
          </Link>
          <Link href="/admin/settings">
            <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" /> System Settings
            </Button>
          </Link>
          <Link href="/admin/doctor-verification">
            <Button variant="outline" className="w-full justify-start">
                <ShieldAlert className="mr-2 h-4 w-4" /> Doctor Verification
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
