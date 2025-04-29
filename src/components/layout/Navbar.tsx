'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu as MenuIcon, X, Bell, Sun, Moon, LogOut, MessageSquare } from 'lucide-react';
import { Disclosure, Transition, Menu as HeadlessMenu } from '@headlessui/react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Loader2, UserCircle, LayoutDashboard } from 'lucide-react';
import clsx from 'clsx';
import { logInfo } from '@/lib/logger';
import { UserType } from '@/types/enums';
import { callApi } from '@/lib/apiClient';
import { roleToDashboard, roleToProfile } from '@/lib/router';
import type { Notification } from '@/types/schemas';

/**
 * Role-aware Navbar driven by AuthContext.
 * Shows Login/Register for logged-out users and role-specific navigation for logged-in users.
 */
export default function Navbar() {
  const { user, profile, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  
  // Derive user role from profile
  const role = profile?.userType;
  
  // Check if a route is active
  const isActive = (href: string) => pathname === href;

  // Fetch unread notifications count
  useEffect(() => {
    const fetchNotifications = async () => {
      if (user) {
        try {
          const response = await callApi('getMyNotifications', { uid: user.uid, role: user.role });
          if (response?.success) {
            const count = response.notifications.filter((n: Notification) => !n.isRead).length;
            setUnreadCount(count);
          }
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      }
    };
    
    fetchNotifications();
    // Set up interval to check periodically
    const interval = setInterval(fetchNotifications, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  // Helper to close mobile menu after navigation
  const close = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
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

  // Handle logout with menu closing
  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
    // Menu will be automatically closed as the component unmounts during navigation
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
                        className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-200 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-slate-800 dark:divide-gray-700"
                        aria-labelledby="user-menu"
                      >
                        <div className="px-4 py-3">
                          <p className="text-sm dark:text-white">Signed in as</p>
                          <p className="truncate text-sm font-medium text-primary">
                            {profile?.email || user.email}
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
                    onClick={() => navigateTo('/login')}
                  >
                    Login
                  </Button>
                  <Button 
                    size="sm" 
                    disabled={loading}
                    onClick={() => navigateTo('/register')}
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
                      navigateTo('/login');
                    }}
                  >
                    Login
                  </Button>
                  <Button 
                    disabled={loading}
                    onClick={() => {
                      close();
                      navigateTo('/register');
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
