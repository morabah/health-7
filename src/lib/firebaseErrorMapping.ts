/**
 * Firebase Error Code Mapping
 * 
 * Maps Firebase error codes to user-friendly messages.
 * These messages can be shown directly to users in the UI.
 */

import { ErrorCategory, ErrorSeverity } from "@/components/ui/ErrorDisplay";

/**
 * Firebase error code to user-friendly message mapping
 */
export const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  'auth/email-already-in-use': 'This email address is already in use. Please try logging in or use a different email.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support for assistance.',
  'auth/user-not-found': 'Invalid email or password. Please try again.',
  'auth/wrong-password': 'Invalid email or password. Please try again.',
  'auth/weak-password': 'Password should be at least 6 characters long.',
  'auth/requires-recent-login': 'For security reasons, please log out and log back in to perform this action.',
  'auth/invalid-credential': 'Your login credentials have expired. Please log in again.',
  'auth/account-exists-with-different-credential': 'An account already exists with the same email but different sign-in credentials.',
  'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.',
  'auth/popup-blocked': 'The sign-in popup was blocked by your browser. Please allow popups for this site.',
  'auth/popup-closed-by-user': 'The sign-in process was interrupted. Please try again.',
  'auth/unauthorized-domain': 'This domain is not authorized for sign-in operations. Please contact support.',
  'auth/invalid-action-code': 'The link you used has expired or is invalid.',
  'auth/invalid-verification-code': 'The verification code is invalid. Please try again.',
  'auth/invalid-verification-id': 'The verification ID is invalid. Please try again.',
  'auth/missing-verification-code': 'Please enter a verification code.',
  'auth/missing-verification-id': 'A verification ID is required. Please try the operation again.',
  'auth/network-request-failed': 'A network error occurred. Please check your connection and try again.',
  'auth/timeout': 'The operation has timed out. Please try again.',
  'auth/too-many-requests': 'Too many unsuccessful attempts. Please try again later.',
  
  // Firestore errors
  'firestore/cancelled': 'The operation was cancelled. Please try again.',
  'firestore/unknown': 'An unknown error occurred. Please try again.',
  'firestore/invalid-argument': 'Invalid data provided. Please check your input and try again.',
  'firestore/deadline-exceeded': 'The operation timed out. Please try again.',
  'firestore/not-found': 'The requested document was not found.',
  'firestore/already-exists': 'The document already exists.',
  'firestore/permission-denied': 'You do not have permission to perform this action.',
  'firestore/resource-exhausted': 'System resources have been exhausted. Please try again later.',
  'firestore/failed-precondition': 'The operation cannot be performed in the current system state.',
  'firestore/aborted': 'The operation was aborted. Please try again.',
  'firestore/out-of-range': 'The operation was attempted past the valid range.',
  'firestore/unimplemented': 'This feature is not implemented yet.',
  'firestore/internal': 'An internal error occurred. Please try again later.',
  'firestore/unavailable': 'The service is currently unavailable. Please try again later.',
  'firestore/data-loss': 'Unrecoverable data loss or corruption occurred.',
  'firestore/unauthenticated': 'Your session has expired. Please log in again.',
  
  // Storage errors
  'storage/unknown': 'An unknown error occurred. Please try again.',
  'storage/object-not-found': 'The file you requested does not exist.',
  'storage/bucket-not-found': 'The storage bucket does not exist.',
  'storage/project-not-found': 'The project does not exist.',
  'storage/quota-exceeded': 'Storage quota exceeded. Please contact support.',
  'storage/unauthorized': 'You are not authorized to access this file.',
  'storage/retry-limit-exceeded': 'The maximum time limit for this operation has been exceeded. Please try again.',
  'storage/invalid-checksum': 'The file upload failed. Please try again.',
  'storage/canceled': 'The file upload was cancelled.',
  'storage/invalid-event-name': 'Invalid event name provided.',
  'storage/invalid-url': 'Invalid URL provided.',
  'storage/invalid-argument': 'Invalid argument provided.',
  'storage/no-default-bucket': 'No default bucket has been set for this project.',
  'storage/cannot-slice-blob': 'The file could not be processed. Please try a different file.',
  'storage/server-file-wrong-size': 'The uploaded file size did not match the expected size.',
  
  // Cloud Functions errors
  'functions/cancelled': 'The operation was cancelled. Please try again.',
  'functions/unknown': 'An unknown error occurred. Please try again.',
  'functions/invalid-argument': 'Invalid data provided. Please check your input and try again.',
  'functions/deadline-exceeded': 'The operation timed out. Please try again.',
  'functions/not-found': 'The requested resource was not found.',
  'functions/already-exists': 'The resource already exists.',
  'functions/permission-denied': 'You do not have permission to perform this action.',
  'functions/resource-exhausted': 'System resources have been exhausted. Please try again later.',
  'functions/failed-precondition': 'The operation cannot be performed in the current system state.',
  'functions/aborted': 'The operation was aborted. Please try again.',
  'functions/out-of-range': 'The operation was attempted past the valid range.',
  'functions/unimplemented': 'This feature is not implemented yet.',
  'functions/internal': 'An internal error occurred. Please try again later.',
  'functions/unavailable': 'The service is currently unavailable. Please try again later.',
  'functions/data-loss': 'Unrecoverable data loss or corruption occurred.',
  'functions/unauthenticated': 'Your session has expired. Please log in again.',
  
  // Realtime Database errors
  'database/permission-denied': 'You do not have permission to access this data.',
  'database/unavailable': 'The database service is currently unavailable. Please try again later.',
  
  // Generic errors
  'internal-error': 'An internal error occurred. Please try again later.',
  'network-error': 'A network error occurred. Please check your connection and try again.',
  'timeout-error': 'The operation timed out. Please try again.',
  'quota-exceeded': 'Service quota exceeded. Please try again later.',
  'invalid-data': 'Invalid data provided. Please check your input and try again.',
  'unauthenticated': 'Authentication required. Please log in to continue.',
  'unauthorized': 'You are not authorized to perform this action.',
};

