'use client';

import React, { useEffect } from 'react';
import { QueryProvider } from '@/lib/queryClient';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import Layout from '@/components/layout/Layout';
import { ErrorBoundaryProvider } from '@/components/error-boundaries/ErrorBoundaryProvider';
import { setupErrorHandling } from '@/lib/errorSystem';
import type { ErrorInfo } from 'react';

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
    <ErrorBoundaryProvider 
      defaultResetOnRouteChange={true}
      onGlobalError={(error: Error, errorInfo: ErrorInfo) => {
        // This is a global error handler that will be called for all errors
        console.error('Global error caught:', error);
      }}
    >
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <Layout>{children}</Layout>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundaryProvider>
  );
}
