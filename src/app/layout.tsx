import React from 'react';
import type { Metadata } from 'next';
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
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
} 