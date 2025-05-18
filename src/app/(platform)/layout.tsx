'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';

/**
 * Platform layout wrapper
 * Protects all routes under (platform) to require authentication
 * Any user role can access these routes
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
