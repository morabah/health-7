'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  Move,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react'; // Import LucideIcon type
import { format, isValid, parseISO } from 'date-fns';
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
const getStatusVariant = (
  status?: AppointmentStatus
): 'info' | 'success' | 'danger' | 'default' => {
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
    { id: 'profile', title: 'Your Profile', visible: true, order: 0 },
    { id: 'stats', title: 'Dashboard Summary', visible: true, order: 1 },
    { id: 'appointments', title: 'Appointments', visible: true, order: 2 },
    { id: 'notifications', title: 'Recent Notifications', visible: true, order: 3 },
    { id: 'availability', title: 'Availability Settings', visible: true, order: 4 },
    { id: 'quick-actions', title: 'Quick Actions', visible: true, order: 5 },
  ],
  layout: 'default',
  theme: 'system',
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
  <Card
    className={`flex items-center gap-4 p-5 transition-colors hover:shadow-md ${href ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''} ${className || ''}`}
  >
    <div className={`p-3 rounded-full bg-primary-100 dark:bg-primary-900/30`}>
      <Icon size={22} className="text-primary" />
    </div>
    <div className="flex-1">
      <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
        {title}
      </p>
      {isLoading ? (
        <div className="h-8 mt-1 flex items-center">
          <Spinner size="sm" />
        </div>
      ) : (
        <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-100">{value}</p>
      )}
    </div>
    {href && (
      <Link
        href={href}
        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
      >
        <ChevronRight size={24} />
      </Link>
    )}
  </Card>
);

// Add a skeleton loader component for cards
const SkeletonCard = () => (
  <div className="animate-pulse">
    <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
  </div>
);

// Add a skeleton loader for the profile section
const ProfileSkeletonLoader = () => (
  <Card className="p-6 border border-gray-200 dark:border-gray-700">
    <div className="flex items-center animate-pulse">
      <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      <div className="ml-4 flex-1">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      </div>
      <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  </Card>
);

// Add a skeleton loader for stat cards
const StatCardSkeleton = () => (
  <Card className="flex items-center gap-4 p-5">
    <div className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 w-12 h-12"></div>
    <div className="flex-1 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
      <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
    </div>
    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
  </Card>
);

// Add a skeleton loader for appointments
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
 * Doctor Dashboard Page using Batch API
 */
