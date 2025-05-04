'use client';

import { lazy } from 'react';
import { lazyLoad } from '@/lib/lazyLoadUtils';

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
 * Prefetch components that are likely to be used soon
 * @param componentType Which component type to prefetch
 */
export function prefetchLazyComponents(componentType: 'notifications' | 'doctors' | 'all'): void {
  const importPromises: Array<() => Promise<any>> = [];
  
  // Based on the requested component type, add the appropriate import promise
  if (componentType === 'notifications' || componentType === 'all') {
    importPromises.push(() => import('./notifications/NotificationPanel'));
    importPromises.push(() => import('./notifications/NotificationList'));
  }
  
  if (componentType === 'doctors' || componentType === 'all') {
    importPromises.push(() => import('./doctors/DoctorSearchResults'));
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