'use client';

import { logError, logWarn } from './logger';
import type { ErrorCategory, ErrorSeverity } from '@/components/ui/ErrorDisplay';

// Enhanced error context with more detailed metadata
interface ErrorContext {
  userId?: string;
  page?: string;
  component?: string;
  action?: string;
  route?: string;
  params?: Record<string, string>;
  requestId?: string;
  timestamp?: number;
  browser?: string;
  operatingSystem?: string;
  environment?: string;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Error classification helper
 * Analyzes an error and determines its category and severity
 */
class ErrorClassifier {
  /**
   * Determine the category of an error
   */
  static categorizeError(error: unknown, context?: ErrorContext): ErrorCategory {
    // Use provided category if available
    if (context?.category) {
      return context.category;
    }
    
    // Check if it's a network error
    if (error instanceof Error) {
      const errorName = error.name.toLowerCase();
      const errorMessage = error.message.toLowerCase();
      
      // Network errors
      if (
        errorName === 'networkerror' ||
        errorMessage.includes('network') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('failed to fetch') ||
        errorMessage.includes('cors') ||
        errorMessage.includes('cross-origin')
      ) {
        return 'network';
      }
      
      // Auth errors
      if (
        errorName === 'unauthorizederror' ||
        errorName === 'authenticationerror' ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('forbidden') ||
        errorMessage.includes('not authenticated') ||
        errorMessage.includes('not authorized') ||
        errorMessage.includes('invalid token') ||
        errorMessage.includes('token expired') ||
        errorMessage.includes('permission')
      ) {
        return 'auth';
      }
      
      // Validation errors
      if (
        errorName === 'validationerror' ||
        errorMessage.includes('validation') ||
        errorMessage.includes('invalid input') ||
        errorMessage.includes('required field') ||
        errorMessage.includes('invalid format')
      ) {
        return 'validation';
      }
      
      // API errors
      if (
        errorName === 'apierror' ||
        errorMessage.includes('api') ||
        errorMessage.includes('endpoint') ||
        errorMessage.includes('status code')
      ) {
        return 'api';
      }
      
      // Database errors
      if (
        errorName === 'databaseerror' ||
        errorMessage.includes('database') ||
        errorMessage.includes('query failed') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('duplicate key')
      ) {
        return 'database';
      }
      
      // Permission errors
      if (
        errorMessage.includes('permission denied') ||
        errorMessage.includes('access denied') ||
        errorMessage.includes('not allowed')
      ) {
        return 'permission';
      }

      // Appointment errors
      if (
        errorMessage.includes('appointment') ||
        errorMessage.includes('booking') ||
        errorMessage.includes('schedule') ||
        errorMessage.includes('slot')
      ) {
        return 'appointment';
      }
    }
    
    // Check if context gives us clues
    if (context) {
      if (context.action?.includes('appointment') || context.component?.includes('Appointment')) {
        return 'appointment';
      }
      
      if (context.action?.includes('auth') || context.component?.includes('Auth')) {
        return 'auth';
      }
      
      if (context.action?.includes('fetch') || context.action?.includes('load')) {
        return 'data';
      }
    }
    
    // Default to unknown if we can't determine the category
    return 'unknown';
  }
  
  /**
   * Determine the severity of an error
   */
  static determineSeverity(error: unknown, context?: ErrorContext): ErrorSeverity {
    // Use provided severity if available
    if (context?.severity) {
      return context.severity;
    }
    
    // Check if the error is fatal (crashes the app)
    if (
      error instanceof Error && 
      (error.name === 'ChunkLoadError' || 
       error.name === 'SyntaxError' ||
       error.message.includes('memory') ||
       error.message.includes('recursion'))
    ) {
      return 'fatal';
    }
    
    // Auth errors are typically warnings unless specified otherwise
    if (this.categorizeError(error, context) === 'auth') {
      return 'warning';
    }
    
    // Network errors might be temporary
    if (this.categorizeError(error, context) === 'network') {
      return 'warning';
    }
    
    // Default to regular error
    return 'error';
  }
  
