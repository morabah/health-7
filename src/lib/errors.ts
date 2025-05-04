/**
 * Custom Error Classes
 * 
 * This file contains specialized error classes for different types of failures
 * in the Health Appointment System. These classes help with categorization,
 * provide detailed context, and improve error handling throughout the application.
 */

import type { ErrorCategory, ErrorSeverity } from '@/components/ui/ErrorDisplay';

/**
 * Base application error options interface
 */
export interface AppErrorOptions {
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  retryable?: boolean;
  context?: Record<string, unknown>;
  code?: string;
  cause?: Error;
}

/**
 * Base application error class that all other error types extend
 */
export class AppError extends Error {
  /** Error category for classification */
  public readonly category: ErrorCategory;
  
  /** Error severity level */
  public readonly severity: ErrorSeverity;
  
  /** Whether the operation can be retried */
  public readonly retryable: boolean;
  
  /** Additional context for debugging */
  public readonly context: Record<string, unknown>;
  
  /** Unique error ID for tracking */
  public readonly errorId: string;
  
  /** Error code for specific error types */
  public readonly code?: string;
  
  constructor(
    message: string,
    options: AppErrorOptions = {}
  ) {
    super(message);
    
    // Set error name to the class name
    this.name = this.constructor.name;
    
    // Set properties from options with defaults
    this.category = options.category || 'unknown';
    this.severity = options.severity || 'error';
    this.retryable = options.retryable !== undefined ? options.retryable : true;
    this.context = options.context || {};
    this.code = options.code;
    
    // Generate a random error ID for tracking
    this.errorId = generateErrorId();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Adds additional context to the error
   */
  public addContext(key: string, value: unknown): this {
    this.context[key] = value;
    return this;
  }
}

// Network related errors

/**
 * NetworkError - Thrown when there are connectivity issues
 */
export class NetworkError extends AppError {
  constructor(
    message = 'Network connection error',
    options: Omit<AppErrorOptions, 'category'> = {}
  ) {
    super(message, {
      ...options,
      category: 'network',
      retryable: options.retryable !== undefined ? options.retryable : true,
      severity: options.severity || 'warning',
    });
  }
}

/**
 * TimeoutError - Thrown when a request times out
 */
export class TimeoutError extends NetworkError {
  constructor(
    message = 'The request timed out',
    options: Omit<AppErrorOptions, 'category'> = {}
  ) {
    super(message, {
      ...options,
      code: options.code || 'TIMEOUT_ERROR',
    });
  }
}

// Authentication related errors

/**
 * AuthError - Base class for authentication errors
 */
export class AuthError extends AppError {
  constructor(
    message = 'Authentication error',
    options: Omit<AppErrorOptions, 'category'> = {}
  ) {
    super(message, {
      ...options,
      category: 'auth',
      retryable: options.retryable !== undefined ? options.retryable : false,
    });
  }
}

/**
 * UnauthorizedError - Thrown when a user is not authorized
 */
export class UnauthorizedError extends AuthError {
  constructor(
    message = 'You are not authorized to perform this action',
    options: Omit<AppErrorOptions, 'category'> = {}
  ) {
    super(message, {
      ...options,
      code: options.code || 'UNAUTHORIZED',
      severity: options.severity || 'warning',
    });
  }
}

/**
 * SessionExpiredError - Thrown when a user's session has expired
 */
export class SessionExpiredError extends AuthError {
  constructor(
    message = 'Your session has expired. Please log in again',
    options: Omit<AppErrorOptions, 'category'> = {}
  ) {
    super(message, {
      ...options,
      code: options.code || 'SESSION_EXPIRED',
      severity: options.severity || 'warning',
    });
  }
}

// API related errors

/**
 * ApiError options interface
 */
export interface ApiErrorOptions extends Omit<AppErrorOptions, 'category'> {
  status?: number;
}

/**
 * ApiError - Base class for API-related errors
 */
export class ApiError extends AppError {
  /** HTTP status code if applicable */
  public readonly status?: number;
  
  constructor(
    message = 'API error',
    options: ApiErrorOptions = {}
  ) {
    super(message, {
      ...options,
      category: 'api',
    });
    
    this.status = options.status;
  }
}

/**
 * ApiResponseError options interface
 */
export interface ApiResponseErrorOptions extends ApiErrorOptions {
  responseData?: unknown;
}

/**
 * ApiResponseError - Thrown when an API response is invalid or unexpected
 */
export class ApiResponseError extends ApiError {
  /** Raw response data */
  public readonly responseData?: unknown;
  
  constructor(
    message = 'Invalid API response',
    options: ApiResponseErrorOptions = {}
  ) {
    super(message, {
      ...options,
      code: options.code || 'INVALID_RESPONSE',
    });
    
    this.responseData = options.responseData;
  }
}

// Validation errors

/**
 * ValidationError options interface
 */
export interface ValidationErrorOptions extends Omit<AppErrorOptions, 'category'> {
  validationIssues?: Record<string, string[]>;
}

/**
 * ValidationError - Thrown when data validation fails
 */
export class ValidationError extends AppError {
  /** Validation issues by field */
  public readonly validationIssues: Record<string, string[]>;
  
  constructor(
    message = 'Validation failed',
    options: ValidationErrorOptions = {}
  ) {
    super(message, {
      ...options,
      category: 'validation',
      retryable: false,
      severity: options.severity || 'warning',
    });
    
    this.validationIssues = options.validationIssues || {};
  }
  
