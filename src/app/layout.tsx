import React from 'react';
import type { Metadata } from 'next';
// Import app configuration early for initialization
import '@/config/appConfig';
// Import global styles (includes Tailwind CSS directives)
import '@/styles/globals.css';

/**
 * Root layout metadata
 */
export const metadata: Metadata = {
  title: 'Health Appointment System',
  description: 'Book and manage healthcare appointments',
};

/**
 * Root layout component
 * This layout wraps all pages in the application
 * Uses Tailwind CSS for styling
 * 
 * @param props - Contains children components
 * @returns Root layout with children
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Add className to enable future dark mode toggling */}
      <body className="min-h-screen bg-gray-50">
        <main className="container mx-auto">{children}</main>
      </body>
    </html>
  );
} 