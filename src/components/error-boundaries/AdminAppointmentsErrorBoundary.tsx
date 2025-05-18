'use client';

import React from 'react';
import CustomizableErrorBoundary from './CustomizableErrorBoundary';
import { Calendar, RefreshCw, List } from 'lucide-react';
import { getUserFriendlyMessage } from '@/lib/errors/errorUtils';

/**
 * AdminAppointmentsErrorBoundary - Error boundary specifically for admin appointment components
 * This provides contextual error messaging for admin appointment functionality
 */
export default function AdminAppointmentsErrorBoundary({ 
  children,
  componentName = 'AdminAppointmentsComponent'
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  return (
    <CustomizableErrorBoundary
      title="Unable to load appointments"
      message="We encountered an issue while loading the appointment information. This could be due to a temporary connectivity issue or a problem with the data."
      icon={Calendar}
      category="appointment"
      componentName={componentName}
      actions={[
        {
          label: 'Retry Loading',
          icon: RefreshCw,
          variant: 'primary'
        },
        {
          label: 'View All Appointments',
          icon: List,
          href: '/admin/appointments',
          variant: 'outline'
        }
      ]}
      additionalContext={{
        feature: 'admin_appointments',
        importance: 'high'
      }}
    >
      {children}
    </CustomizableErrorBoundary>
  );
}
