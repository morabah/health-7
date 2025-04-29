'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';

/**
 * Helper function to get user role as UserType
 */
const getUserRole = (role?: string): UserType => {
  if (role === 'admin') return UserType.ADMIN;
  if (role === 'doctor') return UserType.DOCTOR;
  return UserType.PATIENT; // Default
};

/**
 * Custom hook to get the current user
 */
const useCurrentUser = () => {
  const { user } = useAuth();
  return user;
};

/**
 * Hook to fetch dashboard stats for the current user
 */
export const useMyDashboard = () => {
  const user = useCurrentUser();
  
  return useQuery({
    queryKey: ['dashboard', user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('getMyDashboardStats', { 
        uid: user.uid, 
        role: getUserRole(user.role)
      });
    },
    enabled: !!user?.uid
  });
};

/**
 * Hook to fetch the current user's notifications
 */
export const useNotifications = () => {
  const user = useCurrentUser();
  
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
export function useMarkNotificationRead() {
  const user = useCurrentUser();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.uid) throw new Error('User not authenticated');
      
      return callApi('markNotificationRead', { 
        uid: user.uid, 
        role: getUserRole(user.role),
        ...{ notificationId, isRead: true }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}

/**
 * Hook to mark all notifications as read
 */
export const useMarkAllNotificationsRead = () => {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      if (!user?.uid) throw new Error('User not authenticated');
      
      // Process each notification sequentially
      for (const id of notificationIds) {
        await callApi('markNotificationRead', { 
          uid: user.uid, 
          role: getUserRole(user.role),
          ...{ notificationId: id, isRead: true }
        });
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

/**
 * Hook to find doctors based on search criteria
 */
export const useFindDoctors = () => {
  const user = useCurrentUser();
  
  return useMutation({
    mutationFn: async (searchParams?: { specialty?: string; location?: string; name?: string }) => {
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('findDoctors', { 
        uid: user.uid, 
        role: getUserRole(user.role),
        ...searchParams
      });
    }
  });
};

/**
 * Hook to get a doctor's public profile
 */
export const useDoctorProfile = (doctorId: string) => {
  const user = useCurrentUser();
  
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
  const user = useCurrentUser();
  
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
  const user = useCurrentUser();
  
  return useMutation({
    mutationFn: async (data: { doctorId: string; date: string }) => {
      if (!user?.uid) throw new Error('User not authenticated');
      // Only pass doctorId and date; context is handled by apiClient
      return callApi('getAvailableSlots', { doctorId: data.doctorId, date: data.date });
    }
  });
};

/**
 * Hook to book an appointment
 */
export const useBookAppointment = () => {
  const user = useCurrentUser();
  
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
      // Only pass booking data; context is handled by apiClient
      return callApi('bookAppointment', { ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

/**
 * Hook to send a direct message to another user
 */
export const useDirectMessage = () => {
  const user = useCurrentUser();
  
  return useMutation({
    mutationFn: async (data: { recipientId: string; message: string; subject?: string }) => {
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('sendDirectMessage', { 
        uid: user.uid, 
        role: getUserRole(user.role),
        ...data
      });
    },
    onSuccess: () => {
      // No need to invalidate any queries on the sender's side
    }
  });
};

/**
 * Generic hook to fetch appointments for the current user (patient or doctor)
 * @param role UserType.PATIENT or UserType.DOCTOR
 */
export const useMyAppointments = (role: UserType) => {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ['myAppointments', user?.uid, role],
    queryFn: async () => {
      if (!user?.uid) throw new Error('User not authenticated');
      return callApi('getMyAppointments', {
        uid: user.uid,
        role,
      });
    },
    enabled: !!user?.uid && !!role,
  });
}; 