  /**
   * Generate a user-friendly message based on the error
   */
  static getUserFriendlyMessage(error: unknown, context?: ErrorContext): string {
    const category = this.categorizeError(error, context);
    
    switch (category) {
      case 'network':
        return 'We\'re having trouble connecting to the server. Please check your internet connection and try again.';
      case 'auth':
        return 'Your session may have expired. Please log in again to continue.';
      case 'validation':
        return 'Some information you entered is not valid. Please review and try again.';
      case 'api':
        return 'We\'re experiencing technical difficulties. Please try again later.';
      case 'database':
        return 'We couldn\'t access your information. Please try again later.';
      case 'permission':
        return 'You don\'t have permission to perform this action.';
      case 'appointment':
        return 'There was an issue with your appointment. The time slot might no longer be available.';
      case 'data':
        return 'We couldn\'t load your data. Please try refreshing the page.';
      default:
        if (error instanceof Error) {
          return `Something went wrong: ${error.message}`;
        }
        return 'Something unexpected went wrong. Please try again.';
    }
  }
}

/**
 * Centralized error monitoring utility
 * In development, logs to console
 * In production, can be connected to an error monitoring service
 */
class ErrorMonitor {
  private static instance: ErrorMonitor;
  private isInitialized: boolean = false;
  private isCapturing: boolean = false; // Flag to prevent recursive captures
  private originalConsoleError: typeof console.error | null = null;
  private errorCount: Record<string, number> = {}; // Track error counts by category
  private errorBuckets: Map<string, Set<string>> = new Map(); // Group similar errors
  
  // Stack of active spans/transactions for tracing
  private activeSpans: Array<{
    name: string;
    startTime: number;
    metadata: Record<string, unknown>;
  }> = [];
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    return ErrorMonitor.instance;
  }
  
  /**
   * Initialize the error monitor
   * In production, this would connect to Sentry or another service
   */
  public init(): void {
    if (this.isInitialized) return;
    
    // In production, this would initialize Sentry or another service
    if (process.env.NODE_ENV === 'production') {
      // Example Sentry initialization
      // Sentry.init({ dsn: process.env.SENTRY_DSN });
      console.log('Error monitoring initialized in production mode');
    } else {
      console.log('Error monitoring initialized in development mode');
    }
    
    this.isInitialized = true;
    
    // Collect browser and OS info
    const browserInfo = this.getBrowserInfo();
    
    // Set up global error handlers
    if (typeof window !== 'undefined') {
      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.captureException(event.reason, { 
          source: 'unhandledrejection',
          message: event.reason?.message || 'Unhandled Promise Rejection',
          browser: browserInfo.browser,
          operatingSystem: browserInfo.os,
          timestamp: Date.now(),
          severity: 'error',
        });
      });
      
      // Handle uncaught exceptions
      window.addEventListener('error', (event) => {
        // Don't capture if already in the process of capturing
        if (!this.isCapturing) {
          this.captureException(event.error || new Error(event.message), {
            source: 'window.onerror',
            url: event.filename,
            lineNumber: event.lineno,
            columnNumber: event.colno,
            browser: browserInfo.browser,
            operatingSystem: browserInfo.os,
            timestamp: Date.now(),
            severity: 'error',
          });
        }
        
        // Don't prevent default handling
        return false;
      });
      
      // Override console.error to capture errors, but only if not already capturing
      // Store the original console.error
      this.originalConsoleError = console.error;
      
