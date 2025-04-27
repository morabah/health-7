'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import Layout from '@/components/layout/Layout';

// Create a client
const queryClient = new QueryClient();

/**
 * Client Layout Component
 * Wraps the application in necessary client-side providers
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Layout>{children}</Layout>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
