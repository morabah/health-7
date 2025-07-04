'use client'; // Required for hooks

/**
 * Preload Strategies
 *
 * This module implements optimized preloading strategies for different pages
 * to reduce redundant API calls and improve perceived performance.
 */

import { prefetchApiQuery } from './enhancedApiClient';
import { cacheKeys, cacheManager } from './queryClient';
import enhancedCache, { CacheCategory } from './cacheManager';
import { callApi } from './apiClient';
import { UserType } from '@/types/enums';
import { logInfo, logError } from './logger';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, useCallback } from 'react';
import { enhancedApiCall } from './enhancedApiClient';
import { isOnline } from './errors/networkUtils';
import { useAuth } from '@/context/AuthContext';

// Type for preload strategies
// interface PreloadStrategy { // Removed unused interface
//   // Preload data for a specific page
//   execute(): Promise<void>;
//   // Name for logging
//   name: string;
// }

// Common interface for all page preloaders
interface PagePreloader {
  preloadAll(): Promise<void>;
  preloadFallback(): Promise<void>;
}

// Type for batch doctor data response
interface BatchDoctorDataResponse {
  success: boolean;
  doctor?: DoctorPublicProfile;
  availability?: {
    weeklySchedule: Record<string, TimeSlot[]>;
    blockedDates: string[];
  };
  slots?: Record<string, Array<{ startTime: string; endTime: string }>>;
  appointments?: Array<{
    id: string;
    doctorId: string;
    patientId: string;
    dateTime: string;
    status: string;
    type: string;
  }>;
  [key: string]: unknown;
}

// Define Doctor Profile type to match the API response
interface DoctorPublicProfile {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  specialty?: string;
  profilePictureUrl?: string;
  consultationFee?: number;
  weeklySchedule?: Record<string, TimeSlot[]>;
  blockedDates?: string[];
  [key: string]: unknown;
}

// Define TimeSlot type for type safety
interface TimeSlot {
  startTime: string;
  endTime: string;
}

// Types
export type PreloadFunction = () => Promise<unknown>;
// type PreloadConfig = { // Removed unused type
//   priority: number;
//   condition?: () => boolean;
// };

// interface PreloadResourceMap { // Removed unused interface
//   [key: string]: {
//     preloadFn: PreloadFunction;
//     config: PreloadConfig;
//   }
// }

/**
 * Enhanced preloader for the Book Appointment page
 * Uses advanced caching and prefetching to improve user experience
 */
export class BookAppointmentPreloader implements PagePreloader {
  private doctorId: string;
  private userId: string | null;
  private userRole: UserType;
  private strategicDataFetched = false;
  private prefetchDays = 7; // Number of days to prefetch availability

  constructor(doctorId: string, userId?: string, userRole?: UserType) {
    this.doctorId = doctorId;
    this.userId = userId || null;
    this.userRole = userRole || UserType.PATIENT;
  }

  /**
   * Preload all data needed for the booking page in optimized batches
   */
  async preloadAll(): Promise<void> {
    if (!this.doctorId) {
      logError('BookAppointmentPreloader: No doctorId provided');
      return;
    }

    logInfo('BookAppointmentPreloader: Starting preload', { doctorId: this.doctorId });

    try {
      // Execute the most strategic preload first
      await this.preloadStrategic();

      // Then prefetch future days' slots in the background
      this.prefetchFutureDays().catch(err => {
        logError('Error prefetching future days', { error: err });
      });

      logInfo('BookAppointmentPreloader: Preload complete', { doctorId: this.doctorId });
    } catch (error) {
      logError('BookAppointmentPreloader: Error during preload', {
        error,
        doctorId: this.doctorId,
      });
      // Try fallback approach if the optimized one fails
      await this.preloadFallback();
    }
  }

