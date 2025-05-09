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
  Move,
  Eye,
  EyeOff,
  Save,
  UserCog,
  ChevronRight,
  ClipboardList,
  ListChecks,
  CheckSquare,
  UserPlus,
} from 'lucide-react';
import { useDashboardBatch } from '@/data/dashboardLoaders';
import { useSafeBatchData } from '@/hooks/useSafeBatchData';
import { VerificationStatus, UserType, AppointmentStatus } from '@/types/enums';
import { logInfo, logValidation } from '@/lib/logger';
import ProgressBar from '@/components/ui/ProgressBar';
import { formatDistanceToNow } from 'date-fns';
import Badge from '@/components/ui/Badge';
import AdminDashboardErrorBoundary from '@/components/error-boundaries/AdminDashboardErrorBoundary';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { trackPerformance } from '@/lib/performance';

// Define dashboard section types for personalization
interface DashboardSection {
  id: string;
  title: string;
  visible: boolean;
  order: number;
}

// Define user preferences for dashboard
interface DashboardPreferences {
  sections: DashboardSection[];
  layout: 'default' | 'compact' | 'expanded';
  theme: 'system' | 'light' | 'dark';
}

// Default dashboard preferences
const defaultDashboardPreferences: DashboardPreferences = {
  sections: [
    { id: 'stats', title: 'Dashboard Stats', visible: true, order: 0 },
    { id: 'verification', title: 'Doctor Verifications', visible: true, order: 1 },
    { id: 'recent-users', title: 'Recent Users', visible: true, order: 2 },
    { id: 'recent-appointments', title: 'Recent Appointments', visible: true, order: 3 },
    { id: 'system-status', title: 'System Status', visible: true, order: 4 },
    { id: 'quick-actions', title: 'Quick Actions', visible: true, order: 5 },
  ],
  layout: 'default',
  theme: 'system',
};

// Add skeleton components for loading states
const StatCardSkeleton = () => (
  <Card className="p-6">
    <div className="flex items-center space-x-3 mb-3 animate-pulse">
      <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full w-9 h-9"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
    </div>
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
  </Card>
);

