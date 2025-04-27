/**
 * Firebase Type Definitions
 *
 * This file contains type definitions for Firebase services used in the application.
 * These are stub types to allow for type checking without requiring the actual Firebase SDK.
 */

// Functions type definitions
export interface FirebaseFunctions {
  [key: string]: unknown;
}

// HTTPS Callable Function type definitions
export interface CallableResult<T> {
  data: T;
}

export type HttpsCallableFunction<T, R> = (data: T) => Promise<CallableResult<R>>;

export function httpsCallable<T, R>(
  functions: FirebaseFunctions,
  name: string
): HttpsCallableFunction<T, R> {
  return async (): Promise<CallableResult<R>> => {
    throw new Error(`Firebase functions not available in local mode: ${name}`);
  };
}
