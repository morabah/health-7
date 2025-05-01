/**
 * API Client
 *
 * Unified caller for local API functions.
 * All components must use this wrapper rather than importing localApiFunctions directly.
 * This allows us to swap the backend implementation later by changing only this file.
 */

import * as localAPI from './localApiFunctions';
import { getCurrentAuthCtx } from './apiAuthCtx';
import { logInfo } from './logger';

// Low-noise API methods that should minimize logging
const LOW_NOISE_METHODS = [
  'getAvailableSlots',
  'getMyNotifications',
  'getMyDashboardStats'
];

// Method mapping for backward compatibility
const METHOD_MAPPING: Record<string, string> = {
  'login': 'signIn',
  'registerPatient': 'registerUser',
  'registerDoctor': 'registerUser'
};

/**
 * Call a local API function with the provided arguments
 * 
 * @param method - The API method name to call
 * @param args - Arguments to pass to the API method
 * @returns Promise with the result of the API call
 */
export async function callApi<T = any>(
  method: string, 
  ...args: any[]
): Promise<T> {
  try {
    // Add artificial delay in development mode to expose loading states
    if (process.env.NODE_ENV === 'development' && !method.includes('get')) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Only log non-low-noise methods to prevent console flooding
    const shouldLog = !LOW_NOISE_METHODS.includes(method);
    
    if (shouldLog) {
      // Log API call for debugging
      console.log(`[callApi] Calling ${method} with args:`, args);
    }
    
    // Check if method needs mapping (e.g., login -> signIn)
    const mappedMethod = METHOD_MAPPING[method] || method;
    
    // Special handling for login/signIn
    if (method === 'login') {
      // Extract email and password from arguments for login
      if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
        // Args are already [email, password]
        return await localAPI.signIn(args[0], args[1]) as T;
      } else if (args.length === 1 && typeof args[0] === 'object' && args[0].email && args[0].password) {
        // Args are in object format {email, password}
        return await localAPI.signIn(args[0].email, args[0].password) as T;
      }
    }
    
    // Check if we have the method in our local API
    if (mappedMethod in localAPI.localApi) {
      // @ts-ignore: dynamic method call
      const localApiMethod = localAPI.localApi[mappedMethod];
      
      // Special case for methods that need auth context
      if (mappedMethod.startsWith('get') || mappedMethod === 'updateMyProfile' || mappedMethod === 'bookAppointment') {
        // Get current auth context
        const ctx = getCurrentAuthCtx();
        
        // For debug only - Log method called with args
        if (shouldLog) {
          logInfo(`Calling ${mappedMethod} with processed args`, args);
        }
        
        // Return result from local API call with context
        return await localApiMethod(ctx, ...args);
      }
      
      // For debug only
      if (shouldLog) {
        logInfo(`Calling ${mappedMethod} with processed args`, args);
      }
      
      // Return result from local API call
      return await localApiMethod(...args);
    }
    
    throw new Error(`API method ${method} not found`);
  } catch (err) {
    console.error(`Error calling ${method}:`, err);
    throw err;
  }
}

export default { callApi };
