'use client';

import React from 'react';
import { QueryProvider } from '@/lib/queryClient';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import Layout from '@/components/layout/Layout';
import RootErrorBoundary from './RootErrorBoundary';

/**
 * Client Layout Component
 * Wraps the application in necessary client-side providers
 * Uses optimized QueryProvider with enhanced caching
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootErrorBoundary>
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <Layout>{children}</Layout>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </RootErrorBoundary>
  );
}
