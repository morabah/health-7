'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';
import type { z } from 'zod';
import type { UpdateProfileSchema, SetDoctorAvailabilitySchema, Appointment } from '@/types/schemas';
import { AuthError } from '@/lib/errors/errorClasses';
import { isOnline, executeWhenOnline, persistError, normalizeError } from '@/hooks/useErrorSystem';

/**
 * Hook to fetch doctor profile data
 */
export const useDoctorProfile = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['doctorProfile', user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new AuthError('User not authenticated');
      
      // Ensure network is available
      if (!isOnline()) {
        throw new Error('Cannot load profile while offline. Please check your connection.');
      }
      
      try {
        return await callApi('getMyUserProfile', { uid: user.uid, role: UserType.DOCTOR });
      } catch (error) {
        // Persist critical errors for later analysis
        persistError(normalizeError(error));
        throw error;
      }
    },
    enabled: !!user?.uid
  });
};

/**
 * Hook to update doctor profile
 */
export const useUpdateDoctorProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: z.infer<typeof UpdateProfileSchema>) => {
      if (!user?.uid) throw new AuthError('User not authenticated');
      
      // Execute profile update only when online
      return executeWhenOnline(async () => {
        try {
          // Create the context object separate from the data payload
          const context = {
            uid: user.uid,
            role: UserType.DOCTOR
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
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
    }
  });
};

/**
 * Hook to fetch doctor appointments
 */
export const useDoctorAppointments = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['doctorAppointments', user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new AuthError('User not authenticated');
      
      // Handle offline scenario gracefully
      try {
        return await callApi('getMyAppointments', { 
          uid: user.uid, 
          role: UserType.DOCTOR 
        });
      } catch (error) {
        // Persist critical errors for analysis
        persistError(normalizeError(error));
        throw error;
      }
    },
    enabled: !!user?.uid,
    // Stale time to reduce unnecessary fetches
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to complete an appointment
 */
export const useCompleteAppointment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { appointmentId: string; notes?: string }) => {
      if (!user?.uid) throw new AuthError('User not authenticated');
      
      // Execute only when online
      return executeWhenOnline(async () => {
        try {
          // Create the context object separate from the data payload
          const context = {
            uid: user.uid, 
            role: UserType.DOCTOR
          };
          
          // Pass context as first argument and params as second argument
          return await callApi('completeAppointment', context, params);
        } catch (error) {
          // Persist critical operation errors
          persistError(normalizeError(error));
          throw error;
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

/**
 * Hook for doctor to cancel an appointment
 */
export const useDoctorCancelAppointment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { appointmentId: string; reason: string }) => {
      if (!user?.uid) throw new AuthError('User not authenticated');
      
      // Execute only when online
      return executeWhenOnline(async () => {
        try {
          // Create proper context object
          const context = { 
            uid: user.uid, 
            role: UserType.DOCTOR 
          };
          
          // Pass context as first argument and appointment params as second
          return await callApi('cancelAppointment', context, { 
            appointmentId: params.appointmentId,
            reason: params.reason
          });
        } catch (error) {
          // Persist critical operation errors
          persistError(normalizeError(error));
          throw error;
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

/**
 * Hook to get doctor availability
 */
export const useDoctorAvailability = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['doctorAvailability', user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new AuthError('User not authenticated');
      
      try {
        return await callApi('getDoctorAvailability', 
          { uid: user.uid, role: UserType.DOCTOR },
          { doctorId: user.uid }
        );
      } catch (error) {
        // Persist errors for analysis
        persistError(normalizeError(error));
        throw error;
      }
    },
    enabled: !!user?.uid
  });
};

/**
 * Hook to set doctor availability
 */
export const useSetAvailability = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof SetDoctorAvailabilitySchema>) => {
      if (!user?.uid) throw new AuthError('User not authenticated');
      
      // Execute only when online
      return executeWhenOnline(async () => {
        try {
          // Create the context object separate from the data payload
          const context = {
            uid: user.uid,
            role: UserType.DOCTOR
          };
          // Pass context as first argument and data as second argument
          return await callApi('setDoctorAvailability', context, data);
        } catch (error) {
          // Persist critical operation errors
          persistError(normalizeError(error));
          throw error;
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorAvailability', user?.uid] });
    }
  });
};

/**
 * Hook to fetch a single appointment details
 */
export const useAppointmentDetails = (appointmentId: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['appointmentDetails', appointmentId, user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new AuthError('User not authenticated');
      
      try {
        // Create context object
        const context = {
          uid: user.uid,
          role: UserType.DOCTOR
        };
        
        // Use getAppointmentDetails API method
        return await callApi('getAppointmentDetails', context, { appointmentId });
      } catch (error) {
        persistError(normalizeError(error));
        throw error;
      }
    },
    enabled: !!user?.uid && !!appointmentId
  });
};

/**
 * Function to get appointment details by ID for a doctor
 * This maps to the getAppointmentDetails API method
 */
export const doctorGetAppointmentById = async (context: { uid: string; role: UserType }, appointmentId: string) => {
  if (!context.uid) throw new AuthError('User not authenticated');
  if (context.role !== UserType.DOCTOR) throw new AuthError('Only doctors can access this information');
  
  try {
    // Call the existing getAppointmentDetails API method
    return await callApi('getAppointmentDetails', context, { appointmentId });
  } catch (error) {
    // Handle and normalize error
    const normalizedError = normalizeError(error);
    persistError(normalizedError);
    throw normalizedError;
  }
}; 

/**
 * Hook to batch fetch multiple doctors data at once
 * 
 * @param doctorIds Array of doctor IDs to fetch
 * @param options Additional query options
 * @returns Query result with doctors data
 */
export const useBatchDoctorData = (doctorIds: string[] = [], options: { enabled?: boolean } = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['batchDoctors', doctorIds.sort().join(',')],
    queryFn: async () => {
      if (!doctorIds.length) {
        return { success: true, doctors: {} };
      }

      if (!user?.uid) {
        // Allow anonymous access with limited data
        return callApi('batchGetDoctorsData', undefined, doctorIds);
      }
      
      // Execute with auth context when available
      return callApi('batchGetDoctorsData', 
        { uid: user.uid, role: user.role },
        doctorIds
      );
    },
    enabled: options.enabled !== false && doctorIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Keep data for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Deduplicate identical requests
    select: (data: any) => {
      if (!data.success || !data.doctors) {
        return { success: false, doctors: {} };
      }
      
      // Cache individual doctors to reduce future fetching
      Object.entries(data.doctors).forEach(([doctorId, doctorData]) => {
        queryClient.setQueryData(['doctor', doctorId], { 
          success: true, 
          doctor: doctorData 
        });
      });
      
      return data;
    }
  });
}; 