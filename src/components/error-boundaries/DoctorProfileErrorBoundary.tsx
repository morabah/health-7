'use client';

/**
 * @deprecated Use CustomizableErrorBoundary instead for more flexibility
 */

import React from 'react';
import CustomizableErrorBoundary from './CustomizableErrorBoundary';
import { UserCog, RefreshCw, ArrowLeft } from 'lucide-react';

/**
 * DoctorProfileErrorBoundary - Error boundary for doctor profile-related components
 * This provides more contextual error messaging for doctor profile functionality
 * 
 * @deprecated Use CustomizableErrorBoundary directly for more flexibility
 */
export default function DoctorProfileErrorBoundary({ 
  children,
  componentName = 'DoctorProfileComponent'
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  return (
    <CustomizableErrorBoundary
      title="Unable to load doctor profile"
      message="We encountered an issue while loading the doctor profile information. This could be due to a temporary server issue."
      icon={UserCog}
      category="data"
      componentName={componentName}
      actions={[
        {
          label: 'Retry Loading',
          icon: RefreshCw,
          variant: 'primary'
        },
        {
          label: 'Back to Dashboard',
          icon: ArrowLeft,
          href: '/doctor/dashboard',
          variant: 'outline'
        }
      ]}
    >
      {children}
    </CustomizableErrorBoundary>
  );
} 