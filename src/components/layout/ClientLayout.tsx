'use client';

import React from 'react';
import { QueryProvider } from '@/lib/queryClient';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import Layout from '@/components/layout/Layout';

/**
 * Client Layout Component
 * Wraps the application in necessary client-side providers
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <Layout>{children}</Layout>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