  /**
   * Strategic batch preload for the most critical data
   * This combines doctor profile and public slots into a single API call
   */
  private async preloadStrategic(): Promise<void> {
    if (this.strategicDataFetched) return;

    try {
      // Get current date in YYYY-MM-DD format
      const currentDate = new Date().toISOString().split('T')[0];

      // Create a batch payload to get multiple resources in one go
      const batchPayload = {
        doctorId: this.doctorId,
        includeProfile: true,
        includeAvailability: true,
        includeAppointments: !!this.userId,
        currentDate,
        numDays: 3, // Prefetch 3 days of slots in a single call
      };

      // Use optimized batch endpoint if available
      const response = await callApi<BatchDoctorDataResponse>(
        'batchGetDoctorData',
        this.userId ? { uid: this.userId, role: this.userRole } : undefined,
        batchPayload
      );

      if (response.success) {
        // Cache all returned data appropriately with longer TTLs for better performance
        if (response.doctor) {
          // Cache doctor profile with 30 minute TTL
          enhancedCache.set(
            CacheCategory.DOCTORS,
            enhancedCache.createKey('doctor', this.doctorId),
            response.doctor,
            { ttl: 30 * 60 * 1000, priority: 'high' }
          );
          // Also set in React Query cache
          cacheManager.setDoctorData(this.doctorId, response.doctor);
        }

        if (response.availability) {
          // Cache availability with 10 minute TTL
          enhancedCache.set(
            CacheCategory.APPOINTMENTS,
            enhancedCache.createKey('availability', this.doctorId),
            response.availability,
            { ttl: 10 * 60 * 1000, priority: 'high' }
          );
        }

        if (response.slots) {
          // Cache each day's slots
          if (typeof response.slots === 'object') {
            Object.entries(response.slots).forEach(
              ([dateStr, dateSlots]: [string, Array<{ startTime: string; endTime: string }>]) => {
                // Cache with longer TTL for closer dates
                const today = new Date().toISOString().split('T')[0];
                const priority = dateStr === today ? 'high' : 'normal';
                const ttl = dateStr === today ? 5 * 60 * 1000 : 10 * 60 * 1000;

                enhancedCache.set(
                  CacheCategory.APPOINTMENTS,
                  enhancedCache.createKey('slots', this.doctorId, dateStr),
                  dateSlots,
                  { ttl, priority }
                );

                // Also update in React Query cache
                cacheManager.setQueryData(cacheKeys.availableSlots(this.doctorId, dateStr), {
                  success: true,
                  slots: dateSlots,
                });
              }
            );
          }
        }

        if (response.appointments) {
          // Cache appointments with 2 minute TTL
          enhancedCache.set(
            CacheCategory.APPOINTMENTS,
            enhancedCache.createKey('appointments', this.userId || 'anon'),
            response.appointments,
            { ttl: 2 * 60 * 1000 }
          );

          // Also update in React Query cache
          cacheManager.setQueryData(cacheKeys.appointments(this.userId || 'anon', this.userRole), {
            success: true,
            appointments: response.appointments,
          });
        }

        this.strategicDataFetched = true;
        logInfo('BookAppointmentPreloader: Strategic preload complete', {
          doctorId: this.doctorId,
        });
      }
    } catch (error) {
      logError('BookAppointmentPreloader: Strategic preload failed', {
        error,
        doctorId: this.doctorId,
      });
      // We'll fall back to individual calls
    }
  }

  /**
   * Prefetch slots for future days to make date selection more responsive
   */
  private async prefetchFutureDays(): Promise<void> {
    // Don't prefetch if the main strategic load failed
    if (!this.strategicDataFetched) return;

    try {
      const prefetchPromises = [];
      const today = new Date();

      // Prefetch the next several days (defined by this.prefetchDays)
      for (let i = 1; i <= this.prefetchDays; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        // Use a lower priority for future dates (further away = lower priority)
        const priority = i <= 3 ? 'normal' : 'low';

        // Prefetch this future date's slots
        prefetchPromises.push(this.prefetchSlotsForDate(futureDateStr, priority));
      }

      // Execute prefetches with a small delay between them
      for (let i = 0; i < prefetchPromises.length; i++) {
        // Stagger the prefetches to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100 * i));
        prefetchPromises[i]();
      }
    } catch (error) {
      logError('Error prefetching future days', { error, doctorId: this.doctorId });
    }
  }

