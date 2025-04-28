import { logInfo } from '@/lib/logger';

/**
 * Application Configuration Module
 * Centralizes access to environment variables and derived settings
 * 
 * This module should be imported early in the application bootstrap process
 * to ensure consistent environment variable access throughout the app.
 */

/**
 * API Mode Setting
 * Controls whether the application uses real or mock API endpoints
 * 
 * Values:
 * - "live": Uses actual API endpoints for real data
 * - "mock": Uses mock data for development/testing
 */
export const API_MODE = process.env.NEXT_PUBLIC_API_MODE || 'mock';

/**
 * Logging Level Setting
 * Controls the verbosity of application logging
 * 
 * Values:
 * - "debug": Most verbose, shows all logs including detailed diagnostics
 * - "info": Shows operational information, general app flow
 * - "warn": Shows potential issues that don't prevent operation
 * - "error": Shows only errors that affect functionality
 */
export const LOG_LEVEL = process.env.NEXT_PUBLIC_LOG_LEVEL || 'info';

/**
 * Development Environment Flag
 * Determines if the application is running in development mode
 */
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

/**
 * Mock API Mode Flag
 * Derived from API_MODE, provides a boolean for conditional logic
 */
export const IS_MOCK_MODE = API_MODE === 'mock';

/**
 * Log the application configuration
 * Called during application initialization to record the environment setup
 */
const logAppConfig = () => {
  logInfo('Application Configuration Loaded', {
    API_MODE,
    LOG_LEVEL,
    IS_DEVELOPMENT,
    IS_MOCK_MODE,
    NODE_ENV: process.env.NODE_ENV
  });
};

// Execute logging on module import
logAppConfig();

// Assign to variable before exporting
const appConfig = {
  API_MODE,
  LOG_LEVEL,
  IS_DEVELOPMENT,
  IS_MOCK_MODE
};

export default appConfig; 