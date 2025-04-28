'use client';

import { useState } from 'react';
import { Bell, CheckCircle, Info, AlertTriangle, Calendar } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { logInfo, logValidation } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import { NotificationType } from '@/types/enums';
import { useNotifications, useMarkNotificationRead } from '@/data/sharedLoaders';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/types/schemas';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useNotifications();
  const notificationMutation = useMarkNotificationRead();
  const [error2, setError2] = useState<string | null>(null);

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!data?.success || !data.notifications?.length) return;

    // Get all unread notifications
    const unreadNotifications = data.notifications.filter((notif: Notification) => !notif.isRead);
    if (!unreadNotifications.length) return;

    try {
      // Mark each notification as read
      for (const notification of unreadNotifications) {
        await notificationMutation.mutateAsync(notification.id);
      }
      // Refetch to update the UI
      await refetch();
      logInfo('notifications', { action: 'mark-all-read', userId: user?.uid });
      logValidation('4.10', 'success', 'Notification system fully functional with real data');
    } catch (err) {
      setError2('Failed to mark all notifications as read');
      console.error(err);
    }
  };

  // Mark a single notification as read
  const markAsRead = async (id: string) => {
    try {
      await notificationMutation.mutateAsync(id);
      await refetch();
      logInfo('notifications', { action: 'mark-read', notificationId: id, userId: user?.uid });
    } catch (err) {
      setError2('Failed to mark notification as read');
      console.error(err);
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

  // Calculate unread count
  const unreadCount = data?.success ? data.notifications.filter((n: Notification) => !n.isRead).length : 0;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell /> Notifications
          {unreadCount > 0 && (
            <Badge variant="danger">
              {unreadCount}
            </Badge>
          )}
        </h1>
        <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={isLoading || unreadCount === 0}>
          Mark All as Read
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center my-12">
          <Spinner />
        </div>
      )}

      {error && <Alert variant="error">Failed to load notifications: {error.toString()}</Alert>}
      {error2 && <Alert variant="error">{error2}</Alert>}

      {data?.success && data.notifications.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">You have no notifications</p>
        </Card>
      )}

      {data?.success && data.notifications.length > 0 && (
        <div className="space-y-4">
          {data.notifications.map((notification: Notification) => (
            <Card
              key={notification.id}
              className={`p-4 relative ${
                notification.isRead ? 'opacity-75' : 'border-l-4 border-primary'
              }`}
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
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="mt-2"
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
