import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callApi } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { VerificationStatus, AccountStatus } from '@/types/enums';
import { UserType, VerificationStatus as VerificationStatusEnum } from '@/types/enums';
import type { DoctorProfile } from '@/types/schemas';
import { logInfo } from '@/lib/logger';
import { UnauthorizedError, AuthError } from '@/lib/errors/errorClasses';
import { useMemo } from 'react';
import { useBatchDoctorData } from '@/data/doctorLoaders';
import { z } from 'zod';
import { UserProfileSchema, DoctorProfileSchema } from '@/types/schemas';
import type { Appointment } from '@/types/schemas';

// Define expected API response structure for adminGetAllUsers
interface AdminGetAllUsersPayload {
  page?: number;
  limit?: number;
  filter?: string; // Changed from search to filter to match schema
  status?: 'active' | 'inactive' | 'all'; // Use string literals instead of AccountStatus
  userType?: UserType;
}

// Use the UserProfile type which includes id, and add accountStatus
export type AdminUserListItem = z.infer<typeof UserProfileSchema> & { 
  id: string; 
  accountStatus: AccountStatus; 
};

interface AdminGetAllUsersResponse {
  success: boolean;
  users: AdminUserListItem[];
  totalCount: number;
  error?: string;
}

// Define payload/response for adminGetAllDoctors
interface AdminGetAllDoctorsPayload {
  page?: number;
  limit?: number;
  filter?: string; // Search query
  verificationStatus?: VerificationStatus;
}

interface AdminGetAllDoctorsResponse {
  success: boolean;
  doctors: (z.infer<typeof DoctorProfileSchema> & {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  })[];
  totalCount: number;
  error?: string;
}

// Define payload/response for adminGetAllAppointments
interface AdminGetAllAppointmentsPayload {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  doctorId?: string;
  patientId?: string;
}

interface AdminGetAllAppointmentsResponse {
  success: boolean;
  appointments: Appointment[];
  totalCount: number;
  error?: string;
}

/**
 * Hook to fetch all users with filtering and pagination
 * @param payload - Filters and pagination options
 */
export const useAllUsers = (payload: AdminGetAllUsersPayload = {}) => {
  const { user } = useAuth();

  const queryKey = ['admin', 'users', payload];

  return useQuery<AdminGetAllUsersResponse, Error>({
    queryKey,
    queryFn: async () => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new UnauthorizedError('Only administrators can access user management');
      }

      // Transform the payload to match the expected schema
      const apiPayload = {
        ...payload,
        // Convert AccountStatus to expected string format if needed
        status: payload.status === 'all' ? undefined : payload.status,
      };

      // Assuming callApi returns users matching UserProfileSchema and an id field
      const response = await callApi<{ success: boolean; users: (z.infer<typeof UserProfileSchema> & { id: string })[]; totalCount: number; error?: string }>(
        'adminGetAllUsers',
        {
          uid: user.uid,
          role: UserType.ADMIN,
        },
        apiPayload 
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch users');
      }

      // Manually map isActive to accountStatus and ensure id is present
      const processedUsers: AdminUserListItem[] = response.users.map(u => ({
        ...u, // Spreads properties from UserProfileSchema and the id
        accountStatus: u.isActive ? AccountStatus.ACTIVE : AccountStatus.DEACTIVATED, // Derive accountStatus
      }));

      return {
        ...response,
        users: processedUsers,
      };
    },
    enabled: !!user && user.role === UserType.ADMIN,
  });
};

/**
 * Hook to fetch all patients (uses useAllUsers with filter)
 */
export const useAllPatients = (payload: Omit<AdminGetAllUsersPayload, 'userType'> = {}) => {
  // Force userType filter and pass through other filters/pagination
  return useAllUsers({ ...payload, userType: UserType.PATIENT });
};

/**
 * Hook to fetch all doctors with filtering and pagination
 */
export const useAllDoctors = (payload: AdminGetAllDoctorsPayload = {}) => {
  const { user } = useAuth();
  const queryKey = ['admin', 'doctors', payload];

  return useQuery<AdminGetAllDoctorsResponse, Error>({
    // Specify return type
    queryKey,
    queryFn: async () => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new UnauthorizedError('Only administrators can access doctor records');
      }

      // Pass payload to the API call
      return callApi<AdminGetAllDoctorsResponse>(
        'adminGetAllDoctors',
        {
          uid: user.uid,
          role: UserType.ADMIN,
        },
        payload
      );
    },
    enabled: !!user && user.role === UserType.ADMIN,
  });
};

/**
 * Hook to fetch all appointments
 */
export const useAllAppointments = (payload: AdminGetAllAppointmentsPayload = {}) => {
  const { user } = useAuth();
  const queryKey = ['admin', 'appointments', payload];

  return useQuery<AdminGetAllAppointmentsResponse, Error>({
    queryKey,
    queryFn: async () => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new UnauthorizedError('Only administrators can access all appointments');
      }

      return callApi<AdminGetAllAppointmentsResponse>(
        'adminGetAllAppointments',
        {
          uid: user.uid,
          role: UserType.ADMIN,
        },
        payload
      );
    },
    enabled: !!user && user.role === UserType.ADMIN,
  });
};

