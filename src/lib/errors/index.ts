/**
 * Error Handling System
 * 
 * Centralized exports for the application's error handling system.
 * This file serves as the main entry point for all error-related functionality.
 */

// Error classes
export * from './errorClasses';

// Error utilities
export * from './errorUtils';

// Error monitoring
export * from './errorMonitoring';

// API error handling
export * from './apiErrorHandling';

// Firebase error mapping
export * from './firebaseErrorMapping';

// Network utilities
export * from './networkUtils';

// Error persistence
export * from './errorPersistence';

/**
 * Quick reference guide:
 * 
 * 1. Error Classes:
 *   - AppError: Base error class with context and severity
 *   - NetworkError: Network connectivity issues
 *   - AuthError: Authentication/authorization failures
 *   - ApiError: API-related errors
 *   - ValidationError: Data validation failures
 *   - AppointmentError: Appointment-specific errors
 * 
 * 2. Error Utilities:
 *   - withErrorHandling(fn, config): Safely execute async functions with standardized error handling
 *   - withErrorHandlingSync(fn, config): Synchronous version of withErrorHandling
 *   - normalizeError(error, options): Convert any error to a standardized AppError
 *   - getUserFriendlyMessage(error): Get a user-friendly error message
 * 
 * 3. Error Monitoring:
 *   - reportError(error, context): Report an error to the monitoring system
 *   - ErrorMonitor: Singleton for error tracking and reporting
 * 
 * 4. API Error Handling:
 *   - callApiWithErrorHandling(fn, args, options): Execute API calls with robust error handling
 *   - isRetryableError(error): Check if an error should trigger a retry
 *   - parseApiError(response): Parse API error responses
 * 
 * 5. Firebase Error Mapping:
 *   - getFirebaseErrorMessage(code): Get a user-friendly message for Firebase error codes
 *   - isFirebaseErrorRetryable(code): Check if a Firebase error is retryable
 * 
 * 6. Network Utilities:
 *   - isOnline(): Check if the user is online
 *   - executeWhenOnline(fn, options): Execute a function when online
 *   - initNetworkStateMonitoring(): Initialize network state monitoring
 *   - useNetworkState(): React hook to track online/offline status
 *   - whenOnline(): Promise that resolves when back online
 * 
 * 7. Error Persistence:
 *   - persistError(error): Store an error for later analysis
 *   - getPersistedErrors(): Get all stored errors
 *   - sendPersistedErrors(sendFn): Send stored errors when online
 *   - clearPersistedErrors(): Remove all stored errors
 *   - removePersistedError(errorId): Remove a specific error
 *   - initErrorPersistence(): Set up automatic error persistence
 */ 