'use client';

import { Fragment, useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu as MenuIcon, X, Bell, Sun, Moon, LogOut, MessageSquare, LogIn, Users } from 'lucide-react';
import { Disclosure, Transition, Menu as HeadlessMenu } from '@headlessui/react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Loader2, UserCircle, LayoutDashboard } from 'lucide-react';
import clsx from 'clsx';
import { UserType } from '@/types/enums';
import { callApi } from '@/lib/apiClient';
import { APP_ROUTES } from '@/lib/router';
import type { Notification } from '@/types/schemas';
import { logError } from '@/lib/logger';
import enhancedCache, { CacheCategory } from '@/lib/cacheManager';

// Define session type
type UserSession = {
  sessionId: string;
  email: string;
  role: string;
  lastActive: number;
};

// Format the last active timestamp
const formatLastActive = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  // Less than a minute
  if (diff < 60 * 1000) {
    return 'just now';
  }
  
  // Less than an hour
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}m ago`;
  }
  
  // Less than a day
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}h ago`;
  }
  
  // More than a day
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  return `${days}d ago`;
};

// Common navigation links component with active state
const NavLink = ({ 
  href, 
  label, 
  onClick,
  className = ''
}: { 
  href: string; 
  label: string;
  onClick?: () => void;
  className?: string;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        isActive 
          ? 'bg-gray-100 text-primary dark:bg-slate-700 dark:text-white' 
          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-700',
        'block px-4 py-2 text-sm rounded-md transition-colors',
        className
      )}
    >
      {label}
    </Link>
  );
};

/**
 * Role-aware Navbar driven by AuthContext.
 * Shows Login/Register for logged-out users and role-specific navigation for logged-in users.
 */
export default function Navbar() {
  const { user, userProfile, loading, logout } = useAuth();
  // Default to empty array since activeSessions is not in AuthContext
  const activeSessions: UserSession[] = [];
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [switchingSession, setSwitchingSession] = useState(false);
  const [fetchingNotifications, setFetchingNotifications] = useState(false);
  const [notificationsFetchFailed, setNotificationsFetchFailed] = useState(false);
  const lastFetchTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const pathname = usePathname();
  const router = useRouter();
  
  // Derive user role from userProfile
  const role = userProfile?.userType;
  
  // Check if a route is active
  const isActive = (href: string) => pathname === href;

  // Memoized fetch notifications function
  const fetchNotifications = useCallback(async () => {
    if (!user?.uid || !userProfile?.userType || fetchingNotifications || notificationsFetchFailed) {
      return;
    }
    
    // Debounce check
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 5000) {
      return;
    }
    
    setFetchingNotifications(true);
    lastFetchTimeRef.current = now;
    
    try {
      const response = await callApi('getMyNotifications', { 
        uid: user.uid, 
        role: userProfile.userType 
      });
      
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        const notifications = 'notifications' in response && Array.isArray(response.notifications) 
          ? response.notifications as Notification[] 
          : [];
        const count = notifications.filter((n) => !n.isRead).length;
        setUnreadCount(count);
        setNotificationsFetchFailed(false);
      }
    } catch (error) {
      // Handle specific error types gracefully
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // If the function doesn't exist in Firebase, fail silently
        if (errorMessage.includes('function not found') || 
            errorMessage.includes('404') ||
            errorMessage.includes('getmynotifications') ||
            errorMessage.includes('failed after') ||
            errorMessage.includes('request failed')) {
          // Silently disable notifications for this session
          setNotificationsFetchFailed(true);
          setUnreadCount(0);
          return;
        }
        
        // For authentication errors, also fail silently
        if (errorMessage.includes('authentication') || 
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('auth')) {
          setNotificationsFetchFailed(true);
          return;
        }
      }
      
      // Only log unexpected errors
      console.warn('Notifications temporarily unavailable:', error instanceof Error ? error.message : String(error));
      setNotificationsFetchFailed(true);
    } finally {
      setFetchingNotifications(false);
    }
  }, [user, userProfile, fetchingNotifications, notificationsFetchFailed]);

  // Set up notification polling
  useEffect(() => {
    if (!user?.uid || !userProfile?.userType) {
      return;
    }
    
    isMountedRef.current = true;
    
    // Only start polling if notifications haven't failed
    if (!notificationsFetchFailed) {
    fetchNotifications();
    
    const interval = setInterval(() => {
        if (isMountedRef.current && !notificationsFetchFailed) {
        fetchNotifications();
      }
    }, 60000); // Poll every minute
    
    return () => {
      isMountedRef.current = false;
      if (interval) clearInterval(interval);
    };
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [user, userProfile, fetchNotifications, notificationsFetchFailed]);

  // Close account switcher when navigation changes
  useEffect(() => {
    setShowAccountSwitcher(false);
  }, [pathname]);

  // Helper to close mobile menu after navigation
  const close = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setShowAccountSwitcher(false);
  }, []);

  // Helper for navigation that combines router.push with menu closing
  const navigateTo = useCallback((path: string) => {
    close();
    router.push(path);
  }, [close, router]);

  // Compute role-aware paths
  let dashPath = '/';
  let profPath = '/';
  
  if (role) {
    switch (role) {
      case UserType.PATIENT:
        dashPath = '/patient/dashboard';
        profPath = '/patient/profile';
        break;
      case UserType.DOCTOR:
        dashPath = '/doctor/dashboard';
        profPath = '/doctor/profile';
        break;
      case UserType.ADMIN:
        dashPath = '/admin/dashboard';
        profPath = '/admin/users';
        break;
      default:
        dashPath = '/';
        profPath = '/';
    }
  }

  // Handle logout with menu closing
  const handleLogout = async () => {
    close();
    try {
      await logout();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Show skeleton while loading
  if (loading) {
    return (
      <nav className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur dark:bg-slate-900/80 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex-shrink-0">
              <div className="h-8 w-32 animate-pulse bg-gray-200 dark:bg-slate-700 rounded"></div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 animate-pulse bg-gray-200 dark:bg-slate-700 rounded-full"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur dark:bg-slate-900/80 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-primary dark:text-white">HealthApp</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <NavLink href={dashPath} label="Dashboard" />
                  <NavLink href={profPath} label="Profile" />
                  <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-primary dark:text-gray-200 dark:hover:text-white px-3 py-2 text-sm font-medium rounded-md"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <NavLink href="/auth/login" label="Sign in" />
                  <NavLink 
                    href="/auth/register/patient" 
                    label="Register" 
                    className="bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-md"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Disclosure>
              {({ open }) => (
                <div className="relative">
                  <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary dark:text-gray-200 dark:hover:text-white focus:outline-none">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <X className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <MenuIcon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                  <Transition
                    as="div"
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Disclosure.Panel className="md:hidden">
                      <div className="space-y-1 px-2 pb-3 pt-2">
                        {user ? (
                          <div>
                            <NavLink href={dashPath} label="Dashboard" onClick={close} />
                            <NavLink href={profPath} label="Profile" onClick={close} />
                            <button
                              onClick={handleLogout}
                              className="w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-700 rounded-md"
                            >
                              Sign out
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <NavLink href="/auth/login" label="Sign in" onClick={close} />
                            <NavLink 
                              href="/auth/register/patient" 
                              label="Register" 
                              onClick={close}
                              className="block w-full text-center bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-md"
                            />
                          </div>
                        )}
                      </div>
                    </Disclosure.Panel>
                  </Transition>
                </div>
              )}
            </Disclosure>
          </div>
        </div>
      </div>
    </nav>
  );
}
