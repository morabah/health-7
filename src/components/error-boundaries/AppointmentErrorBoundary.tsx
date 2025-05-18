'use client';

/**
 * @deprecated Use CustomizableErrorBoundary instead for more flexibility
 */

import React from 'react';
import CustomizableErrorBoundary from './CustomizableErrorBoundary';
import { Calendar, RefreshCw } from 'lucide-react';

/**
 * AppointmentErrorBoundary - Error boundary specifically for appointment-related components
 * This provides more contextual error messaging for appointment functionality
 * 
 * @deprecated Use CustomizableErrorBoundary directly for more flexibility
 */
export default function AppointmentErrorBoundary({ 
  children,
  componentName = 'AppointmentComponent'
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  return (
    <CustomizableErrorBoundary
      title="Unable to load appointments"
      message="We encountered an issue while loading your appointment information. This could be due to a temporary connectivity issue."
      icon={Calendar}
      category="appointment"
      componentName={componentName}
      actions={[
        {
          label: 'Retry Loading',
          icon: RefreshCw,
          variant: 'primary'
        }
      ]}
    >
      {children}
    </CustomizableErrorBoundary>
  );
} 