'use client';

import Protected from '@/components/auth/Protected';

/**
 * Platform layout wrapper
 * Protects all routes under (platform) to require authentication
 * Any user role can access these routes
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <Protected>{children}</Protected>;
}
