'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { logInfo, logError } from '@/lib/logger';
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
  const lastRedirectTime = useRef(0);

  useEffect(() => {
    // Only check auth after isLoading is false
    if (isLoading) {
      console.log('[Protected] Auth is still loading, waiting...');
      return;
    }

    // Prevent multiple redirects using global state
    if (isRedirecting() || redirectAttempted.current) {
      console.log('[Protected] Redirect already in progress, skipping');
      return;
    }
    
    // Add time-based throttling for redirects (10 second cooldown)
    const now = Date.now();
    if (now - lastRedirectTime.current < 10000) {
      console.log('[Protected] Redirect throttled (10s cooldown period)');
      return;
    }

    // If no user is logged in (after loading), redirect to login
    if (!user) {
      logInfo('Auth guard: Redirecting to login', { pathname });
      console.log('[Protected] No user found, redirecting to login');
      
      // Set both local and global redirect flags
      redirectAttempted.current = true;
      setRedirecting(true);
      lastRedirectTime.current = now;
      
      // Use a delayed hard redirect to break any loops
      setTimeout(() => {
        if (isBrowser) {
          const nextParam = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
          window.location.href = `/auth/login${nextParam}`;
          
          // Reset the flags after a long delay
          setTimeout(() => {
            redirectAttempted.current = false;
            setRedirecting(false);
          }, 10000);
        }
      }, 500);
      
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
        logError('Protected: User lacks required role', {
          userType,
          requiredRoles: roles
        });
        
        // Set both local and global redirect flags
        redirectAttempted.current = true;
        setRedirecting(true);
        lastRedirectTime.current = now;
        
        // Use a delayed hard redirect
        setTimeout(() => {
          if (isBrowser) {
            window.location.href = '/unauthorized';
            
            // Reset the flags after a long delay
            setTimeout(() => {
              redirectAttempted.current = false;
              setRedirecting(false);
            }, 10000);
          }
        }, 500);
        
        return;
      }
    }

    // User is authenticated and authorized
    console.log('[Protected] User is authorized, showing content');
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
