'use client';

import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';

/**
 * Public Layout
 * Layout for public pages with navbar and footer
 * 
 * @returns Layout component for public pages
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Navbar />
        
        {/* Main content – leaves space for sticky navbar */}
        <main className="flex-1 w-full pt-16 pb-10">
          {children}
        </main>
        
        <Footer />
      </AuthProvider>
    </ThemeProvider>
  );
} 