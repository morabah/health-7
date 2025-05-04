/**
 * Firebase Error Code Mapping
 * 
 * Maps Firebase error codes to user-friendly messages and provides tools for
 * transforming Firebase errors into a standardized format for the application.
 */

import { ErrorCategory, ErrorSeverity } from "@/components/ui/ErrorDisplay";
import { logError } from "./logger";

/**
 * Error domain to help categorize errors by service
 */
export type ErrorDomain = 
  | 'auth' 
  | 'firestore' 
  | 'functions' 
  | 'storage' 
  | 'database' 
  | 'general';

/**
 * Enhanced error information structure
 */
export interface EnhancedErrorInfo {
  /** Original Firebase error code */
  code: string;
  
  /** User-friendly message to display */
  message: string;
  
  /** Error category for UI classification */
  category: ErrorCategory;
  
  /** Error severity for UI display */
  severity: ErrorSeverity;
  
  /** Source service/domain of the error */
  domain: ErrorDomain;
  
  /** Whether the operation can be retried */
  retryable: boolean;
  
  /** Whether the error is related to network issues */
  isNetworkRelated: boolean;
  
  /** Whether the error is related to permissions */
  isPermissionIssue: boolean;
}

/**
 * Firebase error code to comprehensive error information mapping
 */
export const FIREBASE_ERROR_MAP: Record<string, Omit<EnhancedErrorInfo, 'code'>> = {
  // ===== Authentication Errors =====
  'auth/email-already-in-use': {
    message: 'This email address is already in use. Please try logging in or use a different email.',
    category: 'auth',
    severity: 'warning',
    domain: 'auth',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'auth/invalid-email': {
    message: 'Please enter a valid email address.',
    category: 'auth',
    severity: 'warning',
    domain: 'auth',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'auth/user-disabled': {
    message: 'This account has been disabled. Please contact support for assistance.',
    category: 'auth',
    severity: 'error',
    domain: 'auth',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: true,
  },
  'auth/user-not-found': {
    message: 'Invalid email or password. Please try again.',
    category: 'auth',
    severity: 'warning',
    domain: 'auth',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'auth/wrong-password': {
    message: 'Invalid email or password. Please try again.',
    category: 'auth',
    severity: 'warning',
    domain: 'auth',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'auth/weak-password': {
    message: 'Password should be at least 6 characters long.',
    category: 'auth',
    severity: 'warning',
    domain: 'auth',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'auth/requires-recent-login': {
    message: 'For security reasons, please log out and log back in to perform this action.',
    category: 'auth',
    severity: 'warning',
    domain: 'auth',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'auth/invalid-credential': {
    message: 'Your login credentials have expired. Please log in again.',
    category: 'auth',
    severity: 'warning',
    domain: 'auth',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'auth/account-exists-with-different-credential': {
    message: 'An account already exists with the same email but different sign-in credentials.',
    category: 'auth',
    severity: 'warning',
    domain: 'auth',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'auth/operation-not-allowed': {
    message: 'This operation is not allowed. Please contact support.',
    category: 'auth',
    severity: 'error',
    domain: 'auth',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: true,
  },
  'auth/popup-blocked': {
    message: 'The sign-in popup was blocked by your browser. Please allow popups for this site.',
    category: 'auth',
    severity: 'warning',
    domain: 'auth',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'auth/popup-closed-by-user': {
    message: 'The sign-in process was interrupted. Please try again.',
    category: 'auth',
    severity: 'info',
    domain: 'auth',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'auth/unauthorized-domain': {
    message: 'This domain is not authorized for sign-in operations. Please contact support.',
    category: 'auth',
    severity: 'error',
    domain: 'auth',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: true,
  },
  'auth/invalid-action-code': {
    message: 'The link you used has expired or is invalid.',
    category: 'auth',
    severity: 'warning',
    domain: 'auth',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'auth/invalid-verification-code': {
    message: 'The verification code is invalid. Please try again.',
    category: 'auth',
    severity: 'warning',
    domain: 'auth',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'auth/too-many-requests': {
    message: 'Too many unsuccessful attempts. Please try again later.',
    category: 'auth',
    severity: 'error',
    domain: 'auth',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'auth/network-request-failed': {
    message: 'A network error occurred. Please check your connection and try again.',
    category: 'network',
    severity: 'warning',
    domain: 'auth',
    retryable: true,
    isNetworkRelated: true,
    isPermissionIssue: false,
  },
  'auth/timeout': {
    message: 'The authentication operation has timed out. Please try again.',
    category: 'network',
    severity: 'warning',
    domain: 'auth',
    retryable: true,
    isNetworkRelated: true,
    isPermissionIssue: false,
  },
  
  // ===== Firestore Errors =====
  'firestore/cancelled': {
    message: 'The database operation was cancelled. Please try again.',
    category: 'data',
    severity: 'warning',
    domain: 'firestore',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'firestore/unknown': {
    message: 'An unknown database error occurred. Please try again.',
    category: 'data',
    severity: 'error',
    domain: 'firestore',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'firestore/invalid-argument': {
    message: 'Invalid data provided. Please check your input and try again.',
    category: 'data',
    severity: 'warning',
    domain: 'firestore',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'firestore/deadline-exceeded': {
    message: 'The database operation timed out. Please try again.',
    category: 'data',
    severity: 'warning',
    domain: 'firestore',
    retryable: true,
    isNetworkRelated: true,
    isPermissionIssue: false,
  },
  'firestore/not-found': {
    message: 'The requested data was not found.',
    category: 'data',
    severity: 'warning',
    domain: 'firestore',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'firestore/already-exists': {
    message: 'This data already exists.',
    category: 'data',
    severity: 'warning',
    domain: 'firestore',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'firestore/permission-denied': {
    message: 'You do not have permission to access this data.',
    category: 'auth',
    severity: 'error',
    domain: 'firestore',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: true,
  },
  'firestore/resource-exhausted': {
    message: 'Database resources have been exhausted. Please try again later.',
    category: 'data',
    severity: 'error',
    domain: 'firestore',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'firestore/failed-precondition': {
    message: 'The operation cannot be performed in the current system state.',
    category: 'data',
    severity: 'error',
    domain: 'firestore',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'firestore/aborted': {
    message: 'The database operation was aborted. Please try again.',
    category: 'data',
    severity: 'warning',
    domain: 'firestore',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'firestore/out-of-range': {
    message: 'The database operation was attempted past the valid range.',
    category: 'data',
    severity: 'warning',
    domain: 'firestore',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'firestore/unimplemented': {
    message: 'This database feature is not implemented yet.',
    category: 'data',
    severity: 'error',
    domain: 'firestore',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'firestore/internal': {
    message: 'An internal database error occurred. Please try again later.',
    category: 'data',
    severity: 'error',
    domain: 'firestore',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'firestore/unavailable': {
    message: 'The database service is currently unavailable. Please try again later.',
    category: 'data',
    severity: 'error',
    domain: 'firestore',
    retryable: true,
    isNetworkRelated: true,
    isPermissionIssue: false,
  },
  'firestore/data-loss': {
    message: 'Unrecoverable data loss or corruption occurred.',
    category: 'data',
    severity: 'error',
    domain: 'firestore',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'firestore/unauthenticated': {
    message: 'Your session has expired. Please log in again to access this data.',
    category: 'auth',
    severity: 'warning',
    domain: 'firestore',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: true,
  },
  
  // ===== Storage Errors =====
  'storage/unknown': {
    message: 'An unknown storage error occurred. Please try again.',
    category: 'api',
    severity: 'error',
    domain: 'storage',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'storage/object-not-found': {
    message: 'The file you requested does not exist.',
    category: 'data',
    severity: 'warning',
    domain: 'storage',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'storage/bucket-not-found': {
    message: 'The storage bucket does not exist.',
    category: 'api',
    severity: 'error',
    domain: 'storage',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'storage/quota-exceeded': {
    message: 'Storage quota exceeded. Please contact support.',
    category: 'api',
    severity: 'error',
    domain: 'storage',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'storage/unauthorized': {
    message: 'You are not authorized to access this file.',
    category: 'auth',
    severity: 'error',
    domain: 'storage',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: true,
  },
  'storage/retry-limit-exceeded': {
    message: 'The maximum time limit for this file operation has been exceeded. Please try again.',
    category: 'api',
    severity: 'warning',
    domain: 'storage',
    retryable: true,
    isNetworkRelated: true,
    isPermissionIssue: false,
  },
  'storage/invalid-checksum': {
    message: 'The file upload failed due to data corruption. Please try again.',
    category: 'api',
    severity: 'warning',
    domain: 'storage',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'storage/canceled': {
    message: 'The file upload was cancelled.',
    category: 'api',
    severity: 'info',
    domain: 'storage',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'storage/invalid-url': {
    message: 'Invalid storage URL provided.',
    category: 'api',
    severity: 'warning',
    domain: 'storage',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'storage/server-file-wrong-size': {
    message: 'The uploaded file size did not match the expected size.',
    category: 'api',
    severity: 'warning',
    domain: 'storage',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  
  // ===== Cloud Functions Errors =====
  'functions/cancelled': {
    message: 'The server operation was cancelled. Please try again.',
    category: 'api',
    severity: 'warning',
    domain: 'functions',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'functions/unknown': {
    message: 'An unknown server error occurred. Please try again.',
    category: 'api',
    severity: 'error',
    domain: 'functions',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'functions/invalid-argument': {
    message: 'Invalid data provided. Please check your input and try again.',
    category: 'api',
    severity: 'warning',
    domain: 'functions',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'functions/deadline-exceeded': {
    message: 'The server operation timed out. Please try again.',
    category: 'api',
    severity: 'warning',
    domain: 'functions',
    retryable: true,
    isNetworkRelated: true,
    isPermissionIssue: false,
  },
  'functions/not-found': {
    message: 'The requested resource was not found.',
    category: 'data',
    severity: 'warning',
    domain: 'functions',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'functions/already-exists': {
    message: 'The resource already exists.',
    category: 'data',
    severity: 'warning',
    domain: 'functions',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'functions/permission-denied': {
    message: 'You do not have permission to perform this action.',
    category: 'auth',
    severity: 'error',
    domain: 'functions',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: true,
  },
  'functions/resource-exhausted': {
    message: 'Server resources have been exhausted. Please try again later.',
    category: 'api',
    severity: 'error',
    domain: 'functions',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'functions/failed-precondition': {
    message: 'The operation cannot be performed in the current system state.',
    category: 'api',
    severity: 'error',
    domain: 'functions',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'functions/aborted': {
    message: 'The server operation was aborted. Please try again.',
    category: 'api',
    severity: 'warning',
    domain: 'functions',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'functions/out-of-range': {
    message: 'The operation was attempted past the valid range.',
    category: 'api',
    severity: 'warning',
    domain: 'functions',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'functions/unimplemented': {
    message: 'This feature is not implemented yet.',
    category: 'api',
    severity: 'error',
    domain: 'functions',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'functions/internal': {
    message: 'An internal server error occurred. Please try again later.',
    category: 'api',
    severity: 'error',
    domain: 'functions',
    retryable: true,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'functions/unavailable': {
    message: 'The service is currently unavailable. Please try again later.',
    category: 'api',
    severity: 'error',
    domain: 'functions',
    retryable: true,
    isNetworkRelated: true,
    isPermissionIssue: false,
  },
  'functions/data-loss': {
    message: 'Unrecoverable data loss or corruption occurred.',
    category: 'data',
    severity: 'error',
    domain: 'functions',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false,
  },
  'functions/unauthenticated': {
    message: 'Your session has expired. Please log in again.',
    category: 'auth',
    severity: 'warning',
    domain: 'functions',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: true,
  },
  
  // ===== Realtime Database Errors =====
  'database/permission-denied': {
    message: 'You do not have permission to access this data.',
    category: 'auth',
    severity: 'error',
    domain: 'database',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: true,
  },
  'database/unavailable': {
    message: 'The database service is currently unavailable. Please try again later.',
    category: 'data',
    severity: 'error',
    domain: 'database',
    retryable: true,
    isNetworkRelated: true,
    isPermissionIssue: false,
  },
  
  // ===== Generic/Network Errors =====
  'network-error': {
    message: 'A network error occurred. Please check your connection and try again.',
    category: 'network',
    severity: 'warning',
    domain: 'general',
    retryable: true,
    isNetworkRelated: true,
    isPermissionIssue: false,
  },
  'timeout-error': {
    message: 'The operation timed out. Please try again.',
    category: 'network',
    severity: 'warning',
    domain: 'general',
    retryable: true,
    isNetworkRelated: true,
    isPermissionIssue: false,
  },
  'offline-error': {
    message: 'You appear to be offline. Please check your internet connection.',
    category: 'network',
    severity: 'warning',
    domain: 'general',
    retryable: true,
    isNetworkRelated: true,
    isPermissionIssue: false,
  },
};

/**
 * Get a user-friendly error message from a Firebase error code
 * 
 * @param code Firebase error code (e.g., 'auth/user-not-found')
 * @param defaultMessage Fallback message if the code isn't mapped
 * @returns User-friendly error message
 */
export function getFirebaseErrorMessage(code: string, defaultMessage = 'An error occurred. Please try again.'): string {
  const errorInfo = FIREBASE_ERROR_MAP[code];
  return errorInfo ? errorInfo.message : defaultMessage;
}

/**
 * Get the error category for a Firebase error code
 * 
 * @param code Firebase error code
 * @returns Error category
 */
export function getFirebaseErrorCategory(code: string): ErrorCategory {
  const errorInfo = FIREBASE_ERROR_MAP[code];
  if (errorInfo) {
    return errorInfo.category;
  }
  
  // Check if code starts with a known prefix
  if (code.startsWith('auth/')) return 'auth';
  if (code.startsWith('firestore/')) return 'data';
  if (code.startsWith('storage/')) return 'api';
  if (code.startsWith('functions/')) return 'api';
  if (code.startsWith('database/')) return 'data';
  
  return 'api'; // Default category
}

/**
 * Get the error severity for a Firebase error code
 * 
 * @param code Firebase error code
 * @returns Error severity
 */
export function getFirebaseErrorSeverity(code: string): ErrorSeverity {
  const errorInfo = FIREBASE_ERROR_MAP[code];
  return errorInfo ? errorInfo.severity : 'error'; // Default severity
}

/**
 * Get the error domain for a Firebase error code
 * 
 * @param code Firebase error code
 * @returns Error domain
 */
export function getFirebaseErrorDomain(code: string): ErrorDomain {
  const errorInfo = FIREBASE_ERROR_MAP[code];
  if (errorInfo) {
    return errorInfo.domain;
  }
  
  // Check if code starts with a known prefix
  if (code.startsWith('auth/')) return 'auth';
  if (code.startsWith('firestore/')) return 'firestore';
  if (code.startsWith('storage/')) return 'storage';
  if (code.startsWith('functions/')) return 'functions';
  if (code.startsWith('database/')) return 'database';
  
  return 'general'; // Default domain
}

/**
 * Check if an error is retryable based on Firebase error code
 * 
 * @param code Firebase error code
 * @returns Whether the error is retryable
 */
export function isFirebaseErrorRetryable(code: string): boolean {
  const errorInfo = FIREBASE_ERROR_MAP[code];
  return errorInfo ? errorInfo.retryable : false;
}

/**
 * Get comprehensive error information for a Firebase error code
 * 
 * @param code Firebase error code
 * @returns Enhanced error information
 */
export function getFirebaseErrorInfo(code: string): EnhancedErrorInfo {
  const errorInfo = FIREBASE_ERROR_MAP[code];
  
  if (errorInfo) {
    return {
      code,
      ...errorInfo
    };
  }
  
  // Default error info for unknown codes
  return {
    code,
    message: `An error occurred (${code}). Please try again.`,
    category: 'api',
    severity: 'error',
    domain: 'general',
    retryable: false,
    isNetworkRelated: false,
    isPermissionIssue: false
  };
}

/**
 * Create a standardized error from a Firebase error
 * 
 * @param error Firebase error object
 * @returns Standardized error with additional metadata
 */
export function createFirebaseError(error: { code: string; message: string }): Error {
  const errorInfo = getFirebaseErrorInfo(error.code);
  
  const standardError = new Error(errorInfo.message);
  
  // Add all error info as properties
  Object.entries(errorInfo).forEach(([key, value]) => {
    (standardError as any)[key] = value;
  });
  
  // Log the enriched error
  logError(`Firebase error (${errorInfo.domain}): ${errorInfo.code}`, { 
    originalMessage: error.message,
    enhancedInfo: errorInfo 
  });
  
  return standardError;
}

export default {
  getFirebaseErrorMessage,
  getFirebaseErrorCategory,
  getFirebaseErrorSeverity,
  getFirebaseErrorDomain,
  isFirebaseErrorRetryable,
  getFirebaseErrorInfo,
  createFirebaseError
};