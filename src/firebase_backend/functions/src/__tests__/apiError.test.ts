import { ApiError, ApiErrors, handleApiError } from '../utils/apiError';
import * as functions from 'firebase-functions';

describe('ApiError', () => {
  it('should create an instance with default values', () => {
    const error = new ApiError(400, 'BAD_REQUEST', 'Invalid request');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('Invalid request');
    expect(error.details).toBeUndefined();
  });

  it('should include details when provided', () => {
    const details = { field: 'email', issue: 'invalid format' };
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', details);
    expect(error.details).toEqual(details);
  });

  it('should convert to JSON format', () => {
    const error = new ApiError(404, 'NOT_FOUND', 'Resource not found');
    expect(error.toJson()).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
  });

  it('should convert to Firebase HttpsError', () => {
    const error = new ApiError(403, 'PERMISSION_DENIED', 'Access denied');
    const httpsError = error.toHttpsError();
    expect(httpsError).toBeInstanceOf(functions.https.HttpsError);
    expect(httpsError.code).toBe('PERMISSION_DENIED');
    expect(httpsError.message).toBe('Access denied');
  });
});

describe('ApiErrors', () => {
  it('should create a bad request error', () => {
    const error = ApiErrors.invalidRequest({ field: 'email' });
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('invalid-argument');
  });

  it('should create an unauthenticated error', () => {
    const error = ApiErrors.unauthenticated('Please log in');
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Please log in');
  });

  it('should create a permission denied error', () => {
    const error = ApiErrors.permissionDenied('Not allowed');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('permission-denied');
  });

  it('should create a not found error', () => {
    const error = ApiErrors.notFound('User');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('User not found');
  });

  it('should create an already exists error', () => {
    const error = ApiErrors.alreadyExists('Email');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('already-exists');
  });

  it('should create a rate limit error', () => {
    const error = ApiErrors.tooManyRequests('Too many requests');
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('resource-exhausted');
  });

  it('should create an internal server error', () => {
    const error = ApiErrors.internal('Something went wrong');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('internal');
  });
});

describe('handleApiError', () => {
  let mockResponse: any;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should handle ApiError', () => {
    const error = new ApiError(400, 'BAD_REQUEST', 'Invalid input');
    handleApiError(error, mockResponse as any);
    
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid input',
      },
    });
  });

  it('should handle Firebase HttpsError', () => {
    const error = new functions.https.HttpsError('not-found', 'Not found');
    handleApiError(error, mockResponse as any);
    
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'not-found',
        message: 'Not found',
      },
    });
  });

  it('should handle generic Error', () => {
    const error = new Error('Something went wrong');
    process.env.NODE_ENV = 'development';
    
    handleApiError(error, mockResponse as any);
    
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const response = mockResponse.json.mock.calls[0][0];
    expect(response.success).toBe(false);
    expect(response.error.code).toBe('internal');
    expect(response.error.details).toContain('Something went wrong');
  });

  it('should not expose error details in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const error = new Error('Sensitive info');
    handleApiError(error, mockResponse as any);
    
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'internal',
        message: 'An unexpected error occurred',
      },
    });
    
    process.env.NODE_ENV = originalEnv;
  });
});
