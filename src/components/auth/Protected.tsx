'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { logInfo } from '@/lib/logger';

interface ProtectedProps {
  children: React.ReactNode;
  roles?: string[]; // Optional array of allowed roles
}

/**
 * Protected route component that enforces authentication and optional role-based access
 * Shows a spinner while loading, redirects to login if not authenticated,
 * and redirects to unauthorized page if user doesn't have required role
 */
export default function Protected({ children, roles }: ProtectedProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // If still loading, wait for auth state to resolve
    if (loading) {
      return;
    }

    // If no user is logged in, redirect to login
    if (!user) {
      logInfo('Auth guard: Redirecting to login', { pathname });
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // If roles are specified, check if user has required role
    if (roles && roles.length > 0) {
      if (!profile || !profile.userType || !roles.includes(profile.userType)) {
        logInfo('Auth guard: Unauthorized access', {
          userType: profile?.userType || 'unknown',
          requiredRoles: roles,
        });
        router.push('/unauthorized');
        return;
      }
    }

    // User is authenticated and authorized
    setIsAuthorized(true);
  }, [user, profile, loading, roles, router, pathname]);

  // Show loading spinner while authentication state is loading
  // or while authorization is being checked
  if (loading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    );
  }

  // User is authenticated and authorized, render children
  return <>{children}</>;
}
