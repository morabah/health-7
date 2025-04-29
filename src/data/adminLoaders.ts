import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callApi } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import type { VerificationStatus, AccountStatus } from '@/types/enums';
import { UserType, VerificationStatus as VerificationStatusEnum } from '@/types/enums';
import type { DoctorProfile } from '@/types/schemas';
import { logInfo } from '@/lib/logger';

/**
 * Hook to fetch all users
 */
export const useAllUsers = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new Error('Unauthorized');
      }
      
      return callApi('adminGetAllUsers', {
        uid: user.uid,
        role: UserType.ADMIN
      });
    },
    enabled: !!user && user.role === UserType.ADMIN
  });
};

/**
 * Hook to fetch all patients
 */
export const useAllPatients = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['admin', 'patients'],
    queryFn: async () => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new Error('Unauthorized');
      }
      
      const response = await callApi('adminGetAllUsers', {
        uid: user.uid,
        role: UserType.ADMIN
      });
      
      // Filter for patients only
      return {
        ...response,
        users: response.users.filter((u: {role: string}) => u.role === UserType.PATIENT)
      };
    },
    enabled: !!user && user.role === UserType.ADMIN
  });
};

/**
 * Hook to fetch all doctors
 */
export const useAllDoctors = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['admin', 'doctors'],
    queryFn: async () => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new Error('Unauthorized');
      }
      
      return callApi('adminGetAllDoctors', {
        uid: user.uid,
        role: UserType.ADMIN
      });
    },
    enabled: !!user && user.role === UserType.ADMIN
  });
};

/**
 * Hook to fetch all appointments
 */
export const useAllAppointments = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['admin', 'appointments'],
    queryFn: async () => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new Error('Unauthorized');
      }
      
      return callApi('adminGetAllAppointments', {
        uid: user.uid,
        role: UserType.ADMIN
      });
    },
    enabled: !!user && user.role === UserType.ADMIN
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
        throw new Error('Unauthorized');
      }
      
      return callApi('adminGetUserDetail', {
        uid: user.uid,
        role: UserType.ADMIN,
        userId
      });
    },
    enabled: !!user && user.role === UserType.ADMIN && !!userId
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
      notes 
    }: { 
      doctorId: string; 
      status: VerificationStatus; 
      notes?: string 
    }) => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new Error('Unauthorized');
      }
      return callApi('adminVerifyDoctor', {
        uid: user.uid,
        role: UserType.ADMIN,
        doctorId,
        status,
        notes
      });
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
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
      reason 
    }: { 
      userId: string; 
      status: AccountStatus; 
      reason?: string 
    }) => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new Error('Unauthorized');
      }
      return callApi('adminUpdateUserStatus', {
        uid: user.uid,
        role: UserType.ADMIN,
        userId,
        status,
        reason
      });
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'patients'] });
    }
  });
};

/**
 * Hook to fetch pending doctor verifications
 */
export const useAdminGetPendingDoctors = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['admin', 'pendingDoctors'],
    queryFn: async () => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new Error('Unauthorized');
      }
      
      const response = await callApi('adminGetAllDoctors', {
        uid: user.uid,
        role: UserType.ADMIN
      });
      
      // Filter for pending doctors only
      if (response.success) {
        return {
          ...response,
          doctors: response.doctors.filter((doctor: DoctorProfile) => 
            doctor.verificationStatus === VerificationStatusEnum.PENDING
          )
        };
      }
      
      return response;
    },
    enabled: !!user && user.role === UserType.ADMIN
  });
};

/**
 * Hook to get appointment details by ID for admin
 */
export function useAppointmentDetails(appointmentId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['admin', 'appointment', appointmentId],
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
 * Hook to get all appointments for admin
 */
export function useAdminAppointments() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['admin', 'all-appointments'],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      return await callApi('getMyAppointments', {});
    },
    enabled: !!user,
  });
}

/**
 * Hook to get admin dashboard data with all metrics
 */
export const useAdminDashboardData = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new Error('Unauthorized');
      }
      
      return callApi('getMyDashboardStats', {
        uid: user.uid,
        role: UserType.ADMIN
      });
    },
    enabled: !!user && user.role === UserType.ADMIN
  });
};

/**
 * Hook for admin to trigger password reset for user
 */
export const useAdminTriggerPasswordReset = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, notifyUser = true }: { userId: string; notifyUser?: boolean }) => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new Error('Unauthorized');
      }
      
      return callApi('adminTriggerPasswordReset', {
        uid: user.uid,
        role: UserType.ADMIN,
        userId,
        notifyUser
      });
    },
    onSuccess: () => {
      // No need to invalidate queries - password reset doesn't change user data that's displayed
      // But we can log success
      logInfo('Admin triggered password reset successfully');
    }
  });
};