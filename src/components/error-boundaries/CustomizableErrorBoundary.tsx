'use client';

import React, { ReactNode, useEffect, ComponentType } from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { AlertTriangle, RefreshCw, ArrowLeft, LucideIcon } from 'lucide-react';
import Button from '@/components/ui/Button';
import { ErrorMonitor } from '@/lib/errors/errorMonitoring';
import Link from 'next/link';
import { logError } from '@/lib/logger';
import { appEventBus, LogLevel } from '@/lib/eventBus';
import type { ErrorCategory } from '@/components/ui/ErrorDisplay';

// Define fallback props interface
interface ErrorBoundaryFallbackProps {
  error: Error | null;
  resetErrorBoundary: () => void;
}

export interface ErrorAction {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
}

export interface CustomizableErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
  title: string;
  message: string;
  icon?: LucideIcon;
  category?: ErrorCategory;
  actions?: ErrorAction[];
  showErrorDetails?: boolean;
  componentName?: string;
  errorInfo?: React.ErrorInfo;
  additionalContext?: Record<string, unknown>;
}

/**
 * Customizable Error Fallback UI
 * A flexible, reusable error UI component that can be customized for different error scenarios
 */
export const CustomizableErrorFallback: React.FC<CustomizableErrorFallbackProps> = ({
  error,
  resetError,
  title,
  message,
  icon: IconComponent = AlertTriangle,
  category = 'ui',
  actions = [],
  showErrorDetails = true,
  componentName = 'UnknownComponent',
  additionalContext = {},
}) => {
  // Report error to monitoring service
  useEffect(() => {
    if (error) {
      // Emit error event for centralized logging
      appEventBus.emit('log_event', {
        level: LogLevel.ERROR,
        message: `Error in ${componentName}: ${error.message}`,
        data: {
          component: componentName,
          errorMessage: error.message,
          stack: error.stack,
          ...additionalContext
        },
        timestamp: Date.now()
      });
        
      ErrorMonitor.getInstance().reportError(error, {
        component: componentName,
        severity: 'error',
        category,
        details: additionalContext
      });
      
      logError(`Error in ${componentName}`, { 
        error, 
        category,
        ...additionalContext
      });
    }
  }, [error, componentName, category, additionalContext]);

  // Default retry action if no actions are provided
  const defaultActions: ErrorAction[] = [
    {
      label: 'Retry',
      icon: RefreshCw,
      onClick: resetError,
      variant: 'primary'
    }
  ];

  // Use provided actions or default ones
  const errorActions = actions.length > 0 ? actions : defaultActions;

  return (
    <div className="p-6 rounded-lg border border-red-100 dark:border-red-900/30 bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-start">
        <div className="mr-4 mt-1 flex-shrink-0">
          <IconComponent className="h-8 w-8 text-red-500" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-2">
            {title}
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            {message}
          </p>
          
          {showErrorDetails && error && (
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md mb-4">
              <p className="text-sm text-red-800 dark:text-red-300">
                {error.message || 'An unexpected error occurred'}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {errorActions.map((action, index) => {
              const Icon = action.icon;
              
              // If href is provided, render a Link
              if (action.href) {
                return (
                  <Link href={action.href} key={index}>
                    <Button 
                      variant={action.variant || 'outline'}
                      size="sm"
                    >
                      {Icon && <Icon className="mr-2 h-4 w-4" aria-hidden="true" />}
                      {action.label}
                    </Button>
                  </Link>
                );
              }
              
              // Otherwise render a Button
              return (
                <Button 
                  key={index}
                  onClick={action.onClick || resetError}
                  variant={action.variant || 'outline'}
                  size="sm"
                >
                  {Icon && <Icon className="mr-2 h-4 w-4" aria-hidden="true" />}
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export interface CustomizableErrorBoundaryProps {
  children: ReactNode;
  title: string;
  message: string;
  icon?: LucideIcon;
  category?: ErrorCategory;
  actions?: ErrorAction[];
  showErrorDetails?: boolean;
  componentName?: string;
  additionalContext?: Record<string, unknown>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * CustomizableErrorBoundary - A flexible error boundary that can be configured for different contexts
 * 
 * @example
 * <CustomizableErrorBoundary
 *   title="Unable to load appointments"
 *   message="We encountered an issue while loading your appointment information."
 *   icon={Calendar}
 *   category="appointment"
 *   componentName="AppointmentList"
 *   actions={[
 *     { label: 'Retry', icon: RefreshCw, variant: 'primary' },
 *     { label: 'Back to Dashboard', icon: ArrowLeft, href: '/dashboard', variant: 'outline' }
 *   ]}
 * >
 *   <AppointmentList />
 * </CustomizableErrorBoundary>
 */
export default function CustomizableErrorBoundary({
  children,
  title,
  message,
  icon,
  category,
  actions = [],
  showErrorDetails = true,
  componentName = 'UnknownComponent',
  additionalContext = {},
  onError,
}: CustomizableErrorBoundaryProps) {
  // Create a fallback component that will be rendered when an error occurs
  const FallbackComponent: React.FC<ErrorBoundaryFallbackProps> = ({ error, resetErrorBoundary }) => (
    <CustomizableErrorFallback
      error={error}
      resetError={resetErrorBoundary}
      title={title}
      message={message}
      icon={icon}
      category={category}
      actions={actions}
      showErrorDetails={showErrorDetails}
      componentName={componentName}
      additionalContext={additionalContext}
    />
  );

  return (
    <ErrorBoundary
      componentName={componentName}
      onError={onError}
      fallback={<FallbackComponent error={null} resetErrorBoundary={() => {}} />}
    >
      {children}
    </ErrorBoundary>
  );
}
