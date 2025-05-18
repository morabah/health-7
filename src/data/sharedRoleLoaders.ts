'use client';

/**
 * Shared role-aware data loaders
 * 
 * This file contains hooks that can be used across different user roles (patient/doctor)
 * with role-specific behavior determined at runtime based on the current user's role.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';
import { AuthError } from '@/lib/errors/errorClasses';
import { logError, logInfo } from '@/lib/logger';
import { isOnline, executeWhenOnline, persistError, normalizeError } from '@/hooks/useErrorSystem';
import type { z } from 'zod';
import type { UpdateProfileSchema, Appointment } from '@/types/schemas';
import { CACHE_DURATIONS } from '@/lib/cacheDurations';

/**
 * Role-specific query key prefixes to avoid cache collisions
 */
const ROLE_QUERY_KEYS = {
  [UserType.PATIENT]: 'patient',
  [UserType.DOCTOR]: 'doctor',
  [UserType.ADMIN]: 'admin',
};

/**
 * Unified hook to fetch appointments for the current user
 * Works for both patients and doctors
 * 
 * @param options Additional query options
 * @returns Query result with appointments data
 */
export function useMyAppointments(options: {
  status?: 'upcoming' | 'past' | 'today' | 'all';
  limit?: number;
  enabled?: boolean;
} = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { status = 'all', limit, enabled = true } = options;
  
  // Create a role-specific query key to avoid cache collisions
  const rolePrefix = user?.role ? ROLE_QUERY_KEYS[user.role as UserType] || 'user' : 'user';
  
  return useQuery({
    queryKey: [
      `${rolePrefix}Appointments`, 
      user?.uid, 
      status, 
      limit
    ],
    queryFn: async () => {
      if (!user?.uid) {
        throw new AuthError('You must be logged in to view appointments');
      }
      
      // Handle offline scenario gracefully
      try {
        return await callApi('getMyAppointments', 
          { uid: user.uid, role: user.role },
          { status, limit }
        );
      } catch (error) {
        // Persist critical errors for analysis
        persistError(normalizeError(error));
        throw error;
      }
    },
    enabled: enabled && !!user?.uid,
    staleTime: CACHE_DURATIONS.APPOINTMENTS_UPCOMING, // 5 minutes for upcoming appointments
  });
}

/**
 * Unified hook to get appointment details by ID for the current user
 * Works for both patients and doctors
 * 
 * @param appointmentId ID of the appointment to fetch
 * @returns Query result with appointment details
 */
export function useAppointmentDetails(appointmentId: string) {
  const { user } = useAuth();
  
  // Create a role-specific query key to avoid cache collisions
  const rolePrefix = user?.role ? ROLE_QUERY_KEYS[user.role as UserType] || 'user' : 'user';
  
  return useQuery({
    queryKey: [`${rolePrefix}Appointment`, appointmentId],
    queryFn: async () => {
      if (!user?.uid) {
        throw new AuthError('User not authenticated');
      }
      
      // Create the context object
      const context = {
        uid: user.uid,
        role: user.role,
      };
      
      // Pass context as first argument and data as second argument
      return await callApi('getAppointmentDetails', context, { appointmentId });
    },
    enabled: !!appointmentId && !!user?.uid,
  });
}

/**
 * Unified hook to cancel an appointment
 * Works for both patients and doctors
 * 
 * @returns Mutation for cancelling appointments
 */
export function useCancelAppointment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Create a role-specific query key prefix for invalidation
  const rolePrefix = user?.role ? ROLE_QUERY_KEYS[user.role as UserType] || 'user' : 'user';
  
  return useMutation({
    mutationFn: async ({ appointmentId, reason }: { appointmentId: string; reason: string }) => {
      if (!user?.uid) {
        throw new AuthError('You must be logged in to cancel an appointment');
      }
      
      // Execute only when online
      return executeWhenOnline(async () => {
        try {
          logInfo('Cancelling appointment', { 
            appointmentId, 
            userRole: user.role 
          });
          
          // Create proper context object
          const context = { 
            uid: user.uid, 
            role: user.role 
          };
          
          // Pass context as first argument and appointment params as second
          return await callApi('cancelAppointment', context, { 
            appointmentId,
            reason
          });
        } catch (error) {
          // Persist critical operation errors
          persistError(normalizeError(error));
          throw error;
        }
      });
    },
    onSuccess: () => {
      // Invalidate role-specific appointments query to refetch the list
      queryClient.invalidateQueries({ 
        queryKey: [`${rolePrefix}Appointments`, user?.uid] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['notifications'] 
      });
      
      logInfo('Successfully cancelled appointment', { userRole: user?.role });
    },
    onError: error => {
      logError('Failed to cancel appointment', { error, userRole: user?.role });
      throw error; // Re-throw for UI handling
    },
  });
}

/**
 * Unified hook to get user profile
 * Works for both patients and doctors
 * 
 * @returns Query result with user profile data
 */
export function useMyProfile() {
  const { user } = useAuth();
  
  // Create a role-specific query key to avoid cache collisions
  const rolePrefix = user?.role ? ROLE_QUERY_KEYS[user.role as UserType] || 'user' : 'user';
  
  return useQuery({
    queryKey: [`${rolePrefix}Profile`, user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new AuthError('User not authenticated');
      
      // Ensure network is available
      if (!isOnline()) {
        throw new Error('Cannot load profile while offline. Please check your connection.');
      }
      
      try {
        return await callApi('getMyUserProfile', { uid: user.uid, role: user.role });
      } catch (error) {
        // Persist critical errors for later analysis
        persistError(normalizeError(error));
        throw error;
      }
    },
    enabled: !!user?.uid
  });
}

/**
 * Unified hook to update user profile
 * Works for both patients and doctors
 * 
 * @returns Mutation for updating user profile
 */
export function useUpdateMyProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Create a role-specific query key prefix for invalidation
  const rolePrefix = user?.role ? ROLE_QUERY_KEYS[user.role as UserType] || 'user' : 'user';
  
  return useMutation({
    mutationFn: async (data: z.infer<typeof UpdateProfileSchema>) => {
      if (!user?.uid) throw new AuthError('User not authenticated');
      
      // Execute profile update only when online
      return executeWhenOnline(async () => {
        try {
          // Create the context object separate from the data payload
          const context = {
            uid: user.uid,
            role: user.role
          };
          
          // Pass context as first argument and data as second argument
          return await callApi('updateMyUserProfile', context, data);
        } catch (error) {
          // Persist critical errors for later analysis
          persistError(normalizeError(error));
          throw error;
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${rolePrefix}Profile`] });
    }
  });
}
