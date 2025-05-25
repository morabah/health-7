/**
 * CORS Helper for Firebase Functions
 * 
 * This helper enables requests to Firebase Cloud Functions from the local development server
 * by providing workarounds for CORS issues.
 */

import { logInfo, logError, logWarn } from './logger';
import appConfig from '@/config/appConfig';
const { IS_DEVELOPMENT, IS_MOCK_MODE } = appConfig;
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getApp } from 'firebase/app';

// Maximum number of retry attempts for failed requests
const MAX_RETRIES = 3;
// Base delay between retries in milliseconds
const BASE_RETRY_DELAY = 1000;

// Cache for storing function URLs to avoid reconstruction
const functionUrlCache = new Map<string, string>();

/**
 * Get the Firebase function URL with appropriate CORS parameters
 * 
 * @param functionName The name of the Firebase function
 * @returns URL with CORS parameters
 */
export function getFirebaseFunctionUrl(functionName: string): string {
  // Check cache first
  if (functionUrlCache.has(functionName)) {
    return functionUrlCache.get(functionName)!;
  }

  // Base Firebase function URL
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'health7-c378f';
  const region = process.env.NEXT_PUBLIC_FIREBASE_REGION || 'us-central1';
  
  // Check if we should use emulator - respect the explicit FIREBASE_USE_EMULATOR setting
  const useEmulator = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === 'true';
  
  const baseUrl = useEmulator
    ? `http://localhost:5001/${projectId}/${region}/${functionName}`
    : `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

  // Cache the URL
  functionUrlCache.set(functionName, baseUrl);
  
  logInfo(`Constructed function URL for ${functionName}`, { baseUrl, useEmulator });
  
  return baseUrl;
}

/**
 * Create headers for Firebase function requests
 * 
 * @param authToken Optional authentication token
 * @returns Headers object with appropriate settings
 */
export function createRequestHeaders(authToken?: string): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Client-Name': 'health7-web',
    'X-Client-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  });

  // Add auth token if provided
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  // Add CORS headers in development
  if (IS_DEVELOPMENT) {
    headers.set('Origin', window.location.origin);
    headers.set('Access-Control-Request-Method', 'POST');
  }

  return headers;
}

/**
 * Get the current user's auth token with retry logic
 * 
 * @param maxRetries Maximum number of retry attempts
 * @returns Promise resolving to the ID token or null if not available
 */
async function getAuthTokenWithRetry(maxRetries: number = 2): Promise<string | null> {
  const auth = getAuth(getApp());
  
  // If we already have a current user, try to get their token
  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken(true); // Force refresh
    } catch (error) {
      logError('Failed to get ID token from current user', { error });
      return null;
    }
  }
  
  // If no current user, wait for auth state to be determined
  if (maxRetries <= 0) {
    logWarn('Max retries reached waiting for auth state');
    return null;
  }
  
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      
      if (user) {
        try {
          const token = await user.getIdToken(true);
          resolve(token);
        } catch (error) {
          logError('Failed to get ID token after auth state change', { error });
          // Retry with decremented counter after a delay
          setTimeout(() => {
            getAuthTokenWithRetry(maxRetries - 1).then(resolve);
          }, 1000);
        }
      } else {
        resolve(null);
      }
    }, (error) => {
      logError('Error in auth state observer', { error });
      unsubscribe();
      resolve(null);
    });
  });
}

/**
 * Call a Firebase Cloud Function with CORS support and retry logic
 * 
 * @param functionName Name of the Firebase function to call
 * @param payload Data to send to the function
 * @param options Additional options for the request
 * @returns Promise with the response data
 */
export async function callFirebaseFunction<T = any>(
  functionName: string,
  payload: unknown = {},
  options: {
    retries?: number;
    timeout?: number;
    requireAuth?: boolean;
  } = {}
): Promise<T> {
  const {
    retries = MAX_RETRIES,
    timeout = 30000, // 30 seconds default timeout
    requireAuth = true,
  } = options;
  
  const url = getFirebaseFunctionUrl(functionName);
  const requestId = Math.random().toString(36).substring(2, 10);
  
  // Log the start of the request
  logInfo(`[${requestId}] Calling Firebase function: ${functionName}`, {
    url,
    payload: JSON.stringify(payload).substring(0, 200) + '...',
    retries,
    timeout,
    requireAuth,
  });
  
  // Get auth token if required
  let authToken: string | null = null;
  if (requireAuth) {
    try {
      authToken = await getAuthTokenWithRetry(2);
      if (!authToken) {
        logWarn(`[${requestId}] No auth token available for authenticated function call`);
      }
    } catch (error) {
      logError(`[${requestId}] Error getting auth token`, { error });
      throw new Error('Authentication required');
    }
  }
  
  // Create headers
  const headers = createRequestHeaders(authToken || undefined);
  
  // Format payload according to Firebase Functions protocol
  const requestBody = JSON.stringify({ data: payload });
  
  // Track retry attempts
  let attempt = 0;
  
  // Execute the request with retry logic
  while (attempt <= retries) {
    attempt++;
    
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      logInfo(`[${requestId}] Attempt ${attempt}/${retries + 1}`, { url });
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: requestBody,
        mode: 'cors',
        signal: controller.signal,
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Check if the response is OK
      if (!response.ok) {
        const errorText = await response.text();
        logError(`[${requestId}] Function returned error`, {
          status: response.status,
          statusText: response.statusText,
          errorText,
          attempt,
          maxRetries: retries,
        });
        
        // If it's an auth error, don't retry
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed');
        }
        
        // If we have retries left, throw to trigger retry
        if (attempt <= retries) {
          throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
        }
        
        // No more retries, throw the error
        throw new Error(`Request failed after ${retries + 1} attempts: ${response.status} ${response.statusText}`);
      }
      
      // Parse the response
      const responseData = await response.json();
      
      // Firebase Functions return { result: { data: actualData } }
      // Extract the actual data from the response
      const result = responseData?.result?.data ?? responseData;
      
      logInfo(`[${requestId}] Function call successful`, {
        attempt,
        responseKeys: Object.keys(result || {}),
      });
      
      return result as T;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Log the error
      logError(`[${requestId}] Attempt ${attempt} failed`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        attempt,
        maxRetries: retries,
      });
      
      // If we've reached max retries, throw the error
      if (attempt > retries) {
        logError(`[${requestId}] All ${retries + 1} attempts failed`);
        throw new Error(`Failed after ${retries + 1} attempts: ${errorMessage}`);
      }
      
      // Calculate exponential backoff delay
      const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, attempt - 1), 30000); // Max 30s
      logInfo(`[${requestId}] Retrying in ${delay}ms...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached due to the while loop, but TypeScript needs it
  throw new Error('Unexpected error in callFirebaseFunction');
}

// Export the main function as the default export
export default callFirebaseFunction;
