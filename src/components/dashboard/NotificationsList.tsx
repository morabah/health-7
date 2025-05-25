'use client';

import React from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { 
  Bell, 
  Check, 
  Eye, 
  MessageCircle, 
  Calendar, 
  User, 
  AlertCircle 
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { NotificationsListProps, NotificationType } from '@/types/dashboard/dashboard.types';

/**
 * NotificationCard Component
 * Individual notification card with read/unread states and formatting
 */
const NotificationCard = ({ notification }: { notification: NotificationType }) => {
  const getNotificationIcon = (title: string) => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('appointment')) {
      return <Calendar className="h-4 w-4" />;
    } else if (titleLower.includes('message')) {
      return <MessageCircle className="h-4 w-4" />;
    } else if (titleLower.includes('profile')) {
      return <User className="h-4 w-4" />;
    }
    return <Bell className="h-4 w-4" />;
  };

  const formatNotificationDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    
    try {
      const date = parseISO(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInMinutes < 1440) { // Less than 24 hours
        return `${Math.floor(diffInMinutes / 60)}h ago`;
      } else {
        return format(date, 'MMM d');
      }
    } catch (error) {
      console.error('Error formatting notification date:', error);
      return 'Recently';
    }
  };

  return (
    <div className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-sm ${
      notification.isRead 
        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' 
        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start flex-1 min-w-0">
          {/* Icon */}
          <div className={`p-2 rounded-full mr-3 flex-shrink-0 ${
            notification.isRead 
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' 
              : 'bg-primary/10 dark:bg-primary/20 text-primary'
          }`}>
            {getNotificationIcon(notification.title)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className={`text-sm font-medium truncate pr-2 ${
                notification.isRead 
                  ? 'text-slate-700 dark:text-slate-300' 
                  : 'text-slate-900 dark:text-white'
              }`}>
                {notification.title}
              </h4>
              
              {/* Read indicator */}
              {!notification.isRead && (
                <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0"></div>
              )}
            </div>
            
            <p className={`text-sm leading-relaxed ${
              notification.isRead 
                ? 'text-slate-600 dark:text-slate-400' 
                : 'text-slate-700 dark:text-slate-300'
            }`}>
              {notification.message}
            </p>
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-500 dark:text-slate-500">
                {formatNotificationDate(notification.createdAt)}
              </span>
              
              {notification.isRead && (
                <div className="flex items-center text-xs text-slate-400 dark:text-slate-500">
                  <Eye className="h-3 w-3 mr-1" />
                  Read
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * NotificationSkeleton Component
 * Loading skeleton for notifications
 */
const NotificationSkeleton = () => (
  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
    <div className="flex items-start">
      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full mr-3"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      </div>
    </div>
  </div>
);

/**
 * NotificationsList Component
 * 
 * Displays a list of notifications with read/unread states, timestamps,
 * and mark as read functionality.
 * Extracted from the monolithic PatientDashboardPage for better maintainability.
 */
export default function NotificationsList({
  notifications,
  isLoading,
  error,
  maxDisplay = 3,
  unreadCount,
  onMarkAllAsRead,
  markingAllAsRead
}: NotificationsListProps) {
  const displayedNotifications = notifications.slice(0, maxDisplay);

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">
            Unable to Load Notifications
          </h3>
          <p className="text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center">
            <Bell className="text-primary-500 mr-2" size={20} />
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Recent Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 text-xs font-medium rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllAsRead}
                disabled={markingAllAsRead}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {markingAllAsRead ? (
                  <Spinner size="sm" className="mr-1" />
                ) : (
                  <Check size={16} className="mr-1" />
                )}
                Mark all read
              </Button>
            )}
            <Link href="/notifications">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-600 hover:text-primary-700"
              >
                View All
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(maxDisplay)].map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-4">
            {displayedNotifications.map((notification) => (
              <NotificationCard 
                key={notification.id} 
                notification={notification} 
              />
            ))}
            
            {notifications.length > maxDisplay && (
              <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
                <Link href="/notifications">
                  <Button variant="outline" size="sm">
                    View {notifications.length - maxDisplay} more notification{notifications.length - maxDisplay !== 1 ? 's' : ''}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          // Empty state
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No New Notifications
            </h4>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              We'll notify you about important updates and reminders. Stay tuned for appointment confirmations and health tips.
            </p>
          </div>
        )}
      </div>

      {/* Quick stats footer */}
      {notifications.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-3 bg-slate-50 dark:bg-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {notifications.length} total notification{notifications.length !== 1 ? 's' : ''}
            </span>
            {unreadCount > 0 && (
              <span className="flex items-center">
                <div className="h-1.5 w-1.5 bg-primary rounded-full mr-1"></div>
                {unreadCount} unread
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
} 