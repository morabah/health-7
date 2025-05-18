/**
 * Error Boundary Components
 * 
 * This file exports all error boundary components for easy imports
 */

// Base error boundary components
export { default as GlobalErrorBoundary } from './GlobalErrorBoundary';
export { ErrorBoundaryProvider, useErrorBoundary, withErrorBoundary } from './ErrorBoundaryProvider';

// New unified customizable error boundary
export { default as CustomizableErrorBoundary } from './CustomizableErrorBoundary';
export type { CustomizableErrorFallbackProps, ErrorAction } from './CustomizableErrorBoundary';

// Specialized error boundaries (most are now wrappers around CustomizableErrorBoundary)
export { default as ApiErrorBoundary } from './ApiErrorBoundary';
export { default as FormErrorBoundary } from './FormErrorBoundary';
export { default as BookingWorkflowErrorBoundary } from './BookingWorkflowErrorBoundary';
export { default as BookingPaymentErrorBoundary } from './BookingPaymentErrorBoundary';

// Existing specialized error boundaries
export { default as DoctorProfileErrorBoundary } from './DoctorProfileErrorBoundary';
export { default as DataLoadingErrorBoundary } from './DataLoadingErrorBoundary';
export { default as TimeSlotSelectionErrorBoundary } from './TimeSlotSelectionErrorBoundary';
export { default as AuthErrorBoundary } from './AuthErrorBoundary';
export { default as AdminDashboardErrorBoundary } from './AdminDashboardErrorBoundary';
export { default as AppointmentErrorBoundary } from './AppointmentErrorBoundary';

// Export types
export type { GlobalErrorFallbackProps } from './GlobalErrorBoundary';

// Re-export the base ErrorBoundary for flexibility
export { default as ErrorBoundary } from '../ui/ErrorBoundary';