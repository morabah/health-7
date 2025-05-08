'use client';
import { useEffect, useState, lazy, Suspense, useMemo } from 'react';
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
  Check,
  EyeOff,
  Settings,
  Move,
  Eye,
  Save
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
  const [progressiveLoad, setProgressiveLoad] = useState({
    profile: false,
    stats: false,
    appointments: false,
    notifications: false
  });
  
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardPreferences>(defaultDashboardPreferences);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  
  // Load saved preferences from local storage on component mount
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem('dashboardPreferences');
      if (savedPreferences) {
        setDashboardPreferences(JSON.parse(savedPreferences));
      }
    } catch (error) {
      logError('Failed to load dashboard preferences', error);
      // Fall back to defaults if there's an error
      setDashboardPreferences(defaultDashboardPreferences);
    }
  }, []);
  
  // Save preferences to local storage when they change
  useEffect(() => {
    try {
      localStorage.setItem('dashboardPreferences', JSON.stringify(dashboardPreferences));
    } catch (error) {
      logError('Failed to save dashboard preferences', error);
    }
  }, [dashboardPreferences]);
  
  // Start performance tracking
  useEffect(() => {
    const perf = trackPerformance('PatientDashboardPage-render');
    
    // Simulate progressive loading
    setTimeout(() => setProgressiveLoad(prev => ({ ...prev, profile: true })), 300);
    setTimeout(() => setProgressiveLoad(prev => ({ ...prev, stats: true })), 600);
    setTimeout(() => setProgressiveLoad(prev => ({ ...prev, appointments: true })), 900);
    setTimeout(() => setProgressiveLoad(prev => ({ ...prev, notifications: true })), 1200);
    
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
  
  // Count unread notifications
  const unreadCount = useMemo(() => {
    if (data?.notifications?.notifications) {
      return data.notifications.notifications.filter(
        (notification: NotificationType) => !notification.isRead
      ).length;
    }
    return 0;
  }, [data?.notifications?.notifications]);
  
  // Handle marking all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllAsRead(true);
      
      const unreadNotifications = data?.notifications?.notifications.filter(
        (notification: NotificationType) => !notification.isRead
      ) || [];
      
      // Mark each notification as read
      await Promise.all(
        unreadNotifications.map((notification: NotificationType) => 
          callApi('markNotificationRead', { uid: data?.userProfile?.userProfile?.id, role: 'patient' }, { notificationId: notification.id })
        )
      );
      
      // Update the UI - In a real app, you'd invalidate the relevant query cache
      setTimeout(() => {
        setMarkingAllAsRead(false);
        window.location.reload(); // Simple refresh for now; in a real app, use query invalidation
      }, 500);
      
    } catch (err) {
      logError('Error marking notifications as read', err);
      setMarkingAllAsRead(false);
    }
  };
  
  // Toggle section visibility
  const toggleSectionVisibility = (sectionId: string) => {
    setDashboardPreferences(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === sectionId 
          ? { ...section, visible: !section.visible } 
          : section
      )
    }));
  };
  
  // Handle layout change
  const changeLayout = (layout: 'default' | 'compact' | 'expanded') => {
    setDashboardPreferences(prev => ({
      ...prev,
      layout
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
          sections: updatedSections
        }));
      }
    }
    
    setDraggedSection(null);
  };
  
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
  
  // Show skeleton loaders during initial loading
  if (isLoading && !progressiveLoad.profile) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Welcome to Your Dashboard</h1>
        
        <div className="mb-6">
          <ProfileSkeletonLoader />
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Your Health Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Upcoming Appointments</h3>
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
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recent Notifications</h3>
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
          <div className="mb-6" 
            key={sectionId}
            draggable={isEditMode}
            onDragStart={() => handleDragStart(sectionId)}
            onDragOver={(e) => handleDragOver(e, sectionId)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, sectionId)}
          >
            {isEditMode && (
              <div className="flex justify-between items-center mb-2">
                <h2 className="flex items-center gap-2">
                  <Move size={16} className="text-gray-400" />
                  <span className="text-lg font-semibold">{section.title}</span>
                </h2>
                <Button 
                  size="sm" 
                  variant={section.visible ? "ghost" : "outline"} 
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
        );
        
      case 'health-overview':
        return (
          <div className="mb-6"
            key={sectionId}
            draggable={isEditMode}
            onDragStart={() => handleDragStart(sectionId)}
            onDragOver={(e) => handleDragOver(e, sectionId)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, sectionId)}
          >
            {isEditMode && (
              <div className="flex justify-between items-center mb-2">
                <h2 className="flex items-center gap-2">
                  <Move size={16} className="text-gray-400" />
                  <span className="text-lg font-semibold">{section.title}</span>
                </h2>
                <Button 
                  size="sm" 
                  variant={section.visible ? "ghost" : "outline"} 
                  onClick={() => toggleSectionVisibility(sectionId)}
                >
                  {section.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </Button>
              </div>
            )}
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Your Health Overview</h2>
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
                </>
              )}
            </div>
          </div>
        );
        
      case 'appointments':
      case 'reminders':
      case 'notifications':
      case 'quick-actions':
        // These sections are rendered in the main layout
        return null;
        
      default:
        return null;
    }
  };
  
  // Get visible main grid sections
  const visibleMainSections = dashboardPreferences.sections.filter(
    s => ['appointments', 'reminders', 'notifications', 'quick-actions'].includes(s.id) && s.visible
  ).sort((a, b) => a.order - b.order);
  
  return (
    <div className={`space-y-6 p-4 md:p-6 ${dashboardPreferences.layout === 'compact' ? 'max-w-5xl mx-auto' : ''}`}>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Welcome to Your Dashboard</h1>
        
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
                  onChange={(e) => changeLayout(e.target.value as 'default' | 'compact' | 'expanded')}
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
        .filter(s => s.visible && ['profile', 'health-overview'].includes(s.id))
        .map(section => renderSection(section.id))}
      
      {/* Main grid for the rest of the sections */}
      <div className={`grid grid-cols-1 ${dashboardPreferences.layout === 'expanded' ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6`}>
        {/* Left column (appointments and reminders) */}
        <div className={dashboardPreferences.layout === 'expanded' ? '' : 'lg:col-span-2'}>
          <div className="space-y-6">
            {/* Appointments section */}
            {visibleMainSections.find(s => s.id === 'appointments') && (
              <Card
                key="appointments"
                draggable={isEditMode}
                onDragStart={() => handleDragStart('appointments')}
                onDragOver={(e) => handleDragOver(e, 'appointments')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'appointments')}
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
                        <Button variant="outline" size="sm" className="mt-4 flex items-center mx-auto gap-1">
                          <PlusCircle size={16} /> Book An Appointment
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </Card>
            )}
            
            {/* Health Reminders section */}
            {visibleMainSections.find(s => s.id === 'reminders') && (
              <Card
                key="reminders"
                draggable={isEditMode}
                onDragStart={() => handleDragStart('reminders')}
                onDragOver={(e) => handleDragOver(e, 'reminders')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'reminders')}
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
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Health Reminders</h3>
                    )}
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
              onDragOver={(e) => handleDragOver(e, 'notifications')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'notifications')}
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
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recent Notifications</h3>
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
                ) : notifications.length > 0 ? (
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
          )}
          
          {/* Quick Actions section */}
          {visibleMainSections.find(s => s.id === 'quick-actions') && (
            <Card
              key="quick-actions"
              draggable={isEditMode}
              onDragStart={() => handleDragStart('quick-actions')}
              onDragOver={(e) => handleDragOver(e, 'quick-actions')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'quick-actions')}
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
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Quick Actions</h3>
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
