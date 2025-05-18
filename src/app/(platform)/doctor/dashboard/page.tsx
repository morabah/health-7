'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { ApiErrorBoundary, GlobalErrorBoundary } from '@/components/error-boundaries';
import useStandardErrorHandling from '@/hooks/useStandardErrorHandling';

// --- AvailabilitySummaryType and Component ---
export interface AvailabilitySummaryType {
  activeDays?: number;
  activeHours?: number;
}

export function AvailabilitySummary({ availability }: { availability: AvailabilitySummaryType | null }) {
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
  return (
    <div>
      <div className="mb-4">
        <h4 className="font-medium text-slate-800 dark:text-slate-100 mb-2">
          Current Availability
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          You have {availability.activeDays || 0} active days with {availability.activeHours || 0} hours of availability.
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
import { logValidation, logInfo } from '@/lib/logger';
import type { Notification, UserProfile } from '@/types/schemas'; // Assuming UserProfile type exists
import Avatar from '@/components/ui/Avatar';
import { z } from 'zod';
import { AppointmentSchema } from '@/types/schemas';
import { useAuth } from '@/context/AuthContext';
import { useSafeBatchData } from '@/hooks/useSafeBatchData';

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

// Section config interface for dashboard layout
interface SectionConfig {
  id: string;
  title: string;
  visible: boolean;
  order: number;
}

// Dashboard preferences type
interface DashboardPreferences {
  sections: SectionConfig[];
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
 * Doctor Dashboard Page using Batch API with optimized rendering
 * 
 * Performance optimizations:
 * 1. Memoization of expensive components and callbacks
 * 2. Progressive loading with prioritized critical path rendering
 * 3. Deferred rendering of non-essential components
 * 4. Optimized data fetching with cache hydration
 * 5. Reduced re-renders by avoiding prop drilling
 */
export default function DoctorDashboardPage() {
  // Use our standard error handling hook
  const { handleError, withErrorHandling } = useStandardErrorHandling({
    componentName: 'DoctorDashboardPage',
    defaultCategory: 'data',
    defaultSeverity: 'warning',
    defaultMessage: 'Failed to load dashboard data. Please try again later.',
  });

  // Track performance of the complete page render
  useEffect(() => {
    const perf = trackPerformance('DoctorDashboardPage-render');
    return () => {
      perf.stop();
    };
  }, []);
  
  // Manage progressive loading state with separate flags for each section
  // This enables showing critical content first while deferring less important items
  const [progressiveLoad, setProgressiveLoad] = useState({
    profile: false, // User identity - highest priority
    stats: false,   // Key metrics - high priority
    appointments: false, // Today's schedule - medium priority
    notifications: false, // Alerts - lower priority
    availability: false, // Availability - lowest priority
  });

  // Load and save preferences with useRef to avoid render cycle
  const prefRef = useRef<DashboardPreferences>(defaultDashboardPreferences);
  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardPreferences>(
    defaultDashboardPreferences
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  // Load saved preferences from local storage using a layout effect to do it before render
  useEffect(() => {
    // Track this operation
    const perf = trackPerformance('loadDashboardPreferences');
    
    try {
      const savedPreferences = localStorage.getItem('doctorDashboardPreferences');
      if (savedPreferences) {
        const parsed = JSON.parse(savedPreferences);
        prefRef.current = parsed;
        setDashboardPreferences(parsed);
      }
    } catch (error) {
      logInfo('Failed to load dashboard preferences', error);
      // Fall back to defaults if there's an error
      prefRef.current = defaultDashboardPreferences;
      setDashboardPreferences(defaultDashboardPreferences);
    }
    perf.stop();
  }, []); // Empty dependency array - only run once

  // Save preferences to local storage using debounce to reduce writes
  useEffect(() => {
    // Skip initial render
    if (JSON.stringify(dashboardPreferences) === JSON.stringify(defaultDashboardPreferences)) {
      return;
    }
    
    // Debounce the save operation
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('doctorDashboardPreferences', JSON.stringify(dashboardPreferences));
        prefRef.current = dashboardPreferences;
      } catch (error) {
        logInfo('Failed to save dashboard preferences', error);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [dashboardPreferences]);

  // Progressive loading with dynamic timing based on component size
  useEffect(() => {
    // Setup progressive loading timers with performance tracking
    const perfLoad = trackPerformance('progressiveLoading');
    
    // Critical path first - profile
    const profileTimer = setTimeout(() => {
      setProgressiveLoad(prev => ({ ...prev, profile: true }));
      perfLoad.mark('profile-loaded');
    }, 50); // Almost immediate
    
    // Important summary information
    const statsTimer = setTimeout(() => {
      setProgressiveLoad(prev => ({ ...prev, stats: true }));
      perfLoad.mark('stats-loaded');
    }, 1510);
    
    // Today's activity information
    const appointmentsTimer = setTimeout(() => {
      setProgressiveLoad(prev => ({ ...prev, appointments: true }));
      perfLoad.mark('appointments-loaded');
    }, 250);
    
    // Non-critical notifications
    const notificationsTimer = setTimeout(() => {
      setProgressiveLoad(prev => ({ ...prev, notifications: true }));
      perfLoad.mark('notifications-loaded');
    }, 350);
    
    // Lowest priority content
    const availabilityTimer = setTimeout(() => {
      setProgressiveLoad(prev => ({ ...prev, availability: true }));
      perfLoad.mark('availability-loaded');
      perfLoad.stop(); // All loading complete
    }, 450);
    
    return () => {
      // Clean up all timers
      clearTimeout(profileTimer);
      clearTimeout(statsTimer);
      clearTimeout(appointmentsTimer);
      clearTimeout(notificationsTimer);
      clearTimeout(availabilityTimer);
    };
  }, []);

  // Memoize dashboard actions to prevent unnecessary rerenders
  const toggleSectionVisibility = useCallback((sectionId: string) => {
    setDashboardPreferences(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, visible: !section.visible } : section
      ),
    }));
  }, []);

  // Memoize layout change handler
  const changeLayout = useCallback((layout: 'default' | 'compact' | 'expanded') => {
    setDashboardPreferences(prev => ({
      ...prev,
      layout,
    }));
  }, []);

  // Memoize drag and drop handlers
  const handleDragStart = useCallback((sectionId: string) => {
    setDraggedSection(sectionId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    if (draggedSection && draggedSection !== sectionId) {
      // Use dataset instead of classList for better performance
      (e.currentTarget as HTMLElement).dataset.dropTarget = 'true';
      (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-400)';
      (e.currentTarget as HTMLElement).style.border = '2px dashed #3b82f6';
    }
  }, [draggedSection]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Use dataset instead of classList for better performance
    delete (e.currentTarget as HTMLElement).dataset.dropTarget;
    (e.currentTarget as HTMLElement).style.borderColor = '';
    (e.currentTarget as HTMLElement).style.border = '';
    delete (e.currentTarget as HTMLElement).dataset.dropTarget;
    (e.currentTarget as HTMLElement).style.border = '';
    (e.currentTarget as HTMLElement).style.borderWidth = '';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    // Clean up styling
    delete (e.currentTarget as HTMLElement).dataset.dropTarget;
    (e.currentTarget as HTMLElement).style.border = '';
    (e.currentTarget as HTMLElement).style.borderWidth = '';

    if (draggedSection && draggedSection !== targetSectionId) {
      setDashboardPreferences(prev => {
        // Create a new array to avoid mutation
        const updatedSections = [...prev.sections];
        const draggedSectionObj = updatedSections.find(s => s.id === draggedSection);
        const targetSectionObj = updatedSections.find(s => s.id === targetSectionId);

        if (draggedSectionObj && targetSectionObj) {
          // Swap orders
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
            })
          };
        }
        return prev;
      });
    }

    setDraggedSection(null);
  }, [draggedSection]);

  // Batch API data loading and extraction
  const batchResult = useDashboardBatch();
  const { data, isLoading, error } = useSafeBatchData(batchResult, [
    'userProfile',
    'notifications',
    'todayAppointments',
    'upcomingAppointments',
    'stats',
    'availability',
  ]);
  
  // If there's an error, throw it to be caught by the error boundary
  if (error) {
    handleError(error);
    throw error;
  }

  // Memoized extractions
  const doctorProfile = useMemo(() => {
    const profileData = data.userProfile?.data;
    return profileData && typeof profileData === 'object' ? profileData as UserProfile : null;
  }, [data.userProfile]);

  const todayAppointments = useMemo(() => {
    const apptData = data.todayAppointments?.data;
    return Array.isArray(apptData) ? apptData as Appointment[] : [];
  }, [data.todayAppointments]);

  const notifications = useMemo(() => {
    const notifData = data.notifications?.data;
    return Array.isArray(notifData) ? notifData as Notification[] : [];
  }, [data.notifications]);

  // Memoized extraction for availability
  const availability = useMemo<AvailabilitySummaryType | null>(() => {
    const availData = data.availability?.data;
    return availData && typeof availData === 'object' ? (availData as AvailabilitySummaryType) : null;
  }, [data.availability]);

  // Properly type stats as Record<string, unknown> or a specific Stats type
  interface DashboardStats {
    upcomingCount?: number;
    notifUnread?: number;
    pastCount?: number;
    [key: string]: unknown;
  }
  const stats = useMemo<DashboardStats | null>(() => {
    const statsData = data.stats?.data;
    return statsData && typeof statsData === 'object' ? (statsData as DashboardStats) : null;
  }, [data.stats]);

  // Visible main sections
  const visibleMainSections = useMemo(
    () =>
      dashboardPreferences.sections.filter(
        (s: SectionConfig) =>
          ['appointments', 'notifications', 'availability', 'quick-actions'].includes(s.id) && s.visible
      ),
    [dashboardPreferences.sections]
  );

  // Process dashboard data safely with error handling
  const processDashboardData = withErrorHandling(() => {
    if (!data) {
      throw new Error('Dashboard data is not available');
    }
    
    // Type assertion to handle the data structure
    type BatchData = {
      userProfile?: { data?: any },
      notifications?: { data?: { notifications?: any[] } },
      todayAppointments?: { data?: { appointments?: any[] } },
      upcomingAppointments?: { data?: { appointments?: any[] } },
      stats?: { data?: any },
      availability?: { data?: any }
    };
    
    const typedData = data as BatchData;
    
    return {
      userProfile: typedData.userProfile?.data,
      notifications: typedData.notifications?.data?.notifications || [],
      todayAppointments: typedData.todayAppointments?.data?.appointments || [],
      upcomingAppointments: typedData.upcomingAppointments?.data?.appointments || [],
      stats: typedData.stats?.data,
      availability: typedData.availability?.data
    };
  }, {
    message: 'Failed to process dashboard data',
    category: 'data'
  });

  // Process data with error handling
  let dashboardData;
  try {
    dashboardData = processDashboardData();
  } catch (error) {
    handleError(error, {
      message: 'Failed to process dashboard data',
      category: 'data',
      severity: 'error'
    });
    // This will be caught by the error boundary
    throw error;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Dashboard content here */}
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
          <div className="flex items-center gap-2">
            {isEditMode && <Move size={16} className="text-gray-400" />}
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {isEditMode
                ? dashboardPreferences.sections.find(s => s.id === 'availability')?.title
                : 'Availability Settings'}
            </h3>
            {isEditMode && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleSectionVisibility('availability')}
                className="ml-2"
              >
                <Eye size={16} />
              </Button>
            )}
          </div>
          <Link href="/doctor/availability">
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
              Manage <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </div>
      <div className="p-6">
        {/* Render the actual availability summary or a loader as appropriate */}
        {isLoading && !progressiveLoad.availability ? (
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
  );
}
