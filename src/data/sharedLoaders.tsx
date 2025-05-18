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
import type { Appointment } from '@/types/schemas'; // Import Appointment type
import { CACHE_DURATIONS } from '@/lib/cacheDurations';

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
    staleTime: CACHE_DURATIONS.DASHBOARD, // 5 minutes for dashboard data
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
    staleTime: CACHE_DURATIONS.NOTIFICATIONS, // 1 minute for notifications (more volatile)
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
      return callApi(
        'getDoctorPublicProfile',
        user ? { uid: user.uid, role: user.role } : undefined,
        { doctorId }
      );
    },
    enabled: !!doctorId,
    staleTime: CACHE_DURATIONS.DOCTOR_PROFILE, // 5 minutes for doctor profiles
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
      return callApi(
        'getDoctorAvailability',
        user ? { uid: user.uid, role: user.role } : undefined,
        { doctorId }
      );
    },
    enabled: !!doctorId,
    staleTime: CACHE_DURATIONS.DOCTOR_AVAILABILITY, // 2 minutes for doctor availability
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
      return callApi('getAvailableSlots', user ? { uid: user.uid, role: user.role } : undefined, {
        doctorId,
        date,
      });
    },
    enabled: !!doctorId && !!date,
    staleTime: CACHE_DURATIONS.AVAILABLE_SLOTS, // 1 minute for available slots
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
      return callApi(
        'findDoctors',
        user ? { uid: user.uid, role: user.role } : undefined,
        searchParams
      );
    },
    staleTime: CACHE_DURATIONS.SEARCH_RESULTS, // 5 minutes for search results
  });
}

// Define interfaces needed for cache update
interface BookAppointmentParams {
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: AppointmentType;
  notes?: string;
}

interface BookAppointmentApiResponse {
  success: boolean;
  appointment?: Appointment;
  error?: string;
}

// Assuming AppointmentsResponse is defined somewhere accessible or define it here
interface AppointmentsResponse {
  success: boolean;
  error?: string;
  appointments?: Appointment[];
}

/**
 * Hook to book an appointment with a doctor
 */
export function useBookAppointment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<BookAppointmentApiResponse, Error, BookAppointmentParams>({
    mutationFn: async (params: BookAppointmentParams) => {
      if (!user?.uid) {
        throw new AuthError('You must be logged in to book an appointment');
      }

      // Validate required fields
      const { doctorId, appointmentDate, appointmentTime, appointmentType } = params;
      if (!doctorId || !appointmentDate || !appointmentTime || !appointmentType) {
        throw new ValidationError('Missing required appointment information', {
          validationErrors: {
            doctorId: !doctorId ? ['Doctor is required'] : [],
            appointmentDate: !appointmentDate ? ['Date is required'] : [],
            appointmentTime: !appointmentTime ? ['Time is required'] : [],
            appointmentType: !appointmentType ? ['Appointment type is required'] : [],
          },
        });
      }

      try {
        // Call the API to book the appointment
        const result = await callApi<BookAppointmentApiResponse>(
          'bookAppointment',
          { uid: user.uid, role: user.role },
          params
        );

        return result;
      } catch (error) {
        logError('Error booking appointment', { error, params });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['availableSlots', variables.doctorId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      // If we have the appointment data, update the cache directly
      if (data.appointment) {
        // Get existing appointments data from cache if available
        const existingData = queryClient.getQueryData<AppointmentsResponse>([
          'appointments',
          user?.uid,
          'patient',
        ]);

        if (existingData?.appointments) {
          // Update the cache with the new appointment
          queryClient.setQueryData(['appointments', user?.uid, 'patient'], {
            ...existingData,
            appointments: [...existingData.appointments, data.appointment],
          });
        }
      }
    },
  });
}

/**
 * Hook to send a direct message to another user
 */
export function useDirectMessage() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      recipientId,
      message,
    }: {
      recipientId: string;
      message: string;
    }) => {
      if (!user?.uid) throw new AuthError('User not authenticated');

      return callApi('sendDirectMessage', { uid: user.uid, role: user.role }, { recipientId, message });
    },
  });
}

/**
 * Generic hook to fetch appointments for the current user (patient or doctor)
 * @param role UserType.PATIENT or UserType.DOCTOR
 */
export function useMyAppointments(role: UserType) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['appointments', user?.uid, role],
    queryFn: async () => {
      if (!user?.uid) throw new AuthError('User not authenticated');
      return callApi('getMyAppointments', { uid: user.uid, role });
    },
    enabled: !!user?.uid,
    staleTime: CACHE_DURATIONS.APPOINTMENTS_UPCOMING, // 5 minutes for appointments
  });
}
