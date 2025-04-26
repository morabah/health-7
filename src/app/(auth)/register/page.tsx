import React from 'react';
import Link from 'next/link';

/**
 * Register Choice Page
 * Allows users to select their account type (Patient or Doctor)
 * 
 * @returns Register choice component with account type selection
 */
export default function RegisterChoicePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create an Account</h1>
          <p className="text-gray-600">Choose your account type</p>
        </div>
        
        <div className="grid grid-cols-1 gap-4 py-4">
          <Link 
            href="/auth/register/patient"
            className="block p-6 border-2 border-blue-200 rounded-lg hover:border-blue-500 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Patient</h2>
            <p className="text-gray-600">
              Create a patient account to find doctors and book appointments
            </p>
          </Link>
          
          <Link 
            href="/auth/register/doctor"
            className="block p-6 border-2 border-green-200 rounded-lg hover:border-green-500 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Healthcare Provider</h2>
            <p className="text-gray-600">
              Create a healthcare provider account to offer your services
            </p>
          </Link>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 