export default function DoctorDashboardPage() {
  const [progressiveLoad, setProgressiveLoad] = useState({
    profile: false,
    stats: false,
    appointments: false,
    notifications: false,
  });

  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardPreferences>(
    defaultDashboardPreferences
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  // Load saved preferences from local storage on component mount
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem('doctorDashboardPreferences');
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
      localStorage.setItem('doctorDashboardPreferences', JSON.stringify(dashboardPreferences));
    } catch (error) {
      logInfo('Failed to save dashboard preferences', error);
    }
  }, [dashboardPreferences]);

  // Start performance tracking
  useEffect(() => {
    const perf = trackPerformance('DoctorDashboardPage-render');

    // Simulate progressive loading
    setTimeout(() => setProgressiveLoad(prev => ({ ...prev, profile: true })), 300);
    setTimeout(() => setProgressiveLoad(prev => ({ ...prev, stats: true })), 600);
    setTimeout(() => setProgressiveLoad(prev => ({ ...prev, appointments: true })), 900);
    setTimeout(() => setProgressiveLoad(prev => ({ ...prev, notifications: true })), 1200);

    return () => {
      perf.stop();
    };
  }, []);

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

  // Fetch all dashboard data in a single batch request
  const batchResult = useDashboardBatch();

  // Extract and process data from batch response
  const { data, isLoading, error } = useSafeBatchData(batchResult, [
    'userProfile',
    'notifications',
    'todayAppointments',
    'upcomingAppointments',
    'stats',
    'availability',
  ]);

  // Log insights about the batch operation
  useEffect(() => {
    if (!isLoading && !error) {
      const successKeys = Object.keys(data).filter(key => data[key]?.success);
      logInfo('Doctor dashboard batch data loaded', {
        totalKeys: Object.keys(data).length,
        successKeys,
        errorKeys: Object.keys(data).filter(key => !data[key]?.success),
      });
    }
  }, [isLoading, error, data]);

  // Show skeleton loaders during initial loading
  if (isLoading && !progressiveLoad.profile) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Doctor Dashboard</h1>

        <div className="mb-6">
          <ProfileSkeletonLoader />
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            Dashboard Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Today's Appointments
                  </h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <AppointmentCardSkeleton key={i} />
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Recent Notifications
                  </h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
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
    ? ((data.upcomingAppointments.appointments || []) as Appointment[])
    : ([] as Appointment[]);
  const statsData = data.stats?.success ? data.stats : null;
  const availability = data.availability?.success ? data.availability : null;

  // Filter upcoming appointments to exclude those already covered in todayAppointments
  const todayAppointmentIds = new Set(todayAppointments.map((a: Appointment) => a.id));
  const filteredUpcoming = upcomingAppointments.filter(
    (a: Appointment) => !todayAppointmentIds.has(a.id)
  );

  // Derived states for easier access
  const profile = userProfileData?.user as UserProfile | null;
  const upcomingCount = statsData?.upcomingCount ?? 0;
  const pastCount = statsData?.pastCount ?? 0;
  const unreadNotifications = statsData?.notifUnread ?? 0;

  // Sort sections by their order
  const sortedSections = [...dashboardPreferences.sections].sort((a, b) => a.order - b.order);

  // Render dashboard sections based on preferences
  const renderSection = (sectionId: string) => {
    const section = dashboardPreferences.sections.find(s => s.id === sectionId);

    if (!section || !section.visible) return null;

    // Render section content based on ID
    switch (sectionId) {
      case 'profile':
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
            {isLoading && !progressiveLoad.profile ? (
              <ProfileSkeletonLoader />
            ) : profile ? (
              <DoctorProfileSummary profile={profile} />
            ) : (
              <Card className="p-4 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700">
                <div className="flex items-center">
                  <AlertCircle className="text-yellow-500 mr-2" size={20} />
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Your profile information could not be loaded. Please try refreshing or contact
                    support.
                  </p>
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
        );

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
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
              Dashboard Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading && !progressiveLoad.stats ? (
                <>
                  {[...Array(3)].map((_, i) => (
                    <StatCardSkeleton key={i} />
                  ))}
                </>
              ) : (
                <>
                  <StatCard
                    title="Today's Appointments"
                    value={todayAppointments.length}
                    Icon={CalendarCheck}
                    isLoading={isLoading}
                    href="/doctor/appointments?filter=today"
                  />
                  <StatCard
                    title="Upcoming Appointments"
                    value={upcomingCount as number}
                    Icon={AlarmClock}
                    isLoading={isLoading}
                    href="/doctor/appointments?filter=upcoming"
                  />
                  <StatCard
                    title="Unread Notifications"
                    value={unreadNotifications as number}
                    Icon={Bell}
                    isLoading={isLoading}
                    href="/notifications"
                  />
                </>
              )}
            </div>
          </div>
        );

      case 'appointments':
      case 'notifications':
      case 'availability':
      case 'quick-actions':
        // These sections are rendered in the main layout
        return null;

      default:
        return null;
    }
  };

  // Get visible main grid sections
  const visibleMainSections = dashboardPreferences.sections
    .filter(
      s =>
        ['appointments', 'notifications', 'availability', 'quick-actions'].includes(s.id) &&
        s.visible
    )
    .sort((a, b) => a.order - b.order);

  return (
    <div
      className={`space-y-6 p-4 md:p-6 ${dashboardPreferences.layout === 'compact' ? 'max-w-5xl mx-auto' : ''}`}
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Doctor Dashboard</h1>

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

      {/* Remove debug info in production */}
      {process.env.NODE_ENV !== 'production' && (
        <Card className="p-4 bg-yellow-50 border-yellow-200 mb-4">
          <h3 className="font-semibold mb-2">Debug Information</h3>
          <div className="text-sm space-y-1">
            <p>Stats API upcomingCount: {upcomingCount}</p>
            <p>Upcoming appointments from API: {upcomingAppointments.length}</p>
            <p>Filtered upcoming appointments: {filteredUpcoming.length}</p>
          </div>
        </Card>
      )}

      {/* Render top sections based on preferences */}
      {sortedSections
        .filter(s => s.visible && ['profile', 'stats'].includes(s.id))
        .map(section => renderSection(section.id))}

      {/* Main grid for the rest of the sections */}
      <div
        className={`grid grid-cols-1 ${dashboardPreferences.layout === 'expanded' ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6`}
      >
        {/* Left column (appointments and availability) */}
        <div className={dashboardPreferences.layout === 'expanded' ? '' : 'lg:col-span-2'}>
          <div className="space-y-6">
            {/* Appointments section */}
            {visibleMainSections.find(s => s.id === 'appointments') && (
              <Card
                key="appointments"
                draggable={isEditMode}
                onDragStart={() => handleDragStart('appointments')}
                onDragOver={e => handleDragOver(e, 'appointments')}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, 'appointments')}
                className={isEditMode ? 'border-dashed' : ''}
              >
                <Tab.Group>
                  <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between px-6 py-4">
                      {isEditMode ? (
                        <div className="flex items-center gap-2">
                          <Move size={16} className="text-gray-400" />
                          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            {
                              dashboardPreferences.sections.find(s => s.id === 'appointments')
                                ?.title
                            }
                          </h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleSectionVisibility('appointments')}
                            className="ml-2"
                          >
                            <Eye size={16} />
                          </Button>
                        </div>
                      ) : (
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                          Appointments
                        </h3>
                      )}
                      <Link href="/doctor/appointments">
                        <Button variant="ghost" size="sm" className="flex items-center gap-1">
                          View All <ArrowRight size={16} />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <Tab.List className="flex space-x-1 px-4 pt-3 bg-white dark:bg-gray-900">
                    <Tab
                      className={({ selected }) =>
                        clsx(
                          'w-full py-2.5 text-sm font-medium leading-5 text-primary-600 dark:text-primary-400',
                          'rounded-t-lg',
                          'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60',
                          selected
                            ? 'bg-white dark:bg-gray-800 border-b-2 border-primary-500'
                            : 'text-slate-600 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400'
                        )
                      }
                    >
                      Today ({todayAppointments.length})
                    </Tab>
                    <Tab
                      className={({ selected }) =>
                        clsx(
                          'w-full py-2.5 text-sm font-medium leading-5 text-primary-600 dark:text-primary-400',
                          'rounded-t-lg',
                          'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60',
                          selected
                            ? 'bg-white dark:bg-gray-800 border-b-2 border-primary-500'
                            : 'text-slate-600 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400'
                        )
                      }
                    >
                      Upcoming ({filteredUpcoming.length})
                    </Tab>
                  </Tab.List>

                  <Tab.Panels>
                    <Tab.Panel className="p-6">
                      {isLoading && !progressiveLoad.appointments ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <AppointmentCardSkeleton key={i} />
                          ))}
                        </div>
                      ) : todayAppointments.length > 0 ? (
                        <div className="space-y-4">
                          <AppointmentsList
                            appointments={todayAppointments as Appointment[]}
                            emptyMessage="No appointments scheduled for today"
                          />
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">
                            No appointments scheduled for today
                          </p>
                          <Link href="/doctor/availability">
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4 flex items-center mx-auto gap-1"
                            >
                              <Calendar size={16} /> Manage Availability
                            </Button>
                          </Link>
                        </div>
                      )}
                    </Tab.Panel>

                    <Tab.Panel className="p-6">
                      {isLoading && !progressiveLoad.appointments ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <AppointmentCardSkeleton key={i} />
                          ))}
                        </div>
                      ) : filteredUpcoming.length > 0 ? (
                        <div className="space-y-4">
                          <AppointmentsList
                            appointments={filteredUpcoming}
                            emptyMessage="No upcoming appointments scheduled"
                          />
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <CalendarDays className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">
                            No upcoming appointments scheduled
                          </p>
                          <Link href="/doctor/availability">
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4 flex items-center mx-auto gap-1"
                            >
                              <Calendar size={16} /> Manage Availability
                            </Button>
                          </Link>
                        </div>
                      )}
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>
              </Card>
            )}

            {/* Availability Summary section */}
            {visibleMainSections.find(s => s.id === 'availability') && (
              <Card
                key="availability"
                draggable={isEditMode}
                onDragStart={() => handleDragStart('availability')}
                onDragOver={e => handleDragOver(e, 'availability')}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, 'availability')}
                className={isEditMode ? 'border-dashed' : ''}
              >
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between px-6 py-4">
                    {isEditMode ? (
                      <div className="flex items-center gap-2">
                        <Move size={16} className="text-gray-400" />
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                          {dashboardPreferences.sections.find(s => s.id === 'availability')?.title}
                        </h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleSectionVisibility('availability')}
                          className="ml-2"
                        >
                          <Eye size={16} />
                        </Button>
                      </div>
                    ) : (
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        Availability Settings
                      </h3>
                    )}
                    <Link href="/doctor/availability">
                      <Button variant="ghost" size="sm" className="flex items-center gap-1">
                        Manage <ArrowRight size={16} />
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="p-6">
                  {isLoading && !progressiveLoad.appointments ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  ) : (
                    <AvailabilitySummary availability={availability} />
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Right column (notifications and quick actions) */}
        <div className="space-y-6">
          {/* Notifications section */}
          {visibleMainSections.find(s => s.id === 'notifications') && (
            <Card
              key="notifications"
              draggable={isEditMode}
              onDragStart={() => handleDragStart('notifications')}
              onDragOver={e => handleDragOver(e, 'notifications')}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, 'notifications')}
              className={isEditMode ? 'border-dashed' : ''}
            >
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-6 py-4">
                  {isEditMode ? (
                    <div className="flex items-center gap-2">
                      <Move size={16} className="text-gray-400" />
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        {dashboardPreferences.sections.find(s => s.id === 'notifications')?.title}
                      </h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleSectionVisibility('notifications')}
                        className="ml-2"
                      >
                        <Eye size={16} />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        Recent Notifications
                      </h3>
                      {unreadNotifications > 0 && (
                        <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 text-xs font-medium rounded-full">
                          {unreadNotifications} unread
                        </span>
                      )}
                    </div>
                  )}
                  <Link href="/notifications">
                    <Button variant="ghost" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {isLoading && !progressiveLoad.notifications ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="space-y-4">
                    <NotificationsList
                      notifications={notifications}
                      emptyMessage="No recent notifications"
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No new notifications</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Quick Actions section */}
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
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-6 py-4">
                  {isEditMode ? (
                    <div className="flex items-center gap-2">
                      <Move size={16} className="text-gray-400" />
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        {dashboardPreferences.sections.find(s => s.id === 'quick-actions')?.title}
                      </h3>
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
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      Quick Actions
                    </h3>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 gap-3">
                  <Link href="/doctor/availability">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="mr-2" size={16} />
                      Manage Availability
                    </Button>
                  </Link>
                  <Link href="/doctor/profile">
                    <Button variant="outline" className="w-full justify-start">
                      <User className="mr-2" size={16} />
                      Update Profile
                    </Button>
                  </Link>
                  <Link href="/doctor/patients">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="mr-2" size={16} />
                      View My Patients
                    </Button>
                  </Link>
                  <Link href="/notifications">
                    <Button variant="outline" className="w-full justify-start">
                      <Bell className="mr-2" size={16} />
                      <span className="flex-1 text-left">Manage Notifications</span>
                      {unreadNotifications > 0 && (
                        <span className="px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 text-xs font-medium rounded-full ml-2">
                          {unreadNotifications}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Link href="/doctor/appointments?filter=today">
                    <Button variant="outline" className="w-full justify-start">
                      <Video className="mr-2" size={16} />
                      Start Virtual Appointment
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

// Enhanced doctor profile summary component
function DoctorProfileSummary({ profile }: { profile: UserProfile | null }) {
  if (!profile) {
    return (
      <Card className="p-4 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700">
        <p className="text-yellow-700 dark:text-yellow-300">Profile data is missing.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/30 dark:to-secondary-900/30">
      <div className="flex items-center">
        <div className="h-16 w-16 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300">
          <Stethoscope size={28} />
        </div>
        <div className="ml-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Dr. {profile.firstName} {profile.lastName}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            {profile.email || 'No email provided'}
          </p>
        </div>
        <div className="ml-auto">
          <Link href="/doctor/profile">
            <Button variant="outline" size="sm">
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

// Enhanced function components for appointments list
function AppointmentsList({
  appointments,
  emptyMessage,
}: {
  appointments: Appointment[];
  emptyMessage: string;
}) {
  if (!appointments || appointments.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-4">{emptyMessage}</p>;
  }

  // Sort appointments by time
  const sortedAppointments = [...appointments].sort((a, b) => {
    // Convert to Date objects for comparison
    const dateA = new Date(`${a.appointmentDate} ${a.startTime}`);
    const dateB = new Date(`${b.appointmentDate} ${b.startTime}`);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="space-y-4">
      {sortedAppointments.map(appointment => (
        <Link href={`/doctor/appointments/${appointment.id}`} key={appointment.id}>
          <Card className="p-4 hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 cursor-pointer">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center">
                <div className="rounded-full h-10 w-10 bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                  <User size={18} />
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-slate-800 dark:text-slate-100">
                    {appointment.patientName}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {appointment.appointmentType || 'Consultation'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {safeFormat(appointment.appointmentDate, 'MMM d, yyyy')}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {appointment.startTime} - {appointment.endTime}
                </div>
                <Badge variant={getStatusVariant(appointment.status)}>{appointment.status}</Badge>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// Enhanced function for notifications list
function NotificationsList({
  notifications,
  emptyMessage,
}: {
  notifications: Notification[];
  emptyMessage: string;
}) {
  if (!notifications || notifications.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-4">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      {notifications.slice(0, 5).map(notification => (
        <Card
          key={notification.id}
          className={`p-4 border ${notification.isRead ? 'border-gray-200 dark:border-gray-700' : 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20'}`}
        >
          <div className="flex items-start">
            <Bell className="text-primary-500 mt-0.5 flex-shrink-0" size={16} />
            <div className="ml-3">
              <h4 className="font-medium text-slate-800 dark:text-slate-100">
                {notification.title}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {notification.message}
              </p>
              {notification.createdAt && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  {safeFormat(notification.createdAt, 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Enhanced function for availability summary
interface AvailabilitySummary {
  activeDays?: number;
  activeHours?: number;
}

function AvailabilitySummary({ availability }: { availability: AvailabilitySummary | null }) {
  if (!availability) {
    return (
      <div className="text-center py-6">
        <Clock className="h-10 w-10 mx-auto text-gray-400 mb-2" />
        <p className="text-gray-500 dark:text-gray-400">No availability settings found</p>
        <Link href="/doctor/availability">
          <Button variant="outline" size="sm" className="mt-3">
            Set Your Availability
          </Button>
        </Link>
      </div>
    );
  }

  // Show a message if available
  return (
    <div>
      <div className="mb-4">
        <h4 className="font-medium text-slate-800 dark:text-slate-100 mb-2">
          Current Availability
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          You have {availability.activeDays || 0} active days with {availability.activeHours || 0}{' '}
          hours of availability.
        </p>
      </div>
      <Link href="/doctor/availability">
        <Button variant="outline" size="sm">
          <Calendar className="mr-2" size={16} />
          Manage Schedule
        </Button>
      </Link>
    </div>
  );
}
