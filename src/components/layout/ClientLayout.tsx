'use client';

import React, { useEffect } from 'react';
import { QueryProvider } from '@/lib/queryClient';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import Layout from '@/components/layout/Layout';
import AppErrorBoundary from '@/components/error/AppErrorBoundary';
import { setupErrorHandling } from '@/lib/errorSystem';

/**
 * Client Layout Component
 * Wraps the application in necessary client-side providers
 * Uses optimized QueryProvider with enhanced caching
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  // Initialize the error handling system
  useEffect(() => {
    setupErrorHandling();
  }, []);

  return (
    <AppErrorBoundary componentName="MainApplication">
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <Layout>{children}</Layout>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
