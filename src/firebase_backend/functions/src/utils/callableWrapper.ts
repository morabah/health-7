import { CallableRequest, HttpsError, onCall as onCallV2 } from 'firebase-functions/v2/https';
import { logError } from '../shared/logger';
import { CallableContext as ExtendedCallableContext } from '../types';

/**
 * Creates a callable context from a request
 */
function createCallableContext<T>(request: CallableRequest<T>): ExtendedCallableContext {
  const { auth, instanceIdToken } = request;
  
  return {
    auth: auth ? { uid: auth.uid, token: auth.token } : undefined,
    instanceIdToken,
    // Omit app property for now as it has type incompatibility
    app: undefined
  };
}

// Create the onCall function with proper typing
export const onCall = <T = any, R = any>(
  handler: (data: T, context: ExtendedCallableContext) => Promise<R> | R,
  options: {
    requireAuth?: boolean;
    timeoutSeconds?: number;
    memory?: '128MiB' | '256MiB' | '512MiB' | '1GiB' | '2GiB' | '4GiB' | '8GiB';
  } = { requireAuth: true }
) => {
  // Create a wrapper that properly handles the async/await
  const wrappedHandler = async (request: CallableRequest<T>): Promise<R> => {
    try {
      const context = createCallableContext(request);
      return await handler(request.data, context);
    } catch (error) {
      logError('Error in callable function:', error);
      
      // Re-throw the error if it's already an HttpsError
      if (error instanceof HttpsError) {
        throw error;
      }
      
      // Convert other errors to HttpsError
      throw new HttpsError('internal', 'An internal error occurred');
    }
  };

  // Return the wrapped handler with proper typing
  return onCallV2<T, R>({
    region: 'us-central1',
    memory: options.memory || '256MiB',
    timeoutSeconds: options.timeoutSeconds || 60,
    enforceAppCheck: options.requireAuth,
  }, wrappedHandler as any);
}; 