import * as functions from 'firebase-functions';
import { Response } from 'express';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ApiError.prototype);
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
  
  /**
   * Convert to Firebase HttpsError
   */
  toHttpsError(): functions.https.HttpsError {
    return new functions.https.HttpsError(
      this.code as any,
      this.message,
      this.details
    );
  }
  
  /**
   * Convert to JSON response
   */
  toJson() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
}

/**
 * Create a new API error
 */
export const createApiError = (
  statusCode: number,
  code: string,
  message: string,
  details?: any
) => new ApiError(statusCode, code, message, details);

/**
 * Common API errors
 */
export const ApiErrors = {
  // 400 Bad Request
  invalidRequest: (details?: any) =>
    createApiError(400, 'invalid-argument', 'Invalid request', details),
    
  // 401 Unauthorized
  unauthenticated: (message = 'Authentication required') =>
    createApiError(401, 'unauthenticated', message),
    
  // 403 Forbidden
  permissionDenied: (message = 'Permission denied') =>
    createApiError(403, 'permission-denied', message),
    
  // 404 Not Found
  notFound: (resource = 'Resource') =>
    createApiError(404, 'not-found', `${resource} not found`),
    
  // 409 Conflict
  alreadyExists: (resource = 'Resource') =>
    createApiError(409, 'already-exists', `${resource} already exists`),
    
  // 429 Too Many Requests
  tooManyRequests: (message = 'Too many requests') =>
    createApiError(429, 'resource-exhausted', message),
    
  // 500 Internal Server Error
  internal: (message = 'Internal server error', details?: any) =>
    createApiError(500, 'internal', message, details),
    
  // 501 Not Implemented
  notImplemented: (message = 'Not implemented') =>
    createApiError(501, 'unimplemented', message)
};

/**
 * Handle API errors and send appropriate response
 */
export const handleApiError = (error: any, res: Response) => {
  console.error('API Error:', error);
  
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json(error.toJson());
  }
  
  if (error instanceof functions.https.HttpsError) {
    return res.status(400).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
  }
  
  // Default error response
  const apiError = ApiErrors.internal(
    'An unexpected error occurred',
    process.env.NODE_ENV === 'development' ? error.message : undefined
  );
  
  return res.status(apiError.statusCode).json(apiError.toJson());
};
