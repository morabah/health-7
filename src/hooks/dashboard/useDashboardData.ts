'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { callApi } from '@/lib/apiClient';
import { logError, logInfo } from '@/lib/logger';
import { 
  UseDashboardDataReturn, 
  DashboardBatchData, 
  UserProfileType, 
  NotificationType, 
  HealthStats,
  defaultHealthStats,
  defaultProgressiveLoadState
} from '@/types/dashboard/dashboard.types';
import type { Appointment } from '@/types/schemas';

/**
 * useDashboardData Hook
 * 
 * Manages all dashboard data loading including user profile, notifications,
 * appointments, and health statistics with progressive loading support.
 * Extracted from the monolithic PatientDashboardPage for better reusability.
 */
export default function useDashboardData(): UseDashboardDataReturn {
  const { user } = useAuth();
  
  // State management
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [healthStats, setHealthStats] = useState<HealthStats>(defaultHealthStats);
  const [isLoading, setIsLoading] = useState(true);
  const [progressiveLoad, setProgressiveLoad] = useState(defaultProgressiveLoadState);
  const [errors, setErrors] = useState<{
    profile?: string | null;
    notifications?: string | null;
    appointments?: string | null;
    stats?: string | null;
  }>({});

  /**
   * Process batch data from API calls
   */
  const processDashboardData = useCallback((batchData: DashboardBatchData) => {
    // Process user profile
    if (batchData.userProfile?.success && batchData.userProfile.userProfile) {
      setProfile(batchData.userProfile.userProfile);
      setProgressiveLoad(prev => ({ ...prev, profile: true }));
      setErrors(prev => ({ ...prev, profile: null }));
    } else if (batchData.userProfile?.error) {
      setErrors(prev => ({ ...prev, profile: batchData.userProfile?.error || 'Failed to load profile' }));
      setProgressiveLoad(prev => ({ ...prev, profile: true }));
    }

    // Process notifications
    if (batchData.notifications?.success && batchData.notifications.notifications) {
      setNotifications(batchData.notifications.notifications);
      setProgressiveLoad(prev => ({ ...prev, notifications: true }));
      setErrors(prev => ({ ...prev, notifications: null }));
    } else if (batchData.notifications?.error) {
      setErrors(prev => ({ ...prev, notifications: batchData.notifications?.error || 'Failed to load notifications' }));
      setProgressiveLoad(prev => ({ ...prev, notifications: true }));
    }

    // Process appointments
    if (batchData.upcomingAppointments?.success && batchData.upcomingAppointments.appointments) {
      const upcoming = batchData.upcomingAppointments.appointments.filter(apt => {
        const appointmentDate = new Date(apt.appointmentDate);
        return appointmentDate >= new Date() && apt.status !== 'completed' && apt.status !== 'canceled';
      });
      setUpcomingAppointments(upcoming);
      setProgressiveLoad(prev => ({ ...prev, appointments: true }));
      setErrors(prev => ({ ...prev, appointments: null }));
    } else if (batchData.upcomingAppointments?.error) {
      setErrors(prev => ({ ...prev, appointments: batchData.upcomingAppointments?.error || 'Failed to load appointments' }));
      setProgressiveLoad(prev => ({ ...prev, appointments: true }));
    }

    // Process health stats
    if (batchData.stats?.success) {
      const newStats: HealthStats = {
        upcomingAppointments: batchData.stats.upcomingCount || 0,
        pastAppointments: batchData.stats.pastCount || 0,
        completedCheckups: Math.floor(Math.random() * 4), // Simulated data
        medications: Math.floor(Math.random() * 5) // Simulated data
      };
      setHealthStats(newStats);
      setProgressiveLoad(prev => ({ ...prev, stats: true }));
      setErrors(prev => ({ ...prev, stats: null }));
    } else if (batchData.stats?.error) {
      setErrors(prev => ({ ...prev, stats: batchData.stats?.error || 'Failed to load health stats' }));
      setProgressiveLoad(prev => ({ ...prev, stats: true }));
    }

    // Mark reminders as loaded once we have stats and appointments
    if (batchData.stats && batchData.upcomingAppointments) {
      setProgressiveLoad(prev => ({ ...prev, reminders: true }));
    }
  }, []);

  /**
   * Load dashboard data with batch API calls
   */
  const loadDashboardData = useCallback(async () => {
    if (!user?.uid) {
      logError('useDashboardData', 'No user ID available for dashboard data loading');
      setIsLoading(false);
      return;
    }

    try {
      logInfo('useDashboardData', `Loading dashboard data for user: ${user.uid}`);
      setIsLoading(true);

      // Execute batch API calls
      const [profileResponse, notificationsResponse, appointmentsResponse, statsResponse] = await Promise.allSettled([
        // Load user profile
        callApi('/api/localApi', {
          method: 'POST',
          body: JSON.stringify({
            action: 'getUserProfile',
            userId: user.uid
          })
        }),
        
        // Load notifications
        callApi('/api/localApi', {
          method: 'POST',
          body: JSON.stringify({
            action: 'getNotifications',
            userId: user.uid
          })
        }),
        
        // Load upcoming appointments
        callApi('/api/localApi', {
          method: 'POST',
          body: JSON.stringify({
            action: 'getPatientAppointments',
            patientId: user.uid
          })
        }),
        
        // Load dashboard stats
        callApi('/api/localApi', {
          method: 'POST',
          body: JSON.stringify({
            action: 'getDashboardStats',
            userId: user.uid
          })
        })
      ]);

      // Process results
      const batchData: DashboardBatchData = {
        userProfile: profileResponse.status === 'fulfilled' ? profileResponse.value as any : { success: false, error: 'Failed to load profile' },
        notifications: notificationsResponse.status === 'fulfilled' ? notificationsResponse.value as any : { success: false, error: 'Failed to load notifications' },
        upcomingAppointments: appointmentsResponse.status === 'fulfilled' ? appointmentsResponse.value as any : { success: false, error: 'Failed to load appointments' },
        stats: statsResponse.status === 'fulfilled' ? statsResponse.value as any : { success: false, error: 'Failed to load stats' }
      };

      processDashboardData(batchData);
      logInfo('useDashboardData', 'Dashboard data loaded successfully');

    } catch (error) {
      logError('useDashboardData', `Error loading dashboard data: ${error}`);
      setErrors({
        profile: 'Failed to load dashboard data',
        notifications: 'Failed to load dashboard data',
        appointments: 'Failed to load dashboard data',
        stats: 'Failed to load dashboard data'
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, processDashboardData]);

  /**
   * Refetch dashboard data
   */
  const refetch = useCallback(() => {
    setProgressiveLoad(defaultProgressiveLoadState);
    setErrors({});
    loadDashboardData();
  }, [loadDashboardData]);

  /**
   * Load data on mount and user change
   */
  useEffect(() => {
    if (user?.uid) {
      loadDashboardData();
    }
  }, [user?.uid, loadDashboardData]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      setProfile(null);
      setNotifications([]);
      setUpcomingAppointments([]);
      setHealthStats(defaultHealthStats);
      setProgressiveLoad(defaultProgressiveLoadState);
      setErrors({});
    };
  }, []);

  return {
    profile,
    notifications,
    upcomingAppointments,
    healthStats,
    isLoading,
    errors,
    refetch,
    progressiveLoad
  };
} 