'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, CheckCircle, Calendar, AlertTriangle, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { getOptimizedNotifications } from '@/lib/optimizedDataAccess';
import { formatDistanceToNow } from 'date-fns';
import { NotificationType } from '@/types/enums';
import { logInfo, logError } from '@/lib/logger';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  userId: string;
}

interface NotificationPanelProps {
  maxHeight?: string;
  onClose?: () => void;
}

/**
 * Compact notification panel for headers and sidebars
 * Uses optimized data loading with memory caching
 */
export default function NotificationPanel({ 
  maxHeight = '400px',
  onClose 
}: NotificationPanelProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Get unread count for badge
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  // Function to load optimized notifications
  const loadNotifications = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      
      // Load only the most recent notifications (limit to 5)
      const options = { limit: 5, sortBy: 'createdAt', sortOrder: 'desc' as const };
      
      // Use optimized data access with memory caching
      const result = await getOptimizedNotifications(user.uid, options);
      
      if (Array.isArray(result)) {
        setNotifications(result);
      }
    } catch (err) {
      setError('Failed to load notifications');
      logError('Error loading notifications for panel', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);
  
  // Load notifications on mount and when user changes
  useEffect(() => {
    loadNotifications();
    
    // Set up a simple refresh timer for every 60 seconds
    // Less aggressive than the main notification list since this is a compact view
    const timerId = setInterval(() => {
      loadNotifications();
    }, 60000);
    
    return () => clearInterval(timerId);
  }, [loadNotifications]);
  
  // Navigate to notifications page
  const handleViewAll = () => {
    if (onClose) onClose();
    router.push('/notifications');
  };
  
  // Navigate to specific notification
  const handleNotificationClick = (notification: Notification) => {
    if (onClose) onClose();
    
    // Handle different notification types with different routes
    switch (notification.type) {
      case NotificationType.APPOINTMENT_REQUEST:
      case NotificationType.APPOINTMENT_CONFIRMED:
      case NotificationType.APPOINTMENT_CANCELED:
      case NotificationType.APPOINTMENT_REMINDER:
      case NotificationType.APPOINTMENT_COMPLETED:
      case NotificationType.APPOINTMENT_RESCHEDULED:
        // For appointment-related notifications, go to appointments page
        router.push(user?.role === 'doctor' ? '/doctor/appointments' : '/patient/appointments');
        break;
        
      case NotificationType.VERIFICATION_STATUS_CHANGE:
        // For verification status changes, go to profile
        router.push(user?.role === 'doctor' ? '/doctor/profile' : '/patient/profile');
        break;
        
      case NotificationType.ACCOUNT_STATUS_CHANGE:
        // For account status changes, go to profile
        router.push(user?.role === 'doctor' ? '/doctor/profile' : '/patient/profile');
        break;
        
      case NotificationType.NEW_MESSAGE:
        // For messages, go to messages page
        router.push('/messages');
        break;
        
      default:
        // For all other notification types, go to notifications page
        router.push('/notifications');
        break;
    }
    
    logInfo('notification-panel', { 
      action: 'notification-clicked', 
      notificationId: notification.id,
      notificationType: notification.type,
      routeTarget: getRouteForNotificationType(notification.type, user?.role || 'patient')
    });
  };
  
  // Helper function to get the appropriate route for a notification type
  const getRouteForNotificationType = (type: string, userRole: string): string => {
    switch (type) {
      case NotificationType.APPOINTMENT_REQUEST:
      case NotificationType.APPOINTMENT_CONFIRMED:
      case NotificationType.APPOINTMENT_CANCELED:
      case NotificationType.APPOINTMENT_REMINDER:
      case NotificationType.APPOINTMENT_COMPLETED:
      case NotificationType.APPOINTMENT_RESCHEDULED:
        return userRole === 'doctor' ? '/doctor/appointments' : '/patient/appointments';
        
      case NotificationType.VERIFICATION_STATUS_CHANGE:
      case NotificationType.ACCOUNT_STATUS_CHANGE:
        return userRole === 'doctor' ? '/doctor/profile' : '/patient/profile';
        
      case NotificationType.NEW_MESSAGE:
        return '/messages';
        
      default:
        return '/notifications';
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
        return <Calendar className="h-4 w-4 text-primary" />;
      case NotificationType.VERIFICATION_STATUS_CHANGE:
        return <CheckCircle className="h-4 w-4 text-success" />;
      case NotificationType.ACCOUNT_STATUS_CHANGE:
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Info className="h-4 w-4 text-info" />;
    }
  };
  
  return (
    <div className="w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="danger">{unreadCount}</Badge>
          )}
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close notifications"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="w-4 h-4" />
        </div>
      ) : error ? (
        <div className="text-center py-4 text-red-500">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No notifications
        </div>
      ) : (
        <div 
          className="overflow-y-auto space-y-2"
          style={{ maxHeight }}
        >
          {notifications.map(notification => (
            <div 
              key={notification.id}
              className={`p-3 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                notification.isRead ? 'opacity-75' : 'border-l-4 border-primary'
              }`}
              onClick={() => handleNotificationClick(notification)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNotificationClick(notification);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Notification: ${notification.title}`}
            >
              <div className="flex gap-2">
                <div className="mt-1 flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div>
                  <h4 className="text-sm font-medium leading-tight">
                    {notification.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    {notification.createdAt && formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full"
          onClick={handleViewAll}
        >
          View All Notifications
        </Button>
      </div>
    </div>
  );
} 