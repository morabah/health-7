'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { CheckCircle, Mail, ArrowLeft, RefreshCw, Clock, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { logInfo, logError } from '@/lib/logger';
import { UserType } from '@/types/enums';

/**
 * Pending verification page shown to users after they register
 * Informs them to check their email for verification
 */
export default function PendingVerificationPage() {
  const router = useRouter();
  const { user, updateUserVerificationStatus } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  
  // Enhanced local dev simulation
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'processing' | 'verified'>('pending');
  const [verificationProgress, setVerificationProgress] = useState(0);

  /**
   * Simulates a user manually verifying their email for local development
   */
  const simulateManualVerification = async () => {
    if (verificationStatus !== 'pending' || !user) return;
    
    try {
      setVerificationStatus('processing');
      
      // Simulate a progress indicator
      const interval = setInterval(() => {
        setVerificationProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 300);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update user verification status in Auth context
      if (updateUserVerificationStatus) {
        await updateUserVerificationStatus(true);
      }
      
      setVerificationStatus('verified');
      logInfo('User manually verified their email (local dev simulation)');
      
      // Redirect after a brief delay to show success state
      setTimeout(() => {
        const destination = user.role === UserType.DOCTOR 
          ? '/doctor/dashboard' 
          : '/patient/dashboard';
        
        router.push(destination);
      }, 1500);
      
    } catch (error) {
      logError('Error in manual verification simulation', error);
      setResendError('Verification simulation failed');
      setVerificationStatus('pending');
      setVerificationProgress(0);
    }
  };
  
  // Check if user is already verified
  useEffect(() => {
    if (user) {
      // If user is already active, redirect to the appropriate dashboard
      if (user.emailVerified) {
        const destination = user.role === UserType.DOCTOR 
          ? '/doctor/dashboard' 
          : '/patient/dashboard';
        
        logInfo('User already verified, redirecting', { destination });
        router.push(destination);
      }
    }
  }, [user, router]);
  
  // Handler for resending verification email
  // Enhanced for more realistic local development simulation
  const handleResendVerification = async () => {
    setIsResending(true);
    setResendSuccess(false);
    setResendError(null);
    
    try {
      // In a real app, we would call Firebase or another auth provider here
      // For local development, we'll just simulate with a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Randomly simulate occasional failures (10% chance)
      if (Math.random() < 0.1) {
        throw new Error('Failed to send verification email. Server temporarily unavailable.');
      }
      
      setResendSuccess(true);
      logInfo('Verification email resent successfully');
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
      
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
  
  // Render the verified state (after manual verification in local dev)
  if (verificationStatus === 'verified') {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card className="p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Email Verified!</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Your email has been successfully verified. You'll be redirected to your dashboard shortly.
          </p>
          <div className="flex justify-center">
            <Link href={user.role === UserType.DOCTOR ? '/doctor/dashboard' : '/patient/dashboard'}>
              <Button variant="primary">Go to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }
  
  // Render the verification in progress state  
  if (verificationStatus === 'processing') {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card className="p-8 text-center">
          <div className="mb-6">
            <Clock className="w-16 h-16 mx-auto text-primary animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Verifying Your Email</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Please wait while we verify your email address...
          </p>
          
          {/* Progress bar */}
          <div className="w-full bg-slate-200 rounded-full h-2.5 mb-6">
            <div 
              className="bg-primary h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${verificationProgress}%` }}
            ></div>
          </div>
        </Card>
      </div>
    );
  }
  
  // Normal pending verification state
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
          
          {/* LOCAL DEV ONLY: Manual verification option */}
          {process.env.NODE_ENV === 'development' && (
            <div className="border-t border-b border-slate-200 dark:border-slate-700 py-4 my-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-sm">
                <div className="flex items-start">
                  <Lock className="w-5 h-5 mr-2 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-800 dark:text-yellow-300">Development Mode</h3>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      In development mode, you can simulate email verification without actually receiving an email.
                    </p>
                    <Button 
                      onClick={simulateManualVerification}
                      variant="primary"
                      size="sm"
                      className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-white"
                    >
                      Simulate Email Verification
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
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