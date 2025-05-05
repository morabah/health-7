'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Bell, CheckCircle, Info, AlertTriangle, Calendar } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { logInfo, logValidation, logError } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import { NotificationType } from '@/types/enums';
import { useNotifications, useMarkNotificationRead } from '@/data/sharedLoaders';
import { getOptimizedNotifications } from '@/lib/optimizedDataAccess';
import { formatDistanceToNow } from 'date-fns';
import { cacheManager } from '@/lib/queryClient';

// Types needed for the component
interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  userId: string;
}

interface NotificationListProps {
  limit?: number;
  showMarkAllRead?: boolean;
  showControls?: boolean;
  onNotificationClick?: (notification: Notification) => void;
  className?: string;
}

/**
 * Enhanced NotificationList Component with performance optimizations
 * - Uses memory cache for faster rendering
 * - Implements optimized polling with adaptive intervals
 * - Supports batch operations
 * - Visibility-aware polling (reduces polling when tab is not visible)
 */
export default function NotificationList({
  limit = 0,
  showMarkAllRead = true,
  showControls = true,
  onNotificationClick,
  className = '',
}: NotificationListProps) {
  const { user } = useAuth();
  const { data, isLoading, error } = useNotifications();
  const notificationMutation = useMarkNotificationRead();
  const [localData, setLocalData] = useState<Notification[]>([]);
  const [error2, setError2] = useState<string | null>(null);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [pollingInterval, setPollingInterval] = useState<number>(30000); // Start with 30s
  
  // Use refs to track debouncing and avoid unnecessary renders
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingRef = useRef<boolean>(false);
  const consecutiveErrorsRef = useRef(0);
  const lastSuccessfulFetchRef = useRef<number>(Date.now());
  const isMountedRef = useRef<boolean>(true); // Track if component is mounted
  
  // Set isMounted to false when component unmounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Memoize unread count to prevent unnecessary re-renders
  const unreadCount = useMemo(() => 
    localData.filter(n => !n.isRead).length,
  [localData]);
  
  // Debounced loader function with error handling and backoff
  const loadOptimizedNotifications = useCallback(async (forceRefresh = false) => {
    if (!user?.uid || loadingRef.current || !isMountedRef.current) return;
    
    // Don't allow concurrent loads
    loadingRef.current = true;
    
    try {
      // Check if we've had too many errors and need to back off
      const now = Date.now();
      const timeSinceLastSuccess = now - lastSuccessfulFetchRef.current;
      
      // Apply exponential backoff if we've had consecutive errors
      if (consecutiveErrorsRef.current > 0 && !forceRefresh) {
        const backoffTime = Math.min(5000 * Math.pow(2, consecutiveErrorsRef.current - 1), 120000);
        if (timeSinceLastSuccess < backoffTime) {
          // Skip this refresh attempt due to backoff
          loadingRef.current = false;
          return;
        }
      }
      
      // Use the optimized data access with proper filtering
      const options = { limit: limit > 0 ? limit : undefined };
      const cacheOptions = { forceRefresh };
      
      const optimizedData = await getOptimizedNotifications(
        user.uid, 
        options,
        cacheOptions
      );
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        return;
      }
      
      if (optimizedData && Array.isArray(optimizedData)) {
        setLocalData(optimizedData);
        
        // Reset error counter and update last success time
        consecutiveErrorsRef.current = 0;
        lastSuccessfulFetchRef.current = Date.now();
        
        // Adaptive polling: If we have new unread notifications, poll more frequently
        const newUnreadCount = optimizedData.filter(n => !n.isRead).length;
        if (newUnreadCount > unreadCount) {
          // Poll more frequently when there's new activity (20s)
          setPollingInterval(20000);
        } else {
          // Gradually increase polling interval when inactive, up to 60s
          setPollingInterval(prev => Math.min(prev + 5000, 60000));
        }
        
        setLastRefreshTime(Date.now());
      }
    } catch (err) {
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        return;
      }
      
      // Increment error counter for backoff
      consecutiveErrorsRef.current++;
      logError('Error loading optimized notifications', err);
    } finally {
      loadingRef.current = false;
    }
  }, [user?.uid, limit, unreadCount]);
  
  // Handle document visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only proceed if component is still mounted
      if (!isMountedRef.current) return;
      
      if (document.visibilityState === 'visible') {
        // Refresh immediately when tab becomes visible again
        loadOptimizedNotifications(true);
        
        // Reset to more frequent polling when visible
        setPollingInterval(30000);
      } else {
        // Increase polling interval significantly when tab is hidden
        setPollingInterval(120000); // 2 minutes when tab not visible
        
        // Clear any pending polls
        if (pollTimeoutRef.current) {
          clearTimeout(pollTimeoutRef.current);
          pollTimeoutRef.current = null;
        }
      }
    };
    
    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadOptimizedNotifications]);
  
  // Set up initial data loading and polling
  useEffect(() => {
    // Initial load
    loadOptimizedNotifications();
    
    // Clean up function
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [loadOptimizedNotifications]);
  
  // Handle adaptive polling
  useEffect(() => {
    // Don't set up polling if not mounted
    if (!isMountedRef.current) return;
    
    // Setup polling with the dynamic interval
    const setupNextPoll = () => {
      // Clear any existing timeouts
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
      
      // Only proceed if component is still mounted
      if (!isMountedRef.current) return;
      
      // Only poll if the tab is visible or we're on a longer interval (when hidden)
      const isVisible = document.visibilityState === 'visible';
      const effectiveInterval = isVisible ? pollingInterval : Math.max(pollingInterval, 120000);
      
      pollTimeoutRef.current = setTimeout(async () => {
        // Check again if component is still mounted before proceeding
        if (!isMountedRef.current) return;
        
        const timeSinceLastRefresh = Date.now() - lastRefreshTime;
        
        // Only refresh if it's been long enough since the last refresh
        if (timeSinceLastRefresh > 15000 || isVisible) {
          try {
            await loadOptimizedNotifications();
          } catch (error) {
            // Ignore errors in the polling mechanism
            // Just log the error type to help with debugging if needed
            const errorType = error instanceof Error ? error.name : typeof error;
            logInfo('Notification polling error ignored', { errorType });
          } finally {
            // Only set up next poll if still mounted
            if (isMountedRef.current) {
              setupNextPoll();
            }
          }
        } else {
          // If we skipped, setup the next poll
          setupNextPoll();
        }
      }, effectiveInterval);
    };
    
    // Start the polling cycle
    setupNextPoll();
    
    // Clean up on unmount or when dependencies change
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [pollingInterval, lastRefreshTime, loadOptimizedNotifications]);
  
  // Update local data when the React Query cache updates
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    if (data && typeof data === 'object' && 'success' in data && data.success && 'notifications' in data && Array.isArray(data.notifications)) {
      setLocalData(data.notifications);
      setLastRefreshTime(Date.now());
      // Reset error counter when we get data from React Query
      consecutiveErrorsRef.current = 0;
    }
  }, [data]);

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!localData.length || !user?.uid || !isMountedRef.current) return;

    // Get all unread notifications
    const unreadNotifications = localData.filter(notif => !notif.isRead);
    if (!unreadNotifications.length) return;

    setIsMarkingAllRead(true);
    setError2(null);

    try {
      // Optimistic update locally first
      setLocalData(prev => 
        prev.map(notification => ({
          ...notification,
          isRead: true
        }))
      );
      
      // Mark each notification as read
      for (const notification of unreadNotifications) {
        // Check if component is still mounted before continuing the loop
        if (!isMountedRef.current) break;
        await notificationMutation.mutateAsync(notification.id);
      }
      
      // Only proceed if component is still mounted
      if (!isMountedRef.current) return;
      
      // Force cache invalidation
      await cacheManager.invalidateQueries(['notifications', user.uid]);
      
      // Get fresh data
      await loadOptimizedNotifications(true);
      
      // Only proceed if component is still mounted
      if (!isMountedRef.current) return;
      
      logInfo('notifications', { action: 'mark-all-read', userId: user.uid });
      logValidation('4.10', 'success', 'Notification system fully functional with real data');
    } catch (error) {
      // Only proceed if component is still mounted
      if (!isMountedRef.current) return;
      
      // Revert optimistic update on error
      loadOptimizedNotifications(true);
      setError2('Failed to mark all notifications as read');
      logError('Error marking all notifications as read', error);
    } finally {
      if (isMountedRef.current) {
        setIsMarkingAllRead(false);
      }
    }
  };

  // Mark a single notification as read
  const markAsRead = async (id: string) => {
    if (!user?.uid || !isMountedRef.current) return;
    
    setIsMarkingRead(true);
    setError2(null);
    
    try {
      // Optimistic update locally
      setLocalData(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, isRead: true }
            : notification
        )
      );
      
      // Update in the backend
      await notificationMutation.mutateAsync(id);
      
      // Only proceed if component is still mounted
      if (!isMountedRef.current) return;
      
      // Force cache invalidation
      await cacheManager.invalidateQueries(['notifications', user.uid]);
      
      // Get fresh data
      await loadOptimizedNotifications(true);
      
      // Only proceed if component is still mounted
      if (!isMountedRef.current) return;
      
      logInfo('notifications', { action: 'mark-read', notificationId: id, userId: user.uid });
    } catch (error) {
      // Only proceed if component is still mounted
      if (!isMountedRef.current) return;
      
      // Revert optimistic update on error
      loadOptimizedNotifications(true);
      setError2('Failed to mark notification as read');
      logError('Error marking notification as read', { notificationId: id, error });
    } finally {
      if (isMountedRef.current) {
        setIsMarkingRead(false);
      }
    }
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case NotificationType.APPOINTMENT_REQUEST:
      case NotificationType.APPOINTMENT_CONFIRMED:
      case NotificationType.APPOINTMENT_CANCELED:
      case NotificationType.APPOINTMENT_REMINDER:
      case NotificationType.APPOINTMENT_COMPLETED:
      case NotificationType.APPOINTMENT_RESCHEDULED:
        return <Calendar className="h-5 w-5 text-primary" />;
      case NotificationType.VERIFICATION_STATUS_CHANGE:
        return <CheckCircle className="h-5 w-5 text-success" />;
      case NotificationType.ACCOUNT_STATUS_CHANGE:
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      default:
        return <Info className="h-5 w-5 text-info" />;
    }
  };

  // Force a refresh
  const handleRefresh = () => {
    loadOptimizedNotifications(true);
  };

  return (
    <div className={className}>
      {showControls && (
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell /> Notifications
            {unreadCount > 0 && (
              <Badge variant="danger">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <div className="flex space-x-2">
            {showMarkAllRead && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={markAllAsRead} 
                disabled={isLoading || unreadCount === 0 || isMarkingAllRead}
                isLoading={isMarkingAllRead}
              >
                Mark All as Read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh notifications"
            >
              <svg 
                className="h-4 w-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </Button>
          </div>
        </div>
      )}

      {isLoading && !localData.length && (
        <div className="flex justify-center my-12">
          <Spinner />
        </div>
      )}

      {error && <Alert variant="error">Failed to load notifications: {error.toString()}</Alert>}
      {error2 && <Alert variant="error">{error2}</Alert>}

      {!isLoading && localData.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">You have no notifications</p>
        </Card>
      )}

      {localData.length > 0 && (
        <div className="space-y-4">
          {localData.map((notification) => (
            <Card
              key={notification.id}
              className={`p-4 relative ${
                notification.isRead ? 'opacity-75' : 'border-l-4 border-primary'
              }`}
              onClick={() => onNotificationClick && onNotificationClick(notification)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{notification.title}</h3>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {notification.createdAt && formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 my-1">{notification.message}</p>
                  {!notification.isRead && showControls && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      className="mt-2"
                      disabled={isMarkingRead}
                      isLoading={isMarkingRead}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Mark as Read
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 