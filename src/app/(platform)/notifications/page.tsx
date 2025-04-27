'use client';

import { useState } from 'react';
import { Bell, CheckCircle, Trash } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { logInfo } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';

// Sample notification data
const initialNotifications = [
  {
    id: 'notif-1',
    title: 'Appointment Reminder',
    message: 'You have an appointment scheduled for tomorrow at 10:00 AM.',
    timestamp: '2023-12-15T10:30:00.000Z',
    isRead: false,
    type: 'appointment'
  },
  {
    id: 'notif-2',
    title: 'Profile Updated',
    message: 'Your profile information has been successfully updated.',
    timestamp: '2023-12-14T15:45:00.000Z',
    isRead: true,
    type: 'system'
  }
];

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(initialNotifications);
  
  // Mark all notifications as read
  const markAllAsRead = () => {
    logInfo('notifications', { action: 'mark-all-read', userId: user?.id });
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };
  
  // Mark a single notification as read
  const markAsRead = (id: string) => {
    logInfo('notifications', { action: 'mark-read', notificationId: id, userId: user?.id });
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };
  
  // Delete a notification
  const deleteNotification = (id: string) => {
    logInfo('notifications', { action: 'delete', notificationId: id, userId: user?.id });
    setNotifications(prev => 
      prev.filter(notif => notif.id !== id)
    );
  };
  
  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center">
          <Bell className="mr-2 h-6 w-6 text-primary" /> 
          Notifications
          {unreadCount > 0 && (
            <Badge variant="danger" className="ml-2">
              {unreadCount} unread
            </Badge>
          )}
        </h1>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Mark All as Read
        </Button>
      </div>
      
      {notifications.length === 0 ? (
        <Card className="p-8 text-center">
          <Bell className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400">
            You don't have any notifications.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map(notification => (
            <Card 
              key={notification.id}
              className={`p-4 transition-colors ${
                !notification.isRead ? 'border-l-4 border-l-primary' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{notification.title}</h3>
                    {!notification.isRead && (
                      <Badge variant="info" className="text-xs px-2 py-0.5">New</Badge>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    {notification.message}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  {!notification.isRead && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    <Trash className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 