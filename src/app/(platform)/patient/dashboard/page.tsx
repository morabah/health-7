'use client';
import { useEffect, useState, lazy, Suspense, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { GlobalErrorBoundary } from '@/components/error-boundaries';
import useStandardErrorHandling from '@/hooks/useStandardErrorHandling';
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
  Check,
  EyeOff,
  Settings,
  Move,
  Eye,
  Save,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { logInfo, logError, logWarn } from '@/lib/logger';
import { AppError, DataError } from '@/lib/errors/errorClasses';
import { extractErrorMessage } from '@/lib/errors/errorHandlingUtils';
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
import { callApi } from '@/lib/apiClient';

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
    { id: 'health-overview', title: 'Health Overview', visible: true, order: 1 },
    { id: 'appointments', title: 'Upcoming Appointments', visible: true, order: 2 },
    { id: 'reminders', title: 'Health Reminders', visible: true, order: 3 },
    { id: 'notifications', title: 'Recent Notifications', visible: true, order: 4 },
    { id: 'quick-actions', title: 'Quick Actions', visible: true, order: 5 },
  ],
  layout: 'default',
  theme: 'system',
};

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
  <Card
    className={`flex items-center gap-4 p-5 transition-colors hover:shadow-md ${href ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''} ${className || ''}`}
  >
    <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900/30">
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
const patientDashboardKeys = ['userProfile', 'notifications', 'upcomingAppointments', 'stats'];

/**
 * Patient Dashboard Page using Batch API with optimized rendering
 *
 * Performance optimizations:
 * 1. Memoization of expensive components and callbacks
 * 2. Progressive loading with prioritized critical path rendering
 * 3. Deferred rendering of non-essential components
 * 4. Optimized data fetching with cache hydration
 * 5. Reduced re-renders by avoiding prop drilling
 */
