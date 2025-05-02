'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { logError } from '@/lib/logger';
import { errorMonitor } from '@/lib/errorMonitoring';
import { RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string; // Optional name for component identification
  userId?: string; // Optional user ID for error context
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to our logging service
    logError('ErrorBoundary caught an error', { error, errorInfo });
    
    // Report to the error monitoring service with component context
    errorMonitor.captureException(error, {
      component: this.props.componentName || 'ErrorBoundary',
      userId: this.props.userId,
      errorInfo: {
        componentStack: errorInfo.componentStack
      }
    });
    
    // Call the optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Otherwise, use default fallback UI
      return (
        <div className="p-4 flex flex-col items-center justify-center min-h-[200px] space-y-4 text-center">
          <Alert variant="error">
            <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
            <p className="text-sm mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
          </Alert>
          
          <div className="flex space-x-4">
            <Button onClick={this.handleRetry} variant="primary" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 