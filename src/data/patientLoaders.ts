'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';
import { z } from 'zod';
import { CancelAppointmentSchema } from '@/types/schemas';

/**
 * Hook to fetch patient profile data
 */
export const usePatientProfile = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['patientProfile', user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('getMyUserProfile', { uid: user.uid });
    },
    enabled: !!user?.uid
  });
};

/**
 * Hook to update patient profile
 * Note: This is currently a placeholder as the updateMyUserProfile endpoint is not yet implemented
 */
export const useUpdatePatientProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      if (!user?.uid) throw new Error('User not authenticated');
      // This is a placeholder - will use the proper endpoint when available
      console.warn('updateMyUserProfile not yet implemented in localApiFunctions');
      return { success: false, error: 'Not implemented' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientProfile'] });
    }
  });
};

/**
 * Hook to fetch patient appointments
 */
export const usePatientAppointments = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['patientAppointments', user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('getMyAppointments', { 
        uid: user.uid, 
        role: UserType.PATIENT 
      });
    },
    enabled: !!user?.uid
  });
};

/**
 * Hook to cancel an appointment
 */
export const useCancelAppointment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { appointmentId: string, reason?: string }) => {
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('cancelAppointment', { 
        uid: user.uid, 
        role: UserType.PATIENT,
        appointmentId: params.appointmentId,
        reason: params.reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}; 