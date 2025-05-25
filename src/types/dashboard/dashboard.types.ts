import type { LucideIcon } from 'lucide-react';
import type { Appointment } from '@/types/schemas';

/**
 * Dashboard Types for Patient Dashboard Components
 * 
 * Extracted from monolithic PatientDashboardPage for better maintainability
 * and type safety across dashboard components.
 */

/**
 * Core User Profile Types
 */
export interface UserProfileType {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  profilePictureUrl?: string;
}

/**
 * Notification Types
 */
export interface NotificationType {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt?: string;
}

/**
 * Dashboard Section Types for Personalization
 */
export interface DashboardSection {
  id: string;
  title: string;
  visible: boolean;
  order: number;
}

/**
 * Dashboard Preferences Types
 */
export interface DashboardPreferences {
  sections: DashboardSection[];
  layout: 'default' | 'compact' | 'expanded';
  theme: 'system' | 'light' | 'dark';
}

/**
 * Health Statistics Types
 */
export interface HealthStats {
  upcomingAppointments: number;
  pastAppointments: number;
  completedCheckups: number;
  medications: number;
}

/**
 * API Response Types
 */
export interface DashboardResponse {
  success: boolean;
  upcomingCount: number;
  pastCount: number;
}

export interface AppointmentsResponse {
  success: boolean;
  appointments: Appointment[];
}

export interface NotificationsResponse {
  success: boolean;
  notifications: NotificationType[];
}

export interface ProfileResponse {
  success: boolean;
  userProfile: UserProfileType;
  roleProfile?: {
    id: string;
    [key: string]: any;
  } | null;
}

/**
 * Component Props Types
 */
export interface ProfileSummaryProps {
  profile: UserProfileType | null;
  isLoading: boolean;
  error?: string | null;
}

export interface DashboardStatsProps {
  healthStats: HealthStats;
  upcomingAppointments: Appointment[];
  isLoading: boolean;
  error?: string | null;
}

export interface UpcomingAppointmentsProps {
  appointments: Appointment[];
  isLoading: boolean;
  error?: string | null;
  maxDisplay?: number;
}

export interface HealthRemindersProps {
  healthStats: HealthStats;
  upcomingAppointments: Appointment[];
  isLoading: boolean;
  error?: string | null;
}

export interface NotificationsListProps {
  notifications: NotificationType[];
  isLoading: boolean;
  error?: string | null;
  maxDisplay?: number;
  unreadCount: number;
  onMarkAllAsRead: () => void;
  markingAllAsRead: boolean;
}

export interface QuickActionsProps {
  upcomingAppointments: Appointment[];
  isLoading: boolean;
  error?: string | null;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  preferences: DashboardPreferences;
  isEditMode: boolean;
  onSectionReorder: (fromIndex: number, toIndex: number) => void;
  onSectionToggle: (sectionId: string) => void;
  onEditModeToggle: () => void;
  onPreferencesSave: () => void;
}

/**
 * Stat Card Types
 */
export interface StatCardData {
  title: string;
  value: string | number;
  Icon: LucideIcon;
  href?: string;
  className?: string;
  isLoading?: boolean;
}

export interface StatCardProps extends StatCardData {
  onClick?: () => void;
}

/**
 * Progressive Loading Types
 */
export interface ProgressiveLoadState {
  profile: boolean;
  stats: boolean;
  appointments: boolean;
  notifications: boolean;
  reminders: boolean;
}

/**
 * Dashboard Batch Data Types
 */
export interface DashboardBatchData {
  userProfile?: { 
    userProfile?: UserProfileType; 
    success?: boolean; 
    error?: string;
  };
  notifications?: { 
    notifications?: NotificationType[]; 
    success?: boolean; 
    error?: string;
  };
  upcomingAppointments?: { 
    appointments?: Appointment[]; 
    success?: boolean; 
    error?: string;
  };
  stats?: { 
    success?: boolean; 
    upcomingCount?: number; 
    pastCount?: number; 
    error?: string;
  };
}

/**
 * Hook Return Types
 */
export interface UseDashboardDataReturn {
  profile: UserProfileType | null;
  notifications: NotificationType[];
  upcomingAppointments: Appointment[];
  healthStats: HealthStats;
  isLoading: boolean;
  errors: {
    profile?: string | null;
    notifications?: string | null;
    appointments?: string | null;
    stats?: string | null;
  };
  refetch: () => void;
  progressiveLoad: ProgressiveLoadState;
}

export interface UseDashboardPreferencesReturn {
  preferences: DashboardPreferences;
  isEditMode: boolean;
  updatePreferences: (newPreferences: Partial<DashboardPreferences>) => void;
  toggleSectionVisibility: (sectionId: string) => void;
  reorderSections: (fromIndex: number, toIndex: number) => void;
  toggleEditMode: () => void;
  savePreferences: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface UseDashboardPersonalizationReturn {
  isEditMode: boolean;
  draggedSection: string | null;
  dropTargetSection: string | null;
  handleDragStart: (sectionId: string) => void;
  handleDragOver: (e: React.DragEvent, sectionId: string) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, sectionId: string) => void;
  handleSectionReorder: (fromId: string, toId: string) => void;
}

/**
 * Quick Action Item Types
 */
export interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
  color: string;
  bgColor: string;
  hoverColor: string;
  priority: number;
}

/**
 * Health Reminder Item Types
 */
export interface HealthReminderItem {
  id: string;
  title: string;
  description: string;
  type: 'medication' | 'appointment' | 'checkup' | 'wellness' | 'records';
  priority: 'low' | 'medium' | 'high';
  Icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  actionText?: string;
  actionHref?: string;
  condition?: (stats: HealthStats, appointments: Appointment[]) => boolean;
}

/**
 * Default Values
 */
export const defaultDashboardPreferences: DashboardPreferences = {
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

export const defaultHealthStats: HealthStats = {
  upcomingAppointments: 0,
  pastAppointments: 0,
  completedCheckups: 0,
  medications: 0,
};

export const defaultProgressiveLoadState: ProgressiveLoadState = {
  profile: false,
  stats: false,
  appointments: false,
  notifications: false,
  reminders: false,
}; 