const VerificationCardSkeleton = () => (
  <Card>
    <div className="animate-pulse">
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
      </div>
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            <div className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 w-8 h-8"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

const UserCardSkeleton = () => (
  <Card>
    <div className="animate-pulse">
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
      </div>
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3">
            <div className="flex items-center">
              <div className="rounded-full bg-gray-200 dark:bg-gray-700 w-8 h-8"></div>
              <div className="ml-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              </div>
            </div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

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
      className={`p-6 ${customOnClick || href ? 'cursor-pointer transition-transform hover:scale-[1.02]' : ''}`}
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
  'pendingDoctors',
];

function AdminDashboardContent() {
  const { user } = useAuth();
  const batchResult = useDashboardBatch();

  const [progressiveLoad, setProgressiveLoad] = useState({
    stats: false,
    verification: false,
    users: false,
    appointments: false,
  });

  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardPreferences>(
    defaultDashboardPreferences
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  // Load saved preferences from local storage on component mount
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem('adminDashboardPreferences');
      if (savedPreferences) {
        setDashboardPreferences(JSON.parse(savedPreferences));
      }
    } catch (error) {
      logInfo('Failed to load dashboard preferences', error);
      // Fall back to defaults if there's an error
      setDashboardPreferences(defaultDashboardPreferences);
    }
  }, []);

  // Save preferences to local storage when they change
  useEffect(() => {
    try {
      localStorage.setItem('adminDashboardPreferences', JSON.stringify(dashboardPreferences));
    } catch (error) {
      logInfo('Failed to save dashboard preferences', error);
    }
  }, [dashboardPreferences]);

  // Start performance tracking and progressive loading
  useEffect(() => {
    const perf = trackPerformance('AdminDashboardPage-render');

    // Simulate progressive loading
    setTimeout(() => setProgressiveLoad(prev => ({ ...prev, stats: true })), 300);
    setTimeout(() => setProgressiveLoad(prev => ({ ...prev, verification: true })), 600);
    setTimeout(() => setProgressiveLoad(prev => ({ ...prev, users: true })), 900);
    setTimeout(() => setProgressiveLoad(prev => ({ ...prev, appointments: true })), 1200);

    return () => {
      perf.stop();
    };
  }, []);

  const {
    data: extractedData,
    isLoading: batchLoading,
    error: batchError,
  } = useSafeBatchData(batchResult, adminDashboardKeys);

  // Extracted data pieces
  const adminStats = extractedData?.adminStats?.adminStats;
  const allUsers = extractedData?.allUsers?.success ? extractedData.allUsers.users : [];
  const pendingDoctors = extractedData?.pendingDoctors?.success
    ? extractedData.pendingDoctors.doctors.filter(
        d => d.verificationStatus === VerificationStatus.PENDING
      )
    : [];
  const allAppointments = extractedData?.allAppointments?.success
    ? extractedData.allAppointments.appointments
    : [];

  // Dashboard statistics derived from API data
  const totalUsers = adminStats?.totalUsers || 0;
  const totalDoctors = adminStats?.totalDoctors || 0;
  const totalPatients = adminStats?.totalPatients || 0;
  const pendingVerificationsCount = adminStats?.pendingVerifications || 0;

  // Get recent users (last 5)
  const recentUsers = useMemo(() => {
    if (!allUsers || !Array.isArray(allUsers)) return [];
    return [...allUsers]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [allUsers]);

  // Get recent appointments (last 5)
  const recentAppointments = useMemo(() => {
    if (!allAppointments || !Array.isArray(allAppointments)) return [];
    return [...allAppointments]
      .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())
      .slice(0, 5);
  }, [allAppointments]);

  // Toggle section visibility
  const toggleSectionVisibility = (sectionId: string) => {
    setDashboardPreferences(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, visible: !section.visible } : section
      ),
    }));
  };

  // Handle layout change
  const changeLayout = (layout: 'default' | 'compact' | 'expanded') => {
    setDashboardPreferences(prev => ({
      ...prev,
      layout,
    }));
  };

  // Handle section drag start
  const handleDragStart = (sectionId: string) => {
    setDraggedSection(sectionId);
  };

  // Handle section drag over
  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    if (draggedSection && draggedSection !== sectionId) {
      // Highlight the drop target
      e.currentTarget.classList.add('border-primary-400', 'border-2');
    }
  };

  // Handle section drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    // Remove highlighting
    e.currentTarget.classList.remove('border-primary-400', 'border-2');
  };

  // Handle section drop
  const handleDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-primary-400', 'border-2');

    if (draggedSection && draggedSection !== targetSectionId) {
      // Reorder sections
      const updatedSections = [...dashboardPreferences.sections];
      const draggedSectionObj = updatedSections.find(s => s.id === draggedSection);
      const targetSectionObj = updatedSections.find(s => s.id === targetSectionId);

      if (draggedSectionObj && targetSectionObj) {
        // Swap orders
        const draggedOrder = draggedSectionObj.order;
        const targetOrder = targetSectionObj.order;

        updatedSections.forEach(section => {
          if (section.id === draggedSection) {
            section.order = targetOrder;
          } else if (section.id === targetSectionId) {
            section.order = draggedOrder;
          }
        });

        setDashboardPreferences(prev => ({
          ...prev,
          sections: updatedSections,
        }));
      }
    }

    setDraggedSection(null);
  };

  // Show skeleton loaders during initial loading
  if (batchLoading && !progressiveLoad.stats) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Admin Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VerificationCardSkeleton />
          <UserCardSkeleton />
        </div>
      </div>
    );
  }

  if (batchError) {
    return (
      <Alert variant="error">
        <div>
          <h3 className="font-medium">{batchError.message}</h3>
          <p>Error loading dashboard data</p>
        </div>
      </Alert>
    );
  }

  // Sort sections by their order
  const sortedSections = [...dashboardPreferences.sections].sort((a, b) => a.order - b.order);

  // Render dashboard sections based on preferences
  const renderSection = (sectionId: string) => {
    const section = dashboardPreferences.sections.find(s => s.id === sectionId);

    if (!section || !section.visible) return null;

    // Render section content based on ID
    switch (sectionId) {
      case 'stats':
        return (
          <div
            className="mb-6"
            key={sectionId}
            draggable={isEditMode}
            onDragStart={() => handleDragStart(sectionId)}
            onDragOver={e => handleDragOver(e, sectionId)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, sectionId)}
          >
            {isEditMode && (
              <div className="flex justify-between items-center mb-2">
                <h2 className="flex items-center gap-2">
                  <Move size={16} className="text-gray-400" />
                  <span className="text-lg font-semibold">{section.title}</span>
                </h2>
                <Button
                  size="sm"
                  variant={section.visible ? 'ghost' : 'outline'}
                  onClick={() => toggleSectionVisibility(sectionId)}
                >
                  {section.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {batchLoading && !progressiveLoad.stats ? (
                [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
              ) : (
                <>
                  <Stat
                    title="Total Users"
                    value={totalUsers}
                    Icon={Users}
                    isLoading={batchLoading}
                    href="/admin/users"
                  />
                  <Stat
                    title="Patients"
                    value={totalPatients}
                    Icon={UserRound}
                    isLoading={batchLoading}
                    href="/admin/users?role=patient"
                  />
                  <Stat
                    title="Doctors"
                    value={totalDoctors}
                    Icon={Stethoscope}
                    isLoading={batchLoading}
                    href="/admin/users?role=doctor"
                  />
                  <Stat
                    title="Pending Verifications"
                    value={pendingVerificationsCount}
                    Icon={ShieldAlert}
                    isLoading={batchLoading}
                    href="/admin/doctor-verification"
                    trend={pendingVerificationsCount > 0 ? 'negative' : null}
                    subtitle={pendingVerificationsCount > 0 ? 'Needs attention' : ''}
                  />
                </>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Get visible main grid sections
  const visibleMainSections = dashboardPreferences.sections
    .filter(
      s =>
        [
          'verification',
          'recent-users',
          'recent-appointments',
          'system-status',
          'quick-actions',
        ].includes(s.id) && s.visible
    )
    .sort((a, b) => a.order - b.order);

  return (
    <div
      className={`space-y-6 p-4 md:p-6 ${dashboardPreferences.layout === 'compact' ? 'max-w-5xl mx-auto' : ''}`}
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Admin Dashboard</h1>

        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <Button
                size="sm"
                variant="success"
                onClick={() => setIsEditMode(false)}
                className="flex items-center gap-1"
              >
                <Save size={16} />
                Save Changes
              </Button>

              <div className="border-l border-gray-300 dark:border-gray-700 h-8 mx-1"></div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Layout:</span>
                <select
                  value={dashboardPreferences.layout}
                  onChange={e => changeLayout(e.target.value as 'default' | 'compact' | 'expanded')}
                  className="text-sm border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-800"
                >
                  <option value="default">Default</option>
                  <option value="compact">Compact</option>
                  <option value="expanded">Expanded</option>
                </select>
              </div>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditMode(true)}
              className="flex items-center gap-1"
            >
              <Settings size={16} />
              Customize Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Render top sections based on preferences */}
      {sortedSections
        .filter(s => s.visible && ['stats'].includes(s.id))
        .map(section => renderSection(section.id))}

      {/* Main Grid Layout */}
      <div
        className={`grid grid-cols-1 ${
          dashboardPreferences.layout === 'expanded'
            ? 'lg:grid-cols-1'
            : dashboardPreferences.layout === 'compact'
              ? 'lg:grid-cols-2 max-w-5xl gap-6'
              : 'lg:grid-cols-2 gap-6'
        }`}
      >
        {/* Left Column */}
        <div className="space-y-6">
          {/* Doctor Verification Requests */}
          {visibleMainSections.find(s => s.id === 'verification') && (
            <Card
              key="verification"
              draggable={isEditMode}
              onDragStart={() => handleDragStart('verification')}
              onDragOver={e => handleDragOver(e, 'verification')}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, 'verification')}
              className={isEditMode ? 'border-dashed' : ''}
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <Move size={16} className="text-gray-400" />
                    <h2 className="text-lg font-medium">
                      {dashboardPreferences.sections.find(s => s.id === 'verification')?.title}
                    </h2>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleSectionVisibility('verification')}
                      className="ml-2"
                    >
                      <Eye size={16} />
                    </Button>
                  </div>
                ) : (
                  <h2 className="text-lg font-medium">Doctor Verification Requests</h2>
                )}
                <Link href="/admin/doctor-verification">
                  <Button variant="ghost" size="sm">
                    View all
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="p-4">
                {batchLoading && !progressiveLoad.verification ? (
                  <div className="space-y-4 animate-pulse">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-start gap-3 p-3">
                        <div className="p-2 rounded-full mt-1 bg-gray-200 dark:bg-gray-700 w-8 h-8"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pendingDoctors.length > 0 ? (
                  <div className="space-y-2">
                    {pendingDoctors.slice(0, 5).map(doctor => (
                      <Link href={`/admin/doctor-verification/${doctor.id}`} key={doctor.id}>
                        <div className="flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                          <div
                            className={`p-2 rounded-full mt-1 bg-amber-100 dark:bg-amber-900/30`}
                          >
                            <Stethoscope className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">
                              Dr. {doctor.firstName} {doctor.lastName}
                            </p>
                            <div className="flex justify-between mt-1">
                              <span className="text-xs text-slate-500">
                                {doctor.specialty || 'No specialty'}
                              </span>
                              <Badge variant="warning">Pending</Badge>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-success mb-3" />
                    <p className="text-slate-600 dark:text-slate-400">No pending verifications</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Recent Users */}
          {visibleMainSections.find(s => s.id === 'recent-users') && (
            <Card
              key="recent-users"
              draggable={isEditMode}
              onDragStart={() => handleDragStart('recent-users')}
              onDragOver={e => handleDragOver(e, 'recent-users')}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, 'recent-users')}
              className={isEditMode ? 'border-dashed' : ''}
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <Move size={16} className="text-gray-400" />
                    <h2 className="text-lg font-medium">
                      {dashboardPreferences.sections.find(s => s.id === 'recent-users')?.title}
                    </h2>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleSectionVisibility('recent-users')}
                      className="ml-2"
                    >
                      <Eye size={16} />
                    </Button>
                  </div>
                ) : (
                  <h2 className="text-lg font-medium">Recent Users</h2>
                )}
                <Link href="/admin/users">
                  <Button variant="ghost" size="sm">
                    View all
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="p-4">
                {batchLoading && !progressiveLoad.users ? (
                  <div className="space-y-4 animate-pulse">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3">
                        <div className="flex items-center">
                          <div className="rounded-full bg-gray-200 dark:bg-gray-700 w-8 h-8"></div>
                          <div className="ml-3">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                          </div>
                        </div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                ) : recentUsers.length > 0 ? (
                  <div className="space-y-1">
                    {recentUsers.map(user => (
                      <Link href={`/admin/users/${user.id}`} key={user.id}>
                        <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                          <div className="flex items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                user.userType === UserType.DOCTOR
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                  : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                              }`}
                            >
                              {user.userType === UserType.DOCTOR ? (
                                <Stethoscope className="h-4 w-4" />
                              ) : (
                                <UserRound className="h-4 w-4" />
                              )}
                            </div>
                            <div className="ml-3">
                              <p className="font-medium">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                          <Badge variant={user.userType === UserType.DOCTOR ? 'info' : 'success'}>
                            {user.userType}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-slate-600 dark:text-slate-400">No users found</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* System Status */}
          {visibleMainSections.find(s => s.id === 'system-status') && (
            <Card
              key="system-status"
              draggable={isEditMode}
              onDragStart={() => handleDragStart('system-status')}
              onDragOver={e => handleDragOver(e, 'system-status')}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, 'system-status')}
              className={isEditMode ? 'border-dashed' : ''}
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <Move size={16} className="text-gray-400" />
                    <h2 className="text-lg font-medium">
                      {dashboardPreferences.sections.find(s => s.id === 'system-status')?.title}
                    </h2>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleSectionVisibility('system-status')}
                      className="ml-2"
                    >
                      <Eye size={16} />
                    </Button>
                  </div>
                ) : (
                  <h2 className="text-lg font-medium">System Status</h2>
                )}
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <p className="text-sm font-medium">Database Status</p>
                      <Badge variant="success">Online</Badge>
                    </div>
                    <ProgressBar value={95} max={100} className="h-2" variant="success" />
                    <p className="text-xs text-right mt-1 text-slate-500">95% optimal</p>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <p className="text-sm font-medium">API Performance</p>
                      <Badge variant="success">Excellent</Badge>
                    </div>
                    <ProgressBar value={90} max={100} className="h-2" variant="success" />
                    <p className="text-xs text-right mt-1 text-slate-500">90% optimal</p>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <p className="text-sm font-medium">Storage Utilization</p>
                      <Badge variant="info">Good</Badge>
                    </div>
                    <ProgressBar value={60} max={100} className="h-2" variant="info" />
                    <p className="text-xs text-right mt-1 text-slate-500">60% used</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Recent Appointments */}
          {visibleMainSections.find(s => s.id === 'recent-appointments') && (
            <Card
              key="recent-appointments"
              draggable={isEditMode}
              onDragStart={() => handleDragStart('recent-appointments')}
              onDragOver={e => handleDragOver(e, 'recent-appointments')}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, 'recent-appointments')}
              className={isEditMode ? 'border-dashed' : ''}
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <Move size={16} className="text-gray-400" />
                    <h2 className="text-lg font-medium">
                      {
                        dashboardPreferences.sections.find(s => s.id === 'recent-appointments')
                          ?.title
                      }
                    </h2>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleSectionVisibility('recent-appointments')}
                      className="ml-2"
                    >
                      <Eye size={16} />
                    </Button>
                  </div>
                ) : (
                  <h2 className="text-lg font-medium">Recent Appointments</h2>
                )}
                <Link href="/admin/appointments">
                  <Button variant="ghost" size="sm">
                    View all
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="p-4">
                {batchLoading && !progressiveLoad.appointments ? (
                  <div className="space-y-4 animate-pulse">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className="flex justify-between mb-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                        <div className="flex justify-between">
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {recentAppointments.map(appointment => (
                      <Link href={`/admin/appointments/${appointment.id}`} key={appointment.id}>
                        <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex justify-between mb-1">
                            <p className="font-medium">{appointment.patientName}</p>
                            <p className="text-sm">
                              {
                                // Format date
                                new Date(appointment.appointmentDate).toLocaleDateString()
                              }
                            </p>
                          </div>
                          <p className="text-sm text-slate-500 mb-1">
                            With Dr. {appointment.doctorName}
                          </p>
                          <div className="flex justify-between">
                            <p className="text-xs text-slate-500">
                              {
                                // Try to extract time from appointmentDate
                                appointment.appointmentDate.includes('T')
                                  ? new Date(appointment.appointmentDate).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : 'Time not available'
                              }
                            </p>
                            <Badge
                              variant={
                                appointment.status === AppointmentStatus.COMPLETED
                                  ? 'success'
                                  : appointment.status === AppointmentStatus.CONFIRMED
                                    ? 'info'
                                    : appointment.status === AppointmentStatus.CANCELED
                                      ? 'danger'
                                      : 'default'
                              }
                            >
                              {appointment.status}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-slate-600 dark:text-slate-400">No appointments found</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          {visibleMainSections.find(s => s.id === 'quick-actions') && (
            <Card
              key="quick-actions"
              draggable={isEditMode}
              onDragStart={() => handleDragStart('quick-actions')}
              onDragOver={e => handleDragOver(e, 'quick-actions')}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, 'quick-actions')}
              className={isEditMode ? 'border-dashed' : ''}
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <Move size={16} className="text-gray-400" />
                    <h2 className="text-lg font-medium">
                      {dashboardPreferences.sections.find(s => s.id === 'quick-actions')?.title}
                    </h2>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleSectionVisibility('quick-actions')}
                      className="ml-2"
                    >
                      <Eye size={16} />
                    </Button>
                  </div>
                ) : (
                  <h2 className="text-lg font-medium">Quick Actions</h2>
                )}
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 gap-3">
                  <Link href="/admin/users/create">
                    <Button variant="outline" className="w-full justify-start">
                      <UserPlus className="mr-2" size={16} />
                      Create New User
                    </Button>
                  </Link>
                  <Link href="/admin/doctor-verification">
                    <Button variant="outline" className="w-full justify-start">
                      <CheckSquare className="mr-2" size={16} />
                      <span className="flex-1 text-left">Verify Doctors</span>
                      {pendingVerificationsCount > 0 && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-medium rounded-full ml-2">
                          {pendingVerificationsCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Link href="/admin/appointments">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="mr-2" size={16} />
                      Manage Appointments
                    </Button>
                  </Link>
                  <Link href="/admin/users">
                    <Button variant="outline" className="w-full justify-start">
                      <UserCog className="mr-2" size={16} />
                      User Management
                    </Button>
                  </Link>
                  <Link href="/admin/reports">
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="mr-2" size={16} />
                      System Reports
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
