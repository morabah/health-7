/**
 * Error Classes
 * 
 * This file contains specialized error classes for different types of failures
 * that can occur in the application. These error classes help categorize errors,
 * provide detailed context, and improve error handling throughout the application.
 */

// Import only the types, implementation will be moved here
import type { ErrorCategory, ErrorSeverity } from '@/components/ui/ErrorDisplay';

/**
 * Generate a unique error ID
 */
function generateErrorId(): string {
  return 'err_' + Math.random().toString(36).substring(2, 15);
}

/**
 * Base application error options interface
 */
export interface AppErrorOptions {
  /** Error category for classification */
  category?: ErrorCategory;
  
  /** Error severity level */
  severity?: ErrorSeverity;
  
  /** Whether user can retry the operation */
  retryable?: boolean;
  
  /** Additional error context */
  context?: Record<string, unknown>;
  
  /** Original error that caused this one */
  cause?: Error;
  
  /** Error code for specific error types */
  code?: string;
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
  public readonly context: Record<string, unknown> = {};
  
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
    
    // Set error properties from options or defaults
    this.category = options.category || 'unknown';
    this.severity = options.severity || 'error';
    this.retryable = options.retryable ?? true;
    this.code = options.code;
    
    // Add any provided context
    if (options.context) {
      Object.assign(this.context, options.context);
    }
    
    // Generate a random error ID for tracking
    this.errorId = generateErrorId();
    
    // Set error cause for debugging
    if (options.cause) {
      this.cause = options.cause;
    }
    
    // Set proper prototype for instanceof checks
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

// =============================================================================
// Network related errors
// =============================================================================

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
      retryable: options.retryable ?? true,
    });
  }
}

/**
 * TimeoutError - Thrown when a request times out
 */
export class TimeoutError extends NetworkError {
  constructor(
    message = 'Request timed out',
    options: Omit<AppErrorOptions, 'category'> = {}
  ) {
    super(message, {
      ...options,
      code: options.code || 'TIMEOUT_ERROR',
      retryable: options.retryable ?? true,
    });
  }
}

// =============================================================================
// Authentication related errors
// =============================================================================

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
      retryable: options.retryable ?? true,
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
      retryable: options.retryable ?? false,
    });
  }
}

/**
 * SessionExpiredError - Thrown when a user's session has expired
 */
export class SessionExpiredError extends AuthError {
  constructor(
    message = 'Your session has expired, please log in again',
    options: Omit<AppErrorOptions, 'category'> = {}
  ) {
    super(message, {
      ...options,
      retryable: options.retryable ?? false,
    });
  }
}

// =============================================================================
// API related errors
// =============================================================================

/**
 * ApiError options interface
 */
export interface ApiErrorOptions extends Omit<AppErrorOptions, 'category'> {
  statusCode?: number;
}

/**
 * ApiError - Base class for API-related errors
 */
export class ApiError extends AppError {
  /** HTTP status code if applicable */
  public readonly statusCode?: number;
  
  constructor(
    message = 'API error',
    options: ApiErrorOptions = {}
  ) {
    super(message, {
      ...options,
      category: 'api',
    });
    
    this.statusCode = options.statusCode;
  }
}

/**
 * ApiResponseError options interface
 */
export interface ApiResponseErrorOptions extends ApiErrorOptions {
  response?: Response;
  data?: unknown;
}

/**
 * ApiResponseError - Thrown when an API response is invalid or unexpected
 */
export class ApiResponseError extends ApiError {
  /** Original Response object */
  public readonly response?: Response;
  
  /** Parsed response data */
  public readonly data?: unknown;
  
  constructor(
    message = 'Invalid API response',
    options: ApiResponseErrorOptions = {}
  ) {
    super(message, options);
    
    this.response = options.response;
    this.data = options.data;
  }
}

// =============================================================================
// Validation errors
// =============================================================================

/**
 * ValidationError options interface
 */
export interface ValidationErrorOptions extends Omit<AppErrorOptions, 'category'> {
  validationErrors?: Record<string, string[]>;
  statusCode?: number;
}

/**
 * ValidationError - Thrown when data validation fails
 */
export class ValidationError extends AppError {
  /** Validation errors by field */
  public readonly validationErrors: Record<string, string[]>;
  
  constructor(
    message = 'Validation failed',
    options: ValidationErrorOptions = {}
  ) {
    super(message, {
      ...options,
      category: 'validation',
      retryable: options.retryable ?? true,
    });
    
    this.validationErrors = options.validationErrors || {};
  }
  
  /**
   * Add a validation error for a specific field
   */
  public addValidationError(field: string, error: string): this {
    if (!this.validationErrors[field]) {
      this.validationErrors[field] = [];
    }
    
    this.validationErrors[field].push(error);
    return this;
  }
}

// =============================================================================
// Data related errors
// =============================================================================

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
    });
  }
}

