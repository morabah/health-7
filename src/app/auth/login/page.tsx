'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { auth } from '@/lib/realFirebaseConfig';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { logInfo, logError } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';
import AuthErrorBoundary from '@/components/error-boundaries/AuthErrorBoundary';
import { directLoginUser } from '@/lib/directLoginUser';
import { IS_DEVELOPMENT } from '@/config/appConfig';

/**
 * Login Page
 * Connects to live Firebase Authentication service for user login
 * Implements P-LOGIN and D-LOGIN user stories against live development cloud
 *
 * @returns Login form component
 */
export default function LoginPage() {
  return (
    <AuthErrorBoundary componentName="LoginPage">
      <LoginPageContent />
    </AuthErrorBoundary>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const perf = trackPerformance('handleLoginSubmit_Live');
    logInfo('Login attempt started (Live Auth)', { email });

    // Check Auth Instance
    if (!auth) {
      setErrorMsg('Authentication service is currently unavailable. Please try again later.');
      setIsLoading(false);
      logError('[Login Page] Firebase Auth instance is null during login attempt.');
      perf.stop();
      return;
    }

    try {
      // Use direct login implementation which now uses real Firebase Auth
      logInfo('Attempting login with direct implementation');
      const result = await directLoginUser(email, password);
      
      if (result.success) {
        logInfo('Login successful with direct implementation:', { 
          email: result.email,
          userId: result.userId,
          userType: result.userType 
        });
        
        // Redirect to the appropriate dashboard based on user type
        const dashboardPath = result.userType === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';
        router.push(dashboardPath);
        perf.stop();
        return;
      } else {
        // If login fails, throw an error to be caught below
        throw new Error(result.errorMessage || 'Login failed');
      }
      

    } catch (error: any) {
      logError('Login failed (Live Auth)', { 
        email, 
        errorCode: error.code, 
        errorMessage: error.message 
      });
      
      // Map specific Firebase Auth error codes to user-friendly messages
      let friendlyMessage = 'Login failed. Please check your credentials or try again.';
      
      if (error.code === 'auth/user-not-found' || 
          error.code === 'auth/wrong-password' || 
          error.code === 'auth/invalid-credential') {
        friendlyMessage = 'Invalid email or password provided.';
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'The email address is not valid.';
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
      } else if (error.code === 'auth/user-disabled') {
        friendlyMessage = 'This account has been disabled. Please contact support.';
      } else if (error.code === 'auth/network-request-failed') {
        friendlyMessage = 'Network error. Please check your connection and try again.';
      }
      
      setErrorMsg(friendlyMessage);
    } finally {
      setIsLoading(false);
      perf.stop();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LogIn size={20} /> Sign In
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Access your health account</p>
        </div>

        {errorMsg && <Alert variant="error">{errorMsg}</Alert>}

        <form className="space-y-4" onSubmit={handleLogin}>
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

          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            required
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex items-center justify-between">
            <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-primary hover:underline">
              Create Account
            </Link>
          </p>
        </div>

        <div className="text-center mt-6 p-4 border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Live Authentication</h3>
          <p className="text-sm text-blue-600 dark:text-blue-300 mb-2">
            This login connects to the live Firebase Authentication service
          </p>
          <p className="text-xs text-blue-500 dark:text-blue-400">
            Use valid credentials from the Firebase Authentication console
          </p>
        </div>
      </Card>
    </div>
  );
}
