/**
 * CORS Configuration for Firebase Cloud Functions
 * 
 * This file configures CORS settings to allow the frontend to communicate
 * with Firebase Cloud Functions during local development and production.
 */
import { Request, RequestHandler } from 'express';
import cors from 'cors';
import { logInfo, logError } from '../shared/logger';

// List of allowed origins (for stricter environments)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5001',
  'https://health7-c378f.web.app',
  'https://health7-c378f.firebaseapp.com',
  'https://health7.web.app',
  'https://health7.firebaseapp.com',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5001',
];

// CORS configuration options
const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    logInfo('CORS origin check', { origin });
    
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin || allowedOrigins.includes(origin)) {
      logInfo('CORS: Allowing origin', { origin });
      callback(null, true);
    } else {
      logError('CORS: Origin not allowed', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ],
  credentials: true,
  maxAge: 600, // 10 minutes
  optionsSuccessStatus: 204
};

// Create and export the CORS middleware
export const corsMiddleware = cors(corsOptions) as RequestHandler;

// Function to log origins for debugging
export const logOrigin = (req: Request): void => {
  const origin = req.headers?.origin || 'unknown';
  logInfo('Request origin', { 
    origin,
    method: req.method,
    url: req.url
  });
};
