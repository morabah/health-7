'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode} from 'react';
import { createElement } from 'react';

// Create a client with enhanced caching options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection time)
      refetchOnWindowFocus: false,
      retry: 1,
      refetchOnMount: 'always',
    },
  },
});

// Cache key builder helper
export const cacheKeys = {
  // User related keys
  user: (userId?: string) => ['user', userId],
  users: (filters?: Record<string, unknown>) => ['users', filters],
  userProfile: (userId?: string) => ['userProfile', userId],
  myUserProfile: () => ['myUserProfile'],
  
  // Doctor related keys
  doctor: (doctorId?: string) => ['doctor', doctorId],
  doctors: (filters?: Record<string, unknown>) => ['doctors', filters],
  doctorAvailability: (doctorId?: string, date?: string) => 
    ['doctorAvailability', doctorId, date],
  doctorSchedule: (doctorId?: string) => ['doctorSchedule', doctorId],
  
  // Appointment related keys
  appointment: (appointmentId?: string) => ['appointment', appointmentId],
  appointments: (userId?: string, role?: string) => ['appointments', userId, role],
  availableSlots: (doctorId?: string, date?: string) => 
    ['availableSlots', doctorId, date],
  
  // Notification related keys
  notifications: (userId?: string) => ['notifications', userId],
};

// Cache manager with utility functions
export const cacheManager = {
  // Invalidate all queries with the given prefix
  invalidateQueries: async (prefix: string[]) => {
    await queryClient.invalidateQueries({ queryKey: prefix });
  },
  
  // Set data in cache without fetching
  setQueryData: <T>(key: unknown[], data: T) => {
    queryClient.setQueryData(key, data);
  },
  
  // Get data from cache without fetching
  getQueryData: <T>(key: unknown[]): T | undefined => {
    return queryClient.getQueryData<T>(key);
  },
  
  // Prefetch and cache data
  prefetchQuery: async <T>(key: unknown[], queryFn: () => Promise<T>) => {
    await queryClient.prefetchQuery({
      queryKey: key,
      queryFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  },
  
  // Clear entire cache
  clearCache: () => {
    queryClient.clear();
  },
  
  // Invalidate common entity groups
  invalidateUserData: async (userId?: string) => {
    if (userId) {
      await queryClient.invalidateQueries({ queryKey: ['user', userId] });
    } else {
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  },
  
  invalidateAppointmentData: async (userId?: string) => {
    await queryClient.invalidateQueries({ queryKey: ['appointments'] });
    if (userId) {
      await queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
    }
  },
  
  invalidateDoctorData: async (doctorId?: string) => {
    if (doctorId) {
      await queryClient.invalidateQueries({ queryKey: ['doctor', doctorId] });
    } else {
      await queryClient.invalidateQueries({ queryKey: ['doctors'] });
    }
  }
};

export { queryClient };

// Provider wrapper component
export function QueryProvider({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}