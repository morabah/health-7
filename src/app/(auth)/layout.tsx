'use client';

import React from 'react';
import { ThemeProvider } from '@/context/ThemeContext';

/**
 * Auth Layout
 * Special layout for authentication pages without navbar/footer
 * 
 * @returns Layout component for auth pages
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
} 