/**
 * Hook to fetch a specific user's details
 */
export const useUserDetail = (userId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin', 'userDetail', userId],
    queryFn: async () => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new UnauthorizedError('Only administrators can access user details');
      }

      return callApi('adminGetUserDetail', {
        uid: user.uid,
        role: UserType.ADMIN,
        userId,
      });
    },
    enabled: !!user && user.role === UserType.ADMIN && !!userId,
  });
};

/**
 * Hook for admin to verify a doctor
 */
export const useVerifyDoctor = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      doctorId,
      status,
      notes,
    }: {
      doctorId: string;
      status: VerificationStatus;
      notes?: string;
    }) => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new UnauthorizedError('Only administrators can verify doctors');
      }
      return callApi('adminVerifyDoctor', {
        uid: user.uid,
        role: UserType.ADMIN,
        doctorId,
        status,
        notes,
      });
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

/**
 * Hook for admin to activate/deactivate a user
 */
export const useAdminActivateUser = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      status,
      reason,
    }: {
      userId: string;
      status: AccountStatus;
      reason?: string;
    }) => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new UnauthorizedError('Only administrators can update user status');
      }

      // Create separate context and payload objects
      const ctx = {
        uid: user.uid,
        role: UserType.ADMIN,
      };

      const payload = {
        userId,
        status,
        reason,
      };

      return callApi('adminUpdateUserStatus', ctx, payload);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'patients'] });
    },
  });
};

/**
 * Hook to fetch doctors pending verification (uses useAllDoctors with filter)
 */
export const useAdminGetPendingDoctors = (
  payload: Omit<AdminGetAllDoctorsPayload, 'verificationStatus'> = {}
) => {
  // Force verificationStatus filter and pass through other filters/pagination
  return useAllDoctors({ ...payload, verificationStatus: VerificationStatusEnum.PENDING });
};

/**
 * Hook to fetch a single appointment details - admin version
 */
export function useAppointmentDetails(appointmentId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin', 'appointmentDetail', appointmentId],
    queryFn: async () => {
      if (!user) {
        throw new AuthError('User not authenticated');
      }

      if (user.role !== UserType.ADMIN) {
        throw new UnauthorizedError('Only administrators can access this appointment');
      }

      return await callApi(
        'getAppointmentDetails',
        {
          uid: user.uid,
          role: UserType.ADMIN,
        },
        {
          appointmentId,
        }
      );
    },
    enabled: !!appointmentId && !!user,
  });
}

/**
 * Hook to fetch filtered appointments for the admin dashboard
 */
export function useAdminAppointments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin', 'dashboardAppointments'],
    queryFn: async () => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new UnauthorizedError('Only administrators can access this data');
      }

      return callApi('adminGetAllAppointments', {
        uid: user.uid,
        role: UserType.ADMIN,
      });
    },
    enabled: !!user && user.role === UserType.ADMIN,
  });
}

/**
 * Hook to get admin dashboard summary data
 */
export const useAdminDashboardData = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin', 'dashboardData'],
    queryFn: async () => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new UnauthorizedError('Only administrators can access dashboard data');
      }

      return callApi('adminGetDashboardData', {
        uid: user.uid,
        role: UserType.ADMIN,
      });
    },
    enabled: !!user && user.role === UserType.ADMIN,
  });
};

/**
 * Hook for admin to trigger password reset for a user
 */
export const useAdminTriggerPasswordReset = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, email }: { userId: string; email: string }) => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new UnauthorizedError('Only administrators can reset user passwords');
      }

      return callApi(
        'adminTriggerPasswordReset',
        {
          uid: user.uid,
          role: UserType.ADMIN,
        },
        {
          userId,
          email,
        }
      );
    },
    onSuccess: () => {
      // Invalidate relevant queries if needed
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

/**
 * Hook for admin to update a user's profile
 */
export const useAdminUpdateUserProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      profileData,
    }: {
      userId: string;
      profileData: Record<string, unknown>;
    }) => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new UnauthorizedError('Only administrators can update user profiles');
      }

      // Create context and payload objects
      const context = {
        uid: user.uid,
        role: UserType.ADMIN,
      };

      const payload = {
        userId,
        ...profileData,
      };

      return callApi('adminUpdateUserProfile', context, payload);
    },
    onSuccess: (data, variables) => {
      // Invalidate all potentially affected queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'userDetail', variables.userId] });

      // If it's a doctor, also invalidate doctor-specific queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] });
    },
  });
};

/**
 * Hook to get a single doctor by ID - admin version
 */
export const useDoctorById = (doctorId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin', 'doctor', doctorId],
    queryFn: async () => {
      if (!user) {
        throw new AuthError('User not authenticated');
      }

      if (user.role !== UserType.ADMIN) {
        throw new UnauthorizedError('Only administrators can access this doctor information');
      }

      return callApi('adminGetDoctorById', {
        uid: user.uid,
        role: UserType.ADMIN,
        doctorId,
      });
    },
    enabled: !!user && user.role === UserType.ADMIN && !!doctorId,
  });
};
