'use client';

/**
 * @deprecated Use CustomizableErrorBoundary instead for more flexibility
 */

import React, { useState, useEffect } from 'react';
import CustomizableErrorBoundary, { ErrorAction } from './CustomizableErrorBoundary';
import { ValidationError } from '@/lib/errors/errorClasses';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Form Error Boundary
 * 
 * A specialized error boundary for form submissions that provides appropriate
 * error handling and UI for form-related errors, especially validation errors.
 * 
 * @deprecated Use CustomizableErrorBoundary directly for more flexibility
 */
interface FormErrorBoundaryProps {
  children: React.ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function FormErrorBoundary({
  children,
  componentName = 'Form Component',
  onError,
}: FormErrorBoundaryProps) {
  // Create a component that will handle the dynamic error message and validation errors
  const DynamicFormErrorHandler: React.FC<{
    error: Error | null;
    resetErrorBoundary: () => void;
  }> = ({ error, resetErrorBoundary }) => {
    const [title, setTitle] = useState('Form Submission Error');
    const [message, setMessage] = useState('There was a problem with your form submission.');
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
    
    useEffect(() => {
      if (!error) return;
      
      // Check if it's a validation error with specific validation errors
      const isValidationError = error instanceof ValidationError;
      
      if (isValidationError) {
        setTitle('Form Validation Error');
        setMessage('Please correct the following issues:');
        setValidationErrors((error as ValidationError).validationErrors || {});
      } else {
        setTitle('Form Submission Error');
        setMessage(error.message || 'There was a problem with your form submission.');
      }
    }, [error]);
    
    // Format validation errors as a string message
    const getFormattedErrorMessage = (): string => {
      if (Object.keys(validationErrors).length === 0) {
        return message;
      }
      
      // Convert validation errors to a formatted string
      const errorList = Object.entries(validationErrors)
        .map(([field, errors]) => {
          const errorText = Array.isArray(errors) ? errors[0] : errors;
          return `${field}: ${errorText}`;
        })
        .join('\n');
      
      return `${message}\n\n${errorList}`;
    };
    
    return (
      <CustomizableErrorBoundary
        title={title}
        message={getFormattedErrorMessage()}
        icon={AlertTriangle}
        category="validation"
        componentName={componentName}
        actions={[
          {
            label: 'Try Again',
            icon: RefreshCw,
            onClick: resetErrorBoundary,
            variant: 'primary'
          }
        ]}
        onError={onError}
        additionalContext={{
          isValidationError: error instanceof ValidationError,
          validationErrors: error instanceof ValidationError ? 
            (error as ValidationError).validationErrors : undefined
        }}
      >
        {children}
      </CustomizableErrorBoundary>
    );
  };
  
  return <DynamicFormErrorHandler error={null} resetErrorBoundary={() => {}} />;
}

export default FormErrorBoundary;
