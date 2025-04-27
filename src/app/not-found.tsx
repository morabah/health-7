import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 max-w-lg w-full text-center">
        <h1 className="text-6xl font-bold text-slate-900 dark:text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-6">Page Not Found</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link 
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </Link>
          <Link
            href="/auth/login"
            className="px-6 py-3 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
} 