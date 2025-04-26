import React from 'react';
import Link from 'next/link';

/**
 * CMS Landing Page
 * Root page for the content management system
 * Serves as an entry point for various CMS functionalities
 * 
 * @returns CMS Portal dashboard component
 */
export default function CMSPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">CMS Portal</h1>
          <Link href="/" className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md">
            Back to Site
          </Link>
        </div>
        <p className="text-gray-600 mt-2">Manage content and system settings</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 border rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-3">User Management</h2>
          <p className="text-gray-600 mb-4">
            Manage patients, doctors, and administrators
          </p>
          <div className="mt-auto">
            <Link 
              href="/cms/users" 
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Manage Users
            </Link>
          </div>
        </div>
        
        <div className="p-6 border rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-3">Content Management</h2>
          <p className="text-gray-600 mb-4">
            Edit site content, announcements, and resources
          </p>
          <div className="mt-auto">
            <Link 
              href="/cms/content" 
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Manage Content
            </Link>
          </div>
        </div>
        
        <div className="p-6 border rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-3">System Settings</h2>
          <p className="text-gray-600 mb-4">
            Configure application settings and preferences
          </p>
          <div className="mt-auto">
            <Link 
              href="/cms/settings" 
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              System Settings
            </Link>
          </div>
        </div>
        
        <div className="p-6 border rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-3">Doctor Verification</h2>
          <p className="text-gray-600 mb-4">
            Review and verify healthcare provider credentials
          </p>
          <div className="mt-auto">
            <Link 
              href="/cms/doctor-verification" 
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Verification Queue
            </Link>
          </div>
        </div>
        
        <div className="p-6 border rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-3">Analytics</h2>
          <p className="text-gray-600 mb-4">
            View reports and system usage statistics
          </p>
          <div className="mt-auto">
            <Link 
              href="/cms/analytics" 
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              View Analytics
            </Link>
          </div>
        </div>
        
        <div className="p-6 border rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-3">Notifications</h2>
          <p className="text-gray-600 mb-4">
            Manage system-wide notifications and alerts
          </p>
          <div className="mt-auto">
            <Link 
              href="/cms/notifications" 
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Manage Notifications
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 