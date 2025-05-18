'use client';

/**
 * @deprecated Use CustomizableErrorBoundary instead for more flexibility
 */

import React from 'react';
import CustomizableErrorBoundary from './CustomizableErrorBoundary';
import { ShieldAlert, RefreshCw, Home, Settings } from 'lucide-react';

/**
 * AdminDashboardErrorBoundary - Error boundary specifically for admin dashboard components
 * This provides more contextual error messaging for admin functionality
 * 
 * @example
 * <AdminDashboardErrorBoundary>
 *   <AdminDashboardComponent />
 * </AdminDashboardErrorBoundary>
 * 
 * @deprecated Use CustomizableErrorBoundary directly for more flexibility
 */
export default function AdminDashboardErrorBoundary({ 
  children,
  componentName = 'AdminDashboardComponent'
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  return (
    <CustomizableErrorBoundary
      title="Admin Dashboard Error"
      message="We encountered an issue while loading the administrative panel. This could be due to missing permissions or a temporary system issue."
      icon={ShieldAlert}
      category="api"
      componentName={componentName}
      actions={[
        {
          label: 'Retry Loading',
          icon: RefreshCw,
          variant: 'primary'
        },
        {
          label: 'Return to Home',
          icon: Home,
          href: '/',
          variant: 'outline'
        },
        {
          label: 'System Settings',
          icon: Settings,
          href: '/admin/settings',
          variant: 'ghost'
        }
      ]}
    >
      {children}
    </CustomizableErrorBoundary>
  );
} 