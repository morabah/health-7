import '@/styles/globals.css'; // tailwind + tokens
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { ClientLayout } from '@/components/layout/ClientLayout';

// Configure the Inter font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Health Appointment',
    template: '%s | Health Appointment',
  },
  description: 'Book appointments with healthcare professionals',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 antialiased`}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