  /**
   * Prefetch slots for a specific date
   */
  private prefetchSlotsForDate(
    dateStr: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): () => Promise<void> {
    return async () => {
      try {
        // Check if we already have this date cached
        const cachedSlots = enhancedCache.get(
          CacheCategory.APPOINTMENTS,
          enhancedCache.createKey('slots', this.doctorId, dateStr)
        );

        // If already cached, skip prefetching
        if (cachedSlots) return;

        // Otherwise fetch slots for this date
        const response = await callApi<{
          success: boolean;
          slots?: Array<{ startTime: string; endTime: string }>;
        }>(
          'getAvailableSlots',
          this.userId ? { uid: this.userId, role: this.userRole } : undefined,
          { doctorId: this.doctorId, date: dateStr }
        );

        if (response.success && response.slots) {
          // Cache the slots with TTL based on how far in the future
          // (closer dates have longer TTL)
          const ttl =
            priority === 'high'
              ? 5 * 60 * 1000
              : priority === 'normal'
                ? 3 * 60 * 1000
                : 2 * 60 * 1000;

          enhancedCache.set(
            CacheCategory.APPOINTMENTS,
            enhancedCache.createKey('slots', this.doctorId, dateStr),
            response.slots,
            { ttl, priority }
          );

          // Also update in React Query cache
          cacheManager.setQueryData(cacheKeys.availableSlots(this.doctorId, dateStr), {
            success: true,
            slots: response.slots,
          });
        }
      } catch (error) {
        // Silently fail for prefetches
        logError('Failed to prefetch slots', { date: dateStr, doctorId: this.doctorId, error });
      }
    };
  }

  /**
   * Preload doctor profile and related data
   */
  private async preloadDoctorProfile(): Promise<void> {
    if (this.strategicDataFetched) return;

    await prefetchApiQuery('getDoctorPublicProfile', cacheKeys.doctor(this.doctorId), [
      undefined, // context - can be undefined for public endpoint
      { doctorId: this.doctorId },
    ]);
  }

  /**
   * Preload doctor availability
   */
  private async preloadDoctorAvailability(): Promise<void> {
    if (this.strategicDataFetched) return;

    const date = new Date().toISOString().split('T')[0];
    await prefetchApiQuery('getAvailableSlots', cacheKeys.availableSlots(this.doctorId, date), [
      undefined, // context - can be undefined for public endpoint
      { doctorId: this.doctorId, date },
    ]);

    // Also prefetch next few days
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    await prefetchApiQuery(
      'getAvailableSlots',
      cacheKeys.availableSlots(this.doctorId, tomorrowStr),
      [undefined, { doctorId: this.doctorId, date: tomorrowStr }] // context can be undefined for public endpoint
    );
  }

  /**
   * Preload appointments if user is logged in
   */
  private async preloadAppointments(): Promise<void> {
    if (!this.userId || this.strategicDataFetched) return;

    await prefetchApiQuery('getMyAppointments', cacheKeys.appointments(this.userId), [
      { uid: this.userId, role: this.userRole },
    ]);
  }

  /**
   * Fallback to standard preloading if optimized approach fails
   */
  async preloadFallback(): Promise<void> {
    try {
      // Execute in sequence to avoid overwhelming the API
      await this.preloadDoctorProfile();
      await this.preloadDoctorAvailability();
      if (this.userId) {
        await this.preloadAppointments();
      }
    } catch (error) {
      logError('BookAppointmentPreloader: Fallback preload failed', {
        error,
        doctorId: this.doctorId,
      });
    }
  }
}

/**
 * Factory method to create appropriate preloader for a page
 */
export function createPagePreloader(
  page: string,
  params: Record<string, string>,
  user?: { uid: string; role: UserType }
): PagePreloader | null {
  switch (page) {
    case 'book-appointment':
      return new BookAppointmentPreloader(params.doctorId, user?.uid, user?.role);
    // Add more preloaders for other pages as needed
    default:
      return null;
  }
}

/**
 * Utility function to preload data for a page
 */
export async function preloadPageData(
  page: string,
  params: Record<string, string>,
  user?: { uid: string; role: UserType }
): Promise<void> {
  const preloader = createPagePreloader(page, params, user);
  if (preloader) {
    await preloader.preloadAll();
  }
}

export async function enhancedPreload(
  _resourceKey: string, // Prefixed with _
  _preloadFn: PreloadFunction // Prefixed with _
  // dependencies: string[] = [] // Removed unused parameter
): Promise<unknown> {
  // ... existing code ...
  return Promise.resolve(); // Placeholder
}

export function applyStrategies<
  _T,
>() // executeStrategy: (strategy: T) => Promise<unknown> // Removed unused parameter // strategies: T[], // Removed unused parameter
: Promise<unknown[]> {
  // ... existing code ...
  return Promise.resolve([]); // Placeholder
}

export async function executeWithPriority<
  _T,
>() // processor: (item: T) => Promise<unknown> // Removed unused parameter // items: T[], // Removed unused parameter
: Promise<unknown[]> {
  // ... existing code ...
  return Promise.resolve([]); // Placeholder
}

/**
 * Check if data saver is enabled
 */
