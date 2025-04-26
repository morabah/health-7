import React from 'react';
import Link from 'next/link';

/**
 * Homepage (root route)
 * Entry point for the application with service overview
 * Also serves as a development entry point to CMS functionality
 * 
 * @returns Homepage component with links to authentication, information pages, and CMS
 */
export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Health Appointment System</h1>
        <p className="text-lg text-gray-600">Find and book appointments with healthcare providers</p>
      </header>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 border rounded-lg">
            <h3 className="text-xl font-medium mb-2">1. Find a Doctor</h3>
            <p>Search for healthcare providers by specialty, location, and languages</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="text-xl font-medium mb-2">2. Book an Appointment</h3>
            <p>Select a convenient time from available slots</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="text-xl font-medium mb-2">3. Manage Your Care</h3>
            <p>Keep track of appointments and health information</p>
          </div>
        </div>
      </section>

      <div className="text-center mb-8">
        <Link href="/auth/register" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md mr-4">
          Get Started
        </Link>
        <Link href="/auth/login" className="inline-block px-6 py-3 bg-gray-200 text-gray-800 rounded-md">
          Log In
        </Link>
      </div>
      
      {/* CMS Development Entry Point */}
      <div className="mt-16 p-4 border-t border-gray-200">
        <h2 className="text-xl font-semibold mb-2">Development Resources</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/cms" className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
            CMS Portal
          </Link>
          <Link href="/about" className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
            About
          </Link>
          <Link href="/contact" className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
} 