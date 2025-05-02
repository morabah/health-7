'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { CheckCircle, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { logInfo } from '@/lib/logger';
import { UserType } from '@/types/enums';

/**
 * Pending verification page shown to users after they register
 * Informs them to check their email for verification
 */
export default function PendingVerificationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  
  // Check if user is already verified - for now we just redirect based on role
  // Firebase email verification would be implemented in a production version
  useEffect(() => {
    if (user) {
      // If user is already active, redirect to the appropriate dashboard
      const isVerified = true; // Simplified for local development
      
      if (isVerified) {
        const destination = user.role === UserType.DOCTOR 
          ? '/doctor/dashboard' 
          : '/patient/dashboard';
        
        logInfo('User already verified, redirecting', { destination });
        router.push(destination);
      }
    }
  }, [user, router]);
  
  // Handler for resending verification email
  // This is a stub for local development
  const handleResendVerification = async () => {
    setIsResending(true);
    setResendSuccess(false);
    setResendError(null);
    
    try {
      // In a real app, we would call Firebase or another auth provider here
      // For local development, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1500));
      setResendSuccess(true);
      logInfo('Verification email resent successfully');
    } catch (error) {
      // Handle error
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend verification email';
      setResendError(errorMessage);
      logInfo('Failed to resend verification email', { error: errorMessage });
    } finally {
      setIsResending(false);
    }
  };
  
  // If no user is logged in, show a different message
  if (!user) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card className="p-8 text-center">
          <div className="mb-6">
            <Mail className="w-16 h-16 mx-auto text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Verification Required</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            You need to be logged in to verify your account. Please log in to continue the verification process.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/auth/login">
              <Button variant="primary" className="w-full sm:w-auto">Sign In</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full sm:w-auto">Return to Home</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="max-w-lg mx-auto p-6">
      <Card className="p-8">
        <div className="text-center mb-8">
          <Mail className="w-16 h-16 mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
          <p className="text-slate-600 dark:text-slate-300">
            We've sent a verification link to your email address:
            <span className="block font-medium mt-2">{user.email}</span>
          </p>
        </div>
        
        {resendSuccess && (
          <Alert variant="success" className="mb-6">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Verification email resent successfully!
            </div>
          </Alert>
        )}
        
        {resendError && (
          <Alert variant="error" className="mb-6">
            {resendError}
          </Alert>
        )}
        
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h2 className="font-medium mb-2">Next steps:</h2>
            <ol className="list-decimal pl-5 space-y-2 text-slate-600 dark:text-slate-300">
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the verification link in the email</li>
              <li>Once verified, you'll be able to access your account</li>
            </ol>
          </div>
          
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <p className="text-center text-slate-600 dark:text-slate-300 mb-4">
              Didn't receive the email? Check your spam folder or click below to resend.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                onClick={handleResendVerification} 
                isLoading={isResending} 
                disabled={isResending || resendSuccess}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {resendSuccess ? 'Email Sent' : 'Resend Verification'}
              </Button>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full sm:w-auto">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
} 