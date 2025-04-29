'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';

/**
 * Hook to fetch patient profile data
 */
export const usePatientProfile = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['patientProfile', user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('getMyUserProfile', { 
        uid: user.uid,
        role: UserType.PATIENT
      });
    },
    enabled: !!user?.uid
  });
};

/**
 * Hook to update patient profile
 */
export const useUpdatePatientProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('updateMyUserProfile', { ...data });
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
 * Hook to get appointment details by ID for the current patient
 */
export function useAppointmentDetails(appointmentId: string) {
  const user = useAuth().user;
  
  return useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      return await callApi('getAppointmentDetails', { appointmentId });
    },
    enabled: !!appointmentId && !!user,
  });
}

/**
 * Hook to cancel an appointment
 */
export function useCancelAppointment() {
  const user = useAuth().user;
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ appointmentId, reason }: { appointmentId: string; reason?: string }) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      return await callApi('cancelAppointment', { appointmentId, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
} 