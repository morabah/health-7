/**
 * Firebase Error Mapping
 *
 * This file contains utilities for handling Firebase specific errors
 * and mapping them to user-friendly messages and appropriate error types.
 */

import { AuthError, ValidationError } from './errorClasses';

// Define interface for Firebase field violations
interface FieldViolation {
  field: string;
  description: string;
}

/**
 * Map of Firebase auth error codes to user-friendly messages
 */
const FIREBASE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  'auth/invalid-email': 'The email address is badly formatted.',
  'auth/user-disabled': 'This user account has been disabled.',
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'The password is invalid.',
  'auth/email-already-in-use': 'This email address is already in use.',
  'auth/weak-password': 'The password must be at least 6 characters.',
  'auth/requires-recent-login': 'Please log in again before retrying this request.',
  'auth/too-many-requests': 'Too many unsuccessful login attempts. Please try again later.',
  'auth/network-request-failed': 'A network error occurred. Please check your connection.',
  'auth/popup-closed-by-user': 'The sign-in popup was closed before completing the sign in.',
  'auth/unauthorized-domain': 'This domain is not authorized for OAuth operations.',
  'auth/operation-not-allowed': 'This operation is not allowed.',
  'auth/account-exists-with-different-credential':
    'An account already exists with the same email address but different sign-in credentials.',
  'auth/invalid-credential': 'The credential is malformed or has expired.',
  'auth/invalid-verification-code': 'The verification code is invalid.',
  'auth/invalid-verification-id': 'The verification ID is invalid.',
  'auth/missing-verification-code': 'The verification code is missing.',
  'auth/missing-verification-id': 'The verification ID is missing.',
  'auth/session-expired': 'The verification code has expired. Please request a new one.',

  // Firestore errors
  'permission-denied': 'You do not have permission to perform this operation.',
  'resource-exhausted': 'Quota exceeded. Please try again later.',
  'not-found': 'The requested document was not found.',
  'already-exists': 'The document already exists.',
  'failed-precondition': 'The operation failed because of an invalid document state.',
  unauthenticated: 'You must be logged in to perform this operation.',
  unavailable: 'The service is currently unavailable. Please try again later.',

  // Default message
  default: 'An error occurred. Please try again later.',
};

/**
 * Set of Firebase error codes that should be considered retryable
 */
const RETRYABLE_FIREBASE_ERRORS = new Set([
  'resource-exhausted',
  'unavailable',
  'deadline-exceeded',
  'cancelled',
  'internal',
  'auth/network-request-failed',
  'auth/too-many-requests',
]);

/**
 * Gets a user-friendly message for a Firebase error code
 */
export function getFirebaseErrorMessage(code: string): string {
  return FIREBASE_AUTH_ERROR_MESSAGES[code] || FIREBASE_AUTH_ERROR_MESSAGES.default;
}

/**
 * Checks if a Firebase error is retryable
 */
export function isFirebaseErrorRetryable(code: string): boolean {
  return RETRYABLE_FIREBASE_ERRORS.has(code);
}

/**
 * Maps a Firebase error to an appropriate application error
 */
export function mapFirebaseError(error: unknown): Error {
  // Default to the original error if it's not a Firebase error
  if (!error || typeof error !== 'object' || !('code' in error)) {
    // Return as is if not a structured error or Error instance
    return error instanceof Error ? error : new Error(String(error));
  }

  const code = (error as { code: string }).code;
  const message = getFirebaseErrorMessage(code);

  // Authentication errors
  if (code.startsWith('auth/')) {
    return new AuthError(message, {
      code,
      cause: error instanceof Error ? error : undefined,
      retryable: isFirebaseErrorRetryable(code),
      context: { originalError: error },
    });
  }

  // Validation errors
  if (code === 'invalid-argument') {
    return new ValidationError(message, {
      code,
      cause: error instanceof Error ? error : undefined,
      context: { originalError: error },
    });
  }

  // General errors - return as AppError or standard Error
  const baseError = error instanceof Error ? error : new Error(String(error));
  baseError.message = message; // Overwrite message with user-friendly one
  return baseError;
}

/**
 * Extracts validation errors from a Firebase error
 */
export function extractFirebaseValidationErrors(error: unknown): Record<string, string[]> {
  if (!error || typeof error !== 'object') {
    return {};
  }

  // For Firebase Admin SDK validation errors (check if errorInfo exists)
  if (
    'errorInfo' in error &&
    typeof (error as { errorInfo?: { message?: string } }).errorInfo === 'object' &&
    (error as { errorInfo?: { message?: string } }).errorInfo?.message
  ) {
    const match = String((error as { errorInfo: { message: string } }).errorInfo.message).match(
      /([a-zA-Z.]+): (.+)/
    );
    if (match) {
      const [, field, message] = match;
      return { [field]: [message] };
    }
  }

  // For Firestore errors (check if details exists)
  if ('details' in error && typeof (error as { details?: string }).details === 'string') {
    const validationErrors: Record<string, string[]> = {};

    // Try to extract field errors from the details string
    try {
      const details = JSON.parse((error as { details: string }).details);

      if (details.fieldViolations && Array.isArray(details.fieldViolations)) {
        // Use the FieldViolation interface for typing
        details.fieldViolations.forEach((violation: FieldViolation) => {
          // Basic validation of the violation object structure
          if (
            violation &&
            typeof violation.field === 'string' &&
            typeof violation.description === 'string'
          ) {
            const field = violation.field;
            const description = violation.description;

            if (!validationErrors[field]) {
              validationErrors[field] = [];
            }

            validationErrors[field].push(description);
          }
        });

        if (Object.keys(validationErrors).length > 0) {
          return validationErrors;
        }
      }
    } catch /* Removed unused variable e */ {
      // If parsing fails or structure is wrong, just return an empty object
    }
  }

  return {};
}