  /**
   * Add a validation issue for a specific field
   */
  public addIssue(field: string, issue: string): this {
    if (!this.validationIssues[field]) {
      this.validationIssues[field] = [];
    }
    this.validationIssues[field].push(issue);
    return this;
  }
}

// Appointment related errors

/**
 * AppointmentError options interface
 */
export interface AppointmentErrorOptions extends Omit<AppErrorOptions, 'category'> {
  appointmentId?: string;
}

/**
 * AppointmentError - Base class for appointment-related errors
 */
export class AppointmentError extends AppError {
  /** Appointment ID if available */
  public readonly appointmentId?: string;
  
  constructor(
    message = 'Appointment error',
    options: AppointmentErrorOptions = {}
  ) {
    super(message, {
      ...options,
      category: 'appointment',
    });
    
    this.appointmentId = options.appointmentId;
  }
}

/**
 * SlotUnavailableError options interface
 */
export interface SlotUnavailableErrorOptions extends AppointmentErrorOptions {
  slotDateTime?: string;
}

/**
 * SlotUnavailableError - Thrown when an appointment slot is unavailable
 */
export class SlotUnavailableError extends AppointmentError {
  /** The attempted slot datetime */
  public readonly slotDateTime?: string;
  
  constructor(
    message = 'This appointment slot is no longer available',
    options: SlotUnavailableErrorOptions = {}
  ) {
    super(message, {
      ...options,
      code: options.code || 'SLOT_UNAVAILABLE',
      retryable: false,
    });
    
    this.slotDateTime = options.slotDateTime;
  }
}

/**
 * AppointmentConflictError - Thrown when there's a conflict with another appointment
 */
export class AppointmentConflictError extends AppointmentError {
  constructor(
    message = 'This appointment conflicts with another booking',
    options: AppointmentErrorOptions = {}
  ) {
    super(message, {
      ...options,
      code: options.code || 'APPOINTMENT_CONFLICT',
      retryable: false,
    });
  }
}

// Cache related errors

/**
 * CacheError - Thrown when there's an issue with the cache
 */
export class CacheError extends AppError {
  constructor(
    message = 'Cache error',
    options: Omit<AppErrorOptions, 'category'> = {}
  ) {
    super(message, {
      ...options,
      category: 'cache',
      retryable: true,
      severity: options.severity || 'info',
    });
  }
}

// Data related errors

/**
 * DataError - Base class for data-related errors
 */
export class DataError extends AppError {
  constructor(
    message = 'Data error',
    options: Omit<AppErrorOptions, 'category'> = {}
  ) {
    super(message, {
      ...options,
      category: 'data',
      retryable: options.retryable !== undefined ? options.retryable : true,
    });
  }
}

/**
 * NotFoundError options interface
 */
export interface NotFoundErrorOptions extends Omit<AppErrorOptions, 'category'> {
  resourceType?: string;
  resourceId?: string;
}

/**
 * NotFoundError - Thrown when a requested resource is not found
 */
export class NotFoundError extends DataError {
  /** Resource type that wasn't found */
  public readonly resourceType?: string;
  
  /** Resource ID that wasn't found */
  public readonly resourceId?: string;
  
  constructor(
    message = 'Resource not found',
    options: NotFoundErrorOptions = {}
  ) {
    super(message, {
      ...options,
      code: options.code || 'NOT_FOUND',
      retryable: false,
    });
    
    this.resourceType = options.resourceType;
    this.resourceId = options.resourceId;
  }
}

// Permission errors

/**
 * PermissionError options interface
 */
export interface PermissionErrorOptions extends Omit<AppErrorOptions, 'category'> {
  requiredPermission?: string;
}

/**
 * PermissionError - Thrown when a user doesn't have permission for an action
 */
export class PermissionError extends AppError {
  /** Required permission that was missing */
  public readonly requiredPermission?: string;
  
  constructor(
    message = 'You do not have permission to perform this action',
    options: PermissionErrorOptions = {}
  ) {
    super(message, {
      ...options,
      category: 'permission',
      retryable: false,
      severity: options.severity || 'warning',
    });
    
    this.requiredPermission = options.requiredPermission;
  }
}

// Helper functions

/**
 * Generate a random error ID for tracking
 */
function generateErrorId(): string {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a more specific error from a generic one
 */
export function enhanceError(error: unknown, options: {
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  message?: string;
  context?: Record<string, unknown>;
  code?: string;
}): AppError {
  if (error instanceof AppError) {
    // Add context to existing AppError
    Object.entries(options.context || {}).forEach(([key, value]) => {
      error.addContext(key, value);
    });
    return error;
  }
  
  // Create new AppError from generic error
  const message = options.message || (error instanceof Error ? error.message : String(error));
  return new AppError(message, {
    category: options.category,
    severity: options.severity,
    context: {
      ...options.context,
      originalError: error,
    },
    code: options.code,
    cause: error instanceof Error ? error : undefined,
  });
}

/**
 * Throw an appropriate error based on HTTP status code
 */
export function throwHttpError(status: number, message?: string, context?: Record<string, unknown>): never {
  switch (status) {
    case 400:
      throw new ValidationError(message || 'Bad request', { context });
    case 401:
      throw new UnauthorizedError(message || 'Unauthorized', { context });
    case 403:
      throw new PermissionError(message || 'Forbidden', { context });
    case 404:
      throw new NotFoundError(message || 'Not found', { context });
    case 408:
      throw new TimeoutError(message || 'Request timeout', { context });
    case 409:
      throw new ApiError(message || 'Conflict', { context, status, code: 'CONFLICT' });
    case 429:
      throw new ApiError(message || 'Too many requests', { 
        context, status, retryable: true, severity: 'warning', code: 'RATE_LIMITED' 
      });
    case 500:
      throw new ApiError(message || 'Server error', { 
        context, status, retryable: true, severity: 'error', code: 'SERVER_ERROR' 
      });
    default:
      throw new ApiError(message || `HTTP error ${status}`, { context, status });
  }
} 