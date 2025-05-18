'use client';

import React, { useState } from 'react';
import { useErrorHandler } from '@/lib/errors/errorHandlingUtils';
import { ApiError, DataError } from '@/lib/errors/errorClasses';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

/**
 * Example component demonstrating standardized error handling
 */
export function ErrorHandlingExample() {
  const [counter, setCounter] = useState(0);
  
  // Use our custom error handling hook
  const { error, handleError, clearError } = useErrorHandler({
    componentName: 'ErrorHandlingExample',
    context: { feature: 'error-handling-demo' }
  });
  
  // Function that will trigger different types of errors
  const triggerError = (errorType: string) => {
    try {
      switch (errorType) {
        case 'api':
          throw new ApiError('API request failed', {
            statusCode: 500,
            context: { endpoint: '/api/example' }
          });
        case 'data':
          throw new DataError('Failed to load data', {
            context: { dataType: 'appointments' }
          });
        case 'validation':
          throw new Error('Validation failed: Required fields are missing');
        case 'runtime':
          // Simulate a runtime error
          const badArray: any = null;
          badArray.push('This will cause an error');
          break;
        default:
          throw new Error('Unknown error type');
      }
    } catch (err) {
      // Use our standardized error handler
      handleError(err);
    }
  };
  
  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Error Handling Example</h2>
      
      {/* Display error using our standardized ErrorDisplay component */}
      {error && (
        <ErrorDisplay
          error={error}
          severity="error"
          category={error instanceof ApiError ? 'api' : 'unknown'}
          onRetry={clearError}
          className="mb-4"
        />
      )}
      
      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={() => triggerError('api')} variant="outline">
          Trigger API Error
        </Button>
        <Button onClick={() => triggerError('data')} variant="outline">
          Trigger Data Error
        </Button>
        <Button onClick={() => triggerError('validation')} variant="outline">
          Trigger Validation Error
        </Button>
        <Button onClick={() => triggerError('runtime')} variant="outline">
          Trigger Runtime Error
        </Button>
        {error && (
          <Button onClick={clearError} variant="primary">
            Clear Error
          </Button>
        )}
      </div>
      
      <div className="border-t pt-4">
        <p className="text-sm text-gray-600 mb-2">
          Counter: {counter}
        </p>
        <Button 
          onClick={() => setCounter(prev => prev + 1)}
          size="sm"
          variant="ghost"
        >
          Increment Counter
        </Button>
        <p className="text-xs text-gray-500 mt-4">
          Note: The component continues to function even when errors occur
        </p>
      </div>
    </Card>
  );
}

/**
 * Example of using the error handling HOC
 */
import { withErrorHandling } from '@/lib/errors/errorHandlingUtils';

// Component that might throw errors
function ErrorProneComponent({ onError }: { onError?: (err: unknown) => void }) {
  const [shouldError, setShouldError] = useState(false);
  
  // This will cause an error when shouldError is true
  if (shouldError) {
    try {
      throw new Error('This component has crashed!');
    } catch (err) {
      if (onError) onError(err);
      // In a real component, you might want to render a fallback UI here
      return <div className="p-4 bg-red-50">Component has gracefully handled an error</div>;
    }
  }
  
  return (
    <div className="p-4 border rounded">
      <h3 className="font-medium mb-2">Error Prone Component</h3>
      <Button 
        onClick={() => setShouldError(true)}
        variant="danger"
        size="sm"
      >
        Crash Component
      </Button>
    </div>
  );
}

// Wrap the component with our error handling HOC
export const ErrorProneComponentWithErrorHandling = withErrorHandling(
  ErrorProneComponent,
  {
    componentName: 'ErrorProneComponent',
    category: 'ui'
  }
);

export default ErrorHandlingExample;
