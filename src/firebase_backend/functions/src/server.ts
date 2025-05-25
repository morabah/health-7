import * as functions from 'firebase-functions/v2';
import express, { Request, Response, NextFunction } from 'express';
import { logInfo, logError } from './shared/logger';
import { corsMiddleware } from './config/corsConfig';
import { CallableRequest, HttpsError, onCall as onCallV2 } from 'firebase-functions/v2/https';
import { CallableContext as ExtendedCallableContext } from './types';

// Create Express app
const app = express();

// Apply CORS middleware
app.use(corsMiddleware);

// Log all requests
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logInfo(`${method} ${originalUrl} - ${res.statusCode} ${duration}ms`, {
      ip,
      status: res.statusCode,
      duration: `${duration}ms`,
      'user-agent': req.headers['user-agent']
    });
  });
  
  next();
});

// Parse JSON bodies with increased limit for large payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Log all requests
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logInfo(`${method} ${originalUrl} - ${res.statusCode} ${duration}ms`, {
      ip,
      status: res.statusCode,
      duration: `${duration}ms`,
      'user-agent': req.headers['user-agent']
    });
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    region: process.env.FUNCTION_REGION || 'local'
  });
});

// API v1 routes
app.use('/api/v1', (req: Request, res: Response) => {
  res.status(200).json({ message: 'API v1 is working' });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logError('Unhandled error', { error: err });
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message 
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Not Found',
    path: req.path
  });
});

// Error handling middleware
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Error) {
    logError('Unhandled error:', err);
    
    if (res.headersSent) {
      return next(err);
    }
    
    // Handle different types of errors
    const statusCode = 'statusCode' in err ? (err as any).statusCode : 500;
    const code = 'code' in err ? (err as any).code : 'INTERNAL_ERROR';
    const details = 'details' in err ? (err as any).details : undefined;
    
    res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Internal Server Error',
      code,
      details,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  } else {
    // Handle non-Error objects
    logError('Unhandled non-Error object:', err);
    res.status(500).json({
      status: 'error',
      message: 'An unknown error occurred'
    });
  }
});

// Configure global options for all functions
functions.setGlobalOptions({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 60
});

// Create the API function
const api = functions.https.onRequest({
  cors: true,
  region: 'us-central1'
}, app as any);

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
const onCall = <T = any, R = any>(
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

// Export the API and onCall function
export { api, onCall };