function PatientDashboardPage() {
  const { handleError } = useStandardErrorHandling({
    componentName: 'PatientDashboardPage',
    defaultCategory: 'data',
    defaultSeverity: 'warning',
    defaultMessage: 'Failed to load dashboard data. Please try again later.',
  });
  useEffect(() => {
    const perf = trackPerformance('PatientDashboardPage-render');
    return () => {
      perf.stop();
    };
  }, []);

  const [progressiveLoad, setProgressiveLoad] = useState({
    profile: false,
    stats: false,
    appointments: false,
    notifications: false,
    health: false,
  });

  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [displayedNotifications, setDisplayedNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const prefRef = useRef<DashboardPreferences>(defaultDashboardPreferences);
  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardPreferences>(
    defaultDashboardPreferences
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  useEffect(() => {
    const perf = trackPerformance('loadDashboardPreferences');

    try {
      const savedPreferences = localStorage.getItem('dashboardPreferences');
      if (savedPreferences) {
        const parsed = JSON.parse(savedPreferences);
        prefRef.current = parsed;
        setDashboardPreferences(parsed);
      }

      // Clear stale dashboard cache to force fresh data
      const cacheKey = `dashboardBatch_u-007_patient`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const { timestamp } = JSON.parse(cachedData);
          const age = Date.now() - timestamp;
          // Clear cache if older than 60 seconds to ensure we get fresh data
          if (age > 60000) {
            localStorage.removeItem(cacheKey);
            logInfo('Cleared stale dashboard cache', { age: Math.round(age / 1000) + 's' });
          }
        } catch (e) {
          localStorage.removeItem(cacheKey);
          logInfo('Cleared corrupted dashboard cache');
        }
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error, 'Failed to load dashboard preferences');
      logError('Dashboard preferences loading error', {
        error,
        component: 'PatientDashboard',
        action: 'loadPreferences',
      });
      prefRef.current = defaultDashboardPreferences;
      setDashboardPreferences(defaultDashboardPreferences);
    }
    perf.stop();
  }, []);

  useEffect(() => {
    if (JSON.stringify(dashboardPreferences) === JSON.stringify(defaultDashboardPreferences)) {
      return;
    }

    const timer = setTimeout(() => {
      try {
        localStorage.setItem('dashboardPreferences', JSON.stringify(dashboardPreferences));
        prefRef.current = dashboardPreferences;
      } catch (error) {
        const errorMessage = extractErrorMessage(error, 'Failed to save dashboard preferences');
        logError('Dashboard preferences saving error', {
          error,
          component: 'PatientDashboard',
          action: 'savePreferences',
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [dashboardPreferences]);

  useEffect(() => {
    const perfLoad = trackPerformance('progressiveLoading');

    const profileTimer = setTimeout(() => {
      setProgressiveLoad(prev => ({ ...prev, profile: true }));
      perfLoad.mark('profile-loaded');
    }, 50);

    const statsTimer = setTimeout(() => {
      setProgressiveLoad(prev => ({ ...prev, stats: true }));
      perfLoad.mark('stats-loaded');
    }, 150);

    const appointmentsTimer = setTimeout(() => {
      setProgressiveLoad(prev => ({ ...prev, appointments: true }));
      perfLoad.mark('appointments-loaded');
    }, 250);

    const notificationsTimer = setTimeout(() => {
      setProgressiveLoad(prev => ({ ...prev, notifications: true }));
      perfLoad.mark('notifications-loaded');
    }, 350);

    const healthTimer = setTimeout(() => {
      setProgressiveLoad(prev => ({ ...prev, health: true }));
      perfLoad.mark('health-loaded');
      perfLoad.stop();
    }, 450);

    return () => {
      clearTimeout(profileTimer);
      clearTimeout(statsTimer);
      clearTimeout(appointmentsTimer);
      clearTimeout(notificationsTimer);
      clearTimeout(healthTimer);
    };
  }, []);

  const toggleSectionVisibility = useCallback((sectionId: string) => {
    setDashboardPreferences(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, visible: !section.visible } : section
      ),
    }));
  }, []);

  const changeLayout = useCallback((layout: 'default' | 'compact' | 'expanded') => {
    setDashboardPreferences(prev => ({
      ...prev,
      layout,
    }));
  }, []);

  const handleDragStart = useCallback((sectionId: string) => {
    setDraggedSection(sectionId);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, sectionId: string) => {
      e.preventDefault();
      if (draggedSection && draggedSection !== sectionId) {
        e.currentTarget.dataset.dropTarget = 'true';
        e.currentTarget.style.borderColor = 'var(--primary-400)';
        e.currentTarget.style.borderWidth = '2px';
      }
    },
    [draggedSection]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    delete e.currentTarget.dataset.dropTarget;
    e.currentTarget.style.borderColor = '';
    e.currentTarget.style.borderWidth = '';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetSectionId: string) => {
      e.preventDefault();
      delete e.currentTarget.dataset.dropTarget;
      e.currentTarget.style.borderColor = '';
      e.currentTarget.style.borderWidth = '';

      if (draggedSection && draggedSection !== targetSectionId) {
        setDashboardPreferences(prev => {
          const updatedSections = [...prev.sections];
          const draggedSectionObj = updatedSections.find(s => s.id === draggedSection);
          const targetSectionObj = updatedSections.find(s => s.id === targetSectionId);

          if (draggedSectionObj && targetSectionObj) {
            const draggedOrder = draggedSectionObj.order;
            const targetOrder = targetSectionObj.order;

            return {
              ...prev,
              sections: updatedSections.map(section => {
                if (section.id === draggedSection) {
                  return { ...section, order: targetOrder };
                } else if (section.id === targetSectionId) {
                  return { ...section, order: draggedOrder };
                }
                return section;
              }),
            };
          }
          return prev;
        });
      }

      setDraggedSection(null);
    },
    [draggedSection]
  );

  const batchResult = useDashboardBatch();

  const { data, isLoading, error } = useSafeBatchData(batchResult, patientDashboardKeys);

  if (error) {
    handleError(error);
    return <DashboardErrorFallback />;
  }

  const processDashboardData = (batchData: typeof data) => {
    if (!batchData) {
      handleError(new Error('Dashboard data is not available in processDashboardData'));
      return {
        userProfile: null,
        notifications: [],
        upcomingAppointments: [],
        stats: null,
      };
    }

    type BatchData = {
      userProfile?: { userProfile?: UserProfileType; success?: boolean };
      notifications?: { notifications?: NotificationType[]; success?: boolean };
      upcomingAppointments?: { appointments?: Appointment[]; success?: boolean };
      stats?: { success?: boolean; upcomingCount?: number; pastCount?: number };
    };

    const typedData = batchData as BatchData;

    // Log the actual data structure for debugging
    logInfo('Processing dashboard data', {
      hasUserProfile: !!typedData.userProfile,
      userProfileKeys: typedData.userProfile ? Object.keys(typedData.userProfile) : [],
      hasNotifications: !!typedData.notifications,
      hasUpcomingAppointments: !!typedData.upcomingAppointments,
      hasStats: !!typedData.stats,
    });

    return {
      userProfile: typedData.userProfile?.userProfile || null,
      notifications: typedData.notifications?.notifications || [],
      upcomingAppointments: typedData.upcomingAppointments?.appointments || [],
      stats: typedData.stats || null,
    };
  };

  // Memoize the processDashboardData function to avoid recreating it on every render
  const memoizedProcessData = useCallback((data: any) => {
    try {
      return processDashboardData(data);
    } catch (err) {
      handleError(err);
      return {
        userProfile: null,
        notifications: [],
        upcomingAppointments: [],
        stats: null,
      };
    }
  }, []);

  // Use the memoized function in useMemo with correct dependencies
  const dashboardData = useMemo(() => {
    if (!isLoading && data) {
      return memoizedProcessData(data);
    }
    return {
      userProfile: null,
      notifications: [],
      upcomingAppointments: [],
      stats: null,
    };
  }, [isLoading, data, memoizedProcessData]);

  // Use useEffect with stable reference check to prevent unnecessary updates
  useEffect(() => {
    const notifications = dashboardData.notifications;
    if (notifications && notifications.length > 0) {
      // Check if the notifications array has actually changed before updating state
      // This prevents unnecessary state updates that could trigger re-renders
      setDisplayedNotifications(prev => {
        if (
          prev.length !== notifications.length ||
          JSON.stringify(prev) !== JSON.stringify(notifications)
        ) {
          return notifications;
        }
        return prev;
      });

      const newUnreadCount = notifications.filter(n => !n.isRead).length;
      setUnreadCount(prev => (prev !== newUnreadCount ? newUnreadCount : prev));
    }
  }, [dashboardData.notifications]);

  const handleMarkAllAsRead = useCallback(() => {
    setMarkingAllAsRead(true);
    const unread = displayedNotifications.filter(n => !n.isRead);
    if (unread.length === 0) {
      setMarkingAllAsRead(false);
      return;
    }

    const markPromises = unread.map(notification =>
      callApi('markNotificationRead', { notificationId: notification.id })
    );

    Promise.all(markPromises)
      .then(() => {
        setDisplayedNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      })
      .catch(err => {
        handleError(err, {
          message: 'Failed to mark notifications as read',
          category: 'api',
          severity: 'warning',
        });
      })
      .finally(() => {
        setMarkingAllAsRead(false);
      });
  }, [displayedNotifications, handleError]);

  const profile = dashboardData.userProfile;
  const upcomingAppointments = dashboardData.upcomingAppointments;
  const statsData = dashboardData.stats;

  const healthStats = useMemo(
    () => ({
      upcomingAppointments: upcomingAppointments?.length || 0,
      pastAppointments: statsData?.pastCount || 0,
      completedCheckups: 2,
      medications: 1,
    }),
    [upcomingAppointments, statsData]
  );

  const sortedSections = [...dashboardPreferences.sections].sort((a, b) => a.order - b.order);

  const renderSection = (sectionId: string) => {
    const section = dashboardPreferences.sections.find(s => s.id === sectionId);

    if (!section || !section.visible) return null;

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
              <UserProfileSummary profile={profile} />
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

      case 'health-overview':
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

            {/* Enhanced Health Overview Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Heart className="text-primary-500" size={28} />
                  Your Health Overview
                </h2>
                <div className="text-sm text-slate-500">
                  Last updated: {new Date().toLocaleDateString()}
                </div>
              </div>

              {/* Health Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoading && !progressiveLoad.stats ? (
                  <>
                    {[...Array(4)].map((_, i) => (
                      <StatCardSkeleton key={i} />
                    ))}
                  </>
                ) : (
                  <>
                    <StatCard
                      title="Next Appointment"
                      value={
                        upcomingAppointments.length > 0
                          ? 'In ' +
                            Math.ceil(
                              (new Date(upcomingAppointments[0].appointmentDate).getTime() -
                                new Date().getTime()) /
                                (1000 * 60 * 60 * 24)
                            ) +
                            ' days'
                          : 'None scheduled'
                      }
                      Icon={CalendarCheck}
                      href="/patient/appointments?filter=upcoming"
                      className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700"
                    />
                    <StatCard
                      title="Total Appointments"
                      value={`${healthStats.upcomingAppointments + healthStats.pastAppointments}`}
                      Icon={Clipboard}
                      href="/patient/appointments"
                      className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-700"
                    />
                    <StatCard
                      title="Health Records"
                      value={healthStats.completedCheckups}
                      Icon={FileText}
                      href="/patient/health-records"
                      className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-700"
                    />
                    <StatCard
                      title="Active Medications"
                      value={healthStats.medications}
                      Icon={Pill}
                      href="/patient/medications"
                      className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-200 dark:border-orange-700"
                    />
                  </>
                )}
              </div>

              {/* Health Progress Visualization */}
              <Card className="p-6 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Activity className="text-primary-500" size={20} />
                  Health Progress This Year
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Appointments Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">
                        Appointments Completed
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {healthStats.pastAppointments}/12
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((healthStats.pastAppointments / 12) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-500">Goal: 12 per year</p>
                  </div>

                  {/* Health Records Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Health Records</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {healthStats.completedCheckups}/4
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((healthStats.completedCheckups / 4) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-500">Goal: 4 per year</p>
                  </div>

                  {/* Medication Compliance */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">
                        Medication Compliance
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">95%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: '95%' }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-500">Excellent adherence</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );

      case 'appointments':
        return (
          <Card
            key={sectionId}
            draggable={isEditMode}
            onDragStart={() => handleDragStart(sectionId)}
            onDragOver={e => handleDragOver(e, sectionId)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, sectionId)}
            className={isEditMode ? 'border-dashed' : ''}
          >
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-6 py-4">
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <Move size={16} className="text-gray-400" />
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      {dashboardPreferences.sections.find(s => s.id === 'appointments')?.title}
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
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <CalendarCheck className="text-primary-500" size={20} />
                    Upcoming Appointments
                  </h3>
                )}
                <Link href="/patient/appointments">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-700"
                  >
                    View All <ArrowRight size={16} />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="p-6">
              {isLoading && !progressiveLoad.appointments ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <AppointmentCardSkeleton key={i} />
                  ))}
                </div>
              ) : upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.slice(0, 3).map((appointment: Appointment) => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                  {upcomingAppointments.length > 3 && (
                    <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Link href="/patient/appointments?filter=upcoming">
                        <Button variant="outline" size="sm">
                          View {upcomingAppointments.length - 3} more appointments
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Stethoscope className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No upcoming appointments
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Schedule your next appointment to stay on top of your health
                  </p>
                  <Link href="/find-doctors">
                    <Button variant="primary" size="sm" className="flex items-center mx-auto gap-2">
                      <PlusCircle size={16} /> Book An Appointment
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>
        );

      case 'reminders':
        return (
          <Card
            key={sectionId}
            draggable={isEditMode}
            onDragStart={() => handleDragStart(sectionId)}
            onDragOver={e => handleDragOver(e, sectionId)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, sectionId)}
            className={isEditMode ? 'border-dashed' : ''}
          >
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-6 py-4">
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <Move size={16} className="text-gray-400" />
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      {dashboardPreferences.sections.find(s => s.id === 'reminders')?.title}
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleSectionVisibility('reminders')}
                      className="ml-2"
                    >
                      <Eye size={16} />
                    </Button>
                  </div>
                ) : (
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Bell className="text-orange-500" size={20} />
                    Health Reminders
                  </h3>
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {/* Dynamic reminders based on user data */}
                {upcomingAppointments.length === 0 && (
                  <div className="flex items-start p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <Activity className="text-blue-500 mr-3 mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="font-medium text-blue-700 dark:text-blue-300">
                        Schedule Your Next Checkup
                      </h4>
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                        It's important to maintain regular checkups. Consider scheduling your next
                        appointment.
                      </p>
                      <Link href="/find-doctors">
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          Find a Doctor
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {healthStats.medications > 0 && (
                  <div className="flex items-start p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    <Pill className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="font-medium text-green-700 dark:text-green-300">
                        Medication Reminder
                      </h4>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        Don't forget to take your daily medication. Consider setting up automatic
                        reminders.
                      </p>
                      <Link href="/patient/medications">
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 text-green-600 border-green-600 hover:bg-green-50"
                        >
                          Manage Medications
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                <div className="flex items-start p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                  <Heart className="text-purple-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="font-medium text-purple-700 dark:text-purple-300">
                      Wellness Tip
                    </h4>
                    <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                      Stay hydrated and aim for 7-8 hours of sleep each night for optimal health.
                    </p>
                  </div>
                </div>

                {/* Health records reminder */}
                {healthStats.completedCheckups < 2 && (
                  <div className="flex items-start p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                    <FileText className="text-orange-500 mr-3 mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="font-medium text-orange-700 dark:text-orange-300">
                        Update Your Health Records
                      </h4>
                      <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                        Keep your health records up to date by uploading recent test results and
                        medical documents.
                      </p>
                      <Link href="/patient/health-records">
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 text-orange-600 border-orange-600 hover:bg-orange-50"
                        >
                          View Records
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );

      case 'notifications':
        return (
          <Card
            key={sectionId}
            draggable={isEditMode}
            onDragStart={() => handleDragStart(sectionId)}
            onDragOver={e => handleDragOver(e, sectionId)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, sectionId)}
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
                    <Bell className="text-primary-500 mr-2" size={20} />
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      Recent Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 text-xs font-medium rounded-full">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  {unreadCount > 0 && !isEditMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      disabled={markingAllAsRead}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      {markingAllAsRead ? (
                        <Spinner size="sm" className="mr-1" />
                      ) : (
                        <Check size={16} className="mr-1" />
                      )}
                      Mark all read
                    </Button>
                  )}
                  <Link href="/notifications">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary-600 hover:text-primary-700"
                    >
                      View All
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            <div className="p-6">
              {isLoading && !progressiveLoad.notifications ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : displayedNotifications.length > 0 ? (
                <div className="space-y-4">
                  {displayedNotifications.slice(0, 3).map((notification: NotificationType) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                  {displayedNotifications.length > 3 && (
                    <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Link href="/notifications">
                        <Button variant="outline" size="sm">
                          View {displayedNotifications.length - 3} more notifications
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Bell className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No new notifications
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400">
                    We'll notify you about important updates and reminders
                  </p>
                </div>
              )}
            </div>
          </Card>
        );

      case 'quick-actions':
        return (
          <Card
            key={sectionId}
            draggable={isEditMode}
            onDragStart={() => handleDragStart(sectionId)}
            onDragOver={e => handleDragOver(e, sectionId)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, sectionId)}
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
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Settings className="text-gray-500" size={20} />
                    Quick Actions
                  </h3>
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                <Link href="/find-doctors">
                  <Button
                    variant="outline"
                    className="w-full justify-start p-4 h-auto hover:bg-primary-50 hover:border-primary-300 dark:hover:bg-primary-900/20 dark:hover:border-primary-700 transition-colors"
                  >
                    <Stethoscope className="mr-3 text-primary-500" size={20} />
                    <div className="text-left">
                      <div className="font-medium">Find a Doctor</div>
                      <div className="text-xs text-gray-500">
                        Browse specialists and book appointments
                      </div>
                    </div>
                  </Button>
                </Link>

                <Link href="/patient/profile">
                  <Button
                    variant="outline"
                    className="w-full justify-start p-4 h-auto hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20 dark:hover:border-blue-700 transition-colors"
                  >
                    <User className="mr-3 text-blue-500" size={20} />
                    <div className="text-left">
                      <div className="font-medium">Update Profile</div>
                      <div className="text-xs text-gray-500">Manage your personal information</div>
                    </div>
                  </Button>
                </Link>

                <Link href="/patient/health-records">
                  <Button
                    variant="outline"
                    className="w-full justify-start p-4 h-auto hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-900/20 dark:hover:border-green-700 transition-colors"
                  >
                    <FileText className="mr-3 text-green-500" size={20} />
                    <div className="text-left">
                      <div className="font-medium">Health Records</div>
                      <div className="text-xs text-gray-500">View and upload medical documents</div>
                    </div>
                  </Button>
                </Link>

                <Link href="/patient/medications">
                  <Button
                    variant="outline"
                    className="w-full justify-start p-4 h-auto hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-900/20 dark:hover:border-purple-700 transition-colors"
                  >
                    <Pill className="mr-3 text-purple-500" size={20} />
                    <div className="text-left">
                      <div className="font-medium">Medications</div>
                      <div className="text-xs text-gray-500">Manage prescriptions and refills</div>
                    </div>
                  </Button>
                </Link>

                <Link href="/notifications">
                  <Button
                    variant="outline"
                    className="w-full justify-start p-4 h-auto hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-900/20 dark:hover:border-orange-700 transition-colors"
                  >
                    <Bell className="mr-3 text-orange-500" size={20} />
                    <div className="text-left flex-1">
                      <div className="font-medium flex items-center gap-2">
                        Notifications
                        {unreadCount > 0 && (
                          <span className="px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 text-xs font-medium rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Manage your notification preferences
                      </div>
                    </div>
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  const visibleMainSections = dashboardPreferences.sections
    .filter(
      s =>
        ['appointments', 'reminders', 'notifications', 'quick-actions'].includes(s.id) && s.visible
    )
    .sort((a, b) => a.order - b.order);

  return (
    <div
      className={`space-y-6 p-4 md:p-6 ${dashboardPreferences.layout === 'compact' ? 'max-w-5xl mx-auto' : ''}`}
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          Welcome to Your Dashboard
        </h1>

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

      {sortedSections
        .filter(s => s.visible && ['profile', 'health-overview'].includes(s.id))
        .map(section => renderSection(section.id))}

      <div
        className={`grid grid-cols-1 ${dashboardPreferences.layout === 'expanded' ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6`}
      >
        <div className={dashboardPreferences.layout === 'expanded' ? '' : 'lg:col-span-2'}>
          <div className="space-y-6">
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
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between px-6 py-4">
                    {isEditMode ? (
                      <div className="flex items-center gap-2">
                        <Move size={16} className="text-gray-400" />
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                          {dashboardPreferences.sections.find(s => s.id === 'appointments')?.title}
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
                        Upcoming Appointments
                      </h3>
                    )}
                    <Link href="/patient/appointments">
                      <Button variant="ghost" size="sm" className="flex items-center gap-1">
                        View All <ArrowRight size={16} />
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="p-6">
                  {isLoading && !progressiveLoad.appointments ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <AppointmentCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : upcomingAppointments.length > 0 ? (
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4 flex items-center mx-auto gap-1"
                        >
                          <PlusCircle size={16} /> Book An Appointment
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {visibleMainSections.find(s => s.id === 'reminders') && (
              <Card
                key="reminders"
                draggable={isEditMode}
                onDragStart={() => handleDragStart('reminders')}
                onDragOver={e => handleDragOver(e, 'reminders')}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, 'reminders')}
                className={isEditMode ? 'border-dashed' : ''}
              >
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between px-6 py-4">
                    {isEditMode ? (
                      <div className="flex items-center gap-2">
                        <Move size={16} className="text-gray-400" />
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                          {dashboardPreferences.sections.find(s => s.id === 'reminders')?.title}
                        </h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleSectionVisibility('reminders')}
                          className="ml-2"
                        >
                          <Eye size={16} />
                        </Button>
                      </div>
                    ) : (
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        Health Reminders
                      </h3>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Activity className="text-blue-500 mr-3 mt-1 flex-shrink-0" size={20} />
                      <div>
                        <h4 className="font-medium text-blue-700 dark:text-blue-300">
                          Annual Checkup
                        </h4>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          It's been 10 months since your last checkup. Consider scheduling your
                          annual physical.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Heart className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                      <div>
                        <h4 className="font-medium text-green-700 dark:text-green-300">
                          Healthy Reminder
                        </h4>
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                          Don't forget to take your daily medication and stay hydrated!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-6">
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
                      {unreadCount > 0 && (
                        <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 text-xs font-medium rounded-full">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {unreadCount > 0 && !isEditMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                        disabled={markingAllAsRead}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        {markingAllAsRead ? (
                          <Spinner size="sm" className="mr-1" />
                        ) : (
                          <Check size={16} className="mr-1" />
                        )}
                        Mark all read
                      </Button>
                    )}
                    <Link href="/notifications">
                      <Button variant="ghost" size="sm">
                        View All
                      </Button>
                    </Link>
                  </div>
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
                ) : displayedNotifications.length > 0 ? (
                  <div className="space-y-4">
                    {displayedNotifications.map((notification: NotificationType) => (
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
          )}

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
                  <Link href="/notifications">
                    <Button variant="outline" className="w-full justify-start">
                      <Bell className="mr-2" size={16} />
                      <span className="flex-1 text-left">Manage Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 text-xs font-medium rounded-full ml-2">
                          {unreadCount}
                        </span>
                      )}
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

export default function PatientDashboardPageWithErrorHandling() {
  return (
    <GlobalErrorBoundary componentName="PatientDashboard" fallback={<DashboardErrorFallback />}>
      <PatientDashboardPage />
    </GlobalErrorBoundary>
  );
}

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

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const formattedDate = appointment.appointmentDate.includes('T')
    ? format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy')
    : appointment.appointmentDate;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'canceled':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
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
            <h4 className="font-medium text-slate-800 dark:text-slate-100">
              {appointment.doctorName}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {appointment.doctorSpecialty}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-sm text-slate-600 dark:text-slate-400">{formattedDate}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {appointment.startTime} - {appointment.endTime}
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full mt-1 ${getStatusColor(appointment.status)}`}
          >
            {appointment.status}
          </span>
        </div>
      </div>
    </Card>
  );
}

function NotificationCard({ notification }: { notification: NotificationType }) {
  const formattedDate = notification.createdAt
    ? format(new Date(notification.createdAt), 'MMM d, yyyy')
    : '';

  return (
    <Card
      className={`p-4 border ${notification.isRead ? 'border-gray-200 dark:border-gray-700' : 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20'}`}
    >
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
