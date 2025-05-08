'use client';

/**
 * Prefetch Utilities
 *
 * This file contains utilities for intelligent prefetching of data based on
 * anticipated user navigation paths.
 */

import type { QueryClient } from '@tanstack/react-query';
import { UserType } from '@/types/enums';
import { callApi } from './apiClient';
import { logInfo } from './logger';

// Simple browser check utility
const isBrowser = typeof window !== 'undefined';

// Type definitions for API responses
interface AppointmentResponse {
  success: boolean;
  appointments?: Array<{
    id: string;
    doctorId: string;
    patientId: string;
    dateTime: string;
    status: string;
  }>;
}

interface DoctorBatchResponse {
  success: boolean;
  doctors: Record<string, unknown>;
}

/**
 * Prefetch options interface
 */
interface PrefetchOptions {
  queryClient: QueryClient;
  userUid?: string;
  userRole?: UserType;
  enabled?: boolean;
}

/**
 * Prefetch doctor details based on user's upcoming appointments
 * This anticipates user viewing doctor profiles from appointments
 */
export async function prefetchUpcomingAppointmentDoctors(options: PrefetchOptions): Promise<void> {
  const { queryClient, userUid, userRole, enabled = true } = options;

  if (!enabled || !isBrowser || !userUid || userRole !== UserType.PATIENT) {
    return;
  }

  try {
    // Get the user's appointments
    const appointmentsResult = await queryClient.fetchQuery<AppointmentResponse>({
      queryKey: ['appointments', userUid],
      queryFn: async () => callApi('getMyAppointments', { uid: userUid, role: userRole }),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

    if (!appointmentsResult.success || !appointmentsResult.appointments) {
      return;
    }

    // Extract unique doctor IDs from the user's upcoming appointments
    // Using a more compatible approach to get unique values
    const doctorIdsMap: Record<string, boolean> = {};
    appointmentsResult.appointments
      .filter(apt => new Date(apt.dateTime) > new Date()) // Only upcoming appointments
      .forEach(apt => {
        doctorIdsMap[apt.doctorId] = true;
      });

    const doctorIds = Object.keys(doctorIdsMap);

    if (doctorIds.length === 0) {
      return;
    }

    // Prefetch the batch doctor data
    logInfo('Prefetching doctor data for upcoming appointments', { count: doctorIds.length });
    await queryClient.prefetchQuery<DoctorBatchResponse>({
      queryKey: ['batchDoctors', doctorIds.sort().join(',')],
      queryFn: async () =>
        callApi('batchGetDoctorsData', { uid: userUid, role: userRole }, doctorIds),
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  } catch (error) {
    // Just log errors but don't throw - prefetching should fail silently
    logInfo('Error prefetching doctor data for upcoming appointments', { error });
  }
}

/**
 * Prefetch appointments for a specific date range
 * This anticipates user filtering appointments by date
 */
export async function prefetchAppointmentsDateRange(
  startDate: Date,
  endDate: Date,
  options: PrefetchOptions
): Promise<void> {
  const { queryClient, userUid, userRole, enabled = true } = options;

  if (!enabled || !isBrowser || !userUid) {
    return;
  }

  try {
    // Format dates as ISO strings
    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();

    // Prefetch appointments for the date range
    logInfo('Prefetching appointments for date range', {
      startDate: startDateISO,
      endDate: endDateISO,
    });

    // Create a unique query key for this date range
    const rangeKey = `${startDateISO}_${endDateISO}`;

    await queryClient.prefetchQuery<AppointmentResponse>({
      queryKey: ['appointments', userUid, 'range', rangeKey],
      queryFn: async () =>
        callApi(
          'getMyAppointments',
          { uid: userUid, role: userRole },
          { startDate: startDateISO, endDate: endDateISO }
        ),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  } catch (error) {
    // Just log errors but don't throw
    logInfo('Error prefetching appointments for date range', { error });
  }
}

/**
 * Prefetch the next few days of available slots for a doctor
 * This anticipates user booking an appointment and looking at multiple days
 */
export async function prefetchDoctorAvailability(
  doctorId: string,
  daysToFetch: number = 7,
  options: PrefetchOptions
): Promise<void> {
  const { queryClient, userUid, userRole, enabled = true } = options;

  if (!enabled || !isBrowser || !doctorId) {
    return;
  }

  try {
    // Calculate the date range for the next few days
    const dates: string[] = [];
    const today = new Date();

    for (let i = 0; i < daysToFetch; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // Prefetch doctor data with availability for multiple days
    logInfo('Prefetching doctor availability', { doctorId, dayCount: daysToFetch });

    // Use batchGetDoctorData for efficient fetching
    await queryClient.prefetchQuery<{ success: boolean; doctor?: unknown }>({
      queryKey: ['doctor', doctorId, 'availability', dates.join(',')],
      queryFn: async () =>
        callApi('batchGetDoctorData', userUid ? { uid: userUid, role: userRole } : undefined, {
          doctorId,
          includeProfile: true,
          includeAvailability: true,
          includeAppointments: Boolean(userUid),
          currentDate: dates[0],
          numDays: daysToFetch,
        }),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  } catch (error) {
    // Just log errors but don't throw
    logInfo('Error prefetching doctor availability', { error, doctorId });
  }
}

/**
 * Prefetch staff data for admin dashboard
 * This anticipates admin browsing user details
 */
export async function prefetchAdminDashboardData(options: PrefetchOptions): Promise<void> {
  const { queryClient, userUid, userRole, enabled = true } = options;

  if (!enabled || !isBrowser || !userUid || userRole !== UserType.ADMIN) {
    return;
  }

  try {
    // Prefetch dashboard overview data
    logInfo('Prefetching admin dashboard data');

    await queryClient.prefetchQuery<{ success: boolean }>({
      queryKey: ['adminDashboard'],
      queryFn: async () => callApi('adminGetDashboardData', { uid: userUid, role: userRole }),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Prefetch users list (first page/limited)
    await queryClient.prefetchQuery<{ success: boolean; users?: unknown[] }>({
      queryKey: ['adminUsers', 'page_1'],
      queryFn: async () =>
        callApi('adminGetAllUsers', { uid: userUid, role: userRole }, { page: 1, limit: 10 }),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });

    // Prefetch doctors list (first page/limited)
    await queryClient.prefetchQuery<{ success: boolean; doctors?: unknown[] }>({
      queryKey: ['adminDoctors', 'page_1'],
      queryFn: async () =>
        callApi('adminGetAllDoctors', { uid: userUid, role: userRole }, { page: 1, limit: 10 }),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });

    // Prefetch appointments list (first page/limited)
    await queryClient.prefetchQuery<{ success: boolean; appointments?: unknown[] }>({
      queryKey: ['adminAppointments', 'page_1'],
      queryFn: async () =>
        callApi(
          'adminGetAllAppointments',
          { uid: userUid, role: userRole },
          { page: 1, limit: 10 }
        ),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  } catch (error) {
    // Just log errors but don't throw
    logInfo('Error prefetching admin dashboard data', { error });
  }
}

/**
 * Initialize prefetching for a user based on their role
 * This sets up appropriate prefetching based on the user's context
 */
export function initializePrefetching(options: PrefetchOptions): void {
  const { userUid, userRole, enabled = true } = options;

  if (!enabled || !isBrowser || !userUid || !userRole) {
    return;
  }

  // Setup different prefetching strategies based on user role
  switch (userRole) {
    case UserType.PATIENT:
      // For patients, prefetch doctor data for upcoming appointments
      setTimeout(() => prefetchUpcomingAppointmentDoctors(options), 2000);
      break;

    case UserType.DOCTOR:
      // For doctors, prefetch today's appointments
      setTimeout(() => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        prefetchAppointmentsDateRange(today, tomorrow, options);
      }, 2000);
      break;

    case UserType.ADMIN:
      // For admins, prefetch dashboard data
      setTimeout(() => prefetchAdminDashboardData(options), 2000);
      break;
  }
}

/**
 * Browser-side utility to check if this is likely a fast connection
 */
export function hasFastConnection(): boolean {
  if (!isBrowser) return false;

  // Check if the browser supports Navigator.connection
  const connection = (
    navigator as Navigator & {
      connection?: {
        saveData: boolean;
        effectiveType: string;
      };
    }
  ).connection;

  if (!connection) return true; // Default to true if not supported

  // If saveData mode is enabled, don't prefetch
  if (connection.saveData) return false;

  // Check known slow connections
  if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
    return false;
  }

  return true;
}
