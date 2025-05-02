'use client';

import React from 'react';
import { QueryProvider } from '@/lib/queryClient';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import Layout from '@/components/layout/Layout';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { AlertTriangle } from 'lucide-react';

/**
 * Global error fallback component
 */
const GlobalErrorFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
    <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 text-center">
      <div className="flex justify-center mb-4">
        <AlertTriangle size={48} className="text-red-500" />
      </div>
      <h1 className="text-xl font-bold mb-2">Application Error</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        We're sorry, something went wrong with the application. Our team has been notified.
      </p>
      <div className="space-y-2">
        <button 
          onClick={() => window.location.href = '/'}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Go to Home Page
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          Reload Application
        </button>
      </div>
    </div>
  </div>
);

/**
 * Client Layout Component
 * Wraps the application in necessary client-side providers
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  const handleGlobalError = (error: Error) => {
    // Here you could send the error to an external service like Sentry
    console.error('[Global Error]', error);
  };

  return (
    <ErrorBoundary
      fallback={<GlobalErrorFallback />}
      onError={handleGlobalError}
    >
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <Layout>{children}</Layout>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