function isDataSaverEnabled(): boolean {
  if (typeof navigator !== 'undefined') {
    // Safely check for and access connection property
    const connection =
      'connection' in navigator
        ? (navigator as { connection?: { saveData?: boolean } }).connection
        : undefined;
    return connection?.saveData === true;
  }
  return false;
}

/**
 * Check if the connection is slow
 */
function isSlowConnection(): boolean {
  if (typeof navigator !== 'undefined') {
    // Safely check for and access connection property
    const connection =
      'connection' in navigator
        ? (navigator as { connection?: { effectiveType?: string } }).connection
        : undefined;
    return connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';
  }
  return false;
}

/**
 * Determines if preloading should occur based on network conditions
 */
function shouldPreload(): boolean {
  return isOnline() && !isDataSaverEnabled() && !isSlowConnection();
}

/**
 * Preloads data based on user context and role
 */
export function useSmartPrefetch() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const preloaded = useRef<Set<string>>(new Set());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Mark as ready after initial mount
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || !user || !shouldPreload()) {
      return;
    }

    const preload = async (key: string, fn: () => Promise<unknown>) => {
      if (preloaded.current.has(key)) return;
      preloaded.current.add(key);
      try {
        logInfo('Prefetching', { key });
        await fn();
      } catch (error) {
        logError('Prefetch failed', { key, error });
        // Remove from preloaded set if it failed, so it can be tried again
        preloaded.current.delete(key);
      }
    };

    // Role-based preloading logic
    if (user.role === UserType.PATIENT) {
      // Prefetch upcoming appointments and doctor details for those appointments
      preload('patientAppointments', () =>
        queryClient.prefetchQuery({
          queryKey: ['appointments', user.uid],
          queryFn: () => enhancedApiCall('getMyAppointments', { uid: user.uid, role: user.role }),
        })
      );
      // Additional prefetching for patients could go here (e.g., recent doctors)
    } else if (user.role === UserType.DOCTOR) {
      // Prefetch today's and tomorrow's appointments/schedule
      preload('doctorScheduleToday', () =>
        queryClient.prefetchQuery({
          queryKey: ['doctorSchedule', user.uid, 'today'],
          queryFn: () =>
            enhancedApiCall('getDoctorSchedule', { uid: user.uid, role: user.role, date: 'today' }),
        })
      );
      preload('doctorScheduleTomorrow', () =>
        queryClient.prefetchQuery({
          queryKey: ['doctorSchedule', user.uid, 'tomorrow'],
          queryFn: () =>
            enhancedApiCall('getDoctorSchedule', {
              uid: user.uid,
              role: user.role,
              date: 'tomorrow',
            }),
        })
      );
      // Prefetch doctor availability
      preload('doctorAvailability', () =>
        queryClient.prefetchQuery({
          queryKey: ['doctorAvailability', user.uid],
          queryFn: () =>
            enhancedApiCall('getDoctorAvailability', { uid: user.uid, role: user.role }),
        })
      );
    } else if (user.role === UserType.ADMIN) {
      // Prefetch admin dashboard data
      preload('adminDashboard', () =>
        queryClient.prefetchQuery({
          queryKey: ['admin', 'dashboardData'],
          queryFn: () =>
            enhancedApiCall('adminGetDashboardData', { uid: user.uid, role: user.role }),
        })
      );
      // Prefetch first page of users and doctors
      preload('adminUsersPage1', () =>
        queryClient.prefetchQuery({
          queryKey: ['admin', 'users', { page: 1, limit: 10 }],
          queryFn: () =>
            enhancedApiCall(
              'adminGetAllUsers',
              { uid: user.uid, role: user.role },
              { page: 1, limit: 10 }
            ),
        })
      );
      preload('adminDoctorsPage1', () =>
        queryClient.prefetchQuery({
          queryKey: ['admin', 'doctors', { page: 1, limit: 10 }],
          queryFn: () =>
            enhancedApiCall(
              'adminGetAllDoctors',
              { uid: user.uid, role: user.role },
              { page: 1, limit: 10 }
            ),
        })
      );
    }

    // General prefetching for all logged-in users
    preload('userProfile', () =>
      queryClient.prefetchQuery({
        queryKey: ['profile', user.uid],
        queryFn: () => enhancedApiCall('getMyUserProfile', { uid: user.uid, role: user.role }),
      })
    );
    preload('notifications', () =>
      queryClient.prefetchQuery({
        queryKey: ['notifications', user.uid],
        queryFn: () => enhancedApiCall('getMyNotifications', { uid: user.uid, role: user.role }),
      })
    );
  }, [user, queryClient, isReady]); // Dependency on user, queryClient, and isReady state

  // Function to manually trigger prefetch for specific keys
  const triggerPrefetch = useCallback(async (key: string, fn: () => Promise<unknown>) => {
    if (!shouldPreload() || preloaded.current.has(key)) return;
    preloaded.current.add(key);
    try {
      logInfo('Manual Prefetching', { key });
      await fn();
    } catch (error) {
      logError('Manual Prefetch failed', { key, error });
      preloaded.current.delete(key);
    }
  }, []);

  return { triggerPrefetch };
}

