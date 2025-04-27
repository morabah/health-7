'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { logInfo } from '@/lib/logger';

/**
 * Forgot Password Page
 * Allows users to request a password reset link
 * 
 * @returns Forgot password form component
 */
export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Log password reset request
    logInfo('auth-event', {
      action: 'password-reset-request',
      email,
      timestamp: new Date().toISOString()
    });
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
    }, 700);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound size={20} /> Forgot Password
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Enter your email to receive a password reset link
          </p>
        </div>
        
        {submitted ? (
          <div>
            <Alert variant="info">
              If an account exists with the email {email}, a password reset link has been sent. 
              Please check your inbox and follow the instructions.
            </Alert>
            <div className="mt-6 text-center">
              <Link href="/auth/login" className="text-primary hover:underline">
                Return to login
              </Link>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              id="email"
              name="email"
              type="email"
              label="Email Address"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              isLoading={isLoading}
            >
              Send Reset Link
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Remembered your password?{' '}
                <Link href="/auth/login" className="text-primary hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
} 