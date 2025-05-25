'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { logInfo, logError } from '@/lib/logger';
import { roleToDashboard, APP_ROUTES } from '@/lib/router';
import type { UserType } from '@/types/enums';

// Add TypeScript declaration for global state
declare global {
  interface Window {
    __redirecting?: boolean;
  }
}

// Global state check
const isBrowser = typeof window !== 'undefined';
const isRedirecting = () => isBrowser && window.__redirecting === true;
const setRedirecting = (value: boolean) => {
  if (isBrowser) window.__redirecting = value;
};

// Initialize global state if in browser
if (isBrowser && typeof window.__redirecting === 'undefined') {
  window.__redirecting = false;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserType[]; // Optional array of allowed roles
  redirectIfAuth?: boolean; // For /auth/* pages - redirect to dashboard if already logged in
}

/**
 * Protected route component that enforces authentication and optional role-based access
 * Shows a spinner while loading, redirects to login if not authenticated,
 * and redirects to unauthorized page if user doesn't have required role
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectIfAuth = false,
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const redirectAttempted = useRef(false);
  const lastRedirectTime = useRef(0);

  useEffect(() => {
    // Always show spinner while loading, even if user is null
    if (loading) {
      return;
    }

    // Prevent multiple redirects using global state
    if (isRedirecting() || redirectAttempted.current) {
      return;
    }

    // Add time-based throttling for redirects (10 second cooldown)
    const now = Date.now();
    if (now - lastRedirectTime.current < 10000) {
      return;
    }

    // For auth pages: If user is logged in and userProfile is ready, redirect to dashboard
    if (redirectIfAuth && user && userProfile) {
      const dashboardPath = roleToDashboard(userProfile.userType);

      // Avoid redirecting if we're already on the target path
      if (pathname !== dashboardPath) {
        redirectAttempted.current = true;
        setRedirecting(true);
        lastRedirectTime.current = now;

        logInfo('ProtectedRoute: Redirecting authenticated user to dashboard', {
          from: pathname,
          to: dashboardPath,
        });

        router.replace(dashboardPath);
      }
      return;
    }

    // If no user is logged in (after loading), redirect to login
    if (!user) {
      logInfo('ProtectedRoute: Redirecting to login', { pathname });

      // Set both local and global redirect flags
      redirectAttempted.current = true;
      setRedirecting(true);
      lastRedirectTime.current = now;

      // Redirect to login with next parameter
      const nextParam = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`${APP_ROUTES.LOGIN}${nextParam}`);
      return;
    }

    // If allowedRoles are specified, check if user has required role
    if (allowedRoles && allowedRoles.length > 0 && userProfile) {
      const userType = userProfile.userType;
      const hasRequiredRole = userType && allowedRoles.includes(userType as UserType);

      if (!hasRequiredRole) {
        logInfo('ProtectedRoute: Unauthorized access', {
          userType: userType || 'unknown',
          requiredRoles: allowedRoles,
        });

        logError('ProtectedRoute: User lacks required role', {
          userType,
          requiredRoles: allowedRoles,
        });

        // Redirect to their appropriate dashboard
        const dashboardPath = roleToDashboard(userType);

        // Set redirect flags
        redirectAttempted.current = true;
        setRedirecting(true);
        lastRedirectTime.current = now;

        router.replace(dashboardPath);
        return;
      }
    }

    // Reset redirect flag when all checks pass
    redirectAttempted.current = false;
    // Only reset the global flag if we set it in this component
    if (isRedirecting()) {
      setRedirecting(false);
    }
  }, [user, userProfile, loading, allowedRoles, router, pathname, redirectIfAuth]);

  // Show loading spinner while authentication state is loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  // If we need authentication but have no user, show spinner during redirect
  if (!user && !loading && !redirectIfAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  // User is authenticated and authorized (or we're waiting for redirect), render children
  return <>{children}</>;
}