/**
 * Component to handle preloading based on route changes (example usage)
 * This might be better implemented in a layout component
 */
export function RouteChangePrefetcher() {
  const { user } = useAuth();
  const { triggerPrefetch } = useSmartPrefetch();
  const queryClient = useQueryClient();

  useEffect(() => {
    // This is a placeholder - actual route change detection would use
    // Next.js router events or similar mechanism
    const handleRouteChange = (url: string) => {
      logInfo('Route changed', { url });
      if (!user || !shouldPreload()) return;

      // Example: Prefetch data for the book appointment page if navigated to
      if (url.startsWith('/book-appointment/')) {
        const doctorId = url.split('/').pop();
        if (doctorId) {
          triggerPrefetch(`bookAppointment-${doctorId}`, async () => {
            await queryClient.prefetchQuery({
              queryKey: cacheKeys.doctor(doctorId),
              queryFn: () => enhancedApiCall('getDoctorPublicProfile', { doctorId }),
            });
            const today = new Date().toISOString().split('T')[0];
            await queryClient.prefetchQuery({
              queryKey: cacheKeys.availableSlots(doctorId, today),
              queryFn: () => enhancedApiCall('getAvailableSlots', { doctorId, date: today }),
            });
          });
        }
      }
      // Add more route-specific prefetching rules here
    };

    // Simulate route change for demonstration (replace with actual router events)
    const demoTimer = setTimeout(() => handleRouteChange('/book-appointment/doc123'), 5000);

    return () => {
      clearTimeout(demoTimer);
      // Remove actual router event listeners here
    };
  }, [user, triggerPrefetch, queryClient]);

  return null; // This component doesn't render anything
}

// Example high-level preloading function
export async function preloadHighPriorityData() {
  if (!shouldPreload()) return;

  logInfo('Preloading high priority data');
  try {
    // Example: Fetch essential user data or config
    // await enhancedApiCall('getEssentialConfig');
  } catch (error) {
    logError('High priority preload failed', { error });
  }
}

// Example preloading based on navigation intent
export async function preloadForNavigation(targetRoute: string) {
  if (!shouldPreload()) return;

  logInfo('Preloading for navigation', { targetRoute });

  // Example: Prefetch based on the target route pattern
  if (targetRoute.startsWith('/admin')) {
    try {
      // await enhancedApiCall('adminGetCommonData');
    } catch (error) {
      logError('Admin navigation preload failed', { error });
    }
  }
}

// -- Removed unused code fragments --
// const ResourceManager = {
//   resources: {},
//   register: (key, loader) => { ResourceManager.resources[key] = loader; },
//   get: async (key) => {
//     if (!ResourceManager.resources[key]) throw new Error(`Resource not found: ${key}`);
//     return await ResourceManager.resources[key]();
//   }
// };

// const runDependency = async (depKey, loaded) => {
//   if (loaded.has(depKey)) return;
//   const resource = ResourceManager.getDefinition(depKey);
//   if (!resource) return;

//   // Recursively run dependencies
//   if (resource.dependencies) {
//     for (const subDepKey of resource.dependencies) {
//       await runDependency(subDepKey, loaded);
//     }
//   }

//   // Load the resource itself
//   await resource.loader();
//   loaded.add(depKey);
// };

// const PreloadScheduler = {
//   queue: [],
//   processing: false,
//   add: (task) => { PreloadScheduler.queue.push(task); PreloadScheduler.processQueue(); },
//   processQueue: async () => {
//     if (PreloadScheduler.processing || PreloadScheduler.queue.length === 0) return;
//     PreloadScheduler.processing = true;
//     const task = PreloadScheduler.queue.shift();
//     try {
//       await task();
//     } finally {
//       PreloadScheduler.processing = false;
//       PreloadScheduler.processQueue(); // Process next
//     }
//   }
// };

// --- Potentially unused/obsolete code below ---
