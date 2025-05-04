'use client';

import React from 'react';
import { QueryProvider } from '@/lib/queryClient';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import Layout from '@/components/layout/Layout';
import RootErrorBoundary from './RootErrorBoundary';
import { errorMonitor } from '@/lib/errorMonitoring';

/**
 * Client Layout Component
 * Wraps the application in necessary client-side providers
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  const handleGlobalError = (error: Error) => {
    // Send the error to our error monitoring service
    errorMonitor.captureException(error, {
      component: 'ClientLayout',
      severity: 'fatal',
      category: 'unknown'
    });
  };

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
