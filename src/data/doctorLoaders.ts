'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';
import type { z } from 'zod';
import type { UpdateProfileSchema, SetDoctorAvailabilitySchema, Appointment } from '@/types/schemas';

/**
 * Hook to fetch doctor profile data
 */
export const useDoctorProfile = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['doctorProfile', user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('getMyUserProfile', { uid: user.uid, role: UserType.DOCTOR });
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
      if (!user?.uid) throw new Error('User not authenticated');
      // Create the context object separate from the data payload
      const context = {
        uid: user.uid,
        role: UserType.DOCTOR
      };
      // Pass context as first argument and data as second argument
      return callApi('updateMyUserProfile', context, data);
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
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('getMyAppointments', { 
        uid: user.uid, 
        role: UserType.DOCTOR 
      });
    },
    enabled: !!user?.uid
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
      if (!user?.uid) throw new Error('User not authenticated');
      
      // Create the context object separate from the data payload
      const context = {
        uid: user.uid, 
        role: UserType.DOCTOR
      };
      
      // Pass context as first argument and params as second argument
      return callApi('completeAppointment', context, params);
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
      if (!user?.uid) throw new Error('User not authenticated');
      
      // Fix: Create proper context and payload objects
      const context = { 
        uid: user.uid, 
        role: UserType.DOCTOR 
      };
      
      // Pass context as first argument and properly structured payload as second
      return callApi('cancelAppointment', context, { 
        appointmentId: params.appointmentId,
        reason: params.reason
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
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('getDoctorAvailability', { 
        uid: user.uid, 
        role: UserType.DOCTOR,
        doctorId: user.uid 
      });
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
      if (!user?.uid) throw new Error('User not authenticated');
      // Create the context object separate from the data payload
      const context = {
        uid: user.uid,
        role: UserType.DOCTOR
      };
      // Pass context as first argument and data as second argument
      return callApi('setDoctorAvailability', context, data);
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
      if (!user?.uid) throw new Error('User not authenticated');
      
      return await callApi('getAppointmentDetails', { 
        appointmentId 
      });
    },
    enabled: !!user?.uid && !!appointmentId
  });
}; 