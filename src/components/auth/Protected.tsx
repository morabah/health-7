'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { logInfo } from '@/lib/logger';
import { UserType } from '@/types/enums';

interface ProtectedProps {
  children: React.ReactNode;
  roles?: UserType[]; // Optional array of allowed roles
}

/**
 * Protected route component that enforces authentication and optional role-based access
 * Shows a spinner while loading, redirects to login if not authenticated,
 * and redirects to unauthorized page if user doesn't have required role
 */
export default function Protected({ children, roles }: ProtectedProps) {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const redirectAttempted = useRef(false);

  useEffect(() => {
    // Only check auth after isLoading is false
    if (isLoading) {
      return;
    }

    // Prevent multiple redirects in a short time span
    if (redirectAttempted.current) {
      return;
    }

    // If no user is logged in (after loading), redirect to login
    if (!user) {
      logInfo('Auth guard: Redirecting to login', { pathname });
      redirectAttempted.current = true;
      setTimeout(() => {
        const redirectPath = pathname ? `/auth/login?next=${encodeURIComponent(pathname)}` : '/auth/login';
        router.push(redirectPath);
        setTimeout(() => {
          redirectAttempted.current = false;
        }, 5000);
      }, 100);
      return;
    }

    // If roles are specified, check if user has required role
    if (roles && roles.length > 0) {
      const userType = profile?.userType;
      const hasRequiredRole = userType && roles.includes(userType as UserType);
      if (!hasRequiredRole) {
        logInfo('Auth guard: Unauthorized access', {
          userType: userType || 'unknown',
          requiredRoles: roles,
        });
        redirectAttempted.current = true;
        setTimeout(() => {
          router.push('/unauthorized');
          setTimeout(() => {
            redirectAttempted.current = false;
          }, 5000);
        }, 100);
        return;
      }
    }

    // User is authenticated and authorized
    setIsAuthorized(true);
  }, [user, profile, isLoading, roles, router, pathname]);

  // Show loading spinner while authentication state is loading
  // or while authorization is being checked
  if (isLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    );
  }

  // User is authenticated and authorized, render children
  return <>{children}</>;
}
