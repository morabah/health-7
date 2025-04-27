'use client';

import React from 'react';
import Link from 'next/link';
import { UserPlus, Stethoscope } from 'lucide-react';
import Card from '@/components/ui/Card';
import { logInfo } from '@/lib/logger';

/**
 * Register Choice Page
 * Allows users to select their account type (Patient or Doctor)
 * 
 * @returns Register choice component with account type selection
 */
export default function RegisterChoicePage() {
  // Log page view for analytics
  React.useEffect(() => {
    logInfo('auth-event', {
      action: 'register-choice-view',
      timestamp: new Date().toISOString()
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create an Account</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Choose your account type</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 py-4">
          <Card 
            className="flex-1 p-5 border-2 border-slate-200 hover:border-primary cursor-pointer transition-colors flex flex-col"
            onClick={() => {
              logInfo('auth-event', { action: 'register-type-selected', type: 'patient' });
              window.location.href = '/auth/register/patient';
            }}
          >
            <div className="mb-4 text-primary">
              <UserPlus size={24} />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Patient</h2>
            <p className="text-slate-600 dark:text-slate-400 flex-grow">
              Personal health management
            </p>
            <Link 
              href="/auth/register/patient"
              className="text-primary hover:underline text-sm mt-4 inline-block"
            >
              Continue as Patient →
            </Link>
          </Card>
          
          <Card 
            className="flex-1 p-5 border-2 border-slate-200 hover:border-primary cursor-pointer transition-colors flex flex-col"
            onClick={() => {
              logInfo('auth-event', { action: 'register-type-selected', type: 'doctor' });
              window.location.href = '/auth/register/doctor';
            }}
          >
            <div className="mb-4 text-primary">
              <Stethoscope size={24} />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Doctor</h2>
            <p className="text-slate-600 dark:text-slate-400 flex-grow">
              Professional credentials
            </p>
            <Link 
              href="/auth/register/doctor"
              className="text-primary hover:underline text-sm mt-4 inline-block"
            >
              Continue as Doctor →
            </Link>
          </Card>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
} 