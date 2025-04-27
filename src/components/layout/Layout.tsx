'use client';

import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

/**
 * Main Layout Component
 * Renders consistent layout structure with navbar, main content, and footer
 * Used in the root layout wrapper
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />

      {/* Main content – leaves space for sticky navbar */}
      <main className="flex-grow container mx-auto p-4 pt-16 pb-10">{children}</main>

      <Footer />
    </>
  );
}
