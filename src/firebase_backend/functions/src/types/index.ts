import { Request, Response } from 'express';
import { CallableRequest } from 'firebase-functions/v2/https';

// Base response type for all API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Extended Express Request type with user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        [key: string]: any;
      };
    }
  }
}

// Type for callable function context with proper v2 types
export interface ExtendedCallableContext extends Omit<CallableRequest, 'rawRequest'> {
  rawRequest?: Request;
  instanceIdToken?: string;
}

// Type for callable function handler
export type CallableFunction<T = any> = (
  data: any,
  context: ExtendedCallableContext
) => Promise<ApiResponse<T>>;

// Type for HTTP function handler with Express Response
export type HttpFunction = (
  req: Request,
  res: Response
) => Promise<void> | void;

// Type for scheduled function handler
export type ScheduledFunction = (
  context: any
) => Promise<void> | void;
