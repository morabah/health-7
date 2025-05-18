'use client';

/**
 * @deprecated Use CustomizableErrorBoundary instead for more flexibility
 */

import React, { useState, useEffect } from 'react';
import CustomizableErrorBoundary, { ErrorAction } from './CustomizableErrorBoundary';
import { ApiError } from '@/lib/errors/errorClasses';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw, Home, LogIn } from 'lucide-react';

/**
 * API Error Boundary
 * 
 * A specialized error boundary for API calls that provides appropriate
 * error handling and UI for API-related errors.
 * 
 * @deprecated Use CustomizableErrorBoundary directly for more flexibility
 */
interface ApiErrorBoundaryProps {
  children: React.ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function ApiErrorBoundary({
  children,
  componentName = 'API Component',
  onError,
}: ApiErrorBoundaryProps) {
  // Create a component that will handle the dynamic error message and actions
  const DynamicApiErrorHandler: React.FC<{
    error: Error | null;
    resetErrorBoundary: () => void;
  }> = ({ error, resetErrorBoundary }) => {
    const router = useRouter();
    const [title, setTitle] = useState('API Error');
    const [message, setMessage] = useState('We encountered an issue while communicating with our servers.');
    const [actions, setActions] = useState<ErrorAction[]>([]);
    
    useEffect(() => {
      if (!error) return;
      
      // Check if it's an API error with a specific status code
      const isApiError = error instanceof ApiError;
      const statusCode = isApiError ? (error as ApiError).statusCode : undefined;
      
      // Determine if it's an authentication error
      const isAuthError = isApiError && (statusCode === 401 || statusCode === 403);
      
      // Set title based on error type
      setTitle(isApiError ? `API Error ${statusCode ? `(${statusCode})` : ''}` : 'Data Loading Error');
      
      // Set message based on error type
      if (isAuthError) {
        setMessage('Your session has expired or you don\'t have permission to access this resource. Please log in again.');
      } else if (isApiError && statusCode === 404) {
        setMessage('The requested resource was not found. It may have been deleted or moved.');
      } else if (isApiError && statusCode === 500) {
        setMessage('We encountered a server error. Our team has been notified and is working to fix the issue.');
      } else if (isApiError && statusCode === 429) {
        setMessage('Too many requests. Please wait a moment before trying again.');
      } else {
        setMessage(error.message || 'We encountered an issue while communicating with our servers.');
      }
      
      // Set actions based on error type
      const newActions: ErrorAction[] = [];
      
      if (isAuthError) {
        newActions.push({
          label: 'Go to Login',
          icon: LogIn,
          onClick: () => {
            router.push('/auth/login');
            resetErrorBoundary();
          },
          variant: 'primary'
        });
      } else {
        newActions.push({
          label: 'Try Again',
          icon: RefreshCw,
          onClick: resetErrorBoundary,
          variant: 'primary'
        });
      }
      
      newActions.push({
        label: 'Go to Home',
        icon: Home,
        onClick: () => {
          router.push('/');
          resetErrorBoundary();
        },
        variant: 'outline'
      });
      
      setActions(newActions);
    }, [error, resetErrorBoundary, router]);
    
    return (
      <CustomizableErrorBoundary
        title={title}
        message={message}
        icon={AlertCircle}
        category="api"
        componentName={componentName}
        actions={actions}
        additionalContext={{
          statusCode: error instanceof ApiError ? (error as ApiError).statusCode : undefined,
          errorType: error ? error.name : undefined
        }}
        onError={onError}
      >
        {children}
      </CustomizableErrorBoundary>
    );
  };
  
  return <DynamicApiErrorHandler error={null} resetErrorBoundary={() => {}} />;
}

export default ApiErrorBoundary;