      // Replace with our own version that avoids recursion
      console.error = (...args: unknown[]) => {
        // Only capture if not already in the process of capturing
        // This prevents infinite recursion
        if (!this.isCapturing && !args[0]?.toString().includes('[ErrorMonitor]')) {
          // Set flag to prevent recursion
          this.isCapturing = true;
          try {
            // Only capture first argument if it's an error
            const errorArg = args[0] instanceof Error ? args[0] : args.join(' ');
            this.captureException(errorArg, { 
              source: 'console.error',
              browser: browserInfo.browser,
              operatingSystem: browserInfo.os,
              timestamp: Date.now(),
              severity: 'error',
            });
          } finally {
            // Always reset the flag, even if an error occurs
            this.isCapturing = false;
          }
        }
        
        // Always call the original console.error with all arguments
        if (this.originalConsoleError) {
          this.originalConsoleError.apply(console, args);
        }
      };
    }
  }
  
  /**
   * Get browser and OS information for error context
   */
  private getBrowserInfo(): { browser: string; os: string } {
    if (typeof window === 'undefined' || !window.navigator) {
      return { browser: 'unknown', os: 'unknown' };
    }
    
    const userAgent = window.navigator.userAgent;
    let browser = 'unknown';
    let os = 'unknown';
    
    // Determine browser
    if (userAgent.indexOf('Chrome') > -1) {
      browser = 'Chrome';
    } else if (userAgent.indexOf('Safari') > -1) {
      browser = 'Safari';
    } else if (userAgent.indexOf('Firefox') > -1) {
      browser = 'Firefox';
    } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident/') > -1) {
      browser = 'Internet Explorer';
    } else if (userAgent.indexOf('Edge') > -1) {
      browser = 'Edge';
    }
    
    // Determine OS
    if (userAgent.indexOf('Windows') > -1) {
      os = 'Windows';
    } else if (userAgent.indexOf('Mac') > -1) {
      os = 'MacOS';
    } else if (userAgent.indexOf('Linux') > -1) {
      os = 'Linux';
    } else if (userAgent.indexOf('Android') > -1) {
      os = 'Android';
    } else if (userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) {
      os = 'iOS';
    }
    
    return { browser, os };
  }
  
  /**
   * Generate a unique error ID for referencing
   */
  private generateErrorId(): string {
    const random = Math.random().toString(36).substring(2, 11);
    const timestamp = Date.now().toString(36);
    return `err_${timestamp}_${random}`;
  }
  
  /**
   * Capture and report an exception
   * @param error The error to capture
   * @param context Additional context about the error
   * @returns An error ID that can be referenced later
   */
  public captureException(error: unknown, context: ErrorContext = {}): string {
    // If already capturing, return immediately to prevent recursion
    if (this.isCapturing) return 'recursion_prevented';
    
    this.isCapturing = true;
    const errorId = this.generateErrorId();
    
    try {
      // Add timestamp if not provided
      if (!context.timestamp) {
        context.timestamp = Date.now();
      }
      
      // Add environment information
      context.environment = process.env.NODE_ENV || 'development';
      
      // Classify the error if not already classified
      if (!context.category) {
        context.category = ErrorClassifier.categorizeError(error, context);
      }
      
      if (!context.severity) {
        context.severity = ErrorClassifier.determineSeverity(error, context);
      }
      
      // Add browser info if not provided
      if (!context.browser || !context.operatingSystem) {
        const browserInfo = this.getBrowserInfo();
        context.browser = context.browser || browserInfo.browser;
        context.operatingSystem = context.operatingSystem || browserInfo.os;
      }
      
      // Add active span information if available
      if (this.activeSpans.length > 0) {
        const currentSpan = this.activeSpans[this.activeSpans.length - 1];
        context.currentOperation = currentSpan.name;
        context.operationDuration = Date.now() - currentSpan.startTime;
        context.operationMetadata = currentSpan.metadata;
      }
      
      // Add route information if available
      if (typeof window !== 'undefined') {
        context.url = window.location.href;
        context.pathname = window.location.pathname;
      }
      
      // Generate fingerprint for grouping similar errors
      const fingerprint = this.generateErrorFingerprint(error, context);
      
      // Track error count by category
      const category = context.category || 'unknown';
      this.errorCount[category] = (this.errorCount[category] || 0) + 1;
      
      // Group similar errors
      if (!this.errorBuckets.has(fingerprint)) {
        this.errorBuckets.set(fingerprint, new Set());
      }
      this.errorBuckets.get(fingerprint)?.add(errorId);
      
      // Log the error using our existing logger
      // But don't log errors from the error monitor itself to avoid loops
      if (context.source !== 'errorMonitor') {
        if (context.severity === 'fatal' || context.severity === 'error') {
          logError('ErrorMonitor captured exception', { 
            error, 
            context,
            errorId,
            fingerprint,
            errorCount: this.errorBuckets.get(fingerprint)?.size || 1
          });
        } else {
          // For warnings, use logWarn instead
          logWarn('ErrorMonitor captured warning', { 
            error, 
            context,
            errorId,
            fingerprint,
            errorCount: this.errorBuckets.get(fingerprint)?.size || 1
          });
        }
      }
      
      // In production, would send to Sentry or another service
      if (process.env.NODE_ENV === 'production') {
        // Example Sentry reporting
        // Sentry.captureException(error, { 
        //   extra: context,
        //   tags: {
        //     category: context.category,
        //     severity: context.severity,
        //     ...context.tags
        //   },
        //   level: context.severity === 'fatal' ? 'fatal' : 
        //          context.severity === 'error' ? 'error' : 
        //          context.severity === 'warning' ? 'warning' : 'info',
        //   fingerprint: [fingerprint]
        // });
        
        // For now, just log directly to console (not through our override)
        if (this.originalConsoleError) {
          this.originalConsoleError.call(console, '[ErrorMonitor]', error, context, errorId);
        }
      }
      
      return errorId;
    } finally {
      // Always reset the capturing flag when done
      this.isCapturing = false;
    }
  }
  
  /**
   * Generate a fingerprint for an error to group similar errors
   */
  private generateErrorFingerprint(error: unknown, context: ErrorContext): string {
    // Start with the error type
    let components: string[] = [];
    
    // Add error type and message (if available)
    if (error instanceof Error) {
      components.push(error.name);
      
      // Extract the first line of the message (often the most identifying part)
      const messageParts = error.message.split('\n');
      if (messageParts.length > 0) {
        components.push(messageParts[0]);
      }
      
      // Add the first line of the stack trace if available
      if (error.stack) {
        const stackLines = error.stack.split('\n');
        if (stackLines.length > 1) { // First line is usually the error message
          components.push(stackLines[1]);
        }
      }
    } else if (typeof error === 'string') {
      components.push('StringError');
      components.push(error);
    } else if (error && typeof error === 'object') {
      components.push('ObjectError');
      if ('name' in error && typeof error.name === 'string') {
        components.push(error.name);
      }
      if ('message' in error && typeof error.message === 'string') {
        components.push(error.message);
      }
    } else {
      components.push('UnknownError');
      components.push(String(error));
    }
    
    // Add location information if available
    if (context.component) {
      components.push(`Component:${context.component}`);
    }
    
    if (context.action) {
      components.push(`Action:${context.action}`);
    }
    
    // Add category
    if (context.category) {
      components.push(`Category:${context.category}`);
    }
    
    // Join the components and return a hash
    return components.join('|');
  }
  
  /**
   * Clean up the monitor, removing event listeners and restoring console
   */
  public cleanup(): void {
    if (!this.isInitialized) return;
    
    if (typeof window !== 'undefined') {
      // Restore original console.error
      if (this.originalConsoleError) {
        console.error = this.originalConsoleError;
        this.originalConsoleError = null;
      }
      
      // Remove event listeners
      window.removeEventListener('unhandledrejection', (event) => this.captureException(event.reason));
      window.removeEventListener('error', (event) => this.captureException(event.error));
    }
    
    this.isInitialized = false;
  }
  
  /**
   * Set user context for error reporting
   * @param userId User ID for identifying errors with specific users
   */
  public setUser(userId: string): void {
    if (!this.isInitialized) this.init();
    
    // In production, would set user context in Sentry
    if (process.env.NODE_ENV === 'production') {
      // Example Sentry user context
      // Sentry.setUser({ id: userId });
      console.log(`[ErrorMonitor] Set user context: ${userId}`);
    }
  }
  
  /**
   * Start a new operation span/transaction for tracing
   * @param name Name of the operation
   * @param metadata Additional metadata about the operation
   * @returns Object with a finish method to close the span
   */
  public startSpan(name: string, metadata: Record<string, unknown> = {}) {
    const span = {
      name,
      startTime: Date.now(),
      metadata,
    };
    
    this.activeSpans.push(span);
    
    return {
      finish: () => {
        const index = this.activeSpans.findIndex(s => s === span);
        if (index !== -1) {
          this.activeSpans.splice(index, 1);
        }
      },
      addMetadata: (key: string, value: unknown) => {
        span.metadata[key] = value;
      }
    };
  }
  
  /**
   * Clear user context (e.g., on logout)
   */
  public clearUser(): void {
    if (!this.isInitialized) return;
    
    // In production, would clear user context in Sentry
    if (process.env.NODE_ENV === 'production') {
      // Sentry.configureScope(scope => scope.setUser(null));
      console.log('[ErrorMonitor] Cleared user context');
    }
  }
  
  /**
   * Get error statistics
   */
  public getStats() {
    return {
      totalErrors: Object.values(this.errorCount).reduce((sum, count) => sum + count, 0),
      errorsByCategory: { ...this.errorCount },
      uniqueErrors: this.errorBuckets.size,
    };
  }
}

// Export singleton instance
export const errorMonitor = ErrorMonitor.getInstance();

/**
 * Hook into ErrorMonitor to easily report errors from components
 * Returns a user-friendly message for display
 * 
 * @param error Error object
 * @param context Additional context about the error
 * @returns Object containing errorId, userMessage, and details
 */
export function reportError(
  error: unknown, 
  context: ErrorContext = {}
): { errorId: string; userMessage: string; category: ErrorCategory; severity: ErrorSeverity } {
  // Categorize the error
  const category = context.category || ErrorClassifier.categorizeError(error, context);
  const severity = context.severity || ErrorClassifier.determineSeverity(error, context);
  
  // Create enhanced context
  const enhancedContext = { 
    ...context, 
    source: 'reportError',
    category,
    severity,
  };
  
  // Report to error monitor
  const errorId = errorMonitor.captureException(error, enhancedContext);
  
  // Generate user-friendly message
  const userMessage = (context.message as string) || ErrorClassifier.getUserFriendlyMessage(error, enhancedContext);
  
  return { 
    errorId, 
    userMessage, 
    category, 
    severity
  };
}

// Initialize on import in client environment
if (typeof window !== 'undefined') {
  errorMonitor.init();
}

export default errorMonitor; 