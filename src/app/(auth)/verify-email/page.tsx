'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import { logInfo } from '@/lib/logger';

/**
 * Verify Email Page
 * Auto-redirects to login after simulating email verification
 * 
 * @returns Verify email component with loading animation
 */
export default function VerifyEmailPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Log email verification
    logInfo('auth-event', {
      action: 'email-verification-processing',
      timestamp: new Date().toISOString()
    });
    
    // Simulate verification process and redirect
    const timer = setTimeout(() => {
      logInfo('auth-event', {
        action: 'email-verification-success',
        timestamp: new Date().toISOString()
      });
      
      router.replace('/auth/login');
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <CheckCircle size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Verifying Your Email
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Please wait while we verify your email address...
          </p>
        </div>
        
        <div className="flex justify-center py-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        </div>
        
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          You will be redirected to the login page shortly.
        </p>
      </Card>
    </div>
  );
} 