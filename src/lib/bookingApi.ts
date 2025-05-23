'use client';

import { useApiQuery, useApiMutation, prefetchApiQuery } from './enhancedApiClient';
import { cacheKeys } from './queryClient';
import { setMemoryCacheData, getMemoryCacheData } from './optimizedDataAccess';
import { logInfo, logError } from './logger';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { startMeasurement, endMeasurement } from './performanceMetrics';

// Type definitions
interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

interface Doctor {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  specialty: string;
  [key: string]: unknown;
}

interface AvailableSlotsResponse {
  success: boolean;
  slots: TimeSlot[];
  error?: string;
}

// Type for useBookAppointment response
interface BookAppointmentResponse {
  success: boolean;
  appointment: {
    doctorId: string;
    appointmentDate: string;
  };
}

// Create a custom dashboardCacheKey function
const dashboardCacheKey = () => ['dashboard'];

/**
 * Enhanced useAvailableSlots hook with optimized performance
 * - Uses memory caching for fast repeated accesses
 * - Prefetches adjacent dates when a date is selected
 * - Implements automatic retry with exponential backoff
 */
export function useAvailableSlots(doctorId: string, date: string) {
  const { user } = useAuth();
  const [retryCount, setRetryCount] = useState(0);

  // Create a cache key for this specific doctor/date combination
  const cacheKey = `available-slots-${doctorId}-${date}`;

  // Check for cached data first, with a short TTL (15 seconds)
  const loadCachedData = useCallback(() => {
    return getMemoryCacheData<AvailableSlotsResponse>(cacheKey);
  }, [cacheKey]);

  const { data, isLoading, error, refetch } = useApiQuery<AvailableSlotsResponse, Error>(
    'getAvailableSlots',
    cacheKeys.availableSlots(doctorId, date),
    [user ? { uid: user.uid, role: user.role } : undefined, { doctorId, date }], // provide context if user is available
    {
      enabled: !!doctorId && !!date, // remove user requirement since this is a public endpoint
      staleTime: 60 * 1000, // 1 minute
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
    }
  );

  // Handle successful responses separately
  useEffect(() => {
    if (data?.success && data.slots) {
      // Cache successful responses in memory for faster access
      setMemoryCacheData(cacheKey, data, {
        ttl: 15000, // 15 seconds TTL
        priority: 'high',
      });

      // Prefetch adjacent dates to improve UX when user navigates
      prefetchAdjacentDates(doctorId, date);
    }
  }, [data, cacheKey, doctorId, date]);

  // Handle errors separately
  useEffect(() => {
    if (error) {
      logError('Error fetching available slots', { doctorId, date, error });

      // Handle specific error types with custom retry logic
      if (retryCount < 3 && isNetworkError(error)) {
        setRetryCount(prev => prev + 1);
        setTimeout(
          () => {
            refetch();
          },
          1000 * 2 ** retryCount
        );
      }
    }
  }, [error, retryCount, doctorId, date, refetch]);

  // Try to use cached data first for faster rendering
  useEffect(() => {
    const cachedData = loadCachedData();
    if (cachedData && !data) {
      logInfo('Using cached slots data', { doctorId, date });
    }
  }, [loadCachedData, doctorId, date, data]);

  return {
    data: data || loadCachedData(),
    isLoading,
    error,
    refetch,
  };
}

/**
 * Check if an error is a network error (for retry logic)
 */
function isNetworkError(error: Error): boolean {
  return (
    error.message.includes('network') ||
    error.message.includes('timeout') ||
    error.message.includes('abort') ||
    error.message.includes('offline')
  );
}

/**
 * Prefetch slots for adjacent dates to improve UX when user navigates
 */
function prefetchAdjacentDates(doctorId: string, currentDate: string) {
  try {
    const currentDateObj = new Date(currentDate);

    // Prefetch next day
    const nextDay = new Date(currentDateObj);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    // Prefetch previous day
    const prevDay = new Date(currentDateObj);
    prevDay.setDate(prevDay.getDate() - 1);
    const prevDayStr = prevDay.toISOString().split('T')[0];

    // Prefetch in the background with a delay to not interfere with current request
    setTimeout(() => {
      prefetchApiQuery<AvailableSlotsResponse>(
        'getAvailableSlots',
        cacheKeys.availableSlots(doctorId, nextDayStr),
        [undefined, { doctorId, date: nextDayStr }] // context can be undefined for public endpoint
      );
    }, 500);

    setTimeout(() => {
      prefetchApiQuery<AvailableSlotsResponse>(
        'getAvailableSlots',
        cacheKeys.availableSlots(doctorId, prevDayStr),
        [undefined, { doctorId, date: prevDayStr }] // context can be undefined for public endpoint
      );
    }, 1000);
  } catch (err) {
    // Silently fail for prefetching
    logError('Error prefetching adjacent dates', err);
  }
}

/**
 * Enhanced booking appointment mutation with optimized error handling and caching
 */
export function useBookAppointment() {
  const { user } = useAuth();
  const [perfId, setPerfId] = useState<string | null>(null);

  const mutation = useApiMutation<BookAppointmentResponse, Error>('bookAppointment', response => {
    // Invalidate affected cache entries on success
    return [
      cacheKeys.appointments(user?.uid),
      cacheKeys.availableSlots(
        response?.appointment?.doctorId,
        response?.appointment?.appointmentDate
      ),
      dashboardCacheKey(),
      cacheKeys.notifications(),
    ];
  });

  // Handle performance tracking with useEffect
  useEffect(() => {
    if (mutation.isPending && !perfId) {
      // Start performance measurement when mutation starts
      const id = startMeasurement('book-appointment');
      setPerfId(id);
    } else if (!mutation.isPending && perfId) {
      // End performance measurement when mutation completes
      if (mutation.isSuccess) {
        endMeasurement(perfId, { success: true });
        logInfo('Appointment booked successfully');
      } else if (mutation.isError) {
        endMeasurement(perfId, {
          success: false,
          errorMessage:
            mutation.error instanceof Error ? mutation.error.message : String(mutation.error),
        });
        logError('Error booking appointment', mutation.error);
      }

      // Reset perfId
      setPerfId(null);
    }
  }, [mutation.isPending, mutation.isSuccess, mutation.isError, mutation.error, perfId]);

  return mutation;
}

/**
 * Get optimized doctor details with caching
 */
export function useDoctorDetails(doctorId: string) {
  const { user } = useAuth();
  const cacheKey = `doctor-details-${doctorId}`;

  const { data, isLoading, error } = useApiQuery<{ success: boolean; doctor: Doctor }, Error>(
    'getDoctorPublicProfile',
    cacheKeys.doctor(doctorId),
    [user ? { uid: user.uid, role: user.role } : undefined, { doctorId }], // provide context if user is available
    {
      enabled: !!doctorId, // remove user requirement since this is a public endpoint
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Implement the caching logic in a useEffect hook instead
  useEffect(() => {
    if (data?.success && data.doctor) {
      // Store in memory cache for even faster access
      setMemoryCacheData(cacheKey, data.doctor, {
        ttl: 5 * 60 * 1000, // 5 minutes
        priority: 'normal',
      });
    }
  }, [data, cacheKey]);

  // Try to use cached data first for faster initial render
  const cachedDoctor = getMemoryCacheData<Doctor>(cacheKey);

  return {
    doctor: data?.doctor || cachedDoctor,
    isLoading,
    error,
  };
}
