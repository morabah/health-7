'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Home } from 'lucide-react';
import { reportError, errorMonitor } from '@/lib/errorMonitoring';
import Button from '@/components/ui/Button';
import ErrorDisplay from '@/components/ui/ErrorDisplay';

/**
 * Global Error Page
 * 
 * This page is used to display errors that occurred in the application.
 * It can be accessed directly by URL with an error ID for error sharing,
 * or through redirect from the error monitoring system.
 */
export default function ErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<any>(null);
  
  // Extract error ID from URL parameters
  const errorId = searchParams.get('id');
  
  useEffect(() => {
    // If error ID is present, try to retrieve error details from error monitor
    // In a real implementation, this would fetch from the error monitoring service
    if (errorId) {
      // For demonstration, we'll create a mock error to display
      const mockError = {
        message: 'An error occurred while processing your request',
        userMessage: 'We\'re sorry, but something went wrong.',
        category: searchParams.get('category') || 'unknown',
        severity: searchParams.get('severity') || 'error',
        timestamp: Date.now(),
        errorId,
      };
      
      setError(mockError);
    } else {
      // If no error ID, create a generic error
      setError({
        message: 'Unknown error',
        userMessage: 'We\'re sorry, but an unexpected error occurred.',
        category: 'unknown',
        severity: 'error',
        errorId: 'unknown',
        timestamp: Date.now(),
      });
    }
  }, [errorId, searchParams]);
  
  /**
   * Handle going back to the previous page
   */
  const handleGoBack = () => {
    router.back();
  };
  
  /**
   * Handle refreshing the page
   */
  const handleRefresh = () => {
    window.location.reload();
  };
  
  /**
   * Handle going to the home page
   */
  const handleGoHome = () => {
    router.push('/');
  };
  
  /**
   * Get help content based on error category
   */
  const getHelpContent = () => {
    if (!error) return null;
    
    const category = error.category;
    
    switch (category) {
      case 'network':
        return (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Connection Issues</h3>
            <p>It looks like there may be a problem with your internet connection or our servers.</p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>Check your internet connection</li>
              <li>Try refreshing the page</li>
              <li>If the problem persists, please try again later</li>
            </ul>
          </div>
        );
      case 'auth':
        return (
          <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Authentication Issue</h3>
            <p>There was a problem with your login session.</p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>Your session may have expired</li>
              <li>Try logging in again</li>
              <li>Clear your browser cookies and try again</li>
            </ul>
            <div className="mt-4">
              <Button variant="primary" onClick={() => router.push('/auth/login')}>
                Go to Login
              </Button>
            </div>
          </div>
        );
      case 'permission':
        return (
          <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Permission Denied</h3>
            <p>You don't have permission to access this resource.</p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>Make sure you're logged in with the correct account</li>
              <li>Contact support if you believe this is an error</li>
            </ul>
          </div>
        );
      case 'appointment':
        return (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Appointment Issue</h3>
            <p>There was a problem with your appointment.</p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>The time slot may no longer be available</li>
              <li>Try booking another appointment time</li>
              <li>Check your appointments page for more information</li>
            </ul>
            <div className="mt-4">
              <Button variant="primary" onClick={() => router.push('/patient/appointments')}>
                View My Appointments
              </Button>
            </div>
          </div>
        );
      default:
        return (
          <div className="mt-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Unexpected Error</h3>
            <p>We're sorry, but something unexpected happened.</p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>Try refreshing the page</li>
              <li>Go back to the previous page and try again</li>
              <li>If the problem persists, please contact support</li>
            </ul>
          </div>
        );
    }
  };
  
  // If no error is available yet, show a loading state
  if (!error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading error information...</h1>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-800 p-6">
          <h1 className="text-2xl font-bold">Oops! Something went wrong</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            We've encountered an error while processing your request.
          </p>
        </div>
        
        <div className="p-6">
          {/* Error Display */}
          <ErrorDisplay
            error={error}
            message={error.userMessage}
            category={error.category}
            severity={error.severity}
            errorId={error.errorId}
            context={error.context}
          />
          
          {/* Help Content */}
          {getHelpContent()}
          
          {/* Error Reference */}
          <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
            If you need assistance, please reference this error ID: <span className="font-mono">{error.errorId}</span>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
            
            <Button
              variant="primary"
              onClick={handleGoHome}
              className="flex items-center"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 