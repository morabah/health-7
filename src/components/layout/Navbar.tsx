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
import UserSwitcher from '@/components/ui/UserSwitcher';
import { logError } from '@/lib/logger';
import enhancedCache, { CacheCategory } from '@/lib/cacheManager';

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

/**
 * Role-aware Navbar driven by AuthContext.
 * Shows Login/Register for logged-out users and role-specific navigation for logged-in users.
 */
export default function Navbar() {
  const { user, profile, loading, logout, activeSessions, switchToSession, logoutAllSessions } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [switchingSession, setSwitchingSession] = useState(false);
  const [fetchingNotifications, setFetchingNotifications] = useState(false);
  const [notificationsFetchFailed, setNotificationsFetchFailed] = useState(false);
  const lastFetchTimeRef = useRef<number>(0); // Use ref instead of state to avoid re-renders
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Store interval in a ref
  const isMountedRef = useRef<boolean>(true); // Track if component is mounted
  const pathname = usePathname();
  const router = useRouter();
  
  // Derive user role from profile
  const role = profile?.userType;
  
  // Check if a route is active
  const isActive = (href: string) => pathname === href;

  // Memoized fetch notifications function to prevent recreating on every render
  const fetchNotifications = useCallback(async () => {
    // Don't fetch if we're already fetching, failed recently, or component unmounted
    if (fetchingNotifications || notificationsFetchFailed || !isMountedRef.current) {
      return;
    }
    
    // Guard for user authentication
    if (!user?.uid || !user?.role) {
      return;
    }
    
    // Debounce check
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 5000) { // 5 seconds debounce
      return;
    }
    
    // Check if notifications are in the LRU cache first
    const cacheKey = `notifications:${user.uid}`;
    const cachedNotifications = enhancedCache?.get<{success: boolean, notifications: Notification[]}>(
      CacheCategory.NOTIFICATIONS,
      cacheKey
    );
    
    if (cachedNotifications && isMountedRef.current) {
      const count = cachedNotifications.notifications.filter((n: Notification) => !n.isRead).length;
      setUnreadCount(count);
      return;
    }
    
    setFetchingNotifications(true);
    lastFetchTimeRef.current = now;
    
    try {
      // The getMyNotifications API call is already deduplicated by the apiClient
      // We don't need to specify any special options since deduplication is enabled by default
      const response = await callApi('getMyNotifications', { uid: user.uid, role: user.role });
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;
      
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        const notifications = 'notifications' in response && Array.isArray(response.notifications) 
          ? response.notifications as Notification[] 
          : [];
        const count = notifications.filter((n: Notification) => !n.isRead).length;
        setUnreadCount(count);
        setNotificationsFetchFailed(false);
        
        // Store in LRU cache for faster access
        enhancedCache?.set(
          CacheCategory.NOTIFICATIONS,
          cacheKey,
          response,
          { 
            ttl: 15000, // 15 seconds TTL
            priority: 'normal'
          }
        );
      }
    } catch (error) {
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;
      
      logError('Error fetching notifications', { error, userId: user?.uid });
      setNotificationsFetchFailed(true);
      
      // If we fail, we'll retry after a longer delay (2 minutes)
      setTimeout(() => {
        if (isMountedRef.current) {
          setNotificationsFetchFailed(false);
        }
      }, 120000);
    } finally {
      // Check if component is still mounted before updating state
      if (isMountedRef.current) {
        setFetchingNotifications(false);
      }
    }
  }, [user, fetchingNotifications, notificationsFetchFailed]);
  
  // Memoized visibility change handler
  const handleVisibilityChange = useCallback(() => {
    // Constants
    const ACTIVE_FETCH_INTERVAL = 60000; // 1 minute
    const BACKGROUND_FETCH_INTERVAL = 300000; // 5 minutes
    const DEBOUNCE_TIME = 5000; // 5 seconds between potential fetches
    
    // Don't do anything if component is unmounted
    if (!isMountedRef.current) return;
    
    if (document.visibilityState === 'visible') {
      // If becoming visible, fetch immediately if it's been a while
      const now = Date.now();
      if (now - lastFetchTimeRef.current > DEBOUNCE_TIME) {
        fetchNotifications();
      }
      
      // Clear existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Reset to more frequent interval when tab is visible
      intervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          fetchNotifications();
        }
      }, ACTIVE_FETCH_INTERVAL);
    } else {
      // Clear existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Lower frequency polling when tab is not visible
      intervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          fetchNotifications();
        }
      }, BACKGROUND_FETCH_INTERVAL);
    }
  }, [fetchNotifications]);

  // Set up notification polling and visibility handling
  useEffect(() => {
    // Skip if no user is authenticated
    if (!user || !user.uid || !user.role) {
      return;
    }
    
    // Track component mount status
    isMountedRef.current = true;
    
    // Constants
    const ACTIVE_FETCH_INTERVAL = 60000; // 1 minute
    
    // Initial fetch (only once)
    fetchNotifications();
    
    // Set up visibility change listener to optimize polling
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Start with active interval (tab is assumed to be visible on load)
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        fetchNotifications();
      }
    }, ACTIVE_FETCH_INTERVAL);
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchNotifications, handleVisibilityChange]);

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

  // Compute role-aware paths using switch statement
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

  // Handle switching to a different session
  const handleSwitchSession = async (sessionId: string) => {
    if (switchingSession) return; // Prevent duplicate calls
    
    setSwitchingSession(true);
    const success = await switchToSession(sessionId);
    
    if (success) {
      close(); // Close all menus after successful switch
      router.refresh(); // Refresh the page to update UI with new user context
    }
    
    setSwitchingSession(false);
  };

  // Handle logout with menu closing
  const handleLogout = async () => {
    close();
    await logout();
    router.replace('/auth/login');
  };

  // Handle logout all sessions
  const handleLogoutAll = async () => {
    close();
    await logoutAllSessions();
    router.replace('/auth/login');
  };

  // Show skeleton while loading
  if (loading) {
    return (
      <nav className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur dark:bg-slate-900/80 dark:border-slate-800">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-semibold">
            Health<span className="text-primary">Appointment</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="animate-pulse h-5 w-32 rounded bg-slate-200 dark:bg-slate-700"></div>
          <Loader2 className="animate-spin text-primary" size={20} />
          </div>
        </div>
      </nav>
    );
  }

  // Common navigation links component with active state
  const NavLink = ({ 
    href, 
    label, 
    onClick 
  }: { 
    href: string; 
    label: string;
    onClick?: () => void;
  }) => (
    <Link
      href={href}
      onClick={(e) => {
        e.preventDefault();
        if (onClick) onClick();
        navigateTo(href);
      }}
      className={clsx(
        "rounded px-3 py-2 text-sm font-medium transition-colors hover:text-primary dark:hover:text-primary/80",
        isActive(href) && "text-primary font-semibold"
      )}
    >
      {label}
    </Link>
  );

  return (
    <Disclosure
      as="header"
      className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur dark:bg-slate-900/80 dark:border-slate-800"
    >
      {({ open }) => (
        <>
          <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
            {/* Logo */}
            <Link href="/" className="text-lg font-semibold">
              Health<span className="text-primary">Appointment</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex gap-6">
              <NavLink href="/" label="Home" />
              <NavLink href="/about" label="About" />
              <NavLink href="/contact" label="Contact" />
              {user && <NavLink href="/find-doctors" label="Find Doctors" />}
              {user && role && <NavLink href={dashPath} label="Dashboard" />}
            </nav>

            {/* Right section */}
            <div className="hidden md:flex items-center gap-3">
              {/* Theme toggle */}
              <Button
                variant="ghost"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
                disabled={loading}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </Button>

              {user ? (
                <>
                  {/* Notifications */}
                  <Link
                    href="/notifications"
                    className={clsx(
                      "relative p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800",
                      loading && "opacity-50 pointer-events-none"
                    )}
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <Badge variant="danger" className="absolute -top-1 -right-1 px-1.5">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                  </Link>

                  {/* Messages */}
                  <Link
                    href="/messages"
                    className={clsx(
                      "relative p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800",
                      loading && "opacity-50 pointer-events-none"
                    )}
                  >
                    <MessageSquare size={18} />
                  </Link>

                  {/* User Switcher */}
                  <UserSwitcher />

                  {/* User dropdown */}
                  <HeadlessMenu as="div" className="relative">
                    <HeadlessMenu.Button 
                      className={clsx(
                        "flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white",
                        loading && "opacity-50 cursor-not-allowed"
                      )}
                      disabled={loading}
                    >
                      <UserCircle size={16} />
                    </HeadlessMenu.Button>

                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-150 transform"
                      enterFrom="opacity-0 scale-95"
                      enterTo="opacity-100 scale-100"
                      leave="transition ease-in duration-100 transform"
                      leaveFrom="opacity-100 scale-100"
                      leaveTo="opacity-0 scale-95"
                    >
                      <HeadlessMenu.Items 
                        className="absolute right-0 mt-2 w-64 origin-top-right divide-y divide-gray-200 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-slate-800 dark:divide-gray-700"
                        aria-labelledby="user-menu"
                      >
                        <div className="px-4 py-3">
                          <p className="text-sm dark:text-white">Signed in as</p>
                          <p className="truncate text-sm font-medium text-primary">
                            {profile?.firstName && profile?.lastName 
                              ? role === UserType.DOCTOR 
                                ? `Dr. ${profile.firstName} ${profile.lastName}` 
                                : `${profile.firstName} ${profile.lastName}`
                              : profile?.email || user.email}
                          </p>
                        </div>
                        <div className="py-1">
                          <HeadlessMenu.Item>
                            {({ active, close: closeMenu }) => (
                              <button
                                onClick={() => {
                                  closeMenu();
                                  navigateTo(dashPath);
                                }}
                                className={clsx(
                                  active ? 'bg-gray-100 dark:bg-slate-700' : '',
                                  'flex w-full items-center px-4 py-2 text-sm dark:text-white'
                                )}
                              >
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                Dashboard
                              </button>
                            )}
                          </HeadlessMenu.Item>
                          <HeadlessMenu.Item>
                            {({ active, close: closeMenu }) => (
                              <button
                                onClick={() => {
                                  closeMenu();
                                  navigateTo(profPath);
                                }}
                                className={clsx(
                                  active ? 'bg-gray-100 dark:bg-slate-700' : '',
                                  'flex w-full items-center px-4 py-2 text-sm dark:text-white'
                                )}
                              >
                                <UserCircle className="mr-2 h-4 w-4" />
                                Profile
                              </button>
                            )}
                          </HeadlessMenu.Item>
                          
                          {/* Account Switcher */}
                          {activeSessions.length > 1 && (
                            <HeadlessMenu.Item>
                              {({ active }) => (
                                <div>
                                  <button
                                    onClick={() => {
                                      setShowAccountSwitcher(!showAccountSwitcher);
                                    }}
                                    className={clsx(
                                      active ? 'bg-gray-100 dark:bg-slate-700' : '',
                                      'flex w-full items-center px-4 py-2 text-sm dark:text-white'
                                    )}
                                  >
                                    <Users className="mr-2 h-4 w-4" />
                                    Switch Account
                                    <Badge variant="info" className="ml-auto">
                                      {activeSessions.length}
                                    </Badge>
                                  </button>
                                  
                                  {showAccountSwitcher && (
                                    <div className="bg-gray-50 dark:bg-slate-700 px-3 py-2 border-t border-b border-gray-200 dark:border-slate-600">
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                        Active sessions
                                      </p>
                                      <div className="max-h-60 overflow-y-auto space-y-1">
                                        {activeSessions.map((session) => (
                                          <button
                                            key={session.sessionId}
                                            onClick={() => {
                                              handleSwitchSession(session.sessionId);
                                            }}
                                            disabled={switchingSession}
                                            className={clsx(
                                              "flex items-center justify-between w-full px-2 py-1.5 rounded text-sm",
                                              switchingSession && "opacity-70 cursor-wait",
                                              user?.sessionId === session.sessionId 
                                                ? "bg-primary/10 text-primary"
                                                : "hover:bg-gray-100 dark:hover:bg-slate-600"
                                            )}
                                          >
                                            <div className="flex items-center">
                                              <UserCircle className="mr-2 h-4 w-4" />
                                              <div className="flex flex-col items-start">
                                                <span className="font-medium">
                                                  {session.email ? session.email.split('@')[0] : 'User'}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                  {session.role}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex items-center">
                                              {switchingSession && user?.sessionId !== session.sessionId && (
                                                <Loader2 size={12} className="animate-spin mr-1" />
                                              )}
                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatLastActive(session.lastActive)}
                                              </span>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            close();
                                            navigateTo(APP_ROUTES.LOGIN);
                                          }}
                                          className="w-full text-left flex items-center justify-start text-blue-600 dark:text-blue-400"
                                        >
                                          <LogIn className="mr-2 h-4 w-4" />
                                          Add another account
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </HeadlessMenu.Item>
                          )}
                          
                          <HeadlessMenu.Item>
                            {({ active, close }) => (
                              <button
                                onClick={() => {
                                  close();
                                  handleLogout();
                                }}
                                className={clsx(
                                  active ? 'bg-gray-100 dark:bg-slate-700' : '',
                                  'flex w-full items-center px-4 py-2 text-sm text-danger'
                                )}
                                aria-label="Sign out"
                              >
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign out
                              </button>
                            )}
                          </HeadlessMenu.Item>
                          
                          {activeSessions.length > 1 && (
                            <HeadlessMenu.Item>
                              {({ active, close }) => (
                                <button
                                  onClick={() => {
                                    close();
                                    handleLogoutAll();
                                  }}
                                  className={clsx(
                                    active ? 'bg-gray-100 dark:bg-slate-700' : '',
                                    'flex w-full items-center px-4 py-2 text-sm text-danger'
                                  )}
                                  aria-label="Sign out of all accounts"
                                >
                                  <LogOut className="mr-2 h-4 w-4" />
                                  Sign out of all accounts
                                </button>
                              )}
                            </HeadlessMenu.Item>
                          )}
                        </div>
                      </HeadlessMenu.Items>
                    </Transition>
                  </HeadlessMenu>
                </>
              ) : (
                <>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    disabled={loading}
                    onClick={() => navigateTo(APP_ROUTES.LOGIN)}
                  >
                    Login
                  </Button>
                  <Button 
                    size="sm" 
                    disabled={loading}
                    onClick={() => navigateTo(APP_ROUTES.REGISTER)}
                  >
                    Register
                  </Button>
                </>
              )}
            </div>

            {/* Mobile burger */}
            <Disclosure.Button 
              className={clsx(
                "md:hidden p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800",
                loading && "opacity-50 cursor-not-allowed"
              )}
              disabled={loading}
            >
              {open ? <X size={20} /> : <MenuIcon size={20} />}
            </Disclosure.Button>
          </div>

          {/* Mobile menu */}
          <Disclosure.Panel className="md:hidden border-t border-slate-200 dark:border-slate-700">
            <div className="space-y-1 px-4 py-3">
              <NavLink href="/" label="Home" onClick={close} />
              <NavLink href="/about" label="About" onClick={close} />
              <NavLink href="/contact" label="Contact" onClick={close} />
              {user && (
                <>
                  <NavLink href="/find-doctors" label="Find Doctors" onClick={close} />
                  {role && <NavLink href={dashPath} label="Dashboard" onClick={close} />}
                  {role && <NavLink href={profPath} label="Profile" onClick={close} />}
                  <NavLink href="/notifications" label="Notifications" onClick={close} />
                  
                  {/* Mobile Account Switcher */}
                  {activeSessions.length > 1 && (
                    <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
                      <button
                        onClick={() => setShowAccountSwitcher(!showAccountSwitcher)}
                        className="flex items-center justify-between w-full py-2 px-3 text-left text-sm"
                      >
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          <span>Switch Account</span>
                        </div>
                        <Badge variant="info">
                          {activeSessions.length}
                        </Badge>
                      </button>
                      
                      {showAccountSwitcher && (
                        <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-md mt-1 space-y-2">
                          {activeSessions.map((session) => (
                            <button
                              key={session.sessionId}
                              onClick={() => handleSwitchSession(session.sessionId)}
                              disabled={switchingSession}
                              className={clsx(
                                "flex items-center justify-between w-full px-3 py-2 rounded text-sm",
                                switchingSession && "opacity-70 cursor-wait",
                                user?.sessionId === session.sessionId 
                                  ? "bg-primary/10 text-primary"
                                  : "hover:bg-gray-100 dark:hover:bg-slate-600"
                              )}
                            >
                              <div className="flex items-center">
                                <UserCircle className="mr-2 h-4 w-4" />
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">
                                    {session.email ? session.email.split('@')[0] : 'User'}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {session.role}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center">
                                {switchingSession && user?.sessionId !== session.sessionId && (
                                  <Loader2 size={12} className="animate-spin mr-1" />
                                )}
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatLastActive(session.lastActive)}
                                </span>
                              </div>
                            </button>
                          ))}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              close();
                              navigateTo(APP_ROUTES.LOGIN);
                            }}
                            className="w-full text-left flex items-center justify-start text-blue-600 dark:text-blue-400"
                          >
                            <LogIn className="mr-2 h-4 w-4" />
                            Add another account
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
                    <Button
                      variant="ghost"
                      onClick={toggleTheme}
                      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                      className="mr-4"
                      disabled={loading}
                    >
                      {theme === 'dark' ? (
                        <>
                          <Sun size={18} className="mr-2" /> Light Mode
                        </>
                      ) : (
                        <>
                          <Moon size={18} className="mr-2" /> Dark Mode
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost" 
                      onClick={() => {
                        close();
                        handleLogout();
                      }}
                      aria-label="Sign out"
                      className="text-danger"
                      disabled={loading}
                    >
                      <LogOut size={18} className="mr-2" />
                      Sign out
                    </Button>
                    
                    {activeSessions.length > 1 && (
                      <Button
                        variant="ghost" 
                        onClick={() => {
                          close();
                          handleLogoutAll();
                        }}
                        aria-label="Sign out of all accounts"
                        className="text-danger mt-2"
                        disabled={loading}
                      >
                        <LogOut size={18} className="mr-2" />
                        Sign out of all accounts
                      </Button>
                    )}
                  </div>
                </>
              )}
              {!user && (
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="secondary" 
                    disabled={loading}
                    onClick={() => {
                      close();
                      navigateTo(APP_ROUTES.LOGIN);
                    }}
                  >
                    Login
                  </Button>
                  <Button 
                    disabled={loading}
                    onClick={() => {
                      close();
                      navigateTo(APP_ROUTES.REGISTER);
                    }}
                  >
                    Register
                  </Button>
                </div>
              )}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
