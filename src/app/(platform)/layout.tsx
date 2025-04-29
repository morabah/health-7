'use client';

import ProtectedPage from '@/components/auth/ProtectedPage';

/**
 * Platform layout wrapper
 * Protects all routes under (platform) to require authentication
 * Any user role can access these routes
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage>{children}</ProtectedPage>;
}
