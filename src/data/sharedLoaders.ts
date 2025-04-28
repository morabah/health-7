'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';
import { z } from 'zod';
import { FindDoctorsSchema, GetAvailableSlotsSchema, BookAppointmentSchema } from '@/types/schemas';

/**
 * Helper function to get user role as UserType
 */
const getUserRole = (role?: string): UserType => {
  if (role === 'admin') return UserType.ADMIN;
  if (role === 'doctor') return UserType.DOCTOR;
  return UserType.PATIENT; // Default
};

/**
 * Hook to fetch the current user's notifications
 */
export const useNotifications = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['notifications', user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('getMyNotifications', { 
        uid: user.uid, 
        role: getUserRole(user.role)
      });
    },
    enabled: !!user?.uid
  });
};

/**
 * Hook to mark a notification as read
 */
export const useMarkNotificationRead = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('markNotificationRead', { 
        uid: user.uid, 
        role: getUserRole(user.role),
        notificationId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

/**
 * Hook to find doctors based on search criteria
 */
export const useFindDoctors = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (searchParams?: { specialty?: string; location?: string; name?: string }) => {
      if (!user?.uid) throw new Error('User not authenticated');
      // Since the actual findDoctors implementation returns empty array, we don't pass searchParams yet
      return callApi('findDoctors', { 
        uid: user.uid, 
        role: getUserRole(user.role)
      });
    }
  });
};

/**
 * Hook to get a doctor's public profile
 */
export const useDoctorProfile = (doctorId: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['doctorProfile', doctorId],
    queryFn: async () => {
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('getDoctorPublicProfile', { 
        uid: user.uid, 
        role: getUserRole(user.role),
        doctorId
      });
    },
    enabled: !!user?.uid && !!doctorId
  });
};

/**
 * Hook to get a doctor's availability
 */
export const useDoctorAvailability = (doctorId: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['doctorAvailability', doctorId],
    queryFn: async () => {
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('getDoctorAvailability', { 
        uid: user.uid, 
        role: getUserRole(user.role),
        doctorId
      });
    },
    enabled: !!user?.uid && !!doctorId
  });
};

/**
 * Hook to get available appointment slots
 */
export const useAvailableSlots = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: { doctorId: string; date: string }) => {
      if (!user?.uid) throw new Error('User not authenticated');
      // Since the actual getAvailableSlots implementation returns empty array, we don't pass all parameters yet
      return callApi('getAvailableSlots', { 
        uid: user.uid, 
        role: getUserRole(user.role)
      });
    }
  });
};

/**
 * Hook to book an appointment
 */
export const useBookAppointment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      doctorId: string;
      appointmentDate: string;
      startTime: string;
      endTime: string;
      reason?: string;
      appointmentType: string;
    }) => {
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('bookAppointment', { 
        uid: user.uid, 
        role: UserType.PATIENT,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}; 