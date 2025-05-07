'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import { AuthError } from '@/lib/errors/errorClasses';
import { ValidationError } from '@/lib/errors/errorClasses';
import { logError } from '@/lib/logger';
import { AppointmentType } from '@/types/enums';

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
      if (!user?.uid) throw new AuthError('User not authenticated');
      return callApi('getMyDashboardStats', {
        uid: user.uid,
        role: getUserRole(user.role),
      });
    },
    enabled: !!user?.uid,
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
      if (!user?.uid) throw new AuthError('User not authenticated');
      return callApi('getMyNotifications', {
        uid: user.uid,
        role: getUserRole(user.role),
      });
    },
    enabled: !!user?.uid,
  });
};

/**
 * Hook to mark a notification as read
 */
export function useMarkNotificationRead() {
  const user = useCurrentUser();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.uid) throw new AuthError('User not authenticated');

      return callApi('markNotificationRead', {
        uid: user.uid,
        role: getUserRole(user.role),
        ...{ notificationId, isRead: true },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
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
      if (!user?.uid) throw new AuthError('User not authenticated');

      // Process each notification sequentially
      for (const id of notificationIds) {
        await callApi('markNotificationRead', {
          uid: user.uid,
          role: getUserRole(user.role),
          ...{ notificationId: id, isRead: true },
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

/**
 * Hook to fetch a doctor's public profile
 */
export function useDoctorProfile(doctorId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: async () => {
      return callApi('getDoctorPublicProfile', 
        user ? { uid: user.uid, role: user.role } : undefined,
        { doctorId }
      );
    },
    enabled: !!doctorId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a doctor's availability
 */
export function useDoctorAvailability(doctorId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['doctorAvailability', doctorId],
    queryFn: async () => {
      return callApi('getDoctorAvailability', 
        user ? { uid: user.uid, role: user.role } : undefined,
        { doctorId }
      );
    },
    enabled: !!doctorId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch available time slots for a doctor on a specific date
 */
export function useAvailableSlots(doctorId: string, date: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['availableSlots', doctorId, date],
    queryFn: async () => {
      return callApi('getAvailableSlots', 
        user ? { uid: user.uid, role: user.role } : undefined,
        { doctorId, date }
      );
    },
    enabled: !!doctorId && !!date,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to find doctors based on search criteria
 */
export function useFindDoctors(searchParams: Record<string, any> = {}) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['findDoctors', searchParams],
    queryFn: async () => {
      return callApi('findDoctors', 
        user ? { uid: user.uid, role: user.role } : undefined,
        searchParams
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Define the appointment payload interface locally since it's not exported from schemas
interface BookAppointmentParams {
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  appointmentType: AppointmentType;
  reason?: string;
}

/**
 * Hook to book an appointment with a doctor
 */
export function useBookAppointment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: BookAppointmentParams) => {
      if (!user?.uid) {
        throw new AuthError('You must be logged in to book an appointment');
      }
      
      // Validate payload
      if (!payload.doctorId || !payload.appointmentDate || !payload.startTime || !payload.endTime) {
        throw new ValidationError('Missing required appointment fields');
      }
      
      return callApi('bookAppointment', 
        { uid: user.uid, role: user.role },
        payload
      );
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error) => {
      logError('Failed to book appointment', { error });
      // Re-throw so UI can handle it
      throw error;
    }
  });
}

/**
 * Hook to send a direct message to another user
 */
export const useDirectMessage = () => {
  const user = useCurrentUser();

  return useMutation({
    mutationFn: async (data: { recipientId: string; message: string; subject?: string }) => {
      if (!user?.uid) throw new AuthError('User not authenticated');
      return callApi('sendDirectMessage', {
        uid: user.uid,
        role: getUserRole(user.role),
        ...data,
      });
    },
    onSuccess: () => {
      // No need to invalidate any queries on the sender's side
    },
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
      if (!user?.uid) throw new AuthError('User not authenticated');
      return callApi('getMyAppointments', {
        uid: user.uid,
        role,
      });
    },
    enabled: !!user?.uid && !!role,
  });
};
