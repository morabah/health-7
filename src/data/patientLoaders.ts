'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';
import { AuthError, ApiError } from '@/lib/errors/errorClasses';
import type { z } from 'zod';
import type { UpdateProfileSchema, Appointment } from '@/types/schemas';
import { logError, logInfo } from '@/lib/logger';
import { isOnline, executeWhenOnline, persistError, normalizeError } from '@/hooks/useErrorSystem';

/**
 * Hook to fetch patient profile data
 */
export const usePatientProfile = (patientId?: string) => {
  const { user } = useAuth();

  // If patientId is provided, fetch that patient's profile (for doctors/admins)
  // Otherwise, fetch the current user's profile
  return useQuery({
    queryKey: ['patientProfile', patientId || user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new AuthError('User not authenticated');

      if (patientId) {
        // For doctors/admins viewing a patient's profile
        return callApi('getPatientProfile', { uid: user.uid, role: user.role }, { patientId });
      } else {
        // For patients viewing their own profile
        return callApi('getMyUserProfile', {
          uid: user.uid,
          role: UserType.PATIENT,
        });
      }
    },
    enabled: !!user?.uid && (!!patientId || user.role === UserType.PATIENT),
  });
};

/**
 * Hook to batch fetch multiple patient profiles at once
 *
 * @param patientIds Array of patient IDs to fetch
 * @param options Additional query options
 * @returns Query result with patients data
 */
export const useBatchPatientData = (
  patientIds: string[] = [],
  options: { enabled?: boolean } = {}
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['batchPatients', patientIds.sort().join(',')],
    queryFn: async () => {
      if (!patientIds.length) {
        return { success: true, patients: {} };
      }

      if (!user?.uid) {
        throw new AuthError('Authentication required to fetch patient data');
      }

      // Ensure user has appropriate role
      if (user.role !== UserType.DOCTOR && user.role !== UserType.ADMIN) {
        throw new AuthError('Insufficient permissions to access patient data');
      }

      // Execute when online
      return executeWhenOnline(async () => {
        try {
          logInfo('Fetching batch patient data', { count: patientIds.length });

          // Call the batch API endpoint - we'll assume a "batchGetPatientsData" endpoint
          // that works similarly to batchGetDoctorsData
          // If this endpoint doesn't exist, you'd need to implement it in the backend
          const result = await callApi(
            'batchGetPatientsData',
            { uid: user.uid, role: user.role },
            patientIds
          );

          return result;
        } catch (error) {
          // Normalize and persist critical errors
          const normalizedError = normalizeError(error);
          persistError(normalizedError);
          throw normalizedError;
        }
      });
    },
    enabled:
      options.enabled !== false &&
      patientIds.length > 0 &&
      !!user?.uid &&
      (user.role === UserType.DOCTOR || user.role === UserType.ADMIN),
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Keep data for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Process and cache individual patient data
    select: (data: any) => {
      if (!data.success || !data.patients) {
        return { success: false, patients: {} };
      }

      // Cache individual patients to reduce future fetching
      Object.entries(data.patients).forEach(([patientId, patientData]) => {
        queryClient.setQueryData(['patientProfile', patientId], {
          success: true,
          patient: patientData,
        });
      });

      return data;
    },
  });
};

/**
 * Hook to update patient profile
 */
export const useUpdatePatientProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof UpdateProfileSchema>) => {
      if (!user?.uid) throw new AuthError('User not authenticated');

      // Add the proper context to the API call
      return callApi(
        'updateMyUserProfile',
        {
          uid: user.uid,
          role: UserType.PATIENT,
        },
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientProfile'] });
    },
  });
};

/**
 * Hook to fetch patient appointments
 */
export function usePatientAppointments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['appointments', user?.uid],
    queryFn: async () => {
      if (!user?.uid) {
        throw new AuthError('You must be logged in to view appointments');
      }

      return callApi('getMyAppointments', { uid: user.uid, role: user.role });
    },
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get appointment details by ID for the current patient
 */
export function useAppointmentDetails(appointmentId: string) {
  const user = useAuth().user;

  return useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      if (!user) {
        throw new AuthError('User not authenticated');
      }

      // Create the context object
      const context = {
        uid: user.uid,
        role: UserType.PATIENT,
      };

      // Pass context as first argument and data as second argument
      return await callApi('getAppointmentDetails', context, { appointmentId });
    },
    enabled: !!appointmentId && !!user,
  });
}

/**
 * Hook to cancel an appointment
 */
export function useCancelAppointment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId, reason }: { appointmentId: string; reason: string }) => {
      if (!user?.uid) {
        throw new AuthError('You must be logged in to cancel an appointment');
      }

      const response = await callApi<{ success: boolean; message?: string }>(
        'cancelAppointment',
        { uid: user.uid, role: user.role },
        { appointmentId, reason }
      );

      return response;
    },
    onSuccess: () => {
      // Invalidate appointments query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['appointments', user?.uid] });
    },
    onError: error => {
      logError('Failed to cancel appointment', { error });
      throw error; // Re-throw for UI handling
    },
  });
}
