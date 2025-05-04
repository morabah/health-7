'use client';

import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw, XCircle, ExternalLink } from 'lucide-react';
import Button from './Button';
import Alert from './Alert';

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';
export type ErrorCategory = 
  | 'network' 
  | 'auth' 
  | 'validation' 
  | 'api' 
  | 'database' 
  | 'unknown'
  | 'permission'
  | 'appointment'
  | 'data'
  | 'server'
  | 'cache'; // Added cache category for cache-related errors

// Interface for enhanced error types
export interface EnhancedError extends Error {
  code?: string;
  context?: Record<string, unknown>;
  retryable?: boolean;
}

export interface ErrorDisplayProps {
  /**
   * The error object or message to display
   */
  error: Error | EnhancedError | string | unknown;
  
  /**
   * Optional user-friendly message to display instead of the raw error
   */
  message?: string;
  
  /**
   * Error severity level
   */
  severity?: ErrorSeverity;
  
  /**
   * Error category for grouping similar errors
   */
  category?: ErrorCategory;
  
  /**
   * Optional action to retry the operation that failed
   */
  onRetry?: () => void;
  
  /**
   * Optional action to dismiss the error
   */
  onDismiss?: () => void;
  
  /**
   * Optional help text or action suggestions
   */
  helpText?: string;
  
  /**
   * Optional additional error context (for developers)
   */
  context?: Record<string, unknown>;
  
  /**
   * Optional identifier for this error instance
   */
  errorId?: string;
  
  /**
   * Optional CSS class name
   */
  className?: string;
  
  /**
   * Whether to automatically show technical details
   */
  showTechnicalDetails?: boolean;
  
  /**
   * URL with more information about the error
   */
  docsUrl?: string;
}

