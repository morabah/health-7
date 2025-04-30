'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * Auth Layout Component
 * 
 * Wraps authentication-related pages such as login, register, etc.
 * Redirects authenticated users away from auth pages
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // If user is already authenticated, redirect them away from auth pages
  React.useEffect(() => {
    if (!loading && user) {
      // Redirect based on user role
      router.replace('/');
    }
  }, [user, loading, router]);

  // Show children (login/register forms, etc) when not authenticated
  return (
    <>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        </div>
      ) : (
        !user && children
      )}
    </>
  );
} 