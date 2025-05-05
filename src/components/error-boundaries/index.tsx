'use client';

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { logWarn, logError } from '@/lib/logger';

// Base error boundary props
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

// Base error boundary state
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Base Error Boundary component that catches and logs errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { componentName } = this.props;
    // Log the error to an error reporting service
    logError(`Error in ${componentName || 'component'}:`, error);
    logWarn('Component stack:', errorInfo.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="p-4 rounded bg-red-50 border border-red-100 text-red-700">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="mb-4">There was an error rendering this component.</p>
          {this.state.error && process.env.NODE_ENV === 'development' && (
            <pre className="bg-red-100 p-3 rounded text-sm overflow-auto">
              {this.state.error.toString()}
            </pre>
          )}
          <button
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded mt-2"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Specialized Error Boundary for Appointment components
 */
export function AppointmentErrorBoundary({
  children,
  componentName,
}: {
  children: ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName || 'Appointment Component'}
      fallback={
        <div className="p-4 rounded bg-red-50 border border-red-100 text-red-700">
          <h2 className="text-lg font-semibold mb-2">Appointments Error</h2>
          <p className="mb-2">There was a problem loading your appointments.</p>
          <p className="mb-4">
            This might be due to a temporary issue. Please try again later or contact support if the
            problem persists.
          </p>
          <button
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Specialized Error Boundary for Profile components
 */
export function ProfileErrorBoundary({
  children,
  componentName,
}: {
  children: ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName || 'Profile Component'}
      fallback={
        <div className="p-4 rounded bg-red-50 border border-red-100 text-red-700">
          <h2 className="text-lg font-semibold mb-2">Profile Error</h2>
          <p className="mb-2">There was a problem loading your profile.</p>
          <p className="mb-4">
            This might be due to a temporary issue. Please try again later or contact support if the
            problem persists.
          </p>
          <button
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Specialized Error Boundary for Dashboard components
 */
export function DashboardErrorBoundary({
  children,
  componentName,
}: {
  children: ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName || 'Dashboard Component'}
      fallback={
        <div className="p-4 rounded bg-red-50 border border-red-100 text-red-700">
          <h2 className="text-lg font-semibold mb-2">Dashboard Error</h2>
          <p className="mb-2">There was a problem loading your dashboard.</p>
          <p className="mb-4">
            This might be due to a temporary issue. Please try again later or contact support if the
            problem persists.
          </p>
          <button
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Specialized Error Boundary for Time Slot Selection components
 */
export function TimeSlotSelectionErrorBoundary({
  children,
  componentName,
}: {
  children: ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName || 'Time Slot Selection Component'}
      fallback={
        <div className="p-4 rounded bg-red-50 border border-red-100 text-red-700">
          <h2 className="text-lg font-semibold mb-2">Error Loading Time Slots</h2>
          <p className="mb-2">There was a problem loading available appointment times.</p>
          <p className="mb-4">
            This might be due to a temporary issue. Please try again later or contact support if the
            problem persists.
          </p>
          <button
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Specialized Error Boundary for Booking Payment components
 */
export function BookingPaymentErrorBoundary({
  children,
  componentName,
}: {
  children: ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName || 'Booking Payment Component'}
      fallback={
        <div className="p-4 rounded bg-red-50 border border-red-100 text-red-700">
          <h2 className="text-lg font-semibold mb-2">Payment Error</h2>
          <p className="mb-2">There was a problem processing your payment.</p>
          <p className="mb-4">
            This might be due to a temporary issue. Please try again later or contact support if the
            problem persists.
          </p>
          <button
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Retry Payment
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Specialized Error Boundary for Booking Workflow components
 */
export function BookingWorkflowErrorBoundary({
  children,
  componentName,
}: {
  children: ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName || 'Booking Workflow Component'}
      fallback={
        <div className="p-4 rounded bg-red-50 border border-red-100 text-red-700">
          <h2 className="text-lg font-semibold mb-2">Booking Error</h2>
          <p className="mb-2">There was a problem with the booking process.</p>
          <p className="mb-4">
            This might be due to a temporary issue. Please try again later or contact support if the
            problem persists.
          </p>
          <button
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded mr-2"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
          <button
            className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-white rounded"
            onClick={() => (window.location.href = '/find-doctors')}
          >
            Back to Find Doctors
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Specialized Error Boundary for Auth components
 */
export function AuthErrorBoundary({
  children,
  componentName,
}: {
  children: ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName || 'Authentication Component'}
      fallback={
        <div className="p-4 rounded bg-red-50 border border-red-100 text-red-700">
          <h2 className="text-lg font-semibold mb-2">Authentication Error</h2>
          <p className="mb-2">There was a problem with the authentication process.</p>
          <p className="mb-4">
            This might be due to a temporary issue. Please try again later or contact support if the
            problem persists.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
            <button
              className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-white rounded"
              onClick={() => (window.location.href = '/')}
            >
              Go to Home
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
