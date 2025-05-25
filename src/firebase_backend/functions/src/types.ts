import { Request, Response, NextFunction } from 'express';

/**
 * Authentication information for callable functions
 */
export interface AuthData {
  /**
   * The user's unique ID
   */
  uid: string;
  
  /**
   * The user's authentication token
   */
  token: {
    /**
     * The user's email address
     */
    email?: string;
    
    /**
     * Whether the user's email is verified
     */
    email_verified?: boolean;
    
    /**
     * Additional token claims
     */
    [key: string]: any;
  };
}

/**
 * Extended CallableContext interface that includes raw request and custom properties
 */
export interface CallableContext {
  /**
   * Authentication information for the request
   */
  auth?: {
    /**
     * The user's unique ID
     */
    uid: string;
    
    /**
     * The user's authentication token
     */
    token: Record<string, any>;
  };
  
  /**
   * The raw Express request object (only available in HTTP functions)
   */
  rawRequest?: Request;
  
  /**
   * The raw Express response object (only available in HTTP functions)
   */
  rawResponse?: Response;
  
  /**
   * The instance ID token for Firebase App Check
   */
  instanceIdToken?: string;
  
  /**
   * The Firebase app that is associated with the function call
   */
  app?: {
    /**
     * The Firebase App ID
     */
    appId: string;
    
    /**
     * The Google Cloud project ID
     */
    projectId: string;
    
    /**
     * Additional app properties
     */
    [key: string]: any;
  };
}

/**
 * Type for callable function handlers
 */
export type CallableFunction<T = any, R = any> = (
  data: T,
  context: CallableContext
) => Promise<R> | R;

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * The response data (if successful)
   */
  data?: T;
  
  /**
   * Error details (if the operation failed)
   */
  error?: {
    /**
     * Error code
     */
    code: string;
    
    /**
     * Human-readable error message
     */
    message: string;
    
    /**
     * Additional error details
     */
    details?: unknown;
  };
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  /**
   * HTTP status code
   */
  statusCode: number;
  
  /**
   * Error type
   */
  error: string;
  
  /**
   * Human-readable error message
   */
  message: string;
  
  /**
   * Additional error details
   */
  details?: unknown;
  
  /**
   * Stack trace (only in non-production environments)
   */
  stack?: string;
}

/**
 * Type for Express request handlers
 */
export type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

/**
 * Type for async Express request handlers
 */
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Type for middleware functions
 */
export type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Firebase Functions runtime options
 */
export interface RuntimeOptions {
  /**
   * Memory allocation for the function
   */
  memory?: '128MB' | '256MB' | '512MB' | '1GB' | '2GB' | '4GB' | '8GB';
  
  /**
   * Maximum execution time in seconds
   */
  timeoutSeconds?: number;
  
  /**
   * Minimum number of instances to keep warm
   */
  minInstances?: number;
  
  /**
   * Maximum number of instances
   */
  maxInstances?: number;
  
  /**
   * GCP region(s) where the function should be deployed
   */
  region?: string | string[];
  
  /**
   * Maximum number of concurrent requests per instance
   */
  concurrency?: number;
  
  /**
   * VPC connector to use
   */
  vpcConnector?: string;
  
  /**
   * VPC egress settings
   */
  vpcConnectorEgressSettings?: 'PRIVATE_RANGES_ONLY' | 'ALL_TRAFFIC';
  
  /**
   * Service account to use
   */
  serviceAccount?: string;
  
  /**
   * Ingress settings for HTTP functions
   */
  ingressSettings?: 'ALLOW_ALL' | 'ALLOW_INTERNAL_ONLY' | 'ALLOW_INTERNAL_AND_GCLB';
  
  /**
   * Secret environment variables
   */
  secrets?: string[];
  
  /**
   * Retry policy for background functions
   */
  failurePolicy?: {
    retry: Record<string, never>;
  };
}
