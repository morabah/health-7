'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';
import { AuthError } from '@/lib/errors';

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
        return callApi('getPatientProfile', 
          { uid: user.uid, role: user.role },
          { patientId }
        );
      } else {
        // For patients viewing their own profile
      return callApi('getMyUserProfile', { 
        uid: user.uid,
        role: UserType.PATIENT
      });
      }
    },
    enabled: !!user?.uid && (!!patientId || user.role === UserType.PATIENT)
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
      if (!user?.uid) throw new AuthError('User not authenticated');
      
      // Add the proper context to the API call
      return callApi('updateMyUserProfile', {
        uid: user.uid,
        role: UserType.PATIENT
      }, data);
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
      if (!user?.uid) throw new AuthError('User not authenticated');
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
        throw new AuthError('User not authenticated');
      }
      
      // Create the context object
      const context = {
        uid: user.uid,
        role: UserType.PATIENT
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
  const user = useAuth().user;
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ appointmentId, reason }: { appointmentId: string; reason?: string }) => {
      if (!user) {
        throw new AuthError('User not authenticated');
      }
      
      // Create the context object separate from the data payload
      const context = {
        uid: user.uid,
        role: UserType.PATIENT
      };
      
      // Pass context as first argument and data as second argument
      return await callApi('cancelAppointment', context, { appointmentId, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
} 