/**
 * NotFoundError - Thrown when data is not found
 */
export class NotFoundError extends DataError {
  /** Type of entity that was not found */
  public readonly entityType?: string;
  
  /** ID of the entity that was not found */
  public readonly entityId?: string;
  
  constructor(
    message = 'Resource not found',
    entityType?: string,
    entityId?: string,
    options: Omit<AppErrorOptions, 'category'> & { context?: Record<string, unknown> } = {}
  ) {
    super(message, {
      ...options,
      context: {
        ...options.context,
        entityType,
        entityId,
      },
    });
    
    this.entityType = entityType;
    this.entityId = entityId;
  }
}

// =============================================================================
// Appointment related errors
// =============================================================================

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
  /** Appointment ID if applicable */
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
  doctorId?: string;
  slot?: string;
}

/**
 * SlotUnavailableError - Thrown when an appointment slot is unavailable
 */
export class SlotUnavailableError extends AppointmentError {
  /** Doctor ID */
  public readonly doctorId?: string;
  
  /** Time slot */
  public readonly slot?: string;
  
  constructor(
    message = 'This appointment slot is no longer available',
    options: SlotUnavailableErrorOptions = {}
  ) {
    super(message, {
      ...options,
      context: {
        ...options.context,
        doctorId: options.doctorId,
        slot: options.slot,
      },
    });
    
    this.doctorId = options.doctorId;
    this.slot = options.slot;
  }
}

/**
 * AppointmentConflictError - Thrown when an appointment conflicts with another
 */
export class AppointmentConflictError extends AppointmentError {
  /** Conflicting appointment ID */
  public readonly conflictingAppointmentId?: string;
  
  constructor(
    message = 'This appointment conflicts with another appointment',
    appointmentId?: string,
    conflictingAppointmentId?: string,
    options: Omit<AppErrorOptions, 'category'> & { context?: Record<string, unknown> } = {}
  ) {
    super(message, {
      ...options,
      appointmentId,
      context: {
        ...options.context,
        appointmentId,
        conflictingAppointmentId,
      },
    });
    
    this.conflictingAppointmentId = conflictingAppointmentId;
  }
}

// =============================================================================
// Permission errors
// =============================================================================

/**
 * PermissionError - Thrown when a user doesn't have permission
 */
export class PermissionError extends AppError {
  /** Required permission */
  public readonly requiredPermission?: string;
  
  constructor(
    message = 'You do not have permission to perform this action',
    requiredPermission?: string,
    options: Omit<AppErrorOptions, 'category'> & { context?: Record<string, unknown> } = {}
  ) {
    super(message, {
      ...options,
      category: 'permission',
      retryable: options.retryable ?? false,
      context: {
        ...options.context,
        requiredPermission,
      },
    });
    
    this.requiredPermission = requiredPermission;
  }
}

// =============================================================================
// Cache errors
// =============================================================================

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
      category: 'data',
      retryable: options.retryable ?? true,
    });
  }
}

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Enhance an existing Error with additional context
 */
export function enhanceError(
  error: Error, 
  context: Record<string, unknown> = {}
): Error {
  if (error instanceof AppError) {
    Object.entries(context).forEach(([key, value]) => {
      error.addContext(key, value);
    });
    return error;
  }
  
  // For non-AppErrors, add context as properties
  Object.entries(context).forEach(([key, value]) => {
    (error as any)[key] = value;
  });
  
  return error;
}

/**
 * Create and throw an HTTP error based on status code
 */
export function throwHttpError(
  statusCode: number, 
  message?: string, 
  context: Record<string, unknown> = {}
): never {
  let error: AppError;
  
  switch (statusCode) {
    case 400:
      error = new ValidationError(
        message || 'Bad Request', 
        { context, statusCode }
      );
      break;
    case 401:
      error = new AuthError(
        message || 'Unauthorized', 
        { context }
      );
      break;
    case 403:
      error = new UnauthorizedError(
        message || 'Forbidden', 
        { context }
      );
      break;
    case 404:
      error = new NotFoundError(
        message || 'Not Found', 
        undefined, 
        undefined, 
        { context }
      );
      break;
    case 409:
      error = new ApiError(
        message || 'Conflict', 
        { context, statusCode, code: 'CONFLICT' }
      );
      break;
    case 422:
      error = new ValidationError(
        message || 'Unprocessable Entity', 
        { context, statusCode }
      );
      break;
    case 429:
      error = new ApiError(
        message || 'Too Many Requests', 
        { context, statusCode, retryable: true, code: 'RATE_LIMITED' }
      );
      break;
    default:
      if (statusCode >= 500) {
        error = new ApiError(
          message || 'Server Error', 
          { context, statusCode, retryable: true }
        );
      } else {
        error = new ApiError(
          message || `HTTP Error ${statusCode}`, 
          { context, statusCode }
        );
      }
  }
  
  throw error;
} 