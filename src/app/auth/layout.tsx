'use client';

import React from 'react';
import { ThemeProvider } from '@/context/ThemeContext';

/**
 * Auth Layout
 * Simple layout for authentication pages without navbar/footer
 * Uses only ThemeProvider to prevent conflicts with root layout
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {children}
      </div>
    </ThemeProvider>
  );
} 