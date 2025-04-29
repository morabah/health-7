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
    if (process.env.NODE_ENV === 'development') {
      await new Promise(r => setTimeout(r, 400));
    }
    
    console.log(`[callApi] Calling ${method} with args:`, args);
    
    // Map login to signIn
    if (method === 'login') {
      method = 'signIn';
      // Extract email and password from object parameter
      if (args.length === 1 && typeof args[0] === 'object' && args[0].email && args[0].password) {
        args = [args[0].email, args[0].password];
      }
    } else {
      // For any API method other than login, we need to get the auth context
      const authContext = getCurrentAuthCtx();
      
      // Handle two-parameter functions that receive a merged object
      const twoParamMethods = [
        'completeAppointment', 'cancelAppointment', 'markNotificationRead', 
        'bookAppointment', 'getAvailableSlots', 'updateMyUserProfile',
        'sendDirectMessage', 'setDoctorAvailability', 'adminUpdateUserStatus',
        'adminVerifyDoctor', 'findDoctors', 'getAppointmentDetails'
      ];
      
      if (twoParamMethods.includes(method)) {
        // For methods needing both context and payload, check if we need to add context
        if (args.length === 1 && typeof args[0] === 'object') {
          // If args[0] doesn't have uid and role but we have auth context, add it
          const payload = args[0];
          if (!payload.uid && !payload.role && authContext) {
            // Create a new context object
            const context = { uid: authContext.uid, role: authContext.role };
            
            // Replace args with separate context and payload
            args = [context, payload];
          } else if (payload.uid === undefined && payload.role === undefined && authContext) {
            // If uid and role are undefined, replace with auth context
            const { uid, role, ...rest } = payload;
            const context = { uid: authContext.uid, role: authContext.role };
            args = [context, rest];
          }
        }
      } else if (args.length === 0 && authContext) {
        // For methods that just need context, add it if not provided
        args = [{ uid: authContext.uid, role: authContext.role }];
      } else if (args.length === 1 && typeof args[0] === 'object') {
        // For single-argument methods, check if we need to add auth context properties
        const param = args[0];
        if (param.uid === undefined && param.role === undefined && authContext) {
          // Add auth context properties to the param
          args = [{ ...param, uid: authContext.uid, role: authContext.role }];
        }
      }
    }
    
    // Map registerPatient and registerDoctor to registerUser
    if (method === 'registerPatient' || method === 'registerDoctor') {
      method = 'registerUser';
    }
    
    // Check if method exists in localAPI
    if (!(method in localAPI) || typeof localAPI[method as keyof typeof localAPI] !== 'function') {
      return { success: false, error: `Method "${method}" not found in localAPI or is not a function` } as T;
    }
    
    // Log the actual args being used (for debugging)
    logInfo(`Calling ${method} with processed args`, args);
    
    // Call the function dynamically
    // @ts-expect-error – dynamic access
    const result = await localAPI[method](...args);
    return result;
  } catch (err) {
    console.error('[callApi]', method, err);
    // Always return a consistent error object, never throw to callers
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    } as T;
  }
}

export default { callApi };
