'use client';

import { Fragment, useEffect } from 'react';
import Link from 'next/link';
import { Menu as MenuIcon, X, Bell, Sun, Moon, LogOut } from 'lucide-react';
import { Disclosure, Transition, Menu as HeadlessMenu } from '@headlessui/react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Loader2, UserCircle, LayoutDashboard } from 'lucide-react';
import clsx from 'clsx';
import { logInfo } from '@/lib/logger';

/**
 * Role-aware Navbar driven by AuthContext.
 * Shows Login/Register for logged-out users and role-specific navigation for logged-in users.
 */
export default function Navbar() {
  const { user, profile, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Add debugging logs
  useEffect(() => {
    console.log('[Navbar] Auth state:', { loading, user, profile });
    if (profile) {
      logInfo('Navbar role switch', {
        userType: profile.userType,
        email: profile.email,
        dashPath:
          profile.userType === 'PATIENT'
            ? '/patient/dashboard'
            : profile.userType === 'DOCTOR'
              ? '/doctor/dashboard'
              : '/admin/dashboard',
      });
    }
  }, [loading, user, profile]);

  // Determine dashboard and profile paths based on user role
  const dashPath =
    profile?.userType === 'PATIENT'
      ? '/patient/dashboard'
      : profile?.userType === 'DOCTOR'
        ? '/doctor/dashboard'
        : profile?.userType === 'ADMIN'
          ? '/admin/dashboard'
          : '/';

  const profilePath =
    profile?.userType === 'PATIENT'
      ? '/patient/profile'
      : profile?.userType === 'DOCTOR'
        ? '/doctor/profile'
        : '/admin/users';

  // Show spinner while loading
  if (loading) {
    return (
      <nav className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur dark:bg-slate-900/80 dark:border-slate-800">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-semibold">
            Health<span className="text-primary">Appointment</span>
          </Link>
          <Loader2 className="animate-spin text-primary" size={20} />
        </div>
      </nav>
    );
  }

  // Common navigation links
  const NavLink = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      className="rounded px-3 py-2 text-sm font-medium transition-colors hover:text-primary dark:hover:text-primary/80 nav-link"
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
              {user && profile && <NavLink href={dashPath} label="Dashboard" />}
            </nav>

            {/* Right section */}
            <div className="hidden md:flex items-center gap-3">
              {/* Theme toggle */}
              <Button
                variant="ghost"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </Button>

              {user ? (
                <>
                  {/* Notifications */}
                  <Link
                    href="/notifications"
                    className="relative p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Bell size={18} />
                    <Badge variant="danger" className="absolute -top-1 -right-1 px-1.5">
                      1
                    </Badge>
                  </Link>

                  {/* User dropdown */}
                  <HeadlessMenu as="div" className="relative">
                    <HeadlessMenu.Button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
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
                      <HeadlessMenu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-200 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-slate-800 dark:divide-gray-700">
                        <div className="px-4 py-3">
                          <p className="text-sm dark:text-white">Signed in as</p>
                          <p className="truncate text-sm font-medium text-primary">
                            {profile?.email || user.email}
                          </p>
                        </div>
                        <div className="py-1">
                          <HeadlessMenu.Item>
                            {({ active }) => (
                              <Link
                                href={dashPath}
                                className={clsx(
                                  active ? 'bg-gray-100 dark:bg-slate-700' : '',
                                  'flex items-center px-4 py-2 text-sm dark:text-white'
                                )}
                              >
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                Dashboard
                              </Link>
                            )}
                          </HeadlessMenu.Item>
                          <HeadlessMenu.Item>
                            {({ active }) => (
                              <Link
                                href={profilePath}
                                className={clsx(
                                  active ? 'bg-gray-100 dark:bg-slate-700' : '',
                                  'flex items-center px-4 py-2 text-sm dark:text-white'
                                )}
                              >
                                <UserCircle className="mr-2 h-4 w-4" />
                                Profile
                              </Link>
                            )}
                          </HeadlessMenu.Item>
                          <HeadlessMenu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => logout()}
                                className={clsx(
                                  active ? 'bg-gray-100 dark:bg-slate-700' : '',
                                  'flex w-full items-center px-4 py-2 text-sm text-danger'
                                )}
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
                  <Link href="/auth/login">
                    <Button variant="secondary" size="sm">
                      Login
                    </Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button size="sm">Register</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile burger */}
            <Disclosure.Button className="md:hidden p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
              {open ? <X size={20} /> : <MenuIcon size={20} />}
            </Disclosure.Button>
          </div>

          {/* Mobile panel */}
          <Transition
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Disclosure.Panel className="md:hidden border-t bg-white dark:bg-slate-900 dark:border-slate-800">
              <nav className="flex flex-col gap-2 px-4 py-3">
                <NavLink href="/" label="Home" />
                <NavLink href="/about" label="About" />
                <NavLink href="/contact" label="Contact" />

                {user && <NavLink href="/find-doctors" label="Find Doctors" />}

                <button
                  className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  Theme
                </button>

                {user ? (
                  <>
                    <Link
                      href="/notifications"
                      className="rounded px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center"
                    >
                      <Bell size={16} className="mr-2" />
                      Notifications
                      <Badge variant="danger" className="ml-2 px-1.5">
                        1
                      </Badge>
                    </Link>
                    <Link
                      href={dashPath}
                      className="rounded px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center"
                    >
                      <LayoutDashboard size={16} className="mr-2" />
                      Dashboard
                    </Link>
                    <Link
                      href={profilePath}
                      className="rounded px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center"
                    >
                      <UserCircle size={16} className="mr-2" />
                      Profile
                    </Link>
                    <button
                      onClick={logout}
                      className="rounded px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center text-danger w-full"
                    >
                      <LogOut size={16} className="mr-2" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="rounded px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Login
                    </Link>
                    <Link
                      href="/auth/register"
                      className="rounded px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Register
                    </Link>
                  </>
                )}
              </nav>
            </Disclosure.Panel>
          </Transition>
        </>
      )}
    </Disclosure>
  );
}
