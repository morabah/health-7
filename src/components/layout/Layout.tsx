'use client';

import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
  noFooter?: boolean;
  noNavbar?: boolean;
  noPadding?: boolean;
}

/**
 * Main Layout Component
 * Renders consistent layout structure with navbar, main content, and footer
 * Supports various layout options: fullWidth, noFooter, noNavbar, noPadding
 */
export default function Layout({
  children,
  className,
  fullWidth = false,
  noFooter = false,
  noNavbar = false,
  noPadding = false
}: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
      {!noNavbar && <Navbar />}

      {/* Main content – leaves space for sticky navbar */}
      <main 
        className={twMerge(
          clsx(
            "flex-grow w-full mx-auto",
            !noPadding && "px-4 sm:px-6 py-6 sm:py-8 md:py-10", 
            !noNavbar && "pt-16 md:pt-20",
            !fullWidth && "max-w-7xl",
            className
          )
        )}
      >
        {children}
      </main>

      {!noFooter && <Footer />}
    </div>
  );
}