/**
 * User-friendly error display component
 * Shows appropriate error messages based on error type and provides
 * recovery actions when possible
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  message,
  severity = 'error',
  category = 'unknown',
  onRetry,
  onDismiss,
  helpText,
  context,
  errorId,
  className,
  showTechnicalDetails = false,
  docsUrl,
}) => {
  const [showDetails, setShowDetails] = useState(showTechnicalDetails);
  
  // Determine if error is retryable
  const isRetryable = (): boolean => {
    if (onRetry) return true;
    if (error && typeof error === 'object' && 'retryable' in error) {
      return !!error.retryable;
    }
    return category === 'network' || category === 'api' || category === 'cache';
  };
  
  // Get error code if available
  const getErrorCode = (): string | undefined => {
    if (error && typeof error === 'object' && 'code' in error) {
      return error.code as string;
    }
    return undefined;
  };
  
  // Get error message from various error types
  const getErrorMessage = (err: unknown): string => {
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    if (err && typeof err === 'object') {
      if ('message' in err && typeof err.message === 'string') {
        return err.message;
      }
      
      // Extract nested error message if available
      if ('error' in err && err.error) {
        if (typeof err.error === 'string') return err.error;
        if (typeof err.error === 'object' && 'message' in err.error && typeof err.error.message === 'string') {
          return err.error.message;
        }
      }
    }
    return 'An unknown error occurred';
  };
  
  // Get user-friendly message based on category and error
  const getUserFriendlyMessage = (): string => {
    if (message) return message;
    
    const errorMessage = getErrorMessage(error);
    const errorCode = getErrorCode();
    
    // Use error code for more specific messages if available
    if (errorCode) {
      switch (errorCode) {
        case 'CACHE_ERROR':
          return 'There was a problem retrieving cached data. Fresh data will be loaded.';
        case 'DATA_FETCH_ERROR':
          return 'There was a problem fetching the required data from the server.';
        case 'INVALID_USER_DATA':
          return 'The user data received was invalid or corrupted.';
        case 'INVALID_NOTIFICATION_DATA':
          return 'Your notifications could not be loaded correctly.';
      }
    }
    
    // Return category-specific messages
    switch (category) {
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection.';
      case 'auth':
        return 'There was an authentication issue. You might need to log in again.';
      case 'validation':
        return 'Some information you entered is not valid. Please check and try again.';
      case 'api':
        return 'The server encountered an issue while processing your request.';
      case 'database':
        return 'There was an issue accessing your information. Please try again.';
      case 'permission':
        return 'You don\'t have permission to perform this action.';
      case 'appointment':
        return 'There was an issue with your appointment. Please try again.';
      case 'data':
        return 'We couldn\'t load your data. Please try refreshing.';
      case 'server':
        return 'The server is currently experiencing issues. Please try again later.';
      case 'cache':
        return 'There was an issue with cached data. Try refreshing for the latest information.';
      default:
        // If we have a specific error message, use it
        return errorMessage || 'Something went wrong. Please try again.';
    }
  };
  
  // Get variant based on severity
  const getAlertVariant = (): 'error' | 'warning' | 'info' => {
    switch (severity) {
      case 'fatal':
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'error';
    }
  };
  
  // Get error details for developer view
  const getErrorDetails = (): React.ReactNode => {
    if (!showDetails) return null;
    
    // Merge error context with provided context
    const mergedContext = {
      ...(error && typeof error === 'object' && 'context' in error ? error.context as Record<string, unknown> : {}),
      ...context
    };
    
    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded text-sm font-mono overflow-auto">
        <div className="mb-2 font-bold text-xs uppercase text-gray-500 dark:text-gray-400">
          Error Details
        </div>
        <pre className="whitespace-pre-wrap break-words">
          {error instanceof Error ? 
            `${error.name}${getErrorCode() ? ` (${getErrorCode()})` : ''}: ${error.message}\n${error.stack || ''}` : 
            JSON.stringify(error, null, 2)}
        </pre>
        
        {mergedContext && Object.keys(mergedContext).length > 0 && (
          <>
            <div className="mt-4 mb-2 font-bold text-xs uppercase text-gray-500 dark:text-gray-400">
              Error Context
            </div>
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(mergedContext, null, 2)}
            </pre>
          </>
        )}
        
        {errorId && (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Error ID: {errorId}
          </div>
        )}
      </div>
    );
  };
  
  // Get recovery suggestions based on error category
  const getRecoverySuggestions = (): React.ReactNode => {
    if (helpText) return <p className="mt-2 text-sm">{helpText}</p>;
    
    // Get code-specific suggestions
    const errorCode = getErrorCode();
    if (errorCode) {
      switch (errorCode) {
        case 'CACHE_ERROR':
          return (
            <p className="mt-2 text-sm">
              Try refreshing the page to load fresh data from the server.
            </p>
          );
        case 'INVALID_USER_DATA':
        case 'INVALID_NOTIFICATION_DATA':
          return (
            <p className="mt-2 text-sm">
              Try logging out and logging back in to refresh your data.
            </p>
          );
      }
    }
    
    // Default recovery suggestions based on category
    switch (category) {
      case 'network':
        return (
          <ul className="mt-2 text-sm list-disc list-inside">
            <li>Check your internet connection</li>
            <li>Make sure you're not using a VPN that might be blocking access</li>
            <li>Try refreshing the page</li>
          </ul>
        );
      case 'auth':
        return (
          <ul className="mt-2 text-sm list-disc list-inside">
            <li>Your session may have expired</li>
            <li>Try logging out and logging back in</li>
            <li>Make sure cookies are enabled in your browser</li>
          </ul>
        );
      case 'validation':
        return (
          <p className="mt-2 text-sm">
            Please review the information you submitted and try again.
          </p>
        );
      case 'appointment':
        return (
          <ul className="mt-2 text-sm list-disc list-inside">
            <li>The appointment may no longer be available</li>
            <li>Try selecting a different time slot</li>
            <li>Refresh the page to see updated availability</li>
          </ul>
        );
      case 'cache':
        return (
          <p className="mt-2 text-sm">
            This is often a temporary issue. Try refreshing the page.
          </p>
        );
      default:
        return null;
    }
  };
  
  return (
    <Alert
      variant={getAlertVariant()}
      className={`relative ${className || ''}`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3 mt-0.5">
          {severity === 'fatal' || severity === 'error' ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : severity === 'warning' ? (
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-blue-500" />
          )}
        </div>
        
        <div className="flex-1">
          {/* Error Message */}
          <div className="font-medium">
            {getUserFriendlyMessage()}
          </div>
          
          {/* Recovery Suggestions */}
          {getRecoverySuggestions()}
          
          {/* Error Details (for developers) */}
          {getErrorDetails()}
          
          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {isRetryable() && onRetry && (
              <Button 
                variant="primary" 
                size="sm"
                onClick={onRetry}
                className="flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show Details
                </>
              )}
            </Button>
            
            {docsUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(docsUrl, '_blank')}
                className="flex items-center"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                More Info
              </Button>
            )}
            
            {onDismiss && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDismiss}
                className="ml-auto"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </Alert>
  );
};

export default ErrorDisplay; 