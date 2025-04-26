'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { logInfo } from '@/lib/logger';

/**
 * Pending Verification Page
 * Displayed after registration, instructs users to check their email
 * 
 * @returns Pending verification component
 */
export default function PendingVerificationPage() {
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResendEmail = () => {
    setResending(true);
    setResendSuccess(false);
    
    // Log resend verification email request
    logInfo('auth-event', {
      action: 'resend-verification-email',
      timestamp: new Date().toISOString()
    });
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      setResending(false);
      setResendSuccess(true);
    }, 700);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Mail size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Check Your Email
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            We&apos;ve sent a verification link to your email address. Please check your inbox and click the link to verify your account.
          </p>
        </div>
        
        {resendSuccess && (
          <Alert variant="success">
            Verification email has been resent. Please check your inbox.
          </Alert>
        )}
        
        <div className="space-y-4">
          <Button 
            onClick={handleResendEmail}
            isLoading={resending}
            variant="outline"
            className="w-full"
          >
            Resend Verification Email
          </Button>
          
          <div className="text-center">
            <Link 
              href="/auth/login" 
              className="text-primary hover:underline inline-flex items-center"
            >
              Back to Login <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
} 