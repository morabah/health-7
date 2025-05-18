'use client';

import { lazyLoad, preloadComponent } from '@/lib/lazyLoadUtils';
import { logInfo } from '@/lib/logger';

/**
 * Lazy-loaded Notification Panel component
 * Used for notification displays in headers, sidebars, etc.
 */
export const LazyNotificationPanel = lazyLoad(
  () => import('./notifications/NotificationPanel'),
  {
    minimumLoadTime: 300, // Ensures smooth loading transition
  }
);

/**
 * Lazy-loaded Notification List component
 * For the main notifications page
 */
export const LazyNotificationList = lazyLoad(
  () => import('./notifications/NotificationList'),
  {
    minimumLoadTime: 0, // Load as fast as possible for main content
  }
);

/**
 * Lazy-loaded Doctor Search Results component
 * For the find doctors page
 */
export const LazyDoctorSearchResults = lazyLoad(
  () => import('./doctors/DoctorSearchResults'),
  {
    minimumLoadTime: 200, // Short delay to ensure smooth transition
  }
);

/**
 * Lazy-loaded VirtualizedList component
 * Used for efficient rendering of large datasets
 */
export const LazyVirtualizedList = lazyLoad(
  () => import('./ui/VirtualizedList'),
  {
    minimumLoadTime: 0, // Load as fast as possible for UI components
  }
);

/**
 * Lazy-loaded AppointmentDetailsModal component
 * For viewing appointment details
 */
export const LazyAppointmentDetailsModal = lazyLoad(
  () => import('./appointments/AppointmentDetailsModal'),
  {
    minimumLoadTime: 200, // Short delay for modal transitions
  }
);

/**
 * Lazy-loaded DoctorProfileCard component
 * For displaying detailed doctor information
 */
export const LazyDoctorProfileCard = lazyLoad(
  () => import('./doctors/DoctorProfileCard'),
  {
    minimumLoadTime: 200, // Short delay for smooth transitions
  }
);

/**
 * Lazy-loaded AdminDashboardCharts component
 * Heavy component with charts and visualizations
 */
export const LazyAdminDashboardCharts = lazyLoad(
  () => import('./admin/AdminDashboardCharts'),
  {
    minimumLoadTime: 300, // Longer delay for complex visualizations
  }
);

/**
 * Lazy-loaded PatientMedicalHistoryForm component
 * Complex form with many fields and validations
 */
export const LazyPatientMedicalHistoryForm = lazyLoad(
  () => import('./patients/PatientMedicalHistoryForm'),
  {
    minimumLoadTime: 250, // Delay for complex form
  }
);

// Type for dynamic imports
type DynamicImport = () => Promise<unknown>;

/**
 * Prefetch components that are likely to be used soon
 * @param componentType Which component type to prefetch
 */
export function prefetchLazyComponents(componentType: 
  'notifications' | 
  'doctors' | 
  'appointments' | 
  'admin' | 
  'patient' | 
  'ui' | 
  'all'
): void {
  const importPromises: DynamicImport[] = [];
  const startTime = performance.now();
  
  // Based on the requested component type, add the appropriate import promise
  if (componentType === 'notifications' || componentType === 'all') {
    importPromises.push(() => import('./notifications/NotificationPanel'));
    importPromises.push(() => import('./notifications/NotificationList'));
  }
  
  if (componentType === 'doctors' || componentType === 'all') {
    importPromises.push(() => import('./doctors/DoctorSearchResults'));
    // Only prefetch DoctorProfileCard on explicit doctor request to avoid excessive loading
    if (componentType === 'doctors') {
      importPromises.push(() => import('./doctors/DoctorProfileCard'));
    }
  }
  
  if (componentType === 'appointments' || componentType === 'all') {
    importPromises.push(() => import('./appointments/AppointmentDetailsModal'));
  }
  
  if (componentType === 'admin' || componentType === 'all') {
    // Only prefetch admin components on explicit admin request
    if (componentType === 'admin') {
      importPromises.push(() => import('./admin/AdminDashboardCharts'));
    }
  }
  
  if (componentType === 'patient' || componentType === 'all') {
    // Only prefetch patient components on explicit patient request
    if (componentType === 'patient') {
      importPromises.push(() => import('./patients/PatientMedicalHistoryForm'));
    }
  }
  
  if (componentType === 'ui' || componentType === 'all') {
    importPromises.push(() => import('./ui/VirtualizedList'));
  }
  
  // Execute all preloads in parallel
  importPromises.forEach(importPromise => {
    // Wrap in setTimeout to ensure it doesn't block the main thread
    setTimeout(() => {
      importPromise().catch(error => {
        console.error('Error prefetching component:', error);
      });
    }, 0);
  });
} 