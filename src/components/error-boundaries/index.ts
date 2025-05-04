/**
 * Error Boundary Components
 * 
 * This file exports all error boundary components for easy imports
 */

export { default as RootErrorBoundary } from '../layout/RootErrorBoundary';
export { default as AppointmentErrorBoundary } from './AppointmentErrorBoundary';
export { default as DoctorProfileErrorBoundary } from './DoctorProfileErrorBoundary';
export { default as DataLoadingErrorBoundary } from './DataLoadingErrorBoundary';
export { default as AuthErrorBoundary } from './AuthErrorBoundary';
export { default as AdminDashboardErrorBoundary } from './AdminDashboardErrorBoundary';
export { default as PaymentProcessingErrorBoundary } from './PaymentProcessingErrorBoundary';
export { default as BookingWorkflowErrorBoundary } from './BookingWorkflowErrorBoundary';

// Specialized booking workflow error boundaries
export { default as TimeSlotSelectionErrorBoundary } from './TimeSlotSelectionErrorBoundary';
export { default as BookingPaymentErrorBoundary } from './BookingPaymentErrorBoundary';

// Re-export the base ErrorBoundary for flexibility
export { default as ErrorBoundary } from '../ui/ErrorBoundary';
export { default as withErrorBoundary } from '../ui/withErrorBoundary'; 