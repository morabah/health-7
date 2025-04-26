'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Bell, Sun, Moon, User } from 'lucide-react';
import { Disclosure, Transition } from '@headlessui/react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import useDarkMode from '@/hooks/useDarkMode';
import { logInfo } from '@/lib/logger';

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [theme, toggleTheme] = useDarkMode();

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
              <NavLink href="/find-doctors" label="Find Doctors" />
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

              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => logInfo('Notifications clicked')}
                    className="relative p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Bell size={18} />
                    <Badge
                      variant="danger"
                      className="absolute -top-1 -right-1 px-1.5"
                    >
                      1
                    </Badge>
                  </button>

                  {/* Avatar dropdown stub */}
                  <button
                    onClick={() => logInfo('Open profile menu')}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"
                  >
                    <User size={16} />
                  </button>
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

                {isLoggedIn ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="rounded px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        logInfo('Logout clicked');
                        setIsLoggedIn(false);
                      }}
                      className="rounded px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Logout
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