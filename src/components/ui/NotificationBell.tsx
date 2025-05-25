'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Clock, AlertCircle } from 'lucide-react';
import { Transition, Menu } from '@headlessui/react';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';
import { callApi } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { logError } from '@/lib/logger';
import enhancedCache, { CacheCategory } from '@/lib/cacheManager';
import type { Notification } from '@/types/schemas';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';

interface NotificationBellProps {
  className?: string;
}

const formatTimeAgo = (timestamp: number): string => {
  try {
    const date = new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return 'unknown time ago';
  }
};

const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const { user, userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const [open, setOpen] = useState(false);

  // Close dropdown when clicked outside
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;

    const cacheKey = `notifications:${user.uid}`;

    // Check cache first
    const cachedData = enhancedCache?.get<{ success: boolean; notifications: Notification[] }>(
      CacheCategory.NOTIFICATIONS,
      cacheKey
    );

    if (cachedData) {
      setNotifications(cachedData.notifications);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Define the expected response type
      interface NotificationResponse {
        success: boolean;
        notifications: Notification[];
      }

      const response = await callApi<NotificationResponse>('getMyNotifications', {
        uid: user.uid,
        role: userProfile?.userType,
      });

      if (isMountedRef.current) {
        if (response && response.success && response.notifications) {
          setNotifications(response.notifications);

          // Cache the result
          enhancedCache?.set(CacheCategory.NOTIFICATIONS, cacheKey, response, {
            ttl: 30000,
            priority: 'normal',
          });
        } else {
          setError('Failed to load notifications');
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError('Could not fetch notifications');
        logError('Error fetching notifications', { error: err });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      await callApi(
        'markNotificationAsRead',
        { uid: user.uid, role: userProfile?.userType },
        { notificationId }
      );

      // Update local state
      if (isMountedRef.current) {
        setNotifications(prevNotifications =>
          prevNotifications.map(notification =>
            notification.id === notificationId ? { ...notification, isRead: true } : notification
          )
        );

        // Also update cache
        const cacheKey = `notifications:${user.uid}`;
        const cachedData = enhancedCache?.get<{ success: boolean; notifications: Notification[] }>(
          CacheCategory.NOTIFICATIONS,
          cacheKey
        );

        if (cachedData) {
          const updatedCache = {
            ...cachedData,
            notifications: cachedData.notifications.map(notification =>
              notification.id === notificationId ? { ...notification, isRead: true } : notification
            ),
          };

          enhancedCache?.set(CacheCategory.NOTIFICATIONS, cacheKey, updatedCache, {
            ttl: 30000,
            priority: 'normal',
          });
        }
      }
    } catch (err) {
      logError('Error marking notification as read', { error: err, notificationId });
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await callApi('markAllNotificationsAsRead', { uid: user.uid, role: userProfile?.userType });

      // Update local state
      if (isMountedRef.current) {
        setNotifications(prevNotifications =>
          prevNotifications.map(notification => ({ ...notification, isRead: true }))
        );

        // Also update cache
        const cacheKey = `notifications:${user.uid}`;
        const cachedData = enhancedCache?.get<{ success: boolean; notifications: Notification[] }>(
          CacheCategory.NOTIFICATIONS,
          cacheKey
        );

        if (cachedData) {
          const updatedCache = {
            ...cachedData,
            notifications: cachedData.notifications.map(notification => ({
              ...notification,
              isRead: true,
            })),
          };

          enhancedCache?.set(CacheCategory.NOTIFICATIONS, cacheKey, updatedCache, {
            ttl: 30000,
            priority: 'normal',
          });
        }
      }
    } catch (err) {
      logError('Error marking all notifications as read', { error: err });
    }
  };

  // Lifecycle setup
  useEffect(() => {
    isMountedRef.current = true;

    if (user) {
      fetchNotifications();

      // Set up polling
      const interval = setInterval(fetchNotifications, 120000); // Every 2 minutes

      return () => {
        isMountedRef.current = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [user]);

  // When opening, fetch fresh notifications
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const toggleNotifications = () => {
    setOpen(!open);
  };

  return (
    <div ref={menuRef} className={twMerge('relative', className)}>
      <Menu as="div" className="relative">
        {({ open }) => (
          <>
            <Menu.Button
              className={clsx(
                'relative p-2 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors',
                open ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
              aria-label="Notifications"
              onClick={toggleNotifications}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                  <Badge variant="danger" size="xs" pill>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                </div>
              )}
            </Menu.Button>

            <Transition
              show={open}
              as="div"
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items
                static
                className="absolute right-0 mt-2 w-80 max-h-[32rem] overflow-hidden origin-top-right rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
              >
                <div className="py-1 bg-white dark:bg-slate-800">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAllAsRead();
                        }}
                        className="text-xs text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[28rem] overflow-y-auto">
                    {loading ? (
                      <div className="px-4 py-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading notifications...</p>
                      </div>
                    ) : error ? (
                      <div className="px-4 py-8 text-center">
                        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                        <p className="mt-2 text-sm text-red-500">{error}</p>
                        <button
                          onClick={fetchNotifications}
                          className="mt-2 text-xs text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          Retry
                        </button>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Bell className="h-8 w-8 text-slate-400 mx-auto" />
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                        {notifications.map((notification) => (
                          <li
                            key={notification.id}
                            className={clsx(
                              'px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors',
                              !notification.isRead && 'bg-blue-50 dark:bg-blue-900/20'
                            )}
                          >
                            <Menu.Item>
                              {({ active }) => (
                                <div
                                  className={`block ${active ? 'bg-slate-100 dark:bg-slate-700' : ''}`}
                                  onClick={() => {
                                    if (!notification.isRead) {
                                      markAsRead(notification.id);
                                    }
                                  }}
                                >
                                  <div className="flex items-start">
                                    <div className="flex-shrink-0 pt-0.5">
                                      {notification.type === 'appointment_confirmed' ? (
                                        <Check className="h-5 w-5 text-green-500" />
                                      ) : notification.type === 'appointment_canceled' ? (
                                        <X className="h-5 w-5 text-red-500" />
                                      ) : (
                                        <Clock className="h-5 w-5 text-blue-500" />
                                      )}
                                    </div>
                                    <div className="ml-3 flex-1">
                                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                                        {notification.title}
                                      </p>
                                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        {notification.message}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                        {formatTimeAgo(new Date(notification.createdAt).getTime())}
                                      </p>
                                    </div>
                                    {!notification.isRead && (
                                      <div className="ml-2">
                                        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Menu.Item>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 p-2">
                    <Link
                      href="/notifications"
                      className="block w-full text-center py-2 text-xs font-medium text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                      onClick={() => setOpen(false)}
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              </Menu.Items>
            </Transition>
          </>
        )}
      </Menu>
    </div>
  );
};

export default NotificationBell;
