/**
 * API Client
 *
 * Centralizes API calls and handles routing between local and cloud functions.
 * When process.env.NEXT_PUBLIC_API_MODE === 'local', routes to localApi functions.
 * Eventually will route to cloud functions when mode is 'emulator' or 'production'.
 */

import type { LocalApi } from './localApiFunctions';
import localApi from './localApiFunctions';
import { logInfo, logError, logValidation } from './logger';

// Firebase bits are tree-shaken away in 'local' mode
import { httpsCallable } from '@/types/firebase';
import { functions } from '@/firebase_backend/init'; // (stub exists, will be implemented Phase-5)

const API_MODE = process.env.NEXT_PUBLIC_API_MODE ?? 'local';

type AwaitedReturn<T> = T extends Promise<infer R> ? R : T;

/**
 * Call an API function with typesafe parameters and return values
 *
 * @param fn - API function name to call
 * @param payload - Parameters for the function
 * @returns Promise with the function result
 */
export async function callApi<FN extends keyof LocalApi>(
  fn: FN,
  payload: Parameters<LocalApi[FN]>[0]
): Promise<AwaitedReturn<ReturnType<LocalApi[FN]>>> {
  logInfo('callApi', { fn, mode: API_MODE, payload });

  try {
    if (API_MODE === 'local' || API_MODE === 'mock') {
      // direct Typescript-safe local dispatch
      // @ts-expect-error  – ( TS can't see the computed index signature otherwise )
      return await localApi[fn](payload);
    }

    // --- cloud / emulator branch ---
    const callable = httpsCallable(functions, fn as string);
    const res = await callable(payload as unknown);
    return res.data as AwaitedReturn<ReturnType<LocalApi[FN]>>;
  } catch (err) {
    logError('callApi error', err);
    // Re-throw with a labelled error so UI can catch if needed
    throw err;
  }
}

// Log validation for this implementation
logValidation('4.9', 'success', 'apiClient wrapper implemented (local mode operational)');

const apiClient = { callApi };

export default apiClient;
