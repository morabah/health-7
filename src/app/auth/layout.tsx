'use client';

import React from 'react';
import ProtectedPage from '@/components/auth/ProtectedPage';

/**
 * Auth Layout
 * Simple layout for authentication pages without navbar/footer
 * Protected with redirectIfAuth to redirect already authenticated users
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedPage redirectIfAuth={true}>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {children}
    </div>
    </ProtectedPage>
  );
} 