'use client';

/**
 * Dashboard Data Loaders
 * 
 * Provides hooks for loading dashboard data efficiently using
 * batched API calls to improve performance.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { executeBatchOperations, createBatchOperation } from '@/lib/batchApiUtils';
import { UserType } from '@/types/enums';
import { logInfo } from '@/lib/logger';
import { useEffect } from 'react';

/**
 * Hook to fetch all dashboard data in a single batch request
 * based on the user's role.
 */
export function useDashboardBatch() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['dashboardBatch', user?.uid, user?.role],
    queryFn: async () => {
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }
      
      // Create operations array based on user role
      const operations = buildDashboardOperations(user.role);
      
      logInfo('Fetching dashboard data in batch', { 
        role: user.role,
        operationCount: operations.length
      });
      
      return executeBatchOperations(operations, { uid: user.uid, role: user.role });
    },
    enabled: !!user?.uid,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false
  });
}

/**
 * Build the appropriate operations for the user's role
 */
function buildDashboardOperations(role: string): Array<ReturnType<typeof createBatchOperation>> {
  // Common operations for all users
  const operations = [
    createBatchOperation('getMyUserProfile', {}, 'userProfile'),
    createBatchOperation('getMyNotifications', { limit: 5, unreadOnly: true }, 'notifications')
  ];
  
  // Add role-specific operations
  if (role === UserType.PATIENT) {
    operations.push(
      createBatchOperation('getMyAppointments', { status: 'upcoming', limit: 5 }, 'upcomingAppointments'),
      createBatchOperation('getMyDashboardStats', {}, 'stats')
    );
  } else if (role === UserType.DOCTOR) {
    operations.push(
      createBatchOperation('getMyAppointments', { status: 'today', limit: 10 }, 'todayAppointments'),
      createBatchOperation('getMyAppointments', { status: 'upcoming', limit: 10 }, 'upcomingAppointments'),
      createBatchOperation('getDoctorAvailability', {}, 'availability'),
      createBatchOperation('getMyDashboardStats', {}, 'stats')
    );
  } else if (role === UserType.ADMIN) {
    operations.push(
      createBatchOperation('adminGetDashboardData', {}, 'adminStats'),
      createBatchOperation('adminGetAllUsers', { limit: 100, page: 1 }, 'allUsers'),
      createBatchOperation('adminGetAllDoctors', { limit: 100, page: 1 }, 'allDoctors'),
      createBatchOperation('adminGetAllAppointments', { limit: 100, page: 1 }, 'allAppointments'),
      createBatchOperation('adminGetAllDoctors', { 
        limit: 5, 
        verificationStatus: 'pending' 
      }, 'pendingDoctors')
    );
  }
  
  return operations;
}

/**
 * Hook to update React Query cache with data from batch response
 */
export function useBatchResultsCache(batchData: any) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!batchData || !batchData.data || !batchData.data.success) return;
    
    const results = batchData.data.results || batchData.data; // Adapt to actual structure

    // For each category in the batch results, update the corresponding query cache
    if (results.userProfile && results.userProfile.success) {
      queryClient.setQueryData(['userProfile'], results.userProfile);
    }
    
    if (results.notifications && results.notifications.success) {
      queryClient.setQueryData(['notifications'], results.notifications);
    }
    
    if (results.upcomingAppointments && results.upcomingAppointments.success) {
      queryClient.setQueryData(['appointments', 'upcoming'], results.upcomingAppointments);
    }
    
    if (results.todayAppointments && results.todayAppointments.success) {
      queryClient.setQueryData(['appointments', 'today'], results.todayAppointments);
    }
    
    if (results.pendingDoctors && results.pendingDoctors.success) {
      queryClient.setQueryData(['admin', 'doctors', { verificationStatus: 'pending' }], 
        results.pendingDoctors);
    }
    
    if (results.adminStats && results.adminStats.success) {
      queryClient.setQueryData(['admin', 'dashboardStats'], results.adminStats); // Updated key for consistency
    }

    // Added for new admin data
    if (results.allUsers && results.allUsers.success) {
      queryClient.setQueryData(['admin', 'users', 'all'], results.allUsers);
    }

    if (results.allDoctors && results.allDoctors.success) {
      queryClient.setQueryData(['admin', 'doctors', 'all'], results.allDoctors);
    }

    if (results.allAppointments && results.allAppointments.success) {
      queryClient.setQueryData(['admin', 'appointments', 'all'], results.allAppointments);
    }

  }, [batchData, queryClient]);
} 