/**
 * Firebase error categories for different error codes
 */
export const FIREBASE_ERROR_CATEGORIES: Record<string, ErrorCategory> = {
  // Map error prefixes to categories
  'auth/': 'auth',
  'firestore/': 'data',
  'storage/': 'api',
  'functions/': 'api',
  'database/': 'data',
};

/**
 * Firebase error severities for different error codes
 */
export const FIREBASE_ERROR_SEVERITIES: Record<string, ErrorSeverity> = {
  // Auth errors that are user mistakes are warnings
  'auth/wrong-password': 'warning',
  'auth/user-not-found': 'warning',
  'auth/invalid-email': 'warning',
  'auth/weak-password': 'warning',
  'auth/email-already-in-use': 'warning',
  
  // Quota and permission errors are more serious
  'auth/too-many-requests': 'error',
  'firestore/permission-denied': 'error',
  'firestore/unauthenticated': 'error',
  'storage/quota-exceeded': 'error',
  'functions/resource-exhausted': 'error',
  'functions/permission-denied': 'error',
  
  // System errors are critical (using 'error' since 'critical' isn't available)
  'firestore/internal': 'error',
  'firestore/data-loss': 'error',
  'functions/internal': 'error',
  'storage/internal': 'error',
};

/**
 * Get a user-friendly error message from a Firebase error code
 * 
 * @param code Firebase error code (e.g., 'auth/user-not-found')
 * @param defaultMessage Fallback message if the code isn't mapped
 * @returns User-friendly error message
 */
export function getFirebaseErrorMessage(code: string, defaultMessage = 'An error occurred. Please try again.'): string {
  return FIREBASE_ERROR_MESSAGES[code] || defaultMessage;
}

/**
 * Get the error category for a Firebase error code
 * 
 * @param code Firebase error code
 * @returns Error category
 */
export function getFirebaseErrorCategory(code: string): ErrorCategory {
  // Check if code starts with any of the category prefixes
  for (const [prefix, category] of Object.entries(FIREBASE_ERROR_CATEGORIES)) {
    if (code.startsWith(prefix)) {
      return category;
    }
  }
  return 'api'; // Default category
}

/**
 * Get the error severity for a Firebase error code
 * 
 * @param code Firebase error code
 * @returns Error severity
 */
export function getFirebaseErrorSeverity(code: string): ErrorSeverity {
  return FIREBASE_ERROR_SEVERITIES[code] || 'error'; // Default severity
}

/**
 * Create a standardized error from a Firebase error
 * 
 * @param error Firebase error object
 * @returns Standardized error with additional metadata
 */
export function createFirebaseError(error: { code: string; message: string }): Error {
  const message = getFirebaseErrorMessage(error.code, error.message);
  const category = getFirebaseErrorCategory(error.code);
  const severity = getFirebaseErrorSeverity(error.code);
  
  const standardError = new Error(message);
  (standardError as any).originalCode = error.code;
  (standardError as any).category = category;
  (standardError as any).severity = severity;
  (standardError as any).isFirebaseError = true;
  
  return standardError;
}

export default {
  getFirebaseErrorMessage,
  getFirebaseErrorCategory,
  getFirebaseErrorSeverity,
  createFirebaseError
}; 