/**
 * Error Monitoring
 * 
 * This file contains functionality for monitoring and reporting errors to
 * external services. In production, this would connect to a service like
 * Sentry, LogRocket, or similar. For now, it provides a placeholder implementation.
 */

import { AppError } from './errorClasses';

// Environment check
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Error monitor singleton for error tracking and reporting
 */
export class ErrorMonitor {
  private static instance: ErrorMonitor;
  
  private constructor() {
    // Initialize error monitoring service connection
    this.initialize();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    
    return ErrorMonitor.instance;
  }
  
  /**
   * Initialize the error monitoring service
   */
  private initialize(): void {
    if (isProduction) {
      // In production, we would initialize a real error monitoring service here
      // Example: Sentry.init({ dsn: process.env.SENTRY_DSN });
      console.log('[ErrorMonitor] Initialized in production mode');
    } else {
      // In development, we'll just log to console
      console.log('[ErrorMonitor] Initialized in development mode');
    }
  }
  
  /**
   * Report an error to the monitoring service
   */
  public reportError(error: Error, context: Record<string, unknown> = {}): void {
    if (isProduction) {
      // In production, we would send to a real service
      // Example: Sentry.captureException(error, { extra: context });
      
      // Temporary implementation: log to console
      console.error('[ErrorMonitor] Error reported to monitoring service:', error);
      if (Object.keys(context).length > 0) {
        console.error('[ErrorMonitor] Error context:', context);
      }
    } else if (isDevelopment) {
      // In development, log to console with full details
      console.error('==== ERROR REPORTED ====');
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      
      if (error instanceof AppError) {
        console.error('Error Type:', error.name);
        console.error('Category:', error.category);
        console.error('Severity:', error.severity);
        console.error('Error ID:', error.errorId);
        console.error('Context:', error.context);
      }
      
      if (Object.keys(context).length > 0) {
        console.error('Additional Context:', context);
      }
      
      console.error('========================');
    }
  }
  
  /**
   * Record a breadcrumb for error context
   */
  public addBreadcrumb(
    message: string, 
    category: string = 'app', 
    data: Record<string, unknown> = {}
  ): void {
    if (isProduction) {
      // In production, we would add a breadcrumb to the monitoring service
      // Example: Sentry.addBreadcrumb({ message, category, data });
    } else if (isDevelopment) {
      // In development, log to console
      console.log(`[Breadcrumb][${category}] ${message}`, data);
    }
  }
}

// Get the singleton instance
const errorMonitor = ErrorMonitor.getInstance();

/**
 * Report an error to the monitoring system
 */
export function reportError(error: Error, context: Record<string, unknown> = {}): void {
  errorMonitor.reportError(error, context);
}

/**
 * Add a breadcrumb for error context
 */
export function addBreadcrumb(
  message: string, 
  category: string = 'app', 
  data: Record<string, unknown> = {}
): void {
  errorMonitor.addBreadcrumb(message, category, data);
} 