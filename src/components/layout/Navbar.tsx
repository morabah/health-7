'use client';

import Link from 'next/link';
import { Menu, X, Bell, Sun, Moon, User, LogOut } from 'lucide-react';
import { Disclosure, Transition, Menu as HeadlessMenu } from '@headlessui/react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import useDarkMode from '@/hooks/useDarkMode';
import { logInfo } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import { Fragment } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [theme, toggleTheme] = useDarkMode();

  const NavLink = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      className="rounded px-3 py-2 text-sm font-medium transition-colors hover:text-primary dark:hover:text-primary/80 nav-link"
    >
      {label}
    </Link>
  );

  // Determine dashboard link based on user role
  const getDashboardLink = () => {
    if (!user) return '/dashboard';
    
    switch (user.role) {
      case 'PATIENT':
        return '/patient/dashboard';
      case 'DOCTOR':
        return '/doctor/dashboard';
      case 'ADMIN':
        return '/admin/dashboard';
      default:
        return '/dashboard';
    }
  };

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
              <NavLink href="/find-doctors" label="Find Doctors" />
              {user && <NavLink href={getDashboardLink()} label="Dashboard" />}
            </nav>

            {/* Right section */}
            <div className="hidden md:flex items-center gap-3">
              <button
                aria-label="Toggle theme"
                onClick={() => toggleTheme()}
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {user ? (
                <>
                  <Link 
                    href="/notifications"
                    className="relative p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Bell size={18} />
                    <Badge
                      variant="danger"
                      className="absolute -top-1 -right-1 px-1.5"
                    >
                      1
                    </Badge>
                  </Link>

                  {/* User dropdown */}
                  <HeadlessMenu as="div" className="relative">
                    <HeadlessMenu.Button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                      <User size={16} />
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
                          <p className="truncate text-sm font-medium text-primary">{user.email}</p>
                        </div>
                        <div className="py-1">
                          <HeadlessMenu.Item>
                            {({ active }) => (
                              <Link
                                href={getDashboardLink()}
                                className={`${
                                  active ? 'bg-gray-100 dark:bg-slate-700' : ''
                                } block px-4 py-2 text-sm dark:text-white`}
                              >
                                Dashboard
                              </Link>
                            )}
                          </HeadlessMenu.Item>
                          <HeadlessMenu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => logout()}
                                className={`${
                                  active ? 'bg-gray-100 dark:bg-slate-700' : ''
                                } flex w-full items-center px-4 py-2 text-sm text-danger`}
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
                    <Button size="sm">
                      Register
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile burger */}
            <Disclosure.Button className="md:hidden p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
              {open ? <X size={20} /> : <Menu size={20} />}
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
                <NavLink href="/find-doctors" label="Find Doctors" />

                <button
                  className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => toggleTheme()}
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
                      <Badge variant="danger" className="ml-2 px-1.5">1</Badge>
                    </Link>
                    <Link
                      href={getDashboardLink()}
                      className="rounded px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={logout}
                      className="rounded px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center text-danger"
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