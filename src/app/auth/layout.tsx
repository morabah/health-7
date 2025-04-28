'use client';

import React from 'react';

/**
 * Auth Layout
 * Simple layout for authentication pages without navbar/footer
 * No providers to prevent conflicts with root layout
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {children}
    </div>
  );
} 