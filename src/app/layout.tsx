import '@/styles/globals.css';          // tailwind + tokens
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ThemeProvider } from '@/context/ThemeContext';   // empty stub for now
import { AuthProvider } from '@/context/AuthContext';     // empty stub for now
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Health Appointment',
    template: '%s | Health Appointment',
  },
  description: 'Book, manage and track doctor appointments effortlessly.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <Navbar />

            {/* Main content – leaves space for sticky navbar */}
            <main className="flex-1 container mx-auto w-full px-4 pt-16 pb-10">
              {children}
            </main>